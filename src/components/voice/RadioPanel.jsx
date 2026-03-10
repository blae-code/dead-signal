/**
 * DEAD SIGNAL — RadioPanel
 * Hardware field-radio aesthetic inspired by tactical comms equipment.
 * Green LCD frequency display, physical-button styling, LED bar meter.
 */
import React, { useCallback } from 'react';
import { MEMORY_CHANNELS } from '@/lib/voice/memory-channels';
import { voiceNetResolver } from '@/lib/voice/voiceNetResolver';

const C = {
  cyan:    '#00e8ff',
  amber:   '#ffaa00',
  green:   '#39ff14',
  red:     '#ff2020',
  bgPanel: '#16161a',
  bgDark:  '#0a0a0d',
  bgDeep:  '#060608',
  bgLcd:   '#020d04',   // deep green-black for LCD
  lcdGreen:'#00e060',   // bright LCD green
  lcdDim:  '#014a1a',   // dim LCD segments
  border:  '#2a1e10',
  borderHi:'#3e2c18',
  text:    '#eee5d6',
  dim:     '#a79b8f',
  ghost:   '#4e3a22',
};

const PROFILE_LABELS = { clean: 'CLEAN', analog: 'ANLG', vehicle: 'VHC', encrypted: 'ENC', natural: 'PROX' };
const PROFILE_COLORS = { clean: '#00e8ff', analog: '#ffaa00', vehicle: '#ff8c00', encrypted: '#39ff14', natural: '#b060ff' };

// ─── S-meter (signal bargraph like real radio) ─────────────────────────────
function SignalMeter({ strength = 0, active = false }) {
  const total = 10;
  const filled = Math.round(strength * total);
  // First 7 = green (S1–S7), next 2 = amber (+10, +20), last 1 = red (+40)
  const barColors = [
    '#39ff14','#39ff14','#39ff14','#39ff14','#39ff14','#39ff14','#39ff14',
    '#ffaa00','#ffaa00','#ff2020',
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 7, color: C.ghost, fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.08em' }}>SIG</div>
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 16 }}>
        {Array.from({ length: total }, (_, i) => {
          const lit = active && i < filled;
          const h = 6 + i * 1.2;
          return (
            <div key={i} style={{
              width: 3, height: h,
              background: lit ? barColors[i] : 'transparent',
              border: `1px solid ${lit ? barColors[i] : C.ghost + '55'}`,
              boxShadow: lit ? `0 0 4px ${barColors[i]}99` : 'none',
              transition: 'background 0.1s',
              flexShrink: 0,
            }} />
          );
        })}
      </div>
    </div>
  );
}

// ─── Hardware LED lamp ─────────────────────────────────────────────────────
function Led({ active, color, label, large = false }) {
  const cls = active
    ? (color === C.red ? 'ds-led-on-red' : color === C.green ? 'ds-led-on-green' : 'ds-led-on-amber')
    : 'ds-led-off';
  const size = large ? 9 : 7;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }} title={label}>
      <div className={cls} style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }} />
      <span style={{ fontSize: 6.5, color: active ? color : C.ghost, fontFamily: 'Orbitron, monospace', letterSpacing: '0.05em' }}>
        {label}
      </span>
    </div>
  );
}

// ─── Status bar (SECURE / ACTIVE) ─────────────────────────────────────────
function StatusBar({ label, active, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '2px 0',
      background: active ? `${color}22` : 'rgba(0,0,0,0.5)',
      border: `1px solid ${active ? color + '88' : C.ghost + '33'}`,
      position: 'relative', overflow: 'hidden',
    }}>
      {active && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}aa, transparent)` }} />}
      <span style={{
        fontSize: 8, fontFamily: 'Orbitron, monospace', letterSpacing: '0.12em',
        color: active ? color : C.ghost,
        textShadow: active ? `0 0 8px ${color}` : 'none',
      }}>{label}</span>
    </div>
  );
}

// ─── Memory channel buttons (M1, M2…) ─────────────────────────────────────
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
              padding: '4px 0',
              fontSize: 8, fontFamily: 'Orbitron, monospace', fontWeight: 700,
              color: isActive ? C.bgDark : C.dim,
              background: isActive
                ? `linear-gradient(180deg, ${C.amber}dd 0%, ${C.amber}aa 100%)`
                : 'linear-gradient(180deg, #2a2a30 0%, #1a1a1e 100%)',
              border: `1px solid ${isActive ? C.amber : C.ghost + '66'}`,
              cursor: 'pointer', letterSpacing: '0.06em',
              minWidth: 28, textAlign: 'center',
              boxShadow: isActive
                ? `0 0 8px ${C.amber}66, inset 0 1px 0 rgba(255,255,255,0.12)`
                : 'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.5)',
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

// ─── Slider knob ───────────────────────────────────────────────────────────
function SliderKnob({ label, value, onChange, color = '#00e8ff', muted = false }) {
  const pct = Math.round((value ?? 0.8) * 100);
  const displayColor = muted ? C.ghost : color;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 7, color: C.ghost, fontFamily: 'Orbitron, monospace', letterSpacing: '0.08em' }}>{label}</span>
        <span style={{ fontSize: 8, color: displayColor, fontFamily: 'Share Tech Mono, monospace', textShadow: muted ? 'none' : `0 0 4px ${displayColor}66` }}>{pct}</span>
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

// ─── Mode button (PTT / MON / SCN) ────────────────────────────────────────
function ModeButton({ label, active, color, disabled, onClick, title, blink = false }) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      style={{
        flex: 1, padding: '5px 0',
        fontSize: 8.5, fontFamily: 'Orbitron, monospace', fontWeight: 700, letterSpacing: '0.1em',
        border: `1px solid ${active ? color + '99' : C.ghost + '44'}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: active
          ? `linear-gradient(180deg, ${color}22 0%, ${color}10 100%)`
          : 'linear-gradient(180deg, #22222a 0%, #18181e 100%)',
        color: active ? color : C.ghost,
        boxShadow: active ? `0 0 8px ${color}33, inset 0 0 6px ${color}11` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
        textShadow: active ? `0 0 6px ${color}88` : 'none',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.12s',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {active && !disabled && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}88, transparent)` }} />}
      <span className={blink ? 'ds-scan-dot' : ''}>{label}</span>
    </button>
  );
}

// ─── RadioPanel ─────────────────────────────────────────────────────────────

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
  const isReceiving    = isSpeaking && !isGloballyTransmitting;
  const isTransmitting = isSelectedTxRadio && isGloballyTransmitting;
  const isOff          = mode === 'off';
  const isSecure       = radioProfile === 'encrypted';
  const isActive       = !isOff && !!tunedNetId;

  const handleTune    = useCallback((netId) => onTune?.(radioId, netId),      [onTune, radioId]);
  const handleVolume  = useCallback((v)     => onVolumeChange?.(radioId, v),  [onVolumeChange, radioId]);
  const handleSquelch = useCallback((v)     => onSquelchChange?.(radioId, v), [onSquelchChange, radioId]);

  // Border glow color based on state
  const borderColor = isTransmitting ? C.red : isSelectedTxRadio ? C.cyan : isReceiving ? C.green : C.border;
  const profileColor = PROFILE_COLORS[radioProfile] ?? C.dim;

  // Extract channel number from memory slot if possible
  const chanMatch = tunedNetId ? MEMORY_CHANNELS.find(m => m.netId === tunedNetId) : null;
  const chanNum   = chanMatch ? chanMatch.memorySlot.replace('M', '') : '–';

  return (
    <div
      className={isTransmitting ? 'ds-tx-active' : isReceiving ? 'ds-rx-active' : ''}
      style={{
        width: 230,
        background: `linear-gradient(160deg, #1c1c22 0%, #141418 60%, #0f0f12 100%)`,
        border: `2px solid ${borderColor}`,
        padding: 0,
        display: 'flex', flexDirection: 'column',
        fontFamily: 'Share Tech Mono, monospace', color: C.text,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        opacity: isOff ? 0.38 : 1,
        position: 'relative', overflow: 'hidden',
        boxShadow: isTransmitting
          ? `0 0 24px rgba(255,32,32,0.5), inset 0 0 20px rgba(255,32,32,0.06)`
          : isReceiving
          ? `0 0 16px rgba(57,255,20,0.3), inset 0 0 16px rgba(57,255,20,0.04)`
          : 'none',
      }}
    >
      {/* Top accent hairline */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${borderColor}88 40%, ${borderColor}cc 50%, ${borderColor}88 60%, transparent)`, pointerEvents: 'none', zIndex: 2 }} />
      {/* Corner brackets */}
      <div style={{ position: 'absolute', top: 5, left: 5, width: 10, height: 10, borderTop: `1px solid ${borderColor}55`, borderLeft: `1px solid ${borderColor}55`, zIndex: 2 }} />
      <div style={{ position: 'absolute', bottom: 5, right: 5, width: 10, height: 10, borderBottom: `1px solid ${borderColor}33`, borderRight: `1px solid ${borderColor}33`, zIndex: 2 }} />

      {/* ── HEADER STRIP ────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 10px 5px',
        borderBottom: `1px solid ${C.border}`,
        background: 'rgba(0,0,0,0.35)',
      }}>
        <div>
          <div style={{ fontSize: 7, color: C.ghost, letterSpacing: '0.14em', fontFamily: 'Orbitron, monospace' }}>
            {radioId?.replace('_', ' ').toUpperCase()}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: isOff ? C.ghost : C.text, fontFamily: 'Orbitron, monospace', marginTop: 1 }}>
            {label.toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            <Led active={isReceiving}    color={C.green} label="RX" large />
            <Led active={isTransmitting} color={C.red}   label="TX" large />
          </div>
          <SignalMeter strength={isReceiving ? (signalStrength || 0.7) : 0} active={isReceiving} />
        </div>
      </div>

      {/* ── LCD FREQUENCY DISPLAY ─────────────── */}
      <div style={{
        margin: '8px 10px',
        background: C.bgLcd,
        border: `1px solid ${isOff ? '#0d1a10' : '#0a2a14'}`,
        boxShadow: 'inset 0 0 18px rgba(0,0,0,0.95)',
        padding: '8px 12px 7px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* LCD scanlines */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,100,20,0.06) 2px, rgba(0,100,20,0.06) 3px)', pointerEvents: 'none' }} />
        {/* scan overlay if scanning */}
        {scanEnabled && !isOff && <div className="ds-scan-active" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />}

        {/* Channel + Frequency row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontSize: 11, fontFamily: 'Share Tech Mono, monospace', fontWeight: 700,
            color: isOff ? C.lcdDim : C.lcdGreen + '99',
            letterSpacing: '0.06em',
          }}>CH {chanNum}</span>
          <span
            className={!isOff ? 'ds-freq-display' : ''}
            style={{
              fontSize: 26, fontWeight: 700, letterSpacing: '0.12em', lineHeight: 1,
              fontFamily: 'Share Tech Mono, monospace',
              color: isOff ? C.lcdDim : (isTransmitting ? '#ff6060' : C.lcdGreen),
              textShadow: isOff ? 'none' : (isTransmitting
                ? '0 0 10px #ff202099, 0 0 20px #ff202044'
                : `0 0 12px ${C.lcdGreen}99, 0 0 24px ${C.lcdGreen}44`),
            }}
          >
            {isOff ? '---.---' : (tunedFrequencyLabel || '---.---')}
          </span>
        </div>

        {/* Net name / status sub-line */}
        <div style={{
          marginTop: 3, fontSize: 8.5, letterSpacing: '0.1em',
          fontFamily: 'Share Tech Mono, monospace',
          color: isTransmitting ? '#ff6060' : (net ? C.lcdGreen + 'bb' : C.lcdDim),
          textShadow: !isOff && !isTransmitting && net ? `0 0 6px ${C.lcdGreen}55` : 'none',
        }}>
          {isTransmitting ? '● TRANSMITTING' : net ? net.displayName.toUpperCase() : (isOff ? 'RADIO OFF' : 'NO NET')}
        </div>
      </div>

      {/* ── SECURE / ACTIVE status bars ──────── */}
      <div style={{ display: 'flex', gap: 3, padding: '0 10px 7px' }}>
        <StatusBar label="SECURE" active={isSecure}  color={C.green} />
        <StatusBar label="ACTIVE" active={isActive}  color={C.amber} />
        <StatusBar label="SCAN"   active={scanEnabled && !isOff} color={C.cyan} />
      </div>

      {/* ── MEMORY CHANNEL BUTTONS ───────────── */}
      <div style={{ padding: '0 10px 7px' }}>
        <div style={{ fontSize: 7, color: C.ghost, letterSpacing: '0.14em', fontFamily: 'Orbitron, monospace', marginBottom: 4 }}>MEMORY</div>
        <MemoryButtons tunedNetId={tunedNetId} onTune={handleTune} />
      </div>

      {/* ── VOLUME + SQUELCH ─────────────────── */}
      <div style={{
        margin: '0 10px 7px',
        background: 'rgba(0,0,0,0.45)',
        border: `1px solid ${C.border}`,
        padding: '6px 8px',
        display: 'flex', gap: 10,
      }}>
        <SliderKnob label={muted ? 'VOL [M]' : 'VOLUME'} value={muted ? 0 : volume} onChange={handleVolume} color={C.cyan}  muted={muted} />
        <div style={{ width: 1, background: C.border, alignSelf: 'stretch' }} />
        <SliderKnob label="SQUELCH" value={squelchLevel} onChange={handleSquelch} color={C.amber} />
      </div>

      {/* ── MODE BUTTONS ─────────────────────── */}
      <div style={{ display: 'flex', gap: 3, padding: '0 10px 10px' }}>
        <ModeButton
          label={txLocked ? 'TX LOCK' : 'TX'}
          active={isSelectedTxRadio}
          color={C.cyan}
          disabled={txLocked || !txEnabled || isOff}
          title={txLocked ? 'TX Locked' : 'Set as TX radio'}
          onClick={() => !txLocked && onSetTx?.(radioId)}
        />
        <ModeButton
          label={muted ? 'MUTED' : 'MON'}
          active={muted}
          color={C.amber}
          disabled={isOff}
          title="Toggle monitor mute"
          onClick={() => onToggleMute?.(radioId)}
        />
        <ModeButton
          label="SCN"
          active={scanEnabled}
          color={C.green}
          disabled={isOff}
          title="Toggle channel scan"
          blink={scanEnabled}
          onClick={() => onToggleScan?.(radioId)}
        />
      </div>

      {/* ── PROFILE STRIP ────────────────────── */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        padding: '4px 10px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,0,0,0.35)',
      }}>
        <span style={{
          fontSize: 7.5, letterSpacing: '0.1em',
          color: profileColor,
          borderLeft: `2px solid ${profileColor}`,
          paddingLeft: 5,
          fontFamily: 'Orbitron, monospace',
          textShadow: `0 0 6px ${profileColor}66`,
        }}>
          {PROFILE_LABELS[radioProfile] ?? radioProfile?.toUpperCase() ?? 'CLEAN'}
        </span>
        {txLocked && <span style={{ fontSize: 7.5, color: C.red, letterSpacing: '0.08em', fontFamily: 'Orbitron, monospace' }}>⊘ LOCKED</span>}
        {!txLocked && isSelectedTxRadio && <span style={{ fontSize: 7.5, color: C.cyan, letterSpacing: '0.08em', fontFamily: 'Orbitron, monospace', textShadow: `0 0 6px ${C.cyan}66` }}>◈ SELECTED</span>}
      </div>
    </div>
  );
}