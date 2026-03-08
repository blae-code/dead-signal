import { T, Panel, ActionBtn } from "@/components/ui/TerminalCard";
import { Trash2, X } from "lucide-react";

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

export default function PinDetail({ pin, isAdmin, onClose, onStatusCycle, onDelete }) {
  const isStale = pin.expires_at && new Date(pin.expires_at).getTime() < Date.now();
  const expiresIn = pin.expires_at ? Math.round((new Date(pin.expires_at) - Date.now()) / 60000) : null;

  return (
    <Panel accentBorder={PIN_COLORS[pin.type]}>
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: PIN_COLORS[pin.type] }}>
            {PIN_ICONS[pin.type]} {pin.title}
          </span>
          <button onClick={onClose} style={{ color: T.textFaint }}><X size={11} /></button>
        </div>

        <div className="text-xs" style={{ color: T.textDim }}>TYPE: {pin.type}</div>

        {pin.type === "Horde Sighting" && (
          <div className="text-xs space-y-1" style={{ color: T.red }}>
            {pin.horde_size > 0 && <div>SIZE: ~{pin.horde_size} infected</div>}
            {pin.horde_direction && <div>MOVING: {pin.horde_direction}</div>}
          </div>
        )}

        {pin.type === "Rally Point" && pin.rally_expires_at && (() => {
          const secsLeft = Math.max(0, Math.round((new Date(pin.rally_expires_at) - Date.now()) / 1000));
          return <div className="text-xs" style={{ color: "#ff00ff" }}>RALLY IN: {secsLeft}s</div>;
        })()}

        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: T.textFaint }}>STATUS:</span>
          <button onClick={onStatusCycle}
            className="text-xs px-2 py-0.5 border transition-colors"
            style={{ borderColor: STATUS_COLORS[pin.status], color: STATUS_COLORS[pin.status] }}>
            {pin.status}
          </button>
        </div>

        {isStale && (
          <div className="text-xs px-2 py-1 border" style={{ borderColor: T.red + "55", color: T.red, background: T.red + "11" }}>
            ⚠ STALE — INTEL MAY BE OUTDATED
          </div>
        )}
        {!isStale && expiresIn !== null && (
          <div className="text-xs" style={{ color: T.textFaint }}>
            EXPIRES: {expiresIn > 60 ? `${Math.round(expiresIn/60)}h` : `${expiresIn}m`}
          </div>
        )}

        {pin.note && <p className="text-xs" style={{ color: T.textDim }}>{pin.note}</p>}
        <div className="text-xs" style={{ color: T.textFaint }}>COORDS: X{pin.x?.toFixed(1)} Y{pin.y?.toFixed(1)}</div>
        {pin.placed_by && <div className="text-xs" style={{ color: T.textFaint }}>BY: {pin.placed_by}</div>}

        {isAdmin && (
          <ActionBtn color={T.red} onClick={onDelete}>
            <Trash2 size={10} /> REMOVE PIN
          </ActionBtn>
        )}
      </div>
    </Panel>
  );
}