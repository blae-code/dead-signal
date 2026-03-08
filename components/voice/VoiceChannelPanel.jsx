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
import { useLiveKit } from "@/hooks/use-livekit";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import {
  buildClanRoomName,
  buildMissionRoomName,
  buildOpsRoomName,
  parseVoiceRoomName,
  sanitizeRoomToken,
} from "@/lib/livekit-room-utils";
import { ActionBtn, Panel, T } from "@/components/ui/TerminalCard";

const ActiveSpeakerMeta = ({ onWhisper }) => {
  const speaking = useIsSpeaking();
  const info = useParticipantInfo();
  const identity = info?.identity || "unknown";
  const displayName = info?.name || identity;

  return (
    <div
      className="border p-2"
      style={{
        borderColor: speaking ? `${T.green}66` : T.border,
        background: speaking ? `${T.green}0d` : "rgba(24,24,28,0.8)",
      }}
    >
      <ParticipantTile />
      <div className="mt-1 flex items-center justify-between gap-2">
        <span style={{ color: speaking ? T.green : T.textDim, fontSize: "9px", letterSpacing: "0.08em" }}>
          {displayName}
        </span>
        {!info?.isLocal && (
          <button
            type="button"
            onClick={() => onWhisper(identity)}
            className="border px-1.5 py-0.5"
            style={{ borderColor: `${T.cyan}55`, color: T.cyan, fontSize: "8px" }}
            title="Open whisper channel"
          >
            WHISPER
          </button>
        )}
      </div>
    </div>
  );
};

const ParticipantTiles = ({ onWhisper }) => {
  const participants = useParticipants();
  if (!participants.length) {
    return (
      <div className="border px-3 py-3 text-xs" style={{ borderColor: T.border, color: T.textFaint }}>
        NO ACTIVE PARTICIPANTS
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <ParticipantLoop participants={participants}>
        <ActiveSpeakerMeta onWhisper={onWhisper} />
      </ParticipantLoop>
    </div>
  );
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
    isConfigured,
    sessions,
    activeSession,
    activeSessionRoom,
    activeRoomName,
    connectedRooms,
    userIdentity,
    lastError,
    connectToRoom,
    disconnectRoom,
    setActiveRoomName,
    openWhisperRoom,
    setMicrophoneEnabled,
  } = useLiveKit();

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
    const currentName = clanMembership?.callsign || user?.full_name || user?.email || userIdentity || "";
    setDisplayName(currentName);
    setRoomPrompt(roomName);
  };

  const handleConnect = async () => {
    if (!roomPrompt) return;
    setConnectingRoom(roomPrompt);
    try {
      await connectToRoom({
        roomName: roomPrompt,
        userId: userIdentity || user?.email || undefined,
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

  const voiceStatus = activeSession?.connectionState === "connected" ? "ONLINE" : "STANDBY";

  return (
    <Panel
      title={title}
      titleColor={titleColor}
      headerRight={(
        <div className="flex items-center gap-1">
          <span style={{ color: activeSession?.connectionState === "connected" ? T.green : T.textFaint, fontSize: "8px", letterSpacing: "0.1em" }}>
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
            const connected = connectedRooms.includes(room.roomName);
            const selected = activeRoomName === room.roomName;
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

        {activeSessionRoom && activeSession && (
          <RoomContext.Provider value={activeSessionRoom}>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="border px-2 py-1 text-[9px] flex items-center gap-1"
                  style={{ borderColor: `${T.border}aa`, color: muted ? T.red : T.cyan }}
                  onClick={() => setMuted((value) => !value)}
                >
                  {muted ? <VolumeX size={10} /> : <Volume2 size={10} />}
                  {muted ? "AUDIO MUTED" : "AUDIO LIVE"}
                </button>
                <label className="flex items-center gap-1 border px-2 py-1" style={{ borderColor: T.border, color: T.textDim, fontSize: "9px" }}>
                  VOL
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(event) => setVolume(Number(event.target.value))}
                  />
                </label>
                <button
                  type="button"
                  className="border px-2 py-1 text-[9px] flex items-center gap-1"
                  style={{ borderColor: `${T.border}aa`, color: T.green }}
                  onClick={() => setMicrophoneEnabled(activeSession.roomName, true)}
                >
                  <Mic size={10} /> MIC ON
                </button>
                <button
                  type="button"
                  className="border px-2 py-1 text-[9px] flex items-center gap-1"
                  style={{ borderColor: `${T.border}aa`, color: T.amber }}
                  onClick={() => setMicrophoneEnabled(activeSession.roomName, false)}
                >
                  <MicOff size={10} /> MIC OFF
                </button>
              </div>

              <RoomAudioRenderer volume={volume} muted={muted} />
              {!compact && (
                <ParticipantTiles
                  onWhisper={(targetIdentity) => openWhisperRoom(targetIdentity)}
                />
              )}
              <div className="border p-2" style={{ borderColor: T.border }}>
                <ControlBar
                  controls={{
                    microphone: true,
                    camera: false,
                    chat: false,
                    screenShare: false,
                    leave: false,
                    settings: true,
                  }}
                />
              </div>
            </div>
          </RoomContext.Provider>
        )}
      </div>
    </Panel>
  );
}
