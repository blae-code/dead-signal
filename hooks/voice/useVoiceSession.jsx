/**
 * DEAD SIGNAL — useVoiceSession
 * Core voice session context. Manages multi-net LiveKit connections, radio rack state,
 * PTT mode, emergency state, traffic log, and whisper sessions.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RoomEvent, ConnectionQuality } from 'livekit-client';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import {
  initialVoiceSessionState,
  EMPTY_EMERGENCY_STATE,
  EMPTY_RADIO_SLOT,
} from '@/lib/voice/models';
import { voiceNetResolver } from '@/lib/voice/voiceNetResolver';
import { voiceTransportAdapter } from '@/lib/voice/voiceTransportAdapter';
import { MEMORY_CHANNELS } from '@/lib/voice/memory-channels';

// ─── Context ───────────────────────────────────────────────────────────────────

const VoiceSessionContext = createContext(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_LOG_ENTRIES = 100;

/** Map LiveKit ConnectionQuality to our 0-1 signalStrength + RST report */
const qualityToSignal = (quality) => {
  switch (quality) {
    case ConnectionQuality.Excellent: return { strength: 0.95, report: '5x9' };
    case ConnectionQuality.Good:      return { strength: 0.65, report: '5x7' };
    case ConnectionQuality.Poor:      return { strength: 0.3,  report: '3x5' };
    case ConnectionQuality.Lost:      return { strength: 0.05, report: '1x1' };
    default:                          return { strength: 0.5,  report: '5x5' };
  }
};

/** Derive a human-readable connectionHealth from LiveKit room state string */
const roomStateToHealth = (state) => {
  const s = String(state || '').toLowerCase();
  if (s === 'connected')     return 'excellent';
  if (s === 'reconnecting')  return 'reconnecting';
  if (s === 'disconnected')  return 'disconnected';
  return 'poor';
};

/** Convert a LiveKit Participant to our ParticipantVoiceState shape */
const toParticipantState = (participant, netId) => {
  const { strength, report } = qualityToSignal(participant.connectionQuality);
  let meta = {};
  try { meta = JSON.parse(participant.metadata || '{}'); } catch { /**/ }

  return {
    userId: participant.identity,
    callsign: meta.callsign || participant.name || participant.identity,
    displayName: participant.name || participant.identity,
    operatorRole: meta.role || 'field_operator',
    currentNetIds: [netId],
    speakingOnNetId: participant.isSpeaking ? netId : null,
    transmittingOnNetId: participant.isSpeaking ? netId : null,
    isSpeaking: Boolean(participant.isSpeaking),
    isTransmitting: Boolean(participant.isSpeaking),
    isMuted: Boolean(participant.isMicrophoneMuted),
    signalStrength: strength,
    signalReport: report,
    connectionQuality: participant.connectionQuality === ConnectionQuality.Excellent ? 'excellent'
      : participant.connectionQuality === ConnectionQuality.Good ? 'good'
      : participant.connectionQuality === ConnectionQuality.Poor ? 'poor' : 'lost',
    mapPosition: meta.mapPosition ?? null,
    spatialEnabled: false,
    currentRigId: null,
    whisperTargetId: null,
    permissions: {},
  };
};

/** Build an initial radio rack (4 slots) */
const buildInitialRadios = () => [
  {
    ...EMPTY_RADIO_SLOT,
    radioId: 'RADIO_1',
    label: 'Primary Rig',
    tunedNetId: 'net-command',
    tunedFrequencyLabel: '146.520 MHz',
    mode: 'monitor',
    isSelectedTxRadio: true,
    txEnabled: true,
    radioProfile: 'encrypted',
  },
  {
    ...EMPTY_RADIO_SLOT,
    radioId: 'RADIO_2',
    label: 'Secondary Rig',
    tunedNetId: 'net-squad-alpha',
    tunedFrequencyLabel: '462.5625 MHz',
    mode: 'monitor',
    isSelectedTxRadio: false,
    txEnabled: true,
    radioProfile: 'analog',
  },
  {
    ...EMPTY_RADIO_SLOT,
    radioId: 'RADIO_3',
    label: 'Utility Rig',
    tunedNetId: null,
    tunedFrequencyLabel: '---.---',
    mode: 'off',
    isSelectedTxRadio: false,
    txEnabled: false,
    radioProfile: 'clean',
  },
  {
    ...EMPTY_RADIO_SLOT,
    radioId: 'RADIO_4',
    label: 'Proximity Rcvr',
    tunedNetId: null,
    tunedFrequencyLabel: 'LOCAL',
    mode: 'off',
    isSelectedTxRadio: false,
    txEnabled: false,
    radioProfile: 'natural',
  },
];

// ─── Controller ───────────────────────────────────────────────────────────────

const useVoiceSessionController = () => {
  // Registry of netId → { room, activeSpeakers, connectedAt, error, cleanup }
  const registryRef = useRef(new Map());

  // Snapshot of all session data — synced from registryRef on every LiveKit event
  const [sessions, setSessions] = useState({});

  // Radio rack state
  const [radioDevices, setRadioDevices] = useState(buildInitialRadios);

  // Currently selected TX radio id
  const [activeTxRadioId, setActiveTxRadioId] = useState('RADIO_1');

  // Emergency and bridge state
  const [emergencyState, setEmergencyState] = useState(EMPTY_EMERGENCY_STATE);
  const [bridgeStates, setBridgeStates] = useState([]);

  // Whisper session state
  const [whisperSession, setWhisperSession] = useState(null);

  // PTT / mode toggles
  const [pttMode, setPttMode] = useState('hold');
  const [simpleModeEnabled, setSimpleMode] = useState(true);
  const [advancedRadioModeEnabled, setAdvancedMode] = useState(false);

  // Traffic log
  const [voiceEvents, setVoiceEvents] = useState([]);

  // Local identity (fetched from auth once)
  const [userIdentity, setUserIdentity] = useState(null);
  const [userCallsign, setUserCallsign] = useState(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);

  // LiveKit server URL
  const livekitUrl = useMemo(
    () => appParams?.livekitUrl || import.meta.env.VITE_LIVEKIT_URL || '',
    [],
  );

  // ── Auth identity ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    base44.auth.me().then((user) => {
      if (!mounted) return;
      setUserIdentity(user?.id || user?.email || null);
      setUserCallsign(user?.callsign || user?.name || user?.email?.split('@')[0] || 'OPERATOR');
    }).catch(() => { /* silently ignore — auth may not be ready */ });
    return () => { mounted = false; };
  }, []);

  // ── Traffic log helper ──────────────────────────────────────────────────────
  const addVoiceEvent = useCallback((entry) => {
    setVoiceEvents(prev => {
      const next = [{ timestamp: Date.now(), metadata: {}, ...entry }, ...prev];
      return next.slice(0, MAX_LOG_ENTRIES);
    });
  }, []);

  // ── Sync sessions from registry ─────────────────────────────────────────────
  const syncSessions = useCallback(() => {
    const next = {};
    for (const [netId, session] of registryRef.current.entries()) {
      const remote = Array.from(session.room.remoteParticipants?.values?.() ?? []);
      const local = session.room.localParticipant ? [session.room.localParticipant] : [];
      const participants = [...local, ...remote].map(p => toParticipantState(p, netId));
      next[netId] = {
        netId,
        connectionState: String(session.room.state || 'disconnected').toLowerCase(),
        participants,
        activeSpeakers: (session.activeSpeakers ?? []).map(p => p.identity),
        connectedAt: session.connectedAt,
        error: session.error ?? null,
      };
    }
    setSessions(next);
  }, []);

  // ── Disconnect a single net ─────────────────────────────────────────────────
  const disconnectNet = useCallback((netId) => {
    const session = registryRef.current.get(netId);
    if (!session) return;
    try { session.cleanup?.(); } catch { /**/ }
    try { voiceTransportAdapter.disconnect(netId); } catch { /**/ }
    registryRef.current.delete(netId);
    syncSessions();
    addVoiceEvent({ type: 'system', direction: 'local', actorCallsign: userCallsign, netId, outcome: 'stop', metadata: { message: `Left ${netId}` } });
  }, [syncSessions, addVoiceEvent, userCallsign]);

  // ── Disconnect all nets ─────────────────────────────────────────────────────
  const disconnectAll = useCallback(() => {
    for (const netId of [...registryRef.current.keys()]) {
      disconnectNet(netId);
    }
  }, [disconnectNet]);

  // ── Connect to a net ────────────────────────────────────────────────────────
  const connectToNet = useCallback(async (netId) => {
    if (!netId) return;

    const existing = registryRef.current.get(netId);
    const existingState = String(existing?.room?.state || '').toLowerCase();
    if (existing && existingState !== 'disconnected' && existingState !== '') {
      return; // already connected or connecting
    }

    if (!livekitUrl) {
      console.warn('useVoiceSession: VITE_LIVEKIT_URL is not configured.');
    }

    const identity = userIdentity || `operator-${Date.now()}`;

    const room = await voiceTransportAdapter.connect(netId, identity).catch((err) => {
      console.error(`connectToNet(${netId}):`, err);
      return null;
    });
    if (!room) return;

    const session = {
      room,
      activeSpeakers: [],
      connectedAt: null,
      error: null,
      cleanup: null,
    };

    const sync = () => syncSessions();

    const onConnectionStateChanged = (state) => {
      if (String(state).toLowerCase() === 'connected' && !session.connectedAt) {
        session.connectedAt = new Date().toISOString();
      }
      sync();
    };
    const onActiveSpeakersChanged = (speakers) => {
      session.activeSpeakers = Array.isArray(speakers) ? speakers : [];
      sync();
    };
    const onDisconnected = () => {
      sync();
      addVoiceEvent({ type: 'system', direction: 'local', actorCallsign: userCallsign, netId, outcome: 'stop', metadata: { message: `Disconnected from ${netId}` } });
    };

    room.on(RoomEvent.ConnectionStateChanged, onConnectionStateChanged);
    room.on(RoomEvent.ParticipantConnected, sync);
    room.on(RoomEvent.ParticipantDisconnected, sync);
    room.on(RoomEvent.LocalTrackPublished, sync);
    room.on(RoomEvent.LocalTrackUnpublished, sync);
    room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.ConnectionQualityChanged, sync);

    session.cleanup = () => {
      room.off(RoomEvent.ConnectionStateChanged, onConnectionStateChanged);
      room.off(RoomEvent.ParticipantConnected, sync);
      room.off(RoomEvent.ParticipantDisconnected, sync);
      room.off(RoomEvent.LocalTrackPublished, sync);
      room.off(RoomEvent.LocalTrackUnpublished, sync);
      room.off(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.ConnectionQualityChanged, sync);
    };

    registryRef.current.set(netId, session);
    syncSessions();

    addVoiceEvent({ type: 'system', direction: 'local', actorCallsign: userCallsign, netId, outcome: 'start', metadata: { message: `Joined ${netId}` } });
  }, [livekitUrl, userIdentity, userCallsign, syncSessions, addVoiceEvent]);

  // ── Radio rack operations ───────────────────────────────────────────────────

  const setActiveTxRadio = useCallback((radioId) => {
    setActiveTxRadioId(radioId);
    setRadioDevices(prev => prev.map(r => ({
      ...r,
      isSelectedTxRadio: r.radioId === radioId,
      mode: r.radioId === radioId ? 'transmit' : (r.mode === 'transmit' ? 'monitor' : r.mode),
    })));
  }, []);

  const tuneRadio = useCallback((radioId, netId) => {
    const net = voiceNetResolver.getNetById(netId);
    setRadioDevices(prev => prev.map(r => {
      if (r.radioId !== radioId) return r;
      return {
        ...r,
        tunedNetId: netId,
        tunedFrequencyLabel: net?.frequencyLabel ?? '---.---',
        label: net?.displayName ?? r.label,
        radioProfile: net?.radioProfile ?? r.radioProfile,
        mode: r.mode === 'off' ? 'monitor' : r.mode,
      };
    }));
    if (net) {
      connectToNet(netId);
      addVoiceEvent({ type: 'system', direction: 'local', actorCallsign: userCallsign, netId, outcome: 'success', metadata: { message: `Tuned to ${net.displayName}` } });
    }
  }, [connectToNet, addVoiceEvent, userCallsign]);

  const setVolume = useCallback((radioId, level) => {
    setRadioDevices(prev => prev.map(r => r.radioId === radioId ? { ...r, volume: level } : r));
    const radio = radioDevices.find(r => r.radioId === radioId);
    if (radio?.tunedNetId) voiceTransportAdapter.setVolume(radio.tunedNetId, level);
  }, [radioDevices]);

  const setSquelch = useCallback((radioId, level) => {
    setRadioDevices(prev => prev.map(r => r.radioId === radioId ? { ...r, squelchLevel: level } : r));
  }, []);

  const toggleMute = useCallback((radioId) => {
    setRadioDevices(prev => prev.map(r => {
      if (r.radioId !== radioId) return r;
      const next = !r.muted;
      if (r.tunedNetId) voiceTransportAdapter.setVolume(r.tunedNetId, next ? 0 : r.volume);
      return { ...r, muted: next };
    }));
  }, []);

  const toggleScan = useCallback((radioId) => {
    setRadioDevices(prev => prev.map(r => {
      if (r.radioId !== radioId) return r;
      const next = !r.scanEnabled;
      if (next) {
        const targets = voiceNetResolver.getScanTargets().map(n => n.id);
        return { ...r, scanEnabled: true, scanTargets: targets };
      }
      return { ...r, scanEnabled: false };
    }));
  }, []);

  // ── Mic / PTT ──────────────────────────────────────────────────────────────

  const setMicEnabled = useCallback(async (enabled) => {
    const txRadio = radioDevices.find(r => r.isSelectedTxRadio);
    if (!txRadio?.tunedNetId) return;
    await voiceTransportAdapter.setMicEnabled(txRadio.tunedNetId, enabled);
    setIsTransmitting(enabled);
    setIsMicMuted(!enabled);
    addVoiceEvent({
      type: enabled ? 'tx' : 'system',
      direction: enabled ? 'out' : 'local',
      actorCallsign: userCallsign,
      netId: txRadio.tunedNetId,
      outcome: enabled ? 'start' : 'stop',
      metadata: {},
    });
  }, [radioDevices, userCallsign, addVoiceEvent]);

  // ── Whisper / Direct Contact ────────────────────────────────────────────────

  const openWhisper = useCallback(async (targetUserId, targetCallsign) => {
    const myId = userIdentity || 'local';
    const roomName = `direct-${[myId, targetUserId].sort().join('-')}`;
    await connectToNet(roomName);
    setWhisperSession({ targetUserId, targetCallsign: targetCallsign || targetUserId, initiatorId: myId, whisperRoomName: roomName, active: true });
    addVoiceEvent({ type: 'direct', direction: 'out', actorCallsign: userCallsign, netId: roomName, targetId: targetUserId, outcome: 'start', metadata: { targetCallsign } });
  }, [connectToNet, userIdentity, userCallsign, addVoiceEvent]);

  const closeWhisper = useCallback(() => {
    if (whisperSession?.whisperRoomName) {
      disconnectNet(whisperSession.whisperRoomName);
    }
    addVoiceEvent({ type: 'direct', direction: 'local', actorCallsign: userCallsign, netId: whisperSession?.whisperRoomName, outcome: 'stop', metadata: {} });
    setWhisperSession(null);
  }, [whisperSession, disconnectNet, userCallsign, addVoiceEvent]);

  // ── Emergency traffic ──────────────────────────────────────────────────────

  const openEmergency = useCallback((netId = 'net-emergency') => {
    setEmergencyState({ active: true, openedBy: userCallsign, netId, openedAt: Date.now() });
    addVoiceEvent({ type: 'emergency', direction: 'out', actorCallsign: userCallsign, netId, outcome: 'start', metadata: {} });
  }, [userCallsign, addVoiceEvent]);

  const closeEmergency = useCallback(() => {
    addVoiceEvent({ type: 'emergency', direction: 'local', actorCallsign: userCallsign, netId: emergencyState.netId, outcome: 'stop', metadata: {} });
    setEmergencyState(EMPTY_EMERGENCY_STATE);
  }, [userCallsign, emergencyState.netId, addVoiceEvent]);

  // ── Bridge ─────────────────────────────────────────────────────────────────

  const openBridge = useCallback(async (netId1, netId2) => {
    await connectToNet(netId1);
    await connectToNet(netId2);
    const net1 = voiceNetResolver.getNetById(netId1);
    const net2 = voiceNetResolver.getNetById(netId2);
    const label = `${net1?.slug?.toUpperCase() ?? netId1}↔${net2?.slug?.toUpperCase() ?? netId2}`;
    setBridgeStates(prev => [...prev.filter(b => !(b.netId1 === netId1 && b.netId2 === netId2)), { netId1, netId2, active: true, label }]);
    addVoiceEvent({ type: 'bridge', direction: 'local', actorCallsign: userCallsign, netId: netId1, targetId: netId2, outcome: 'start', metadata: { label } });
  }, [connectToNet, userCallsign, addVoiceEvent]);

  const closeBridge = useCallback((netId1, netId2) => {
    setBridgeStates(prev => prev.filter(b => !(b.netId1 === netId1 && b.netId2 === netId2)));
    addVoiceEvent({ type: 'bridge', direction: 'local', actorCallsign: userCallsign, netId: netId1, targetId: netId2, outcome: 'stop', metadata: {} });
  }, [userCallsign, addVoiceEvent]);

  // ── Legacy connectToRoom compat (used by VoiceChannelPanel) ─────────────────
  const connectToRoom = useCallback(async ({ roomName, userId: _uid, displayName: _dn }) => {
    return connectToNet(roomName);
  }, [connectToNet]);

  const disconnectRoom = useCallback((roomName) => disconnectNet(roomName), [disconnectNet]);

  const setActiveRoomName = useCallback((netId) => {
    const radio = radioDevices.find(r => r.tunedNetId === netId && r.isSelectedTxRadio);
    if (!radio) {
      // Auto-tune RADIO_1 to this net
      tuneRadio('RADIO_1', netId);
      setActiveTxRadio('RADIO_1');
    }
  }, [radioDevices, tuneRadio, setActiveTxRadio]);

  const setMicrophoneEnabled = useCallback(async (_roomName, enabled) => {
    return setMicEnabled(enabled);
  }, [setMicEnabled]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => () => disconnectAll(), [disconnectAll]);

  // ── Derived session state ──────────────────────────────────────────────────
  const txRadio = radioDevices.find(r => r.isSelectedTxRadio) ?? radioDevices[0];
  const activeTxNetId = txRadio?.tunedNetId ?? null;

  const connectedNetIds = useMemo(() => Object.keys(sessions).filter(id => sessions[id].connectionState === 'connected'), [sessions]);
  const monitoredNetIds = useMemo(() => radioDevices.filter(r => r.mode !== 'off' && r.tunedNetId).map(r => r.tunedNetId), [radioDevices]);

  const allParticipants = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const session of Object.values(sessions)) {
      for (const p of session.participants) {
        if (!seen.has(p.userId)) { seen.add(p.userId); out.push(p); }
      }
    }
    return out;
  }, [sessions]);

  const activeSpeakers = useMemo(() => allParticipants.filter(p => p.isSpeaking), [allParticipants]);

  const connectionHealth = useMemo(() => {
    const states = Object.values(sessions).map(s => s.connectionState);
    if (states.includes('reconnecting')) return 'reconnecting';
    if (states.includes('connected')) return 'excellent';
    if (states.length === 0) return 'disconnected';
    return 'poor';
  }, [sessions]);

  const isScanActive = useMemo(() => radioDevices.some(r => r.scanEnabled), [radioDevices]);

  const voiceSessionState = useMemo(() => ({
    ...initialVoiceSessionState,
    activeTxNetId,
    activeTxRadioId,
    monitoredNetIds,
    connectedNetIds,
    participants: allParticipants,
    whisperSession,
    emergencyState,
    bridgeStates,
    connectionHealth,
    pttMode,
    recentVoiceEvents: voiceEvents,
    simpleModeEnabled,
    advancedRadioModeEnabled,
    isTransmitting,
    isMicMuted,
    isScanActive,
    scanPausedOnNetId: null,
  }), [
    activeTxNetId, activeTxRadioId, monitoredNetIds, connectedNetIds,
    allParticipants, whisperSession, emergencyState, bridgeStates,
    connectionHealth, pttMode, voiceEvents, simpleModeEnabled,
    advancedRadioModeEnabled, isTransmitting, isMicMuted, isScanActive,
  ]);

  return {
    // State
    voiceSessionState,
    radioDevices,
    activeSpeakers,
    sessions,
    userCallsign,

    // Net / room operations
    connectToNet,
    disconnectNet,
    disconnectAll,

    // Radio rack
    setActiveTxRadio,
    tuneRadio,
    setVolume,
    setSquelch,
    toggleMute,
    toggleScan,

    // PTT / mic
    setMicEnabled,
    setPttMode,

    // Direct contact
    openWhisper,
    closeWhisper,

    // Emergency
    openEmergency,
    closeEmergency,

    // Bridge
    openBridge,
    closeBridge,

    // Mode toggles
    setSimpleMode: (v) => setSimpleMode(v),
    setAdvancedMode: (v) => setAdvancedMode(v),

    // Traffic log
    addVoiceEvent,

    // Legacy compat (VoiceChannelPanel etc.)
    connectToRoom,
    disconnectRoom,
    setActiveRoomName,
    setMicrophoneEnabled,
  };
};

// ─── Provider ──────────────────────────────────────────────────────────────────

export function VoiceSessionProvider({ children }) {
  const value = useVoiceSessionController();
  return (
    <VoiceSessionContext.Provider value={value}>
      {children}
    </VoiceSessionContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceSession() {
  const ctx = useContext(VoiceSessionContext);
  if (!ctx) throw new Error('useVoiceSession must be used within a VoiceSessionProvider');
  return ctx;
}
