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
            {activeLocs.map(loc => (
              <div key={loc.id} className="flex items-center gap-2 px-3 py-1.5 border-b" style={{ borderColor: T.border + "44" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: loc.player_callsign === myCallsign ? T.green : T.cyan, boxShadow: `0 0 4px ${T.cyan}`, flexShrink: 0 }} />
                <span className="text-xs flex-1 truncate" style={{ color: loc.player_callsign === myCallsign ? T.green : T.text }}>{loc.player_callsign}</span>
                {loc.in_vehicle && <span style={{ color: T.amber, fontSize: "8px" }}>VEH</span>}
              </div>
            ))}
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
                return (
                  <button key={pin.id} onClick={() => onPinClick(pin)}
                    className="w-full text-left px-3 py-2 border-b flex items-center gap-2 hover:bg-white hover:bg-opacity-5 transition-colors"
                    style={{ borderColor: T.border + "55", opacity: isStale ? 0.5 : 1 }}>
                    <span style={{ color: PIN_COLORS[pin.type], fontSize: "11px" }}>{PIN_ICONS[pin.type]}</span>
                    <span className="text-xs flex-1 truncate" style={{ color: isStale ? T.textFaint : T.text }}>{pin.title}</span>
                    {isStale && <span style={{ color: T.red, fontSize: "7px" }}>STALE</span>}
                    <span style={{ color: STATUS_COLORS[pin.status], fontSize: "7px" }}>●</span>
                  </button>
                );
              })
          }
        </div>
      </Panel>
    </div>
  );
}