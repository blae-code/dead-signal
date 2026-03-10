import { T, Panel, ActionBtn, EmptyState } from "@/components/ui/TerminalCard";

const toGridLabel = (x, y) => {
  const col = String.fromCharCode(65 + Math.min(9, Math.floor(x / 10)));
  const row = Math.min(8, Math.floor(y / 12.5)) + 1;
  return `${col}${row}`;
};

const PIN_COLORS = {
  "Loot Cache": T.amber, "Safe House": T.green, "Danger Zone": T.red,
  "Resource Node": T.cyan, "Enemy Sighting": T.red, "Clan Base": T.green,
  "Vehicle Spawn": T.cyan, "Objective": T.orange, "Horde Sighting": "#ff2020",
  "Rally Point": "#ff00ff", "Route Waypoint": T.textDim, "Other": T.textDim
};
const PIN_ICONS = {
  "Loot Cache": "◆", "Safe House": "⌂", "Danger Zone": "☢",
  "Resource Node": "◉", "Enemy Sighting": "☠", "Clan Base": "⚑",
  "Vehicle Spawn": "⊞", "Objective": "✦", "Horde Sighting": "🧟",
  "Rally Point": "★", "Route Waypoint": "◈", "Other": "●"
};
const STATUS_COLORS = { Fresh: T.green, Looted: T.textDim, Unknown: T.amber, Active: T.cyan, Cleared: T.textFaint };

export default function MapSidebar({ pins, playerLocs, myCallsign, routePoints, onPinClick, onClearRoute, onSaveRoute, nowMs }) {
  const now = nowMs ?? Date.now();
  const activeLocs = playerLocs;


  return (
    <div className="space-y-3">
      {/* Route builder */}
      {routePoints.length > 0 && (
        <Panel title={`ROUTE (${routePoints.length} WPT)`} titleColor={T.cyan}>
          <div className="px-3 py-2 space-y-2">
            {routePoints.map((pt, i) => (
              <div key={i} className="text-xs flex items-center gap-2" style={{ color: T.textDim }}>
                <span style={{ color: T.cyan }}>WPT{i + 1}</span> X{pt.x.toFixed(1)} Y{pt.y.toFixed(1)}
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <ActionBtn color={T.green} onClick={onSaveRoute} small>SAVE ROUTE</ActionBtn>
              <ActionBtn color={T.red} onClick={onClearRoute} small>CLEAR</ActionBtn>
            </div>
          </div>
        </Panel>
      )}

      {/* Online players */}
      {activeLocs.length > 0 && (
        <Panel title={`ONLINE (${activeLocs.length})`} titleColor={T.cyan}>
          <div className="overflow-y-auto" style={{ maxHeight: "110px" }}>
            {activeLocs.map(loc => {
              const isMe = loc.player_callsign === myCallsign;
              const dotColor = isMe ? T.green : T.cyan;
              const elapsed = Math.floor((now - new Date(loc.timestamp).getTime()) / 1000);
              const timeStr = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m`;
              return (
                <div key={loc.id} className="relative flex items-center gap-2 px-3 py-1.5 border-b" style={{ borderColor: T.border + "44" }}>
                  <div style={{ position:"absolute", left:0, top:"10%", bottom:"10%", width:"2px", background: dotColor, boxShadow:`0 0 4px ${dotColor}` }} />
                  <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:dotColor, boxShadow:`0 0 6px ${dotColor}`, flexShrink:0, animation:"glowDotPulse 2s ease-in-out infinite" }} />
                  <span className="text-xs flex-1 truncate" style={{ color: isMe ? T.green : T.text, fontSize:"10px" }}>{loc.player_callsign}</span>
                  {loc.in_vehicle && <span style={{ color:T.amber, fontSize:"7px", border:`1px solid ${T.amber}55`, padding:"0 3px", background:`${T.amber}10` }}>VEH</span>}
                  <span style={{ color:T.textGhost, fontSize:"7px", fontFamily:"'Orbitron', monospace" }}>{timeStr}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Active pins list */}
      <Panel title={`PINS (${pins.length})`}>
        <div className="overflow-y-auto" style={{ maxHeight: "280px" }}>
          {pins.length === 0
            ? <EmptyState message="NO PINS" />
            : pins.map(pin => {
                const isStale = pin.expires_at && new Date(pin.expires_at).getTime() < now;
                const pinColor = PIN_COLORS[pin.type] || T.textDim;
                const statusColor = STATUS_COLORS[pin.status] || T.textFaint;
                const grid = (pin.x != null && pin.y != null) ? toGridLabel(pin.x, pin.y) : null;
                return (
                  <button key={pin.id} onClick={() => onPinClick(pin)}
                    className="w-full text-left px-3 py-2 border-b relative flex items-center gap-2 transition-colors"
                    style={{ borderColor: T.border + "44", opacity: isStale ? 0.45 : 1, background:"transparent" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Left accent */}
                    <div style={{ position:"absolute", left:0, top:"10%", bottom:"10%", width:"2px", background:pinColor, boxShadow:`0 0 4px ${pinColor}88` }} />
                    <span style={{ color:pinColor, fontSize:"11px", flexShrink:0, filter:`drop-shadow(0 0 3px ${pinColor})` }}>{PIN_ICONS[pin.type]}</span>
                    <span className="flex-1 truncate" style={{ color:isStale ? T.textFaint : T.text, fontSize:"10px" }}>{pin.title}</span>
                    {grid && <span style={{ color:T.textGhost, fontSize:"7px", fontFamily:"'Orbitron', monospace", border:`1px solid ${T.border}`, padding:"0 3px", flexShrink:0 }}>{grid}</span>}
                    {isStale && <span style={{ color:T.red, fontSize:"7px", border:`1px solid ${T.red}44`, padding:"0 3px" }}>STALE</span>}
                    <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:statusColor, boxShadow:`0 0 4px ${statusColor}`, flexShrink:0 }} />
                  </button>
                );
              })
          }
        </div>
      </Panel>
    </div>
  );
}