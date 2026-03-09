import { useMemo, useState } from "react";
import {
  ControlBar,
  ParticipantLoop,
  ParticipantTile,
  RoomAudioRenderer,
  RoomContext,
  useIsSpeaking,
  useParticipantInfo,
  useParticipants,
} from "@livekit/components-react";
import { Headphones, Mic, MicOff, PhoneCall, Radio, Users, Volume2, VolumeX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useVoiceSession } from "@/hooks/voice/useVoiceSession.jsx";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";

import { ActionBtn, Panel, T } from "@/components/ui/TerminalCard";

const sanitizeRoomToken = (value, fallback = "channel") => {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
};

const buildMissionRoomName = (missionId) => `mission-${sanitizeRoomToken(missionId, "unknown")}`;
const buildClanRoomName = (clanId = "primary") => `clan-${sanitizeRoomToken(clanId, "primary")}`;
const buildOpsRoomName = () => "operations-oncall";
const parseVoiceRoomName = (roomName) => {
  const normalized = sanitizeRoomToken(roomName, "");
  if (!normalized) {
    return { kind: "unknown", roomName: "", isWhisper: false, baseRoomName: null };
  }

  const whisperIndex = normalized.indexOf("-whisper-");
  const baseRoomName = whisperIndex >= 0 ? normalized.slice(0, whisperIndex) : normalized;
  const whisperTarget = whisperIndex >= 0 ? normalized.slice(whisperIndex + "-whisper-".length) : null;
  const isWhisper = whisperIndex >= 0;

  if (baseRoomName.startsWith("mission-")) {
    return {
      kind: "mission",
      roomName: normalized,
      isWhisper,
      baseRoomName,
      missionId: baseRoomName.slice("mission-".length),
      whisperTarget,
    };
  }

  if (baseRoomName.startsWith("clan-")) {
    return {
      kind: "clan",
      roomName: normalized,
      isWhisper,
      baseRoomName,
      clanId: baseRoomName.slice("clan-".length),
      whisperTarget,
    };
  }

  if (baseRoomName.startsWith("operations") || baseRoomName.startsWith("ops-") || baseRoomName.startsWith("system")) {
    return {
      kind: "operations",
      roomName: normalized,
      isWhisper,
      baseRoomName,
      whisperTarget,
    };
  }

  return {
    kind: "general",
    roomName: normalized,
    isWhisper,
    baseRoomName,
    whisperTarget,
  };
};


const RoomConnectDialog = ({ open, roomLabel, displayName, onDisplayNameChange, onConfirm, onCancel, loading }) => {
  if (!open) return null;
  return (
    <div className="border p-3 space-y-2" style={{ borderColor: `${T.cyan}66`, background: "rgba(17,18,24,0.92)" }}>
      <div style={{ color: T.cyan, fontFamily: "'Orbitron', monospace", fontSize: "9px", letterSpacing: "0.12em" }}>
        ROOM CONNECT DIALOG
      </div>
      <div style={{ color: T.textDim, fontSize: "10px" }}>JOIN {roomLabel}</div>
      <input
        className="w-full border px-2 py-1.5 text-xs"
        style={{ borderColor: T.border, background: T.bg3, color: T.text }}
        value={displayName}
        onChange={(event) => onDisplayNameChange(event.target.value)}
        placeholder="Display name"
      />
      <div className="flex items-center justify-end gap-1.5">
        <ActionBtn small color={T.textDim} onClick={onCancel} disabled={loading}>
          CANCEL
        </ActionBtn>
        <ActionBtn small color={T.cyan} onClick={onConfirm} disabled={loading}>
          {loading ? "CONNECTING..." : "CONNECT"}
        </ActionBtn>
      </div>
    </div>
  );
};

const uniqueBy = (items, key) => {
  const map = new Map();
  for (const item of items) {
    map.set(item[key], item);
  }
  return [...map.values()];
};

export default function VoiceChannelPanel({
  title = "VOICE CHANNELS",
  titleColor = T.cyan,
  includeMissionRooms = true,
  includeClanRoom = true,
  includeOpsRoom = true,
  roomSeed = [],
  compact = false,
  onClanCallBroadcast,
}) {
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [connectingRoom, setConnectingRoom] = useState(null);
  const [roomPrompt, setRoomPrompt] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const {
    voiceSessionState,
    connectToRoom,
    disconnectRoom,
    setActiveRoomName,
    setMicrophoneEnabled,
  } = useVoiceSession();

  const {
    activeTxNetId,
    connectedNetIds,
    connectionHealth,
  } = voiceSessionState;

  const isConfigured = true; // TODO: get from voiceSessionState
  const lastError = connectionHealth === 'error'; // TODO: get from voiceSessionState

  const { data: user = null } = useQuery({
    queryKey: ["voice", "auth", "me"],
    queryFn: () => base44.auth.me(),
    staleTime: 60_000,
    retry: 1,
  });

  const { data: missions = [] } = useRealtimeEntityList({
    queryKey: ["voice", "missions"],
    entityName: "Mission",
    enabled: includeMissionRooms,
    queryFn: () => base44.entities.Mission.list("-created_date", 50).catch(() => []),
    refetchInterval: 20_000,
    patchStrategy: "patch",
  });

  const { data: clanMembers = [] } = useRealtimeEntityList({
    queryKey: ["voice", "clan-members"],
    entityName: "ClanMember",
    enabled: includeClanRoom,
    queryFn: () => base44.entities.ClanMember.list("-created_date", 100).catch(() => []),
    refetchInterval: 30_000,
    patchStrategy: "patch",
  });

  const clanMembership = useMemo(
    () => clanMembers.find((entry) => entry.user_email && user?.email && entry.user_email === user.email) || null,
    [clanMembers, user?.email],
  );
  const clanId = sanitizeRoomToken(clanMembership?.clan_id || "primary");

  const derivedRooms = useMemo(() => {
    const rooms = [];
    if (includeOpsRoom) {
      rooms.push({
        roomName: buildOpsRoomName(),
        label: "Operations On-Call",
        kind: "operations",
        source: "system",
      });
    }
    if (includeClanRoom) {
      rooms.push({
        roomName: buildClanRoomName(clanId),
        label: "Clan Command Net",
        kind: "clan",
        source: "roster",
      });
    }
    if (includeMissionRooms) {
      missions.slice(0, 15).forEach((mission) => {
        const status = String(mission.status || "").toLowerCase();
        const active = ["active", "pending", "in_progress"].includes(status);
        if (!active) return;
        const roomName = mission.voice_room_name || buildMissionRoomName(mission.id);
        rooms.push({
          roomName,
          label: `Mission: ${mission.title || mission.id}`,
          kind: "mission",
          source: "mission",
          missionId: mission.id,
        });
      });
    }
    return uniqueBy([...rooms, ...roomSeed], "roomName");
  }, [clanId, includeClanRoom, includeMissionRooms, includeOpsRoom, missions, roomSeed]);

  const openConnectDialog = (roomName) => {
    const currentName = clanMembership?.callsign || user?.full_name || user?.email || "";
    setDisplayName(currentName);
    setRoomPrompt(roomName);
  };

  const handleConnect = async () => {
    if (!roomPrompt) return;
    setConnectingRoom(roomPrompt);
    try {
      await connectToRoom({
        roomName: roomPrompt,
        userId: user?.id || user?.email || undefined,
        displayName: displayName || undefined,
      });
      setRoomPrompt(null);
    } finally {
      setConnectingRoom(null);
    }
  };

  const handleStartClanCall = async () => {
    const roomName = buildClanRoomName(clanId);
    if (typeof onClanCallBroadcast === "function") {
      await onClanCallBroadcast(roomName);
      return;
    }
    const message = `Clan voice channel online: ${roomName}`;
    await base44.entities.Announcement.create({
      title: "CLAN VOICE CHANNEL ONLINE",
      body: message,
      type: "Ops",
      pinned: true,
      posted_by: user?.full_name || user?.email || "System",
    }).catch(() => null);
  };

  const voiceStatus = voiceSessionState.connectionHealth === "connected" ? "ONLINE" : "STANDBY";

  return (
    <Panel
      title={title}
      titleColor={titleColor}
      headerRight={(
        <div className="flex items-center gap-1">
          <span style={{ color: voiceSessionState.connectionHealth === "connected" ? T.green : T.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>
            {voiceStatus}
          </span>
          {includeClanRoom && user?.role === "admin" && (
            <ActionBtn small color={T.green} onClick={handleStartClanCall}>
              <PhoneCall size={9} /> CLAN CALL
            </ActionBtn>
          )}
        </div>
      )}
    >
      <div className="p-3 space-y-3">
        {!isConfigured && (
          <div className="border px-3 py-2 text-xs" style={{ borderColor: `${T.red}66`, color: T.red }}>
            LIVEKIT NOT CONFIGURED. SET VITE_LIVEKIT_URL AND LIVEKIT FUNCTION ENV KEYS.
          </div>
        )}
        {lastError && (
          <div className="border px-3 py-2 text-xs" style={{ borderColor: `${T.red}66`, color: T.red }}>
            {lastError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          {derivedRooms.map((room) => {
            const connected = connectedNetIds.includes(room.roomName);
            const selected = activeTxNetId === room.roomName;
            const roomMeta = parseVoiceRoomName(room.roomName);
            return (
              <div
                key={room.roomName}
                className="border px-2.5 py-2"
                style={{
                  borderColor: selected ? `${T.cyan}66` : T.border,
                  background: selected ? `${T.cyan}0f` : "rgba(24,24,28,0.8)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {roomMeta.kind === "mission" && <Radio size={10} style={{ color: T.amber }} />}
                      {roomMeta.kind === "clan" && <Users size={10} style={{ color: T.green }} />}
                      {roomMeta.kind === "operations" && <Headphones size={10} style={{ color: T.cyan }} />}
                      <span style={{ color: T.text, fontSize: "10px" }}>{room.label}</span>
                    </div>
                    <div style={{ color: T.textFaint, fontSize: "8px" }}>{room.roomName}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {connected ? (
                      <>
                        <ActionBtn small color={selected ? T.cyan : T.textDim} onClick={() => setActiveRoomName(room.roomName)}>
                          FOCUS
                        </ActionBtn>
                        <ActionBtn small color={T.red} onClick={() => disconnectRoom(room.roomName)}>
                          LEAVE
                        </ActionBtn>
                      </>
                    ) : (
                      <ActionBtn small color={T.cyan} onClick={() => openConnectDialog(room.roomName)}>
                        JOIN
                      </ActionBtn>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <RoomConnectDialog
          open={Boolean(roomPrompt)}
          roomLabel={roomPrompt || ""}
          displayName={displayName}
          onDisplayNameChange={setDisplayName}
          onConfirm={handleConnect}
          onCancel={() => setRoomPrompt(null)}
          loading={Boolean(connectingRoom)}
        />
      </div>
    </Panel>
  );
}
