import { useMemo } from "react";
import { T } from "@/components/ui/TerminalCard";
import { useAnimationEnabled } from "@/hooks/use-animation-enabled";

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

function getPinAlpha(pin, now) {
  if (!pin.expires_at) return 1;
  const msLeft = new Date(pin.expires_at).getTime() - now;
  const totalMs = 6 * 3600 * 1000; // assume 6h total
  if (msLeft <= 0) return 0.15;
  return Math.max(0.2, Math.min(1, msLeft / totalMs));
}

export { PIN_COLORS, PIN_ICONS };

export default function MapCanvas({
  canvasRef, pins, playerLocs, playerTrails, myCallsign,
  pendingCoords, routePoints, broadcasts,
  showFog, fogSectors, fogClearable,
  showHeatmap, heatmapPoints,
  placingMode, onClick, onPinClick,
  nowMs,
  hordeSightingType = "",
  rallyPointType = "",
}) {
  const animationEnabled = useAnimationEnabled();
  const now = nowMs ?? Date.now();
  const visiblePlayerLocs = useMemo(
    () => playerLocs.filter((loc) => now - new Date(loc.timestamp).getTime() < 5 * 60 * 1000),
    [playerLocs, now],
  );

  return (
    <div
      ref={canvasRef}
      onClick={onClick}
      className="relative border overflow-hidden select-none"
      style={{
        borderColor: T.border,
        background: "#040a04",
        aspectRatio: "16/10",
        cursor: placingMode ? "crosshair" : "default",
        backgroundImage: `linear-gradient(rgba(57,255,20,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,0.025) 1px, transparent 1px)`,
        backgroundSize: "5% 5%",
      }}
    >
      {/* Grid labels */}
      {[...Array(10)].map((_, i) => (
        <span key={`col-${i}`} className="absolute pointer-events-none" style={{ left: `${i * 10 + 1}%`, top: "1%", color: T.textFaint, fontSize: "8px" }}>
          {String.fromCharCode(65 + i)}
        </span>
      ))}
      {[...Array(8)].map((_, i) => (
        <span key={`row-${i}`} className="absolute pointer-events-none" style={{ top: `${i * 12 + 2}%`, left: "0.4%", color: T.textFaint, fontSize: "8px" }}>
          {i + 1}
        </span>
      ))}
      <div className="absolute top-2 right-2 pointer-events-none" style={{ color: T.textFaint, fontSize: "9px" }}>N↑</div>

      {/* Heatmap blobs */}
      {showHeatmap && heatmapPoints.map((pt, i) => (
        <div key={i} className="absolute pointer-events-none" style={{
          left: `${pt.x}%`, top: `${pt.y}%`,
          width: "60px", height: "60px",
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${pt.color}55 0%, transparent 70%)`,
        }} />
      ))}

      {/* Fog of war sectors (10x8 = 80 sectors) */}
      {showFog && [...Array(10)].map((_, col) => [...Array(8)].map((_, row) => {
        const key = `${col}-${row}`;
        if (fogSectors.has(key)) return null;
        return (
          <div key={key}
            onClick={e => { e.stopPropagation(); fogClearable && fogClearable(key); }}
            className="absolute pointer-events-auto"
            style={{
              left: `${col * 10}%`, top: `${row * 12.5}%`,
              width: "10%", height: "12.5%",
              background: "rgba(0,0,0,0.75)",
              border: "1px solid rgba(57,255,20,0.05)",
              cursor: fogClearable ? "pointer" : "default"
            }} />
        );
      }))}

      {/* Route lines */}
      {routePoints.length > 1 && (
        <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
          {routePoints.map((pt, i) => {
            if (i === 0) return null;
            const prev = routePoints[i - 1];
            return (
              <line key={i}
                x1={`${prev.x}%`} y1={`${prev.y}%`}
                x2={`${pt.x}%`} y2={`${pt.y}%`}
                stroke={T.cyan} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7"
              />
            );
          })}
        </svg>
      )}

      {/* Player trails */}
      {Object.entries(playerTrails).map(([callsign, trail]) => (
        <svg key={callsign} className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
          {trail.map((pt, i) => {
            if (i === 0) return null;
            const prev = trail[i - 1];
            return (
              <line key={i}
                x1={`${prev.x}%`} y1={`${prev.y}%`}
                x2={`${pt.x}%`} y2={`${pt.y}%`}
                stroke={callsign === myCallsign ? T.green : T.cyan}
                strokeWidth="1" opacity={0.15 + (i / trail.length) * 0.5}
                strokeDasharray="2 3"
              />
            );
          })}
        </svg>
      ))}

      {/* Pins */}
      {pins.map(pin => {
        const alpha = getPinAlpha(pin, now);
        const isStale = pin.expires_at && new Date(pin.expires_at).getTime() < now;
        return (
          <button key={pin.id}
            onClick={e => { e.stopPropagation(); onPinClick(pin); }}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform"
            style={{ left: `${pin.x}%`, top: `${pin.y}%`, color: PIN_COLORS[pin.type] || T.textDim, fontSize: "14px", lineHeight: 1, background: "none", border: "none", opacity: alpha }}
            title={`${pin.title}${isStale ? " [STALE]" : ""}`}
          >
            <span style={{ filter: `drop-shadow(0 0 3px ${PIN_COLORS[pin.type]})` }}>{PIN_ICONS[pin.type]}</span>
            {rallyPointType && pin.type === rallyPointType && pin.rally_expires_at && (() => {
              const secsLeft = Math.max(0, Math.round((new Date(pin.rally_expires_at) - now) / 1000));
              return secsLeft > 0 ? (
                <span style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", fontSize: "7px", color: "#ff00ff", whiteSpace: "nowrap" }}>
                  {secsLeft}s
                </span>
              ) : null;
            })()}
            {hordeSightingType && pin.type === hordeSightingType && pin.horde_direction && (
              <span style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", fontSize: "7px", color: T.red }}>
                →{pin.horde_direction}
              </span>
            )}
          </button>
        );
      })}

      {/* Player locations */}
      {visiblePlayerLocs.map(loc => {
        const isMe = loc.player_callsign === myCallsign;
        return (
          <div key={loc.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${loc.x}%`, top: `${loc.y}%` }}>
            <div
              className={animationEnabled ? "layout-nav-dot-pulse" : undefined}
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: isMe ? T.green : T.cyan,
                border: `2px solid ${isMe ? T.green : T.cyan}`,
                boxShadow: `0 0 8px ${isMe ? T.green : T.cyan}`,
                animationDuration: "1.5s",
              }}
            />
            <div style={{ position: "absolute", top: "12px", left: "50%", transform: "translateX(-50%)", color: isMe ? T.green : T.cyan, fontSize: "7px", whiteSpace: "nowrap", textShadow: `0 0 4px ${isMe ? T.green : T.cyan}`, fontFamily: "'Share Tech Mono', monospace" }}>
              {loc.player_callsign}{loc.in_vehicle ? " 🚗" : ""}
            </div>
          </div>
        );
      })}

      {/* Pending placement crosshair */}
      {pendingCoords && (
        <div className="absolute w-3 h-3 border-2 border-white transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
          style={{ left: `${pendingCoords.x}%`, top: `${pendingCoords.y}%` }} />
      )}

      {/* Route waypoints in progress */}
      {routePoints.map((pt, i) => (
        <div key={i} className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${pt.x}%`, top: `${pt.y}%`, width: "8px", height: "8px", borderRadius: "50%", background: T.cyan, border: `1px solid ${T.cyan}`, boxShadow: `0 0 4px ${T.cyan}` }} />
      ))}

      {/* Map broadcasts */}
      {broadcasts.map(b => (
        <div key={b.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${b.x ?? 50}%`, top: `${b.y ?? 50}%`, zIndex: 10 }}>
          <div
            className={animationEnabled ? "threat-blink" : undefined}
            style={{
              background: "rgba(255,0,255,0.12)",
              border: "1px solid #ff00ff",
              color: "#ff00ff",
              fontSize: "9px",
              padding: "3px 8px",
              whiteSpace: "nowrap",
              fontFamily: "'Orbitron', monospace",
              letterSpacing: "0.1em",
            }}
          >
            ⚡ {b.message}
          </div>
        </div>
      ))}
    </div>
  );
}
