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
  bgPanel: '#1c1c20',
  bgDark:  '#0f0f12',
  bgDeep:  '#0a0a0e',
  border:  '#2a1e10',
  text:    '#eee5d6',
  dim:     '#a79b8f',
  ghost:   '#4e3a22',
};

const PROFILE_LABELS = { clean: 'CLEAN', analog: 'ANLG', vehicle: 'VHC', encrypted: 'ENC', natural: 'PROX' };
const PROFILE_COLORS = { clean: '#00e8ff', analog: '#ffaa00', vehicle: '#ff8c00', encrypted: '#39ff14', natural: '#b060ff' };

// ─── Signal Meter ──────────────────────────────────────────────────────────────

function SignalMeter({ strength = 0, active = false }) {
  const bars = 5;
  const filled = Math.round(strength * bars);
  const barColors = [C.green, C.green, C.amber, C.amber, C.red];
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 18 }} title={`Signal: S${filled}`}>
      {Array.from({ length: bars }, (_, i) => (
        <div key={i} style={{
          width: 4, height: 5 + i * 2.5, borderRadius: 0,
          background: (active && i < filled) ? barColors[i] : 'transparent',
          border: `1px solid ${(active && i < filled) ? barColors[i] : C.ghost}`,
          boxShadow: (active && i < filled) ? `0 0 4px ${barColors[i]}88` : 'none',
          transition: 'background 0.15s, box-shadow 0.15s',
        }} />
      ))}
    </div>
  );
}

// ─── LED Lamp ──────────────────────────────────────────────────────────────────

function Led({ active, color, label }) {
  const cls = active
    ? (color === C.red ? 'ds-led-on-red' : color === C.green ? 'ds-led-on-green' : 'ds-led-on-amber')
    : 'ds-led-off';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }} title={label}>
      <div className={cls} style={{ width: 7, height: 7, borderRadius: '50%', transition: 'background 0.1s' }} />
      <span style={{ fontSize: 7, color: active ? color : C.ghost, fontFamily: 'Share Tech Mono, monospace' }}>
        {label}
      </span>
    </div>
  );
}

// ─── Memory Buttons ─────────────────────────────────────────────────────────────

function MemoryButtons({ tunedNetId, onTune }) {
  return (
    <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
      {MEMORY_CHANNELS.map(({ memorySlot, netId, label }) => {
        const isActive = tunedNetId === netId;
        return (
          <button
            key={memorySlot}
            onClick={() => onTune?.(netId)}
            title={label}
            style={{
              padding: '2px 4px', fontSize: 8, fontFamily: 'Share Tech Mono, monospace', fontWeight: 700,
              color: isActive ? C.bgDark : C.dim,
              background: isActive ? C.cyan : C.ghost,
              border: `1px solid ${isActive ? C.cyan : C.border}`,
              borderRadius: 1, cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.1s',
              minWidth: 22, textAlign: 'center',
              boxShadow: isActive ? `0 0 6px ${C.cyan}66` : 'none',
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

function SliderKnob({ label, value, onChange, color = '#00e8ff', muted = false }) {
  const pct = Math.round((value ?? 0.8) * 100);
  const displayColor = muted ? C.ghost : color;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 7, color: C.dim, fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.1em' }}>{label}</span>
        <span style={{ fontSize: 7, color: displayColor, fontFamily: 'Share Tech Mono, monospace' }}>{pct}</span>
      </div>
      <input
        type="range" min="0" max="1" step="0.01" value={value ?? 0.8}
        onChange={(e) => onChange?.(parseFloat(e.target.value))}
        className="ds-range"
        style={{ '--range-fill-color': displayColor, '--range-pct': `${pct}%` }}
      />
    </div>
  );
}

// ─── RadioPanel ─────────────────────────────────────────────────────────────────

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
}) {
  const {
    radioId, label, tunedNetId, tunedFrequencyLabel, mode,
    isSelectedTxRadio, volume, squelchLevel, scanEnabled, muted,
    radioProfile, txEnabled, txLocked,
  } = radio;

  const net = tunedNetId ? voiceNetResolver.getNetById(tunedNetId) : null;
  const isReceiving = isSpeaking && !isGloballyTransmitting;
  const isTransmitting = isSelectedTxRadio && isGloballyTransmitting;
  const isOff = mode === 'off';

  const handleTune    = useCallback((netId) => onTune?.(radioId, netId),         [onTune, radioId]);
  const handleVolume  = useCallback((v)     => onVolumeChange?.(radioId, v),     [onVolumeChange, radioId]);
  const handleSquelch = useCallback((v)     => onSquelchChange?.(radioId, v),    [onSquelchChange, radioId]);

  const borderColor = isTransmitting ? C.red : isSelectedTxRadio ? C.cyan : isReceiving ? C.green : C.border;
  const profileColor = PROFILE_COLORS[radioProfile] ?? C.dim;

  const modeButtons = [
    { key: 'tx',  label: 'TX',                 active: isSelectedTxRadio, color: C.cyan,  disabled: txLocked || !txEnabled || isOff, title: txLocked ? 'TX Locked' : 'Set as TX radio', onClick: () => !txLocked && onSetTx?.(radioId) },
    { key: 'mon', label: muted ? 'MUTED' : 'MON', active: muted,          color: C.amber, disabled: isOff, title: 'Toggle mute', onClick: () => onToggleMute?.(radioId) },
    { key: 'scn', label: 'SCN',                active: scanEnabled,       color: C.green, disabled: isOff, title: 'Toggle scan', onClick: () => onToggleScan?.(radioId) },
  ];

  return (
    <div
      className={isTransmitting ? 'ds-tx-active' : isReceiving ? 'ds-rx-active' : ''}
      style={{
        width: 220,
        background: `linear-gradient(180deg, #1e1e24 0%, ${C.bgPanel} 100%)`,
        border: `2px solid ${borderColor}`,
        borderRadius: 3, padding: 10,
        display: 'flex', flexDirection: 'column', gap: 8,
        fontFamily: 'Share Tech Mono, monospace', color: C.text,
        transition: 'border-color 0.15s',
        opacity: isOff ? 0.4 : 1,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Top edge glow line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${borderColor}66 50%, transparent 100%)`,
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 8, color: C.ghost, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {radioId?.replace('_', ' ')}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: isOff ? C.ghost : C.text }}>
            {label.toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Led active={isReceiving}    color={C.green} label="RX" />
            <Led active={isTransmitting} color={C.red}   label="TX" />
          </div>
          <SignalMeter strength={isReceiving ? (signalStrength || 0.7) : 0} active={isReceiving} />
        </div>
      </div>

      {/* Frequency display */}
      <div style={{
        background: C.bgDeep,
        border: `1px solid ${isOff ? C.border : '#1a2a1a'}`,
        borderRadius: 2, padding: '7px 10px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
        boxShadow: 'inset 0 0 14px rgba(0,0,0,0.9)',
      }}>
        <div
          className={!isOff ? 'ds-freq-display' : ''}
          style={{
            fontSize: 21, fontWeight: 700, letterSpacing: '0.14em',
            color: isOff ? C.ghost : (isTransmitting ? C.red : C.cyan),
            fontFamily: 'Share Tech Mono, monospace', lineHeight: 1,
          }}
        >
          {isOff ? '---.---' : (tunedFrequencyLabel || '---.---')}
        </div>
        <div style={{
          fontSize: 8, letterSpacing: '0.1em', marginTop: 4, textTransform: 'uppercase',
          color: isTransmitting ? C.red : (net ? C.dim : C.ghost),
        }}>
          {isTransmitting ? '● TRANSMITTING' : net ? net.displayName : (isOff ? 'RADIO OFF' : 'NO NET')}
        </div>
        {scanEnabled && !isOff && (
          <div className="ds-scan-active" style={{ position: 'absolute', inset: 0, borderRadius: 2, pointerEvents: 'none' }} />
        )}
      </div>

      {/* Memory channels */}
      <MemoryButtons tunedNetId={tunedNetId} onTune={handleTune} />

      {/* Volume & Squelch */}
      <div style={{
        background: '#13131a', border: `1px solid ${C.border}`,
        borderRadius: 2, padding: '6px 8px', display: 'flex', gap: 10,
      }}>
        <SliderKnob label={muted ? 'VOL [MUTED]' : 'VOLUME'} value={muted ? 0 : volume} onChange={handleVolume} color="#00e8ff" muted={muted} />
        <div style={{ width: 1, background: C.border, alignSelf: 'stretch' }} />
        <SliderKnob label="SQUELCH" value={squelchLevel} onChange={handleSquelch} color="#ffaa00" />
      </div>

      {/* Mode buttons */}
      <div style={{ display: 'flex', gap: 3 }}>
        {modeButtons.map(({ key, label: bl, active, color, disabled, title, onClick }) => (
          <button key={key} onClick={onClick} disabled={disabled} title={title} style={{
            flex: 1, padding: '5px 0', fontSize: 9, fontWeight: 700,
            fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.08em',
            border: `1px solid ${active ? color : C.border}`, borderRadius: 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: active ? `${color}20` : '#13131a',
            color: active ? color : C.dim, transition: 'all 0.1s',
            boxShadow: active ? `0 0 4px ${color}44` : 'none', opacity: disabled ? 0.5 : 1,
          }}>
            {key === 'scn' && scanEnabled ? <span className="ds-scan-dot">{bl}</span> : bl}
          </button>
        ))}
      </div>

      {/* Profile badge + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 8, letterSpacing: '0.08em', color: profileColor, borderLeft: `2px solid ${profileColor}`, paddingLeft: 5 }}>
          {PROFILE_LABELS[radioProfile] ?? radioProfile?.toUpperCase() ?? 'CLEAN'}
        </span>
        {txLocked && <span style={{ fontSize: 8, color: C.red, letterSpacing: '0.06em' }}>⊘ TX LOCKED</span>}
        {!txLocked && isSelectedTxRadio && <span style={{ fontSize: 8, color: C.cyan, letterSpacing: '0.06em' }}>● SELECTED</span>}
      </div>
    </div>
  );
}
