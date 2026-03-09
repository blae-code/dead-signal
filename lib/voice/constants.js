export const INITIAL_RADIO_DEVICE_STATE = {
    radioId: 'RADIO_1',
    label: 'Command Net',
    tunedNetId: 'net-command',
    tunedFrequencyLabel: '121.5 MHz',
    mode: 'monitor',
    isSelectedTxRadio: true,
    txEnabled: true,
    txLocked: false,
    volume: 0.8,
    muted: false,
    squelchLevel: 0.1,
    scanEnabled: false,
    scanTargets: [],
    memoryBank: 'default',
    radioProfile: 'default'
};

export const INITIAL_VOICE_SESSION_STATE = {
    activeTxNetId: 'net-command',
    activeTxRadioId: 'RADIO_1',
    monitoredNetIds: ['net-command', 'net-squad-alpha'],
    connectedNetIds: ['net-command', 'net-squad-alpha'],
    participants: [],
    whisperSession: null,
    emergencyState: { type: 'none', active: false },
    bridgeStates: [],
    connectionHealth: 'connected',
    selectedInputDeviceId: 'default',
    selectedOutputDeviceId: 'default',
    pttMode: 'hold',
    recentVoiceEvents: [],
    simpleModeEnabled: true,
    advancedRadioModeEnabled: false
};
