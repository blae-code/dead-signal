/**
 * Dead Signal — shared terminal UI primitives + design system
 * Full-spectrum colour unlock: deep, rich, layered.
 */

// ── Extended palette ──────────────────────────────────────────────────────────
export const T = {
  // ── Backgrounds (deep & layered for maximum contrast)
  bg0:  "#0a0806",  // page background
  bg1:  "#1c1e21",  // primary card (ServerMonitor standard)
  bg2:  "#252930",  // secondary card (slightly lighter)
  bg3:  "#2e333f",  // tertiary card

  // ── Borders (deep with bright accent options)
  border:   "#2a1e10",
  borderHi: "#3e2c18",
  borderBt: "#4e3a22",  // bright touch

  // ── Text (warm, readable)
  text:      "#e8dcc8",
  textDim:   "#c0aa88",
  textFaint: "#7a6a52",
  textGhost: "#3a2e20",

  // ── Status — military/industrial spectrum (pure, high-saturation)
  green:   "#39ff14",   // phosphor green (operational / clear)
  amber:   "#ffaa00",   // command amber (standby / caution)
  red:     "#ff2020",   // hard red (critical / danger)
  cyan:    "#00d4e8",   // steel cyan (server / comms)
  orange:  "#ff6600",   // hazard orange (warning / elevated)
  olive:   "#a8c820",   // field olive (intel / secondary)
  steel:   "#4ab8d4",   // cold steel (network / data)
  teal:    "#00b896",   // military teal (logistics / supply)
  gold:    "#d4a800",   // tactical gold (high-value / loot)

  // ── Semantic shortcuts
  online:  "#39ff14",
  offline: "#ff2020",
  warn:    "#ffaa00",
  info:    "#00d4e8",
  ai:      "#a8c820",

  // ── Shadows (layered depth)
  shadow0: "0 2px 4px rgba(0,0,0,0.3)",
  shadow1: "0 4px 12px rgba(0,0,0,0.5)",
  shadow2: "0 8px 24px rgba(0,0,0,0.7)",
  shadow3: "0 16px 40px rgba(0,0,0,0.9)",
};

// ── Panel top-hairline gradient ───────────────────────────────────────────────
export function accentLine(color) {
  return {
    position: "absolute", top: 0, left: 0, right: 0, height: "1px",
    background: `linear-gradient(90deg, transparent 0%, ${color}66 40%, ${color}aa 50%, ${color}66 60%, transparent 100%)`,
    pointerEvents: "none",
  };
}

// ── Page header ───────────────────────────────────────────────────────────────
export function PageHeader({ icon: Icon, title, color = T.amber, children }) {
  return (
    <div
      className="relative flex items-center gap-3 flex-wrap px-4 py-3 overflow-hidden"
      style={{
        border: `1px solid ${color}44`,
        background: `linear-gradient(135deg, ${color}0f 0%, #0a080600 60%)`,
        boxShadow: `inset 0 1px 0 ${color}28, inset 0 -1px 0 rgba(0,0,0,0.4), 0 6px 20px ${color}18`,
      }}
    >
      <div style={accentLine(color)} />
      {/* Corner bracket */}
      <div style={{ position: "absolute", top: 4, left: 4, width: 8, height: 8, borderTop: `1px solid ${color}66`, borderLeft: `1px solid ${color}66` }} />
      <div style={{ position: "absolute", bottom: 4, right: 4, width: 8, height: 8, borderBottom: `1px solid ${color}33`, borderRight: `1px solid ${color}33` }} />

      <div style={{
        width: "24px", height: "24px",
        border: `1px solid ${color}55`,
        background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 8px ${color}22`,
        flexShrink: 0,
      }}>
        <Icon size={11} style={{ color }} />
      </div>

      <span style={{
        color,
        fontFamily: "'Orbitron', monospace",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.26em",
        textShadow: `0 0 14px ${color}66`,
      }}>
        {title}
      </span>

      {children && (
        <div className="ml-auto flex items-center gap-2 flex-wrap">{children}</div>
      )}
    </div>
  );
}

// ── Stat card grid ────────────────────────────────────────────────────────────
export function StatGrid({ stats }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
      {stats.map(({ label, value, color = T.amber, sub }) => (
        <div
          key={label}
          className="relative text-center overflow-hidden"
          style={{
            border: `1px solid ${color}33`,
            background: `linear-gradient(160deg, ${color}0a 0%, #0a080600 100%)`,
            padding: "12px 8px 10px",
            boxShadow: `inset 0 1px 0 ${color}18`,
          }}
        >
          <div style={accentLine(color)} />
          {/* Corner glow */}
          <div style={{ position: "absolute", top: 0, left: 0, width: 24, height: 24, background: `radial-gradient(circle at 0 0, ${color}18, transparent 70%)` }} />
          <div style={{ color: T.textFaint, fontSize: "7.5px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.2em", marginBottom: "6px" }}>{label}</div>
          <div style={{ color, fontFamily: "'Orbitron', monospace", fontSize: "22px", fontWeight: "bold", lineHeight: 1, textShadow: `0 0 16px ${color}77` }}>
            {value}
          </div>
          {sub && <div style={{ color: color + "88", fontSize: "7px", marginTop: "4px", letterSpacing: "0.1em" }}>{sub}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────
export function Panel({ title, titleColor = T.amber, headerRight, accentBorder, children }) {
  const accent = accentBorder || (titleColor ? titleColor : T.amber);
  return (
    <div
      className="relative overflow-hidden"
      style={{
        border: `1px solid ${accent}33`,
        background: T.bg1,
        boxShadow: `inset 0 1px 0 ${accent}22, inset 0 -1px 0 rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.7), 0 0 20px ${accent}12`,
      }}
    >
      <div style={accentLine(accent)} />
      {title && (
        <div
          className="flex items-center justify-between px-3 py-2 border-b"
          style={{ borderColor: T.border, background: `${accent}07` }}
        >
          <div className="flex items-center gap-2">
            <div style={{ width: "3px", height: "12px", background: accent, boxShadow: `0 0 5px ${accent}` }} />
            <span style={{ color: accent, fontFamily: "'Orbitron', monospace", fontSize: "9.5px", letterSpacing: "0.2em", textShadow: `0 0 8px ${accent}55` }}>
              {title}
            </span>
          </div>
          {headerRight}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Form panel ────────────────────────────────────────────────────────────────
export function FormPanel({ title, titleColor = T.green, onClose, children }) {
  return (
    <div
      className="relative border p-4 space-y-3 overflow-hidden"
      style={{ borderColor: titleColor + "44", background: T.bg1 }}
    >
      <div style={accentLine(titleColor)} />
      <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: T.border }}>
        <div className="flex items-center gap-2">
          <div style={{ width: "3px", height: "12px", background: titleColor, boxShadow: `0 0 5px ${titleColor}` }} />
          <span style={{ color: titleColor, fontFamily: "'Orbitron', monospace", fontSize: "9.5px", letterSpacing: "0.2em", textShadow: `0 0 8px ${titleColor}55` }}>
            // {title}
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ color: T.textFaint, fontSize: "12px" }} className="hover:opacity-70 transition-opacity">
            ✕
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Field label ───────────────────────────────────────────────────────────────
export function Field({ label, children }) {
  return (
    <div>
      <div style={{ color: T.textFaint, fontSize: "8px", letterSpacing: "0.18em", fontFamily: "'Orbitron', monospace", marginBottom: "4px" }}>{label}</div>
      {children}
    </div>
  );
}

// ── Input / select styles ─────────────────────────────────────────────────────
export const inputStyle = {
  background: "rgba(10, 7, 4, 0.95)",
  borderColor: T.borderHi,
  color: T.text,
  fontSize: "12px",
  boxShadow: `inset 0 1px 3px rgba(0,0,0,0.6)`,
};

export const selectStyle = {
  background: "rgba(10, 7, 4, 0.95)",
  borderColor: T.borderHi,
  color: T.text,
  fontSize: "12px",
  boxShadow: `inset 0 1px 3px rgba(0,0,0,0.6)`,
};

// ── Filter pill ───────────────────────────────────────────────────────────────
export function FilterPill({ label, active, color = T.green, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1 border transition-all"
      style={{
        borderColor: active ? color : T.border,
        color: active ? color : T.textFaint,
        background: active ? `${color}18` : "transparent",
        boxShadow: active ? `0 0 8px ${color}33` : "none",
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "10px",
      }}
    >
      {label}
    </button>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────
export function ActionBtn({ color = T.green, onClick, disabled, children, small }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative border flex items-center gap-1.5 overflow-hidden transition-opacity"
      style={{
        borderColor: disabled ? T.border : color + "77",
        color: disabled ? T.textFaint : color,
        background: disabled ? "transparent" : `${color}0f`,
        fontSize: small ? "9px" : "11px",
        padding: small ? "3px 9px" : "5px 14px",
        opacity: disabled ? 0.4 : 1,
        fontFamily: "'Orbitron', monospace",
        letterSpacing: "0.1em",
        boxShadow: disabled ? "none" : `0 0 10px ${color}22`,
        textShadow: disabled ? "none" : `0 0 6px ${color}66`,
      }}
    >
      {!disabled && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: `linear-gradient(90deg, transparent, ${color}66, transparent)` }} />}
      {children}
    </button>
  );
}

// ── Table header ──────────────────────────────────────────────────────────────
export function TableHeader({ columns, style }) {
  return (
    <div className="grid px-3 py-2 border-b" style={{ ...style, borderColor: T.border, background: "rgba(0,0,0,0.3)" }}>
      {columns.map(col => (
        <span key={col} style={{ color: T.textFaint, fontSize: "7.5px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.18em" }}>
          {col}
        </span>
      ))}
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────
export function TableRow({ style, onClick, accentColor, children }) {
  return (
    <div
      className={`grid px-3 py-2 border-b items-center relative ${onClick ? "cursor-pointer transition-colors" : ""}`}
      style={{ ...style, borderColor: T.border + "66" }}
      onClick={onClick}
      onMouseEnter={onClick ? (e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; } : undefined}
      onMouseLeave={onClick ? (e) => { e.currentTarget.style.background = "transparent"; } : undefined}
    >
      {accentColor && (
        <div style={{ position: "absolute", left: 0, top: "15%", bottom: "15%", width: "2px", background: accentColor, boxShadow: `0 0 4px ${accentColor}` }} />
      )}
      {children}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ message }) {
  return (
    <div
      className="px-3 py-8 text-center"
      style={{ color: T.textGhost, fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.2em", background: "rgba(0,0,0,0.2)" }}
    >
      // {message}
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────
export function SectionDivider({ label, color = T.textFaint }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${color}44, transparent)` }} />
      {label && <span style={{ color, fontSize: "7px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.22em" }}>{label}</span>}
      <div style={{ flex: 1, height: "1px", background: `linear-gradient(270deg, ${color}44, transparent)` }} />
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ label, color }) {
  return (
    <span style={{
      color,
      border: `1px solid ${color}55`,
      background: `${color}12`,
      fontSize: "7.5px",
      fontFamily: "'Orbitron', monospace",
      letterSpacing: "0.12em",
      padding: "1px 6px",
      boxShadow: `0 0 6px ${color}22`,
    }}>
      {label}
    </span>
  );
}

// ── Glow dot ──────────────────────────────────────────────────────────────────
export function GlowDot({ color, size = 6, pulse = false }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {pulse && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: color, opacity: 0.4,
          animation: "glowDotPulse 2s ease-in-out infinite",
        }} />
      )}
      <div style={{
        position: "absolute", inset: "1px", borderRadius: "50%",
        background: color,
        boxShadow: `0 0 ${size}px ${color}`,
      }} />
    </div>
  );
}