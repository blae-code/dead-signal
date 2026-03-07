/**
 * Shared terminal UI primitives used across all pages.
 * Keeps the design system consistent without inline style chaos.
 */

// ── Rust-apocalypse palette ───────────────────────────────────────────────────
export const T = {
  bg0:      "linear-gradient(135deg, rgba(20, 15, 10, 0.95) 0%, rgba(25, 18, 12, 0.95) 100%)",
  bg1:      "linear-gradient(135deg, rgba(30, 20, 15, 0.9) 0%, rgba(35, 25, 15, 0.9) 100%)",
  bg2:      "linear-gradient(135deg, rgba(40, 30, 20, 0.9) 0%, rgba(45, 32, 18, 0.9) 100%)",
  border:   "#3a2a1a",   // dark rust border
  borderHi: "#4a3a2a",   // medium rust border
  text:     "#b8a890",   // primary text—faded tan
  textDim:  "#8a7a6a",   // secondary—muted brown
  textFaint:"#5a4a3a",   // faint—deep rust
  // status – strictly reserved
  green:    "#39ff14",
  amber:    "#ffb000",
  red:      "#ff2020",
  cyan:     "#00e5ff",
  orange:   "#ff8000",
};

// ── Page header ──────────────────────────────────────────────────────────────
export function PageHeader({ icon: Icon, title, color = T.text, children }) {
  return (
    <div className="flex items-center gap-3 flex-wrap pb-3 mb-1 border-b" 
      style={{ borderColor: T.border, paddingBottom: "1rem", borderBottomWidth: "2px", borderBottomColor: color + "44" }}>
      <Icon size={14} style={{ color }} />
      <span className="text-xs font-bold tracking-widest" style={{ color, fontFamily: "'Orbitron', monospace", letterSpacing: "0.25em" }}>
        {title}
      </span>
      {children && <div className="ml-auto flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

// ── Stat card grid ────────────────────────────────────────────────────────────
export function StatGrid({ stats }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
      {stats.map(({ label, value, color = T.text }) => (
        <div key={label} className="border p-3 text-center" 
          style={{ borderColor: T.border, background: T.bg1, boxShadow: `inset 0 1px 0 rgba(184, 134, 11, 0.2)` }}>
          <div className="text-xs mb-1 tracking-widest" style={{ color: T.textFaint, fontSize: "9px" }}>{label}</div>
          <div className="font-bold text-base" style={{ color, fontFamily: "'Orbitron', monospace" }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Panel (card with optional header) ────────────────────────────────────────
export function Panel({ title, titleColor = T.text, headerRight, accentBorder, children }) {
  return (
    <div className="border" style={{ borderColor: accentBorder || T.border, background: T.bg1 }}>
      {title && (
        <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: T.border }}>
          <span className="text-xs font-bold tracking-widest" style={{ color: titleColor, fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>
            {title}
          </span>
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
    <div className="border p-4 space-y-3" style={{ borderColor: titleColor + "55", background: T.bg1 }}>
      <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: T.border }}>
        <span className="text-xs font-bold tracking-widest" style={{ color: titleColor, fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>
          // {title}
        </span>
        {onClose && (
          <button onClick={onClose} style={{ color: T.textFaint }} className="hover:opacity-70 transition-opacity">
            ✕
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Field label + input wrapper ───────────────────────────────────────────────
export function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs mb-1 tracking-widest" style={{ color: T.textDim, fontSize: "9px" }}>{label}</div>
      {children}
    </div>
  );
}

// ── Shared input styles (use as inline style spreads) ─────────────────────────
export const inputStyle = {
  background: T.bg0,
  borderColor: T.borderHi,
  color: T.text,
  fontSize: "12px",
};

export const selectStyle = {
  background: T.bg0,
  borderColor: T.borderHi,
  color: T.text,
  fontSize: "12px",
};

// ── Pill / Tag button ─────────────────────────────────────────────────────────
export function FilterPill({ label, active, color = T.green, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1 border transition-colors"
      style={{
        borderColor: active ? color : T.border,
        color: active ? color : T.textDim,
        background: active ? color + "11" : "transparent",
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
      className="border flex items-center gap-1 transition-opacity"
      style={{
        borderColor: disabled ? T.border : color,
        color: disabled ? T.textFaint : color,
        background: "transparent",
        fontSize: small ? "10px" : "12px",
        padding: small ? "2px 8px" : "4px 12px",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "'Share Tech Mono', monospace",
      }}
    >
      {children}
    </button>
  );
}

// ── Table header row ──────────────────────────────────────────────────────────
export function TableHeader({ columns, style }) {
  return (
    <div className="grid px-3 py-2 border-b" style={{ ...style, borderColor: T.border }}>
      {columns.map(col => (
        <span key={col} className="text-xs tracking-widest" style={{ color: T.textFaint, fontSize: "9px" }}>{col}</span>
      ))}
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────
export function TableRow({ style, onClick, children }) {
  return (
    <div
      className={`grid px-3 py-2 border-b items-center ${onClick ? "cursor-pointer hover:bg-white hover:bg-opacity-5 transition-colors" : ""}`}
      style={{ ...style, borderColor: T.border + "88" }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ message }) {
  return (
    <div className="px-3 py-6 text-xs text-center" style={{ color: T.textFaint }}>
      // {message}
    </div>
  );
}