import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Map, Send, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WebGLMapRenderer from '@/components/map/WebGLMapRenderer';
import { PageHeader, Panel, T, ActionBtn, Field, inputStyle } from '@/components/ui/TerminalCard';

export default function ClanMap() {
  const [user, setUser] = useState(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastType, setBroadcastType] = useState('tactical');
  const [selectedSquad, setSelectedSquad] = useState(null);
  const [mapImageUrl, setMapImageUrl] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Real-time data
  const { data: positions = [] } = useQuery({
    queryKey: ['clanPositions'],
    queryFn: () => base44.entities.ClanPosition.list(),
  });

  const { data: overlays = [] } = useQuery({
    queryKey: ['tacticalOverlays'],
    queryFn: () => base44.entities.TacticalOverlay.list(),
  });

  const { data: broadcasts = [] } = useQuery({
    queryKey: ['clanBroadcasts'],
    queryFn: () => base44.entities.ClanBroadcast.filter({ expires_at: { $gte: new Date().toISOString() } }),
  });

  const { data: squads = [] } = useQuery({
    queryKey: ['squadStatus'],
    queryFn: () => base44.entities.SquadStatus.list(),
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const unsub1 = base44.entities.ClanPosition.subscribe((event) => {
      // Component will refetch via useQuery when data changes
    });
    const unsub2 = base44.entities.TacticalOverlay.subscribe(() => {});
    const unsub3 = base44.entities.ClanBroadcast.subscribe(() => {});
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim() || !user) return;
    const myPos = positions.find(p => p.player_email === user.email);
    const x = myPos?.x || 50;
    const y = myPos?.y || 50;
    
    await base44.entities.ClanBroadcast.create({
      message: broadcastMsg,
      x, y,
      sent_by: user.full_name || user.email,
      broadcast_type: broadcastType,
      expires_at: new Date(Date.now() + 60000).toISOString(),
    });
    setBroadcastMsg('');
  };

  const activeSquads = squads.filter(s => s.mission_status === 'active');

  return (
    <div className="p-4 space-y-3 max-w-full mx-auto" style={{ minHeight: 'calc(100vh - 48px)' }}>
      <PageHeader icon={Map} title="CLAN COORDINATION MAP" color={T.cyan} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: 'calc(100vh - 140px)' }}>
        {/* Map */}
        <div className="lg:col-span-3 space-y-2" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ border: `1px solid ${T.border}`, background: T.bg1, overflow: 'hidden', flex: 1, minHeight: '400px' }}>
            <WebGLMapRenderer 
              positions={positions}
              overlays={overlays}
              broadcasts={broadcasts}
              mapWidth={100}
              mapHeight={100}
              mapImageUrl={mapImageUrl}
            />
          </div>
          <div style={{ border: `1px solid ${T.border}`, padding: '12px', background: T.bg1 }}>
            <Field label="MAP IMAGE URL">
              <input
                type="text"
                value={mapImageUrl || ''}
                onChange={(e) => setMapImageUrl(e.target.value)}
                placeholder="Paste your game map image URL here..."
                style={{ ...inputStyle, width: '100%', fontSize: '11px' }}
              />
            </Field>
            <div style={{ fontSize: '8px', color: T.textFaint, marginTop: '6px' }}>
              Use a 1:1 aspect ratio image. Coordinates: (0,0) = bottom-left, ({`${100},${100}`}) = top-right
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {/* Broadcast */}
          <Panel title="BROADCAST" titleColor={T.amber}>
            <div className="space-y-2 p-3">
              <Field label="TYPE">
                <select
                  value={broadcastType}
                  onChange={(e) => setBroadcastType(e.target.value)}
                  style={inputStyle}
                  className="w-full text-xs"
                >
                  <option value="tactical">Tactical</option>
                  <option value="emergency">Emergency</option>
                  <option value="intel">Intel</option>
                  <option value="rally">Rally</option>
                  <option value="all_clear">All Clear</option>
                </select>
              </Field>
              <Field label="MESSAGE">
                <textarea
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  style={inputStyle}
                  className="w-full text-xs h-20 resize-none"
                  placeholder="Broadcast message..."
                />
              </Field>
              <ActionBtn color={T.amber} onClick={handleBroadcast} disabled={!broadcastMsg.trim()}>
                <Send size={10} /> SEND
              </ActionBtn>
            </div>
          </Panel>

          {/* Active Squads */}
          <Panel title={`SQUADS (${activeSquads.length})`} titleColor={T.green}>
            <div className="space-y-2 p-3">
              {activeSquads.length === 0 ? (
                <div style={{ color: T.textFaint, fontSize: '9px' }}>No active squads</div>
              ) : (
                activeSquads.map(squad => (
                  <motion.button
                    key={squad.id}
                    onClick={() => setSelectedSquad(squad)}
                    className="w-full text-left p-2 border transition-all"
                    style={{
                      borderColor: selectedSquad?.id === squad.id ? T.green : T.border,
                      background: selectedSquad?.id === squad.id ? T.green + '12' : 'transparent',
                      color: T.text,
                      fontSize: '9px',
                    }}
                    whileHover={{ x: 2 }}
                  >
                    <div style={{ color: T.green, fontWeight: 'bold' }}>{squad.squad_name}</div>
                    <div style={{ color: T.textFaint, marginTop: '3px' }}>
                      {squad.member_count} members · Health: {squad.health_avg.toFixed(0)}%
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </Panel>

          {/* Squad Detail */}
          {selectedSquad && (
            <Panel title={selectedSquad.squad_name} titleColor={T.cyan} accentBorder={T.cyan}>
              <div className="space-y-2 p-3 text-xs">
                <div>
                  <div style={{ color: T.textFaint }}>Leader</div>
                  <div style={{ color: T.text }}>{selectedSquad.leader_callsign}</div>
                </div>
                <div>
                  <div style={{ color: T.textFaint }}>Morale</div>
                  <div style={{ color: T.text, textTransform: 'capitalize' }}>{selectedSquad.morale}</div>
                </div>
                <div>
                  <div style={{ color: T.textFaint }}>Ammo Avg</div>
                  <div style={{ color: selectedSquad.ammo_avg < 30 ? T.red : T.green }}>
                    {selectedSquad.ammo_avg.toFixed(0)}%
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {/* Active Broadcasts */}
          {broadcasts.length > 0 && (
            <Panel title={`BROADCASTS (${broadcasts.length})`} titleColor={T.amber}>
              <div className="space-y-1 p-3">
                {broadcasts.slice(0, 5).map(b => (
                  <div key={b.id} style={{ fontSize: '8px', color: T.textDim, borderLeft: `2px solid ${T.amber}`, paddingLeft: '6px', marginBottom: '4px' }}>
                    <div style={{ color: T.amber }}>{b.sent_by}</div>
                    <div>{b.message}</div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}