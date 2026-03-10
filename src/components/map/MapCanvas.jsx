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

const HORDE_ANGLES = {
  N: 270, NE: 315, E: 0, SE: 45, S: 90, SW: 135, W: 180, NW: 225
};

function getPinAlpha(pin, now) {
  if (!pin.expires_at) return 1;
  const msLeft = new Date(pin.expires_at).getTime() - now;
  const totalMs = 6 * 3600 * 1000;
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
        background: "#060d06",
        aspectRatio: "16/10",
        cursor: placingMode ? "crosshair" : "default",
        backgroundImage: `linear-gradient(rgba(57,255,20,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,0.03) 1px, transparent 1px)`,
        backgroundSize: "5% 5%",
        boxShadow: `inset 0 0 40px rgba(0,0,0,0.6), 0 0 0 1px ${T.border}`,
      }}
    >
      {/* HUD corner brackets */}
      <div style={{ position:"absolute", top:6, left:6, width:16, height:16, borderTop:`1px solid ${T.cyan}77`, borderLeft:`1px solid ${T.cyan}77`, pointerEvents:"none", zIndex:5 }} />
      <div style={{ position:"absolute", top:6, right:6, width:16, height:16, borderTop:`1px solid ${T.cyan}77`, borderRight:`1px solid ${T.cyan}77`, pointerEvents:"none", zIndex:5 }} />
      <div style={{ position:"absolute", bottom:22, left:6, width:16, height:16, borderBottom:`1px solid ${T.cyan}55`, borderLeft:`1px solid ${T.cyan}55`, pointerEvents:"none", zIndex:5 }} />
      <div style={{ position:"absolute", bottom:22, right:6, width:16, height:16, borderBottom:`1px solid ${T.cyan}55`, borderRight:`1px solid ${T.cyan}55`, pointerEvents:"none", zIndex:5 }} />

      {/* Grid intersection dots */}
      <svg className="absolute inset-0 pointer-events-none" style={{ width:"100%", height:"100%", zIndex:1 }}>
        {[...Array(11)].map((_, col) => [...Array(9)].map((_, row) => (
          <circle key={`dot-${col}-${row}`} cx={`${col * 10}%`} cy={`${row * 12.5}%`} r="1.2" fill={T.green} fillOpacity="0.18" />
        )))}
      </svg>

      {/* Grid col labels A–J */}
      {[...Array(10)].map((_, i) => (
        <span key={`col-${i}`} className="absolute pointer-events-none" style={{ left: `${i * 10 + 1}%`, top: "1%", color: T.textGhost, fontSize: "7.5px", zIndex: 3, fontFamily: "'Orbitron', monospace", letterSpacing: "0.05em" }}>
          {String.fromCharCode(65 + i)}
        </span>
      ))}
      {/* Grid row labels 1–8 */}
      {[...Array(8)].map((_, i) => (
        <span key={`row-${i}`} className="absolute pointer-events-none" style={{ top: `${i * 12.5 + 2}%`, left: "0.4%", color: T.textGhost, fontSize: "7.5px", zIndex: 3, fontFamily: "'Orbitron', monospace" }}>
          {i + 1}
        </span>
      ))}

      {/* Compass rose — top-right */}
      <div className="absolute pointer-events-none" style={{ top: 8, right: 10, width: 38, height: 38, zIndex: 5 }}>
        <svg width="38" height="38">
          <line x1="19" y1="4" x2="19" y2="34" stroke={T.textGhost} strokeWidth="0.5" opacity="0.35" />
          <line x1="4" y1="19" x2="34" y2="19" stroke={T.textGhost} strokeWidth="0.5" opacity="0.35" />
          <circle cx="19" cy="19" r="5.5" fill="none" stroke={T.textGhost} strokeWidth="0.5" opacity="0.3" />
          {/* N arrow (red) */}
          <polygon points="19,4 22,15 19,13 16,15" fill={T.red} opacity="0.85" />
          {/* S arrow (dim) */}
          <polygon points="19,34 22,23 19,25 16,23" fill={T.textGhost} opacity="0.3" />
          {/* Center dot */}
          <circle cx="19" cy="19" r="1.5" fill={T.textGhost} opacity="0.5" />
        </svg>
        <span style={{ position:"absolute", top:"-1px", left:"50%", transform:"translateX(-50%)", color:T.red, fontSize:"6px", fontFamily:"'Orbitron', monospace", lineHeight:1, opacity:0.9 }}>N</span>
        <span style={{ position:"absolute", bottom:"-1px", left:"50%", transform:"translateX(-50%)", color:T.textGhost, fontSize:"5.5px", fontFamily:"'Orbitron', monospace", opacity:0.4 }}>S</span>
        <span style={{ position:"absolute", top:"50%", left:"0", transform:"translateY(-50%)", color:T.textGhost, fontSize:"5.5px", fontFamily:"'Orbitron', monospace", opacity:0.4 }}>W</span>
        <span style={{ position:"absolute", top:"50%", right:"0", transform:"translateY(-50%)", color:T.textGhost, fontSize:"5.5px", fontFamily:"'Orbitron', monospace", opacity:0.4 }}>E</span>
      </div>

      {/* Placing-mode scan sweep */}
      {placingMode && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 4 }}>
          <div className="map-scan-sweep" style={{
            height: "1px",
            background: `linear-gradient(90deg, transparent 0%, ${T.amber}55 30%, ${T.amber}cc 50%, ${T.amber}55 70%, transparent 100%)`,
            boxShadow: `0 0 8px ${T.amber}44`,
          }} />
          <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse at 50% 50%, transparent 40%, ${T.amber}07 100%)` }} />
        </div>
      )}

      {/* Heatmap blobs */}
      {showHeatmap && heatmapPoints.map((pt, i) => (
        <div key={i} className="absolute pointer-events-none" style={{
          left: `${pt.x}%`, top: `${pt.y}%`,
          width: "72px", height: "72px",
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${pt.color}66 0%, ${pt.color}22 45%, transparent 70%)`,
          zIndex: 2,
        }} />
      ))}

      {/* Fog of war sectors */}
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
              background: "rgba(0,0,0,0.8)",
              border: "1px solid rgba(57,255,20,0.04)",
              cursor: fogClearable ? "pointer" : "default",
              zIndex: 6,
            }} />
        );
      }))}

      {/* Route lines */}
      {routePoints.length > 1 && (
        <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%", zIndex: 7 }}>
          {routePoints.map((pt, i) => {
            if (i === 0) return null;
            const prev = routePoints[i - 1];
            return (
              <line key={i}
                x1={`${prev.x}%`} y1={`${prev.y}%`}
                x2={`${pt.x}%`} y2={`${pt.y}%`}
                stroke={T.cyan} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.75"
              />
            );
          })}
        </svg>
      )}

      {/* Player trails */}
      {Object.entries(playerTrails).map(([callsign, trail]) => (
        <svg key={callsign} className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%", zIndex: 7 }}>
          {trail.map((pt, i) => {
            if (i === 0) return null;
            const prev = trail[i - 1];
            return (
              <line key={i}
                x1={`${prev.x}%`} y1={`${prev.y}%`}
                x2={`${pt.x}%`} y2={`${pt.y}%`}
                stroke={callsign === myCallsign ? T.green : T.cyan}
                strokeWidth="1" opacity={0.12 + (i / trail.length) * 0.55}
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
        const pinColor = PIN_COLORS[pin.type] || T.textDim;
        return (
          <button key={pin.id}
            onClick={e => { e.stopPropagation(); onPinClick(pin); }}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform"
            style={{ left: `${pin.x}%`, top: `${pin.y}%`, color: pinColor, fontSize: "14px", lineHeight: 1, background: "none", border: "none", opacity: alpha, zIndex: 8 }}
            title={`${pin.title}${isStale ? " [STALE]" : ""}`}
          >
            <span style={{ filter: `drop-shadow(0 0 5px ${pinColor})` }}>{PIN_ICONS[pin.type]}</span>
            {/* Rally countdown */}
            {rallyPointType && pin.type === rallyPointType && pin.rally_expires_at && (() => {
              const secsLeft = Math.max(0, Math.round((new Date(pin.rally_expires_at) - now) / 1000));
              return secsLeft > 0 ? (
                <span style={{ position: "absolute", top: "-11px", left: "50%", transform: "translateX(-50%)", fontSize: "7px", color: "#ff00ff", whiteSpace: "nowrap", background: "rgba(0,0,0,0.75)", padding: "0 3px", border: "1px solid #ff00ff44" }}>
                  {secsLeft}s
                </span>
              ) : null;
            })()}
            {/* Horde direction SVG arrow */}
            {hordeSightingType && pin.type === hordeSightingType && pin.horde_direction && (
              <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)" }}>
                <svg width="10" height="10" style={{ display: "block", transform: `rotate(${HORDE_ANGLES[pin.horde_direction.toUpperCase()] ?? 0}deg)` }}>
                  <polygon points="5,0 9,9 5,7 1,9" fill={T.red} />
                </svg>
              </div>
            )}
          </button>
        );
      })}

      {/* Player locations */}
      {visiblePlayerLocs.map(loc => {
        const isMe = loc.player_callsign === myCallsign;
        const dotColor = isMe ? T.green : T.cyan;
        return (
          <div key={loc.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${loc.x}%`, top: `${loc.y}%`, zIndex: 9 }}>
            {/* Outer ring */}
            {animationEnabled && (
              <div style={{ position:"absolute", top:"-5px", left:"-5px", right:"-5px", bottom:"-5px", borderRadius:"50%", border:`1px solid ${dotColor}55`, animation:"glowDotPulse 2s ease-in-out infinite" }} />
            )}
            <div
              className={animationEnabled ? "layout-nav-dot-pulse" : undefined}
              style={{ width:"10px", height:"10px", borderRadius:"50%", background: dotColor, border:`2px solid ${dotColor}`, boxShadow:`0 0 10px ${dotColor}`, animationDuration:"1.5s" }}
            />
            <div style={{ position:"absolute", top:"13px", left:"50%", transform:"translateX(-50%)", color:dotColor, fontSize:"7px", whiteSpace:"nowrap", textShadow:`0 0 4px ${dotColor}`, fontFamily:"'Share Tech Mono', monospace", background:"rgba(0,0,0,0.6)", padding:"0 3px" }}>
              {loc.player_callsign}{loc.in_vehicle ? " ⊞" : ""}
            </div>
          </div>
        );
      })}

      {/* Pending placement crosshair */}
      {pendingCoords && (
        <div className="absolute pointer-events-none" style={{ left:`${pendingCoords.x}%`, top:`${pendingCoords.y}%`, transform:"translate(-50%,-50%)", zIndex:10 }}>
          <svg width="22" height="22">
            <line x1="11" y1="0" x2="11" y2="7" stroke={T.amber} strokeWidth="1.5" />
            <line x1="11" y1="15" x2="11" y2="22" stroke={T.amber} strokeWidth="1.5" />
            <line x1="0" y1="11" x2="7" y2="11" stroke={T.amber} strokeWidth="1.5" />
            <line x1="15" y1="11" x2="22" y2="11" stroke={T.amber} strokeWidth="1.5" />
            <circle cx="11" cy="11" r="3.5" fill="none" stroke={T.amber} strokeWidth="1" />
            <circle cx="11" cy="11" r="0.8" fill={T.amber} />
          </svg>
          <div style={{ position:"absolute", top:"24px", left:"50%", transform:"translateX(-50%)", color:T.amber, fontSize:"7px", fontFamily:"'Orbitron', monospace", whiteSpace:"nowrap", background:"rgba(0,0,0,0.8)", padding:"1px 5px", border:`1px solid ${T.amber}55` }}>
            {pendingCoords.x.toFixed(1)},{pendingCoords.y.toFixed(1)}
          </div>
        </div>
      )}

      {/* Route waypoints */}
      {routePoints.map((pt, i) => (
        <div key={i} className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left:`${pt.x}%`, top:`${pt.y}%`, zIndex:9 }}>
          <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:T.cyan, border:`1px solid ${T.cyan}`, boxShadow:`0 0 5px ${T.cyan}` }} />
          <span style={{ position:"absolute", top:"-13px", left:"50%", transform:"translateX(-50%)", color:T.cyan, fontSize:"6px", fontFamily:"'Orbitron', monospace", whiteSpace:"nowrap" }}>{i + 1}</span>
        </div>
      ))}

      {/* Map broadcasts */}
      {broadcasts.map(b => (
        <div key={b.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left:`${b.x ?? 50}%`, top:`${b.y ?? 50}%`, zIndex:11 }}>
          <div
            className={animationEnabled ? "threat-blink" : undefined}
            style={{
              background:"rgba(255,0,255,0.14)", border:"1px solid #ff00ff",
              borderTop:"2px solid #ff00ff", color:"#ff00ff",
              fontSize:"9px", padding:"3px 8px", whiteSpace:"nowrap",
              fontFamily:"'Orbitron', monospace", letterSpacing:"0.1em",
              boxShadow:"0 0 14px rgba(255,0,255,0.35)",
            }}
          >
            ⚡ {b.message}
          </div>
        </div>
      ))}

      {/* Bottom telemetry strip */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between pointer-events-none" style={{ padding:"2px 10px", background:"rgba(0,0,0,0.55)", borderTop:`1px solid ${T.border}55`, zIndex:5 }}>
        <span style={{ color:T.textGhost, fontSize:"6.5px", fontFamily:"'Orbitron', monospace", letterSpacing:"0.12em" }}>PINS:{pins.length}</span>
        <span style={{ color:T.textGhost, fontSize:"6.5px", fontFamily:"'Orbitron', monospace", letterSpacing:"0.12em" }}>OPS:{visiblePlayerLocs.length}</span>
        <span style={{ color:T.textGhost, fontSize:"6.5px", fontFamily:"'Orbitron', monospace", letterSpacing:"0.12em" }}>SECTOR:ALPHA</span>
      </div>
    </div>
  );
}