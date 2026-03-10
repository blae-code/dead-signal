/**
 * DEAD SIGNAL — CommsRail
 * Persistent bottom comms strip. Always visible. Shows:
 * - Active TX radio/net
 * - Monitored nets
 * - Active speaker
 * - Connection health
 * - PTT button
 * - Emergency state
 */
import React from 'react';
import { Radio, Mic, MicOff, AlertTriangle } from 'lucide-react';
import { useVoiceSession } from '@/hooks/voice/useVoiceSession';
import { usePushToTalk } from '@/hooks/voice/usePushToTalk';
import { voiceNetResolver } from '@/lib/voice/voiceNetResolver';

// ─── Color helpers ─────────────────────────────────────────────────────────────

const HEALTH_COLOR = {
  excellent:    '#39ff14',
  good:         '#39ff14',
  poor:         '#ffaa00',
  reconnecting: '#ffaa00',
  disconnected: '#ff2020',
};

const CATEGORY_COLOR = {
  command:   '#ff2020',
  squad:     '#00e8ff',
  logistics: '#00c8a0',
  emergency: '#ff2020',
  proximity: '#b060ff',
  direct:    '#e8b800',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function TxIndicator({ netId, isTransmitting, onClick }) {
  const net = netId ? voiceNetResolver.getNetById(netId) : null;
  const color = net ? (CATEGORY_COLOR[net.category] ?? '#00e8ff') : '#776b5f';
  const txActive = isTransmitting;
  const lcdGreen = '#00e060';
  const lcdDim   = '#014a1a';
  const bgLcd    = '#030c04';

  return (
    <button
      onClick={onClick}
      title="Click to open Radio Rack"
      style={{
        display: 'flex', alignItems: 'center', gap: 0,
        border: `1px solid ${txActive ? '#ff202077' : '#2a1e10'}`,
        background: 'rgba(0,0,0,0.5)',
        cursor: 'pointer', minWidth: 170,
        transition: 'all 0.15s', padding: 0, overflow: 'hidden',
        boxShadow: txActive ? '0 0 12px rgba(255,32,32,0.35)' : 'none',
        position: 'relative',
      }}
    >
      {/* Icon cell */}
      <div style={{ padding: '4px 8px', borderRight: '1px solid #2a1e10', display: 'flex', alignItems: 'center', background: txActive ? 'rgba(255,32,32,0.12)' : 'rgba(0,0,0,0.35)', flexShrink: 0 }}>
        <Radio size={12} color={txActive ? '#ff2020' : color} />
      </div>
      {/* LCD cell */}
      <div style={{ flex: 1, background: bgLcd, padding: '4px 8px', position: 'relative', overflow: 'hidden' }}>
        {/* LCD scanlines */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,80,10,0.07) 2px, rgba(0,80,10,0.07) 3px)', pointerEvents: 'none' }} />
        <div style={{ fontSize: 7, color: txActive ? '#ff6060aa' : (net ? lcdGreen + '88' : lcdDim), fontFamily: 'Orbitron, monospace', letterSpacing: '0.12em' }}>
          {txActive ? '● TX' : (net ? 'TX READY' : 'NO NET')}
        </div>
        <div
          className={txActive ? 'ds-tx-text' : ''}
          style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', lineHeight: 1.1,
            color: txActive ? '#ff8080' : (net ? lcdGreen : lcdDim),
            fontFamily: 'Share Tech Mono, monospace',
            textShadow: net && !txActive ? `0 0 8px ${lcdGreen}77` : (txActive ? '0 0 8px rgba(255,32,32,0.6)' : 'none'),
          }}
        >
          {net ? net.displayName.toUpperCase() : '-- NO NET --'}
        </div>
        {net && (
          <div style={{ fontSize: 8, color: txActive ? '#ff606066' : lcdGreen + '66', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.06em' }}>
            {net.frequencyLabel}
          </div>
        )}
      </div>
    </button>
  );
}

function MonitoredNetPill({ netId, isActiveTx }) {
  const net = voiceNetResolver.getNetById(netId);
  if (!net) return null;
  const color = isActiveTx ? '#ff2020' : (CATEGORY_COLOR[net.category] ?? '#00e8ff');

  return (
    <div
      title={`${net.displayName} — ${net.frequencyLabel}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        border: `1px solid ${isActiveTx ? '#ff2020' : '#2a1e10'}`,
        borderRadius: 2,
        background: isActiveTx ? 'rgba(255,32,32,0.12)' : 'rgba(0,0,0,0.3)',
        fontSize: 10,
        fontFamily: 'Share Tech Mono, monospace',
        color,
        letterSpacing: '0.08em',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {net.slug?.toUpperCase() ?? net.displayName.substring(0, 6).toUpperCase()}
    </div>
  );
}

function ActiveSpeakerDisplay({ activeSpeakers }) {
  if (!activeSpeakers?.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 100 }}>
        <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#2a1e10', border: '1px solid #3e2c18' }} />
        <span style={{ fontSize: 9, color: '#3e2c18', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.1em' }}>
          NET QUIET
        </span>
      </div>
    );
  }
  const speaker = activeSpeakers[0];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 100 }}>
      <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#39ff14', boxShadow: '0 0 6px #39ff1488', animation: 'glowDotPulse 1s ease-in-out infinite' }} />
      <span style={{ fontSize: 11, color: '#39ff14', fontFamily: 'Share Tech Mono, monospace', fontWeight: 700, letterSpacing: '0.08em', textShadow: '0 0 8px #39ff1466' }}>
        {(speaker.callsign || speaker.userId || 'UNKNOWN').toUpperCase()}
      </span>
    </div>
  );
}

function HealthDot({ health }) {
  const color = HEALTH_COLOR[health] ?? '#776b5f';
  const label = health?.toUpperCase() ?? 'UNKNOWN';
  const ledCls = health === 'excellent' || health === 'good' ? 'ds-led-on-green'
    : health === 'reconnecting' || health === 'poor' ? 'ds-led-on-amber'
    : health === 'disconnected' ? 'ds-led-on-red' : 'ds-led-off';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} title={`Connection: ${label}`}>
      <div className={ledCls} style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0 }} />
      <span style={{ fontSize: 9, color, fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.06em' }}>{label}</span>
    </div>
  );
}

function PttButton({ isTransmitting, pttMode, onStart, onStop }) {
  return (
    <button
      onMouseDown={pttMode === 'hold' ? onStart : undefined}
      onMouseUp={pttMode === 'hold' ? onStop : undefined}
      onTouchStart={pttMode === 'hold' ? (e) => { e.preventDefault(); onStart(); } : undefined}
      onTouchEnd={pttMode === 'hold' ? (e) => { e.preventDefault(); onStop(); } : undefined}
      onClick={pttMode === 'toggle' ? (isTransmitting ? onStop : onStart) : undefined}
      className={isTransmitting ? 'ds-tx-active' : ''}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '5px 20px',
        border: `2px solid ${isTransmitting ? '#ff2020' : '#3e2c18'}`,
        background: isTransmitting
          ? 'linear-gradient(180deg, rgba(255,32,32,0.35) 0%, rgba(200,0,0,0.2) 100%)'
          : 'linear-gradient(180deg, #2e2e38 0%, #1a1a20 100%)',
        cursor: 'pointer',
        fontFamily: 'Orbitron, monospace',
        fontSize: 10, fontWeight: 700,
        color: isTransmitting ? '#ff2020' : '#776b5f',
        letterSpacing: '0.16em',
        transform: isTransmitting ? 'scale(0.95)' : 'scale(1)',
        transition: 'transform 0.08s, border-color 0.08s, color 0.08s',
        userSelect: 'none', WebkitUserSelect: 'none',
        minWidth: 90,
        boxShadow: isTransmitting
          ? 'inset 0 2px 4px rgba(0,0,0,0.5), 0 0 14px rgba(255,32,32,0.5)'
          : 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.5)',
        textShadow: isTransmitting ? '0 0 8px #ff202099' : 'none',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {isTransmitting && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,32,32,0.8), transparent)' }} />}
      {isTransmitting
        ? <><Mic size={11} color="#ff2020" style={{ filter: 'drop-shadow(0 0 4px #ff2020)' }} /> TX LIVE</>
        : <><MicOff size={11} color="#4e3a22" /> PTT</>
      }
    </button>
  );
}

function EmergencyBanner({ emergencyState }) {
  if (!emergencyState?.active) return null;
  return (
    <div
      className="threat-blink"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 12px',
        border: '2px solid #ff2020',
        background: 'rgba(255,32,32,0.18)',
        fontSize: 9, fontFamily: 'Orbitron, monospace', fontWeight: 700,
        color: '#ff2020', letterSpacing: '0.14em',
        boxShadow: '0 0 12px rgba(255,32,32,0.5), inset 0 0 8px rgba(255,32,32,0.08)',
        textShadow: '0 0 8px #ff202099',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, #ff202099, transparent)' }} />
      <AlertTriangle size={12} style={{ filter: 'drop-shadow(0 0 4px #ff2020)' }} />
      PRIORITY ALERT
    </div>
  );
}

// ─── Main CommsRail ────────────────────────────────────────────────────────────

export function CommsRail({ onOpenRadioRack }) {
  const {
    voiceSessionState,
    activeSpeakers,
  } = useVoiceSession();

  const { isTransmitting, startTx, stopTx } = usePushToTalk();

  const {
    activeTxNetId,
    monitoredNetIds,
    connectionHealth,
    pttMode,
    emergencyState,
    isMicMuted,
  } = voiceSessionState;

  // Nets that are monitored but not the TX net (up to 3 pills visible)
  const monitoredPills = (monitoredNetIds ?? []).slice(0, 4);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        height: 52,
        background: 'transparent',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* VOICE label anchor */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        flexShrink: 0,
      }}>
        <Radio size={10} color="#ffaa0066" />
        <span style={{ fontSize: 7, color: '#ffaa0055', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.14em' }}>
          VOICE
        </span>
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 32, background: '#3e2c18', flexShrink: 0 }} />

      {/* TX Indicator */}
      <TxIndicator
        netId={activeTxNetId}
        isTransmitting={isTransmitting}
        onClick={onOpenRadioRack}
      />

      {/* Separator */}
      <div style={{ width: 1, height: 32, background: '#3e2c18', flexShrink: 0 }} />

      {/* Monitored nets */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flex: 1, overflow: 'hidden' }}>
        {monitoredPills.map(netId => (
          <MonitoredNetPill
            key={netId}
            netId={netId}
            isActiveTx={netId === activeTxNetId}
          />
        ))}
        {(monitoredNetIds?.length ?? 0) > 4 && (
          <span style={{ fontSize: 9, color: '#776b5f', fontFamily: 'Share Tech Mono, monospace' }}>
            +{monitoredNetIds.length - 4}
          </span>
        )}
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 32, background: '#3e2c18', flexShrink: 0 }} />

      {/* Active speaker */}
      <ActiveSpeakerDisplay activeSpeakers={activeSpeakers} />

      {/* Separator */}
      <div style={{ width: 1, height: 32, background: '#3e2c18', flexShrink: 0 }} />

      {/* Connection health */}
      <HealthDot health={connectionHealth} />

      {/* Separator */}
      <div style={{ width: 1, height: 32, background: '#3e2c18', flexShrink: 0 }} />

      {/* PTT Button */}
      <PttButton
        isTransmitting={isTransmitting}
        pttMode={pttMode ?? 'hold'}
        onStart={startTx}
        onStop={stopTx}
      />

      {/* Mic muted indicator */}
      {isMicMuted && !isTransmitting && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <MicOff size={12} color="#ffaa00" />
          <span style={{ fontSize: 9, color: '#ffaa00', fontFamily: 'Share Tech Mono, monospace' }}>MUTED</span>
        </div>
      )}

      {/* Emergency */}
      <EmergencyBanner emergencyState={emergencyState} />
    </div>
  );
}