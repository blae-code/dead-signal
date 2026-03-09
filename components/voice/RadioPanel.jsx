/**
 * DEAD SIGNAL — RadioPanel
 * Single hardware-style radio unit. Resembles a field radio / transceiver.
 */
import React, { useCallback } from 'react';
import { MEMORY_CHANNELS } from '@/lib/voice/memory-channels';
import { voiceNetResolver } from '@/lib/voice/voiceNetResolver';

// ─── Color constants ────────────────────────────────────────────────────────────
const C = {
  cyan:    '#00e8ff',
  amber:   '#ffaa00',
  green:   '#39ff14',
  red:     '#ff2020',
  bg:      '#18181c',
  bgPanel: '#1c1c20',
  bgDark:  '#0f0f12',
  border:  '#2a1e10',
  text:    '#eee5d6',
  dim:     '#a79b8f',
  ghost:   '#4e3a22',
};

const PROFILE_LABELS = {
  clean:     'CLEAN',
  analog:    'ANLG',
  vehicle:   'VHC',
  encrypted: 'ENC',
  natural:   'PROX',
};

// ─── Signal Meter ──────────────────────────────────────────────────────────────

function SignalMeter({ strength = 0 }) {
  const bars = 5;
  const filled = Math.round(strength * bars);
  const barColors = ['#39ff14', '#39ff14', '#ffaa00', '#ffaa00', '#ff2020'];
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 16 }}>
      {Array.from({ length: bars }, (_, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: 5 + i * 2,
            borderRadius: 1,
            background: i < filled ? barColors[i] : C.ghost,
            transition: 'background 0.2s',
          }}
        />
      ))}
    </div>
  );
}

// ─── Memory Buttons ─────────────────────────────────────────────────────────────

function MemoryButtons({ tunedNetId, onTune }) {
  return (
    <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
      {MEMORY_CHANNELS.map(({ memorySlot, netId, label }) => {
        const isActive = tunedNetId === netId;
        return (
          <button
            key={memorySlot}
            onClick={() => onTune?.(netId)}
            title={label}
            style={{
              padding: '2px 5px',
              fontSize: 9,
              fontFamily: 'Share Tech Mono, monospace',
              fontWeight: 700,
              color: isActive ? C.bg : C.dim,
              background: isActive ? C.cyan : C.ghost,
              border: `1px solid ${isActive ? C.cyan : C.border}`,
              borderRadius: 2,
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'all 0.1s',
            }}
          >
            {memorySlot}
          </button>
        );
      })}
    </div>
  );
}

// ─── Slider Control ─────────────────────────────────────────────────────────────

function SliderKnob({ label, value, onChange, color = C.cyan }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
      <span style={{ fontSize: 8, color: C.dim, fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.08em' }}>{label}</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value ?? 0.8}
        onChange={(e) => onChange?.(parseFloat(e.target.value))}
        style={{
          WebkitAppearance: 'none',
          width: '100%',
          height: 4,
          borderRadius: 2,
          background: `linear-gradient(to right, ${color} ${(value ?? 0.8) * 100}%, ${C.ghost} ${(value ?? 0.8) * 100}%)`,
          outline: 'none',
          cursor: 'pointer',
        }}
      />
      <span style={{ fontSize: 8, color: C.ghost, fontFamily: 'Share Tech Mono, monospace' }}>
        {Math.round((value ?? 0.8) * 100)}
      </span>
    </div>
  );
}

// ─── RadioPanel ─────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   radio: import('@/lib/voice/models').RadioDeviceState,
 *   isSpeaking?: boolean,
 *   signalStrength?: number,
 *   isGloballyTransmitting?: boolean,
 *   onSetTx: (radioId: string) => void,
 *   onTune: (radioId: string, netId: string) => void,
 *   onVolumeChange: (radioId: string, level: number) => void,
 *   onSquelchChange: (radioId: string, level: number) => void,
 *   onToggleScan: (radioId: string) => void,
 *   onToggleMute: (radioId: string) => void,
 *   className?: string,
 * }} props
 */
export function RadioPanel({
  radio,
  isSpeaking = false,
  signalStrength = 0,
  isGloballyTransmitting = false,
  onSetTx,
  onTune,
  onVolumeChange,
  onSquelchChange,
  onToggleScan,
  onToggleMute,
  className,
}) {
  const {
    radioId,
    label,
    tunedNetId,
    tunedFrequencyLabel,
    mode,
    isSelectedTxRadio,
    volume,
    squelchLevel,
    scanEnabled,
    muted,
    radioProfile,
    txEnabled,
    txLocked,
  } = radio;

  const net = tunedNetId ? voiceNetResolver.getNetById(tunedNetId) : null;
  const isReceiving = isSpeaking && !isGloballyTransmitting;
  const isTransmitting = isSelectedTxRadio && isGloballyTransmitting;
  const isOff = mode === 'off';

  const handleTune = useCallback((netId) => onTune?.(radioId, netId), [onTune, radioId]);
  const handleVolume = useCallback((v) => onVolumeChange?.(radioId, v), [onVolumeChange, radioId]);
  const handleSquelch = useCallback((v) => onSquelchChange?.(radioId, v), [onSquelchChange, radioId]);

  const borderColor = isTransmitting ? C.red
    : isSelectedTxRadio ? C.cyan
    : isReceiving ? C.green
    : C.border;

  return (
    <div
      style={{
        width: 220,
        background: C.bgPanel,
        border: `2px solid ${borderColor}`,
        borderRadius: 6,
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontFamily: 'Share Tech Mono, monospace',
        color: C.text,
        boxShadow: isTransmitting
          ? `0 0 16px rgba(255,32,32,0.4), inset 0 0 8px rgba(255,32,32,0.08)`
          : isSelectedTxRadio
          ? `0 0 10px rgba(0,232,255,0.2)`
          : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        opacity: isOff ? 0.45 : 1,
      }}
    >
      {/* Header: label + lamps */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 9, color: C.dim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {radioId?.replace('_', ' ')}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: C.text }}>
            {label.toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* RX lamp */}
          <div
            title="RX"
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isReceiving ? C.green : C.ghost,
              boxShadow: isReceiving ? `0 0 6px ${C.green}` : 'none',
              transition: 'all 0.15s',
            }}
          />
          {/* TX lamp */}
          <div
            title="TX"
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isTransmitting ? C.red : C.ghost,
              boxShadow: isTransmitting ? `0 0 6px ${C.red}` : 'none',
              transition: 'all 0.15s',
            }}
          />
          {/* Signal meter */}
          <SignalMeter strength={isReceiving ? signalStrength || 0.7 : 0} />
        </div>
      </div>

      {/* Frequency display */}
      <div
        style={{
          background: C.bgDark,
          border: `1px solid ${C.border}`,
          borderRadius: 3,
          padding: '6px 8px',
          textAlign: 'center',
        }}
      >
        <div style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: isOff ? C.ghost : C.cyan,
          fontFamily: 'Share Tech Mono, monospace',
          lineHeight: 1.1,
        }}>
          {isOff ? '---.---' : (tunedFrequencyLabel || '---.---')}
        </div>
        <div style={{ fontSize: 9, color: C.dim, letterSpacing: '0.08em', marginTop: 2, textTransform: 'uppercase' }}>
          {net ? net.displayName : (isOff ? 'RADIO OFF' : 'NO NET')}
        </div>
      </div>

      {/* Memory channel buttons */}
      <MemoryButtons tunedNetId={tunedNetId} onTune={handleTune} />

      {/* Volume & Squelch */}
      <div style={{ display: 'flex', gap: 8 }}>
        <SliderKnob
          label={muted ? 'VOL (MUTED)' : 'VOL'}
          value={muted ? 0 : volume}
          onChange={handleVolume}
          color={muted ? C.ghost : C.cyan}
        />
        <SliderKnob
          label="SQ"
          value={squelchLevel}
          onChange={handleSquelch}
          color={C.amber}
        />
      </div>

      {/* Mode buttons */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={() => !txLocked && onSetTx?.(radioId)}
          disabled={txLocked || !txEnabled || isOff}
          title={txLocked ? 'TX Locked' : 'Set as transmit radio'}
          style={{
            flex: 1, padding: '4px 0', fontSize: 10, fontWeight: 700,
            fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.06em',
            border: `1px solid ${isSelectedTxRadio ? C.cyan : C.border}`,
            borderRadius: 2, cursor: (txLocked || !txEnabled || isOff) ? 'not-allowed' : 'pointer',
            background: isSelectedTxRadio ? 'rgba(0,232,255,0.15)' : 'transparent',
            color: isSelectedTxRadio ? C.cyan : C.dim,
          }}
        >
          TX
        </button>
        <button
          onClick={() => onToggleMute?.(radioId)}
          disabled={isOff}
          style={{
            flex: 1, padding: '4px 0', fontSize: 10, fontWeight: 700,
            fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.06em',
            border: `1px solid ${muted ? C.amber : C.border}`,
            borderRadius: 2, cursor: isOff ? 'not-allowed' : 'pointer',
            background: muted ? 'rgba(255,170,0,0.15)' : 'transparent',
            color: muted ? C.amber : C.dim,
          }}
        >
          {muted ? 'MUTED' : 'MON'}
        </button>
        <button
          onClick={() => onToggleScan?.(radioId)}
          disabled={isOff}
          style={{
            flex: 1, padding: '4px 0', fontSize: 10, fontWeight: 700,
            fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.06em',
            border: `1px solid ${scanEnabled ? C.green : C.border}`,
            borderRadius: 2, cursor: isOff ? 'not-allowed' : 'pointer',
            background: scanEnabled ? 'rgba(57,255,20,0.12)' : 'transparent',
            color: scanEnabled ? C.green : C.dim,
          }}
        >
          SCN
        </button>
      </div>

      {/* Profile badge + lock indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 8, color: C.ghost, letterSpacing: '0.06em' }}>
          {PROFILE_LABELS[radioProfile] ?? radioProfile?.toUpperCase() ?? 'CLEAN'}
        </span>
        {txLocked && (
          <span style={{ fontSize: 8, color: C.red, letterSpacing: '0.06em' }}>TX LOCKED</span>
        )}
      </div>
    </div>
  );
}
