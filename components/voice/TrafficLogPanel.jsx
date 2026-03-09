/**
 * DEAD SIGNAL — TrafficLogPanel
 * Radio operations traffic log. Shows timestamped events with direction, callsign, and net.
 */
import React, { useState, useMemo } from 'react';
import { ArrowDownLeft, ArrowUpRight, Info, Radio, AlertTriangle, Link, Trash2 } from 'lucide-react';
import { useVoiceSession } from '@/hooks/voice/useVoiceSession';
import { voiceNetResolver } from '@/lib/voice/voiceNetResolver';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (ts) => {
  if (!ts) return '--:--:--';
  const d = new Date(ts);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':');
};

const TYPE_CONFIG = {
  rx:        { color: '#39ff14', Icon: ArrowDownLeft, label: 'RX' },
  tx:        { color: '#ff2020', Icon: ArrowUpRight,  label: 'TX' },
  system:    { color: '#00e8ff', Icon: Info,           label: 'SYS' },
  scan:      { color: '#ffaa00', Icon: Radio,          label: 'SCN' },
  direct:    { color: '#e8b800', Icon: Radio,          label: 'DIR' },
  emergency: { color: '#ff2020', Icon: AlertTriangle,  label: 'EMG' },
  bridge:    { color: '#b060ff', Icon: Link,           label: 'BRG' },
};

const FILTERS = ['ALL', 'RX', 'TX', 'SYSTEM'];

// ─── Log Entry Row ─────────────────────────────────────────────────────────────

function LogEntry({ event }) {
  const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.system;
  const { Icon, color, label } = cfg;
  const netName = event.netId ? (voiceNetResolver.getNetById(event.netId)?.displayName ?? event.netId) : null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '52px 30px 90px 1fr',
        gap: 6,
        alignItems: 'center',
        padding: '3px 8px',
        fontSize: 10,
        fontFamily: 'Share Tech Mono, monospace',
        borderBottom: '1px solid rgba(42,30,16,0.4)',
      }}
    >
      {/* Timestamp */}
      <span style={{ color: '#4e3a22', whiteSpace: 'nowrap' }}>{fmtTime(event.timestamp)}</span>

      {/* Type icon + label */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 3, color }}>
        <Icon size={10} />
        <span style={{ fontSize: 8 }}>{label}</span>
      </span>

      {/* Callsign */}
      <span style={{ color: '#eee5d6', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {(event.actorCallsign ?? '?').toUpperCase()}
      </span>

      {/* Net + outcome */}
      <span style={{ color: '#a79b8f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {netName ? netName : (event.metadata?.message ?? '')}
      </span>
    </div>
  );
}

// ─── TrafficLogPanel ──────────────────────────────────────────────────────────

export function TrafficLogPanel({ maxHeight = 300 }) {
  const { voiceSessionState } = useVoiceSession();
  const events = voiceSessionState?.recentVoiceEvents ?? [];

  const [filter, setFilter] = useState('ALL');
  const [clearedAt, setClearedAt] = useState(0);

  // Events are newest-first (prepended in useVoiceSession), so newest is always at top.
  const filtered = useMemo(() => {
    const base = clearedAt ? events.filter(e => (e.timestamp ?? 0) > clearedAt) : events;
    if (filter === 'ALL') return base;
    return base.filter(e => e.type?.toUpperCase() === filter || e.direction?.toUpperCase() === filter);
  }, [events, filter, clearedAt]);

  const clearLog = () => setClearedAt(Date.now());

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#18181c',
        border: '1px solid #2a1e10',
        borderRadius: 4,
        overflow: 'hidden',
        fontFamily: 'Share Tech Mono, monospace',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          background: '#1c1c20',
          borderBottom: '1px solid #2a1e10',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#ffaa00' }}>TRAFFIC LOG</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: 8, padding: '1px 6px', borderRadius: 2, cursor: 'pointer',
                border: `1px solid ${filter === f ? '#00e8ff' : '#2a1e10'}`,
                color: filter === f ? '#00e8ff' : '#776b5f',
                background: filter === f ? 'rgba(0,232,255,0.1)' : 'transparent',
                fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.06em',
              }}
            >
              {f}
            </button>
          ))}
          <button
            onClick={clearLog}
            title="Clear log"
            style={{
              display: 'flex', alignItems: 'center', padding: '1px 5px', borderRadius: 2, cursor: 'pointer',
              border: '1px solid #2a1e10', color: '#4e3a22', background: 'transparent',
              fontFamily: 'Share Tech Mono, monospace', lineHeight: 1,
            }}
          >
            <Trash2 size={8} />
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div
        style={{
          maxHeight,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: '16px 10px', color: '#4e3a22', fontSize: 10, textAlign: 'center' }}>
            NO RECENT TRAFFIC
          </div>
        ) : (
          filtered.map((event, i) => <LogEntry key={`${event.timestamp}-${i}`} event={event} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
