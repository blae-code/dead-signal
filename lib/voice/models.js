/**
 * DEAD SIGNAL — Voice Domain Models
 * Canonical single source of truth for all voice system types and runtime initial state.
 * Do NOT import from types.js, schemas.js, or domain.js — those are removed.
 */

// ─── Enumerations ──────────────────────────────────────────────────────────────

/**
 * @typedef {'command' | 'squad' | 'logistics' | 'proximity' | 'direct' | 'emergency'} VoiceNetCategory
 */

/**
 * @typedef {'ptt' | 'open' | 'role-gated'} DisciplineMode
 */

/**
 * @typedef {'clean' | 'analog' | 'vehicle' | 'encrypted' | 'natural'} RadioProfile
 */

/**
 * @typedef {'off' | 'monitor' | 'transmit'} RadioMode
 */

/**
 * @typedef {'hold' | 'toggle'} PttMode
 */

/**
 * @typedef {'rx' | 'tx' | 'system' | 'scan' | 'direct' | 'emergency' | 'bridge'} VoiceEventType
 */

/**
 * @typedef {'in' | 'out' | 'local'} VoiceEventDirection
 */

// ─── Core Domain Types ─────────────────────────────────────────────────────────

/**
 * A logical voice communication net (maps to a LiveKit room).
 * @typedef {object} VoiceNet
 * @property {string} id
 * @property {string} slug
 * @property {string} displayName
 * @property {string} frequencyLabel  e.g. "146.520 MHz"
 * @property {string|null} memorySlot  e.g. "M1"
 * @property {VoiceNetCategory} category
 * @property {'net' | 'spatial' | 'direct'} type
 * @property {number} priority  1=emergency (highest priority), 6=proximity (lowest)
 * @property {DisciplineMode} disciplineMode
 * @property {boolean} allowPTT
 * @property {boolean} allowOpenMic
 * @property {boolean} allowWhisper
 * @property {boolean} spatialEnabled
 * @property {string[]} roleRestrictions  empty = open to all
 * @property {boolean} bridgeable
 * @property {boolean} hidden
 * @property {string|null} associatedMissionId
 * @property {string|null} associatedSquadId
 * @property {string|null} associatedClanId
 * @property {string} livekitRoomName
 * @property {RadioProfile} radioProfile
 * @property {boolean} scanEligible
 * @property {number|null} squelchRecommended  0–1
 * @property {boolean} netControlEnabled
 * @property {boolean} emergencyCapable
 */

/**
 * State of a single radio in the operator's rack.
 * @typedef {object} RadioDeviceState
 * @property {string} radioId  e.g. "RADIO_1"
 * @property {string} label  user-facing label
 * @property {string|null} tunedNetId
 * @property {string} tunedFrequencyLabel
 * @property {RadioMode} mode
 * @property {boolean} isSelectedTxRadio
 * @property {boolean} txEnabled
 * @property {boolean} txLocked
 * @property {number} volume  0–1
 * @property {boolean} muted
 * @property {number} squelchLevel  0–1
 * @property {boolean} scanEnabled
 * @property {string[]} scanTargets  netIds to scan
 * @property {string} memoryBank
 * @property {RadioProfile} radioProfile
 */

/**
 * Voice state of a single session participant.
 * @typedef {object} ParticipantVoiceState
 * @property {string} userId
 * @property {string} callsign
 * @property {string} displayName
 * @property {string} operatorRole
 * @property {string[]} currentNetIds
 * @property {string|null} speakingOnNetId
 * @property {string|null} transmittingOnNetId
 * @property {boolean} isSpeaking
 * @property {boolean} isTransmitting
 * @property {boolean} isMuted
 * @property {number} signalStrength  0–1
 * @property {string} signalReport  e.g. "5x9"
 * @property {'excellent' | 'good' | 'poor' | 'lost'} connectionQuality
 * @property {{x: number, y: number, z?: number}|null} mapPosition
 * @property {boolean} spatialEnabled
 * @property {string|null} currentRigId
 * @property {string|null} whisperTargetId
 * @property {object} permissions
 */

/**
 * Active operator-to-operator direct contact session.
 * @typedef {object} WhisperSession
 * @property {string} targetUserId
 * @property {string} targetCallsign
 * @property {string} initiatorId
 * @property {string} whisperRoomName
 * @property {boolean} active
 */

/**
 * Net bridge state (connecting two nets for cross-monitoring).
 * @typedef {object} BridgeState
 * @property {string} netId1
 * @property {string} netId2
 * @property {boolean} active
 * @property {string} label  e.g. "CMD↔LOG"
 */

/**
 * Emergency traffic state.
 * @typedef {object} EmergencyState
 * @property {boolean} active
 * @property {string|null} openedBy  callsign
 * @property {string|null} netId
 * @property {number|null} openedAt  epoch ms
 */

/**
 * Full voice session state — top-level shape for VoiceSessionContext.
 * @typedef {object} VoiceSessionState
 * @property {string|null} activeTxNetId
 * @property {string|null} activeTxRadioId
 * @property {string[]} monitoredNetIds
 * @property {string[]} connectedNetIds
 * @property {ParticipantVoiceState[]} participants
 * @property {WhisperSession|null} whisperSession
 * @property {EmergencyState} emergencyState
 * @property {BridgeState[]} bridgeStates
 * @property {'excellent' | 'good' | 'poor' | 'reconnecting' | 'disconnected'} connectionHealth
 * @property {string|null} selectedInputDeviceId
 * @property {string|null} selectedOutputDeviceId
 * @property {PttMode} pttMode
 * @property {VoiceEventLogEntry[]} recentVoiceEvents
 * @property {boolean} simpleModeEnabled
 * @property {boolean} advancedRadioModeEnabled
 * @property {boolean} isTransmitting
 * @property {boolean} isMicMuted
 * @property {boolean} isScanActive
 * @property {string|null} scanPausedOnNetId
 */

/**
 * A single entry in the radio traffic log.
 * @typedef {object} VoiceEventLogEntry
 * @property {number} timestamp  epoch ms
 * @property {VoiceEventType} type
 * @property {VoiceEventDirection} direction
 * @property {string|null} actorCallsign
 * @property {string|null} netId
 * @property {string|null} targetId
 * @property {'success' | 'fail' | 'start' | 'stop' | 'pause' | 'resume'} outcome
 * @property {object} metadata
 */

// ─── Runtime Constants ─────────────────────────────────────────────────────────

/** @type {EmergencyState} */
export const EMPTY_EMERGENCY_STATE = {
  active: false,
  openedBy: null,
  netId: null,
  openedAt: null,
};

/** @type {VoiceSessionState} */
export const initialVoiceSessionState = {
  activeTxNetId: null,
  activeTxRadioId: null,
  monitoredNetIds: [],
  connectedNetIds: [],
  participants: [],
  whisperSession: null,
  emergencyState: EMPTY_EMERGENCY_STATE,
  bridgeStates: [],
  connectionHealth: 'disconnected',
  selectedInputDeviceId: null,
  selectedOutputDeviceId: null,
  pttMode: 'hold',
  recentVoiceEvents: [],
  simpleModeEnabled: true,
  advancedRadioModeEnabled: false,
  isTransmitting: false,
  isMicMuted: false,
  isScanActive: false,
  scanPausedOnNetId: null,
};

/** @type {RadioDeviceState} */
export const EMPTY_RADIO_SLOT = {
  radioId: null,
  label: '-- EMPTY --',
  tunedNetId: null,
  tunedFrequencyLabel: '---.---',
  mode: 'off',
  isSelectedTxRadio: false,
  txEnabled: false,
  txLocked: false,
  volume: 0.8,
  muted: false,
  squelchLevel: 0.1,
  scanEnabled: false,
  scanTargets: [],
  memoryBank: 'default',
  radioProfile: 'clean',
};
