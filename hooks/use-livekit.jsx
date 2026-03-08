import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Room, RoomEvent } from "livekit-client";
import { base44 } from "@/api/base44Client";
import { invokeFunction } from "@/api/function-invoke";
import { appParams } from "@/lib/app-params";
import { buildWhisperRoomName, sanitizeRoomToken } from "@/lib/livekit-room-utils";
import { createVoiceSessionRegistry } from "@/lib/livekit-session-registry";

const LiveKitContext = createContext(null);

const roomStateLabel = (state) => String(state || "disconnected").toLowerCase();

const toSessionSnapshot = (session) => {
  const remoteParticipants = Array.from(session.room.remoteParticipants.values());
  const localParticipant = session.room.localParticipant ? [session.room.localParticipant] : [];
  const participants = [...localParticipant, ...remoteParticipants].map((participant) => ({
    identity: participant.identity,
    name: participant.name || participant.identity,
    isLocal: participant.isLocal,
    isSpeaking: Boolean(participant.isSpeaking),
    audioLevel: typeof participant.audioLevel === "number" ? participant.audioLevel : 0,
    microphoneEnabled: Boolean(participant.isMicrophoneEnabled),
  }));

  return {
    roomName: session.roomName,
    displayName: session.displayName,
    connectionState: roomStateLabel(session.room.state),
    participants,
    activeSpeakers: session.activeSpeakers.map((entry) => entry.identity),
    connectedAt: session.connectedAt,
    error: session.error || null,
  };
};

const useLiveKitController = () => {
  const registryRef = useRef(createVoiceSessionRegistry());
  const [sessions, setSessions] = useState({});
  const [activeRoomName, setActiveRoomName] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [userIdentity, setUserIdentity] = useState(null);

  const livekitUrl = useMemo(
    () => appParams.livekitUrl || import.meta.env.VITE_LIVEKIT_URL || "",
    [],
  );

  useEffect(() => {
    let mounted = true;
    base44.auth.me().then((user) => {
      if (!mounted) return;
      setUserIdentity(user?.id || user?.email || null);
    }).catch(() => {
      if (!mounted) return;
      setUserIdentity(null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const syncSessions = useCallback(() => {
    const next = {};
    for (const [roomName, session] of registryRef.current.entries()) {
      next[roomName] = toSessionSnapshot(session);
    }
    setSessions(next);
  }, []);

  const disconnectRoom = useCallback((roomName) => {
    const key = sanitizeRoomToken(roomName, "");
    if (!key) return;
    const session = registryRef.current.get(key);
    if (!session) return;

    try {
      session.cleanup?.();
    } catch {
      // ignore listener cleanup failures
    }
    try {
      session.room.disconnect();
    } catch {
      // ignore disconnect failures
    }
    registryRef.current.remove(key);
    if (activeRoomName === key) {
      setActiveRoomName(null);
    }
    syncSessions();
  }, [activeRoomName, syncSessions]);

  const disconnectAll = useCallback(() => {
    for (const [roomName, session] of registryRef.current.entries()) {
      try {
        session.cleanup?.();
      } catch {
        // ignore cleanup failures
      }
      try {
        session.room.disconnect();
      } catch {
        // ignore disconnect failures
      }
      registryRef.current.remove(roomName);
    }
    setActiveRoomName(null);
    syncSessions();
  }, [syncSessions]);

  const connectToRoom = useCallback(async ({
    roomName,
    userId,
    displayName,
  }) => {
    const normalizedRoomName = sanitizeRoomToken(roomName);
    const identity = userId || userIdentity || `operator-${Date.now()}`;

    if (!livekitUrl) {
      const error = "LiveKit URL is not configured.";
      setLastError(error);
      throw new Error(error);
    }

    const existing = registryRef.current.get(normalizedRoomName);
    if (existing && roomStateLabel(existing.room.state) !== "disconnected") {
      setActiveRoomName(normalizedRoomName);
      syncSessions();
      return existing;
    }

    if (existing) {
      disconnectRoom(normalizedRoomName);
    }

    setLastError(null);
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    const session = {
      roomName: normalizedRoomName,
      displayName: displayName || identity,
      room,
      activeSpeakers: [],
      connectedAt: null,
      error: null,
      cleanup: null,
    };

    const syncFromEvents = () => {
      syncSessions();
    };

    const onConnectionStateChanged = (state) => {
      if (roomStateLabel(state) === "connected" && !session.connectedAt) {
        session.connectedAt = new Date().toISOString();
      }
      syncFromEvents();
    };
    const onActiveSpeakersChanged = (speakers) => {
      session.activeSpeakers = Array.isArray(speakers) ? speakers : [];
      syncFromEvents();
    };
    const onDisconnected = () => {
      syncFromEvents();
    };
    const onFailed = (error) => {
      session.error = error?.message || "LiveKit connection failed.";
      setLastError(session.error);
      syncFromEvents();
    };

    room.on(RoomEvent.ConnectionStateChanged, onConnectionStateChanged);
    room.on(RoomEvent.ParticipantConnected, syncFromEvents);
    room.on(RoomEvent.ParticipantDisconnected, syncFromEvents);
    room.on(RoomEvent.LocalTrackPublished, syncFromEvents);
    room.on(RoomEvent.LocalTrackUnpublished, syncFromEvents);
    room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.ConnectionQualityChanged, syncFromEvents);

    session.cleanup = () => {
      room.off(RoomEvent.ConnectionStateChanged, onConnectionStateChanged);
      room.off(RoomEvent.ParticipantConnected, syncFromEvents);
      room.off(RoomEvent.ParticipantDisconnected, syncFromEvents);
      room.off(RoomEvent.LocalTrackPublished, syncFromEvents);
      room.off(RoomEvent.LocalTrackUnpublished, syncFromEvents);
      room.off(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.ConnectionQualityChanged, syncFromEvents);
    };

    registryRef.current.set(normalizedRoomName, session);
    syncSessions();

    try {
      const tokenResponse = await invokeFunction("livekitToken", {
        roomName: normalizedRoomName,
        userId: identity,
      });
      const token = tokenResponse?.data?.token;
      const serverUrl = tokenResponse?.data?.url || livekitUrl;
      if (!token) {
        throw new Error("LiveKit token server returned an empty token.");
      }
      await room.connect(serverUrl, token, {
        autoSubscribe: true,
      });
      setActiveRoomName(normalizedRoomName);
      syncSessions();
      return session;
    } catch (error) {
      onFailed(error);
      disconnectRoom(normalizedRoomName);
      throw error;
    }
  }, [disconnectRoom, livekitUrl, syncSessions, userIdentity]);

  const setMicrophoneEnabled = useCallback(async (roomName, enabled) => {
    const key = sanitizeRoomToken(roomName, "");
    const session = key ? registryRef.current.get(key) : null;
    if (!session) return;
    await session.room.localParticipant.setMicrophoneEnabled(Boolean(enabled)).catch(() => {});
    syncSessions();
  }, [syncSessions]);

  const openWhisperRoom = useCallback(async (targetIdentity) => {
    if (!activeRoomName || !targetIdentity) return null;
    const whisperRoomName = buildWhisperRoomName(activeRoomName, targetIdentity);
    return connectToRoom({
      roomName: whisperRoomName,
      userId: userIdentity || undefined,
      displayName: `${targetIdentity} whisper`,
    });
  }, [activeRoomName, connectToRoom, userIdentity]);

  useEffect(() => () => disconnectAll(), [disconnectAll]);

  const activeSession = activeRoomName ? sessions[activeRoomName] || null : null;
  const activeSessionRoom = activeRoomName ? registryRef.current.get(activeRoomName)?.room || null : null;
  const connectedRooms = Object.values(sessions)
    .filter((entry) => entry.connectionState === "connected")
    .map((entry) => entry.roomName);

  return {
    livekitUrl,
    isConfigured: Boolean(livekitUrl),
    sessions,
    activeSession,
    activeSessionRoom,
    activeRoomName,
    connectedRooms,
    userIdentity,
    lastError,
    connectToRoom,
    disconnectRoom,
    disconnectAll,
    setActiveRoomName,
    setMicrophoneEnabled,
    openWhisperRoom,
  };
};

export const LiveKitProvider = ({ children }) => {
  const value = useLiveKitController();
  return <LiveKitContext.Provider value={value}>{children}</LiveKitContext.Provider>;
};

export const useLiveKit = () => {
  const ctx = useContext(LiveKitContext);
  if (!ctx) {
    throw new Error("useLiveKit must be used within LiveKitProvider.");
  }
  return ctx;
};
