/**
 * DEAD SIGNAL — RadioRack
 * 4-radio rack panel. Renders RadioPanel instances wired to voice session state.
 */
import React, { useState } from 'react';
import { X, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { RadioPanel } from './RadioPanel';
import { DevicePanel } from './DevicePanel';
import { useVoiceSession } from '@/hooks/voice/useVoiceSession';
import { EMPTY_RADIO_SLOT } from '@/lib/voice/models';

const NUM_SLOTS = 4;

export function RadioRack({ onClose }) {
  const {
    voiceSessionState,
    radioDevices,
    activeSpeakers,
    setActiveTxRadio,
    tuneRadio,
    setVolume,
    setSquelch,
    toggleMute,
    toggleScan,
  } = useVoiceSession();

  const [devicesExpanded, setDevicesExpanded] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(voiceSessionState.advancedRadioModeEnabled);

  const { isTransmitting } = voiceSessionState;

  // Pad to NUM_SLOTS with empty slots
  const slots = Array.from({ length: NUM_SLOTS }, (_, i) => radioDevices[i] ?? { ...EMPTY_RADIO_SLOT, radioId: `SLOT_${i + 1}` });

  // Determine per-radio speaking state from activeSpeakers
  const speakingByNet = {};
  for (const s of activeSpeakers) {
    if (s.speakingOnNetId) speakingByNet[s.speakingOnNetId] = true;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#1c1c20',
        border: '1px solid #2a1e10',
        borderRadius: 6,
        overflow: 'hidden',
        fontFamily: 'Share Tech Mono, monospace',
        maxWidth: 960,
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: '#18181c',
          borderBottom: '1px solid #2a1e10',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#ffaa00' }}>
            RADIO RACK
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setAdvancedMode(false)}
              style={{
                fontSize: 9, padding: '2px 7px', borderRadius: 2, cursor: 'pointer',
                border: '1px solid', letterSpacing: '0.06em',
                borderColor: !advancedMode ? '#00e8ff' : '#2a1e10',
                color: !advancedMode ? '#00e8ff' : '#776b5f',
                background: !advancedMode ? 'rgba(0,232,255,0.1)' : 'transparent',
              }}
            >SIMPLE</button>
            <button
              onClick={() => setAdvancedMode(true)}
              style={{
                fontSize: 9, padding: '2px 7px', borderRadius: 2, cursor: 'pointer',
                border: '1px solid', letterSpacing: '0.06em',
                borderColor: advancedMode ? '#00e8ff' : '#2a1e10',
                color: advancedMode ? '#00e8ff' : '#776b5f',
                background: advancedMode ? 'rgba(0,232,255,0.1)' : 'transparent',
              }}
            >ADV</button>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#776b5f', display: 'flex', alignItems: 'center' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Radio slots */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: 14,
          overflowX: 'auto',
          flexWrap: 'wrap',
        }}
      >
        {slots.map((radio) => {
          const isSpeaking = radio.tunedNetId ? Boolean(speakingByNet[radio.tunedNetId]) : false;
          const speakerForNet = activeSpeakers.find(s => s.speakingOnNetId === radio.tunedNetId);
          const signalStrength = speakerForNet?.signalStrength ?? 0;

          return (
            <RadioPanel
              key={radio.radioId}
              radio={radio}
              isSpeaking={isSpeaking}
              signalStrength={signalStrength}
              isGloballyTransmitting={isTransmitting && radio.isSelectedTxRadio}
              onSetTx={setActiveTxRadio}
              onTune={tuneRadio}
              onVolumeChange={setVolume}
              onSquelchChange={setSquelch}
              onToggleMute={toggleMute}
              onToggleScan={toggleScan}
            />
          );
        })}
      </div>

      {/* Device Panel (collapsible) */}
      <div style={{ borderTop: '1px solid #2a1e10' }}>
        <button
          onClick={() => setDevicesExpanded(!devicesExpanded)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer',
            color: '#a79b8f', fontSize: 10, fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.08em',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings size={11} /> AUDIO DEVICES
          </span>
          {devicesExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {devicesExpanded && (
          <div style={{ padding: '0 14px 12px' }}>
            <DevicePanel compact />
          </div>
        )}
      </div>
    </div>
  );
}
