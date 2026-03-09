/**
 * DEAD SIGNAL — AnnunciatorBar
 * Persistent severity-based system alert strip. Modeled after avionics alarm discipline.
 * Priority: critical > warn > info. Max 6 alerts inline.
 */
import React, { useMemo } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useVoiceSession } from '@/hooks/voice/useVoiceSession';

// ─── Alert definitions ─────────────────────────────────────────────────────────

const SEV = { critical: 3, warn: 2, info: 1 };

const SEV_STYLE = {
  critical: { color: '#ff2020', border: '#ff2020', bg: 'rgba(255,32,32,0.15)' },
  warn:     { color: '#ffaa00', border: '#ffaa00', bg: 'rgba(255,170,0,0.12)' },
  info:     { color: '#00e8ff', border: '#00e8ff', bg: 'rgba(0,232,255,0.08)' },
};

/** @param {import('@/lib/voice/models').VoiceSessionState} s */
const buildAlerts = (s, radioDevices) => {
  if (!s) return [];
  const alerts = [];

  if (s.emergencyState?.active) {
    alerts.push({ id: 'emergency', sev: 'critical', label: 'EMERGENCY TRAFFIC', blink: true,
      tip: `Opened by ${s.emergencyState.openedBy ?? 'UNKNOWN'}` });
  }

  if (s.connectionHealth === 'disconnected') {
    alerts.push({ id: 'net-down', sev: 'critical', label: 'NET DOWN',
      tip: 'No active voice connection' });
  } else if (s.connectionHealth === 'reconnecting') {
    alerts.push({ id: 'reconnecting', sev: 'warn', label: 'LINK DEGRADED',
      tip: 'Attempting to reconnect' });
  } else if (s.connectionHealth === 'poor') {
    alerts.push({ id: 'poor-link', sev: 'warn', label: 'WEAK SIGNAL',
      tip: 'Poor connection quality' });
  }

  if (s.bridgeStates?.some(b => b.active)) {
    const labels = s.bridgeStates.filter(b => b.active).map(b => b.label).join(', ');
    alerts.push({ id: 'bridge', sev: 'info', label: `BRIDGE ${labels}` });
  }

  const txRadio = radioDevices?.find(r => r.isSelectedTxRadio);
  if (txRadio?.txLocked) {
    alerts.push({ id: 'tx-locked', sev: 'warn', label: 'TX LOCKED',
      tip: `Transmit locked on ${txRadio.label}` });
  }

  if (s.isScanActive) {
    if (s.scanPausedOnNetId) {
      alerts.push({ id: 'scan-hold', sev: 'info', label: 'SCAN HOLD',
        tip: `Traffic on ${s.scanPausedOnNetId}` });
    } else {
      alerts.push({ id: 'scan', sev: 'info', label: 'SCAN ACTIVE' });
    }
  }

  if (s.isMicMuted && !s.isTransmitting) {
    alerts.push({ id: 'mic-muted', sev: 'warn', label: 'MIC MUTED',
      tip: 'Microphone is muted' });
  }

  // Sort: critical → warn → info
  alerts.sort((a, b) => SEV[b.sev] - SEV[a.sev]);
  return alerts;
};

// ─── AnnunciatorItem ────────────────────────────────────────────────────────────

const SEV_ICON = {
  critical: AlertTriangle,
  warn:     AlertCircle,
  info:     Info,
};

function AnnunciatorItem({ label, sev, blink, tip }) {
  const style = SEV_STYLE[sev] ?? SEV_STYLE.info;
  const Icon = SEV_ICON[sev] ?? Info;
  return (
    <div
      title={tip}
      className={blink ? 'threat-blink' : ''}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 7px 1px 5px',
        border: `1px solid ${style.border}`,
        borderRadius: 2,
        background: style.bg,
        fontSize: 9,
        fontFamily: 'Share Tech Mono, monospace',
        fontWeight: 700,
        color: style.color,
        letterSpacing: '0.1em',
        whiteSpace: 'nowrap',
        cursor: tip ? 'help' : 'default',
        userSelect: 'none',
      }}
    >
      <Icon size={9} strokeWidth={2.5} style={{ flexShrink: 0 }} />
      {label}
    </div>
  );
}

// ─── AnnunciatorBar ─────────────────────────────────────────────────────────────

export function AnnunciatorBar() {
  const { voiceSessionState, radioDevices } = useVoiceSession();

  const alerts = useMemo(
    () => buildAlerts(voiceSessionState, radioDevices ?? []),
    [voiceSessionState, radioDevices],
  );

  if (!alerts.length) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 12px',
          background: '#0f0f12',
          borderBottom: '1px solid #1c1c20',
          minHeight: 24,
          flexShrink: 0,
        }}
      >
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#39ff14', opacity: 0.45 }} />
        <span style={{ fontSize: 8, color: '#39ff1455', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.2em' }}>
          SYSTEMS NOMINAL
        </span>
      </div>
    );
  }

  const MAX_VISIBLE = 6;
  const visible = alerts.slice(0, MAX_VISIBLE);
  const overflow = alerts.length - MAX_VISIBLE;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        background: '#0f0f12',
        borderBottom: '1px solid #1c1c20',
        minHeight: 24,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {visible.map(a => (
        <AnnunciatorItem key={a.id} label={a.label} sev={a.sev} blink={a.blink} tip={a.tip} />
      ))}
      {overflow > 0 && (
        <span style={{ fontSize: 9, color: '#776b5f', fontFamily: 'Share Tech Mono, monospace' }}>
          +{overflow}
        </span>
      )}
    </div>
  );
}
