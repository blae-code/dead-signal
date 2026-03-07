import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Map, Plus, Trash2, Filter, X, Save } from "lucide-react";

const PIN_TYPES = ["Loot Cache", "Safe House", "Danger Zone", "Resource Node", "Enemy Sighting", "Clan Base", "Vehicle Spawn", "Objective", "Other"];
const PIN_COLORS = {
  "Loot Cache": "#ffb000",
  "Safe House": "#39ff14",
  "Danger Zone": "#ff2020",
  "Resource Node": "#00e5ff",
  "Enemy Sighting": "#ff2020",
  "Clan Base": "#39ff14",
  "Vehicle Spawn": "#00e5ff",
  "Objective": "#ff8000",
  "Other": "#888",
};
const PIN_ICONS = {
  "Loot Cache": "◆", "Safe House": "⌂", "Danger Zone": "☢", "Resource Node": "◉",
  "Enemy Sighting": "☠", "Clan Base": "⚑", "Vehicle Spawn": "⊞", "Objective": "✦", "Other": "●",
};

const STATUS_COLORS = { Fresh: "#39ff14", Looted: "#555", Unknown: "#ffb000", Active: "#00e5ff", Cleared: "#39ff1444" };

export default function TacticalMap() {
  const canvasRef = useRef(null);
  const [pins, setPins] = useState([]);
  const [placing, setPlacing] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [filterType, setFilterType] = useState("ALL");
  const [newPin, setNewPin] = useState({ title: "", type: "Loot Cache", note: "", status: "Unknown" });
  const [pendingCoords, setPendingCoords] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.MapPin.list("-created_date", 100).then(setPins).catch(() => {});
    const unsub = base44.entities.MapPin.subscribe(ev => {
      if (ev.type === "create") setPins(p => [...p, ev.data]);
      if (ev.type === "update") setPins(p => p.map(x => x.id === ev.id ? ev.data : x));
      if (ev.type === "delete") setPins(p => p.filter(x => x.id !== ev.id));
    });
    return unsub;
  }, []);

  const handleMapClick = (e) => {
    if (!placing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingCoords({ x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) });
    setShowForm(true);
    setPlacing(false);
  };

  const handleSavePin = async () => {
    if (!newPin.title.trim() || !pendingCoords) return;
    const pin = { ...newPin, ...pendingCoords, placed_by: user?.full_name || user?.email || "Unknown" };
    const saved = await base44.entities.MapPin.create(pin);
    setPins(p => [...p, saved]);
    setNewPin({ title: "", type: "Loot Cache", note: "", status: "Unknown" });
    setPendingCoords(null);
    setShowForm(false);
  };

  const handleDeletePin = async (id) => {
    await base44.entities.MapPin.delete(id);
    setPins(p => p.filter(x => x.id !== id));
    setSelectedPin(null);
  };

  const handleStatusCycle = async (pin) => {
    const statuses = ["Unknown", "Fresh", "Looted", "Active", "Cleared"];
    const next = statuses[(statuses.indexOf(pin.status) + 1) % statuses.length];
    const updated = await base44.entities.MapPin.update(pin.id, { status: next });
    setPins(p => p.map(x => x.id === pin.id ? updated : x));
    setSelectedPin(updated);
  };

  const filteredPins = filterType === "ALL" ? pins : pins.filter(p => p.type === filterType);

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <Map size={16} style={{ color: "#00e5ff" }} />
        <span className="text-sm font-bold tracking-widest" style={{ color: "#00e5ff", fontFamily: "'Orbitron', monospace" }}>TACTICAL MAP</span>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <select
            className="text-xs px-2 py-1 border bg-black"
            style={{ borderColor: "#1e3a1e", color: "#39ff14" }}
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="ALL">ALL TYPES</option>
            {PIN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={() => { setPlacing(!placing); setShowForm(false); }}
            className="text-xs px-3 py-1 border flex items-center gap-1"
            style={{ borderColor: placing ? "#ffb000" : "#39ff14", color: placing ? "#ffb000" : "#39ff14" }}
          >
            <Plus size={11} /> {placing ? "CANCEL PLACE" : "DROP PIN"}
          </button>
        </div>
      </div>

      {placing && (
        <div className="text-xs px-3 py-2 border" style={{ borderColor: "#ffb000", color: "#ffb000", background: "#1a0f00" }}>
          ⚠ CLICK ON MAP TO PLACE PIN
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map canvas */}
        <div className="lg:col-span-2">
          <div
            ref={canvasRef}
            onClick={handleMapClick}
            className="relative border overflow-hidden"
            style={{
              borderColor: "#1e3a1e",
              background: "#050f05",
              aspectRatio: "16/10",
              cursor: placing ? "crosshair" : "default",
              backgroundImage: `
                linear-gradient(rgba(57,255,20,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(57,255,20,0.03) 1px, transparent 1px)
              `,
              backgroundSize: "5% 5%",
            }}
          >
            {/* Grid labels */}
            {[...Array(10)].map((_, i) => (
              <span key={`col-${i}`} className="absolute text-xs" style={{ left: `${i * 10 + 1}%`, top: "1%", color: "#39ff1422", fontSize: "8px" }}>
                {String.fromCharCode(65 + i)}
              </span>
            ))}
            {[...Array(8)].map((_, i) => (
              <span key={`row-${i}`} className="absolute text-xs" style={{ top: `${i * 12 + 2}%`, left: "0.5%", color: "#39ff1422", fontSize: "8px" }}>
                {i + 1}
              </span>
            ))}

            {/* Compass */}
            <div className="absolute top-2 right-2 text-xs" style={{ color: "#39ff1455" }}>N↑</div>

            {/* Pins */}
            {filteredPins.map(pin => (
              <button
                key={pin.id}
                onClick={e => { e.stopPropagation(); setSelectedPin(pin === selectedPin ? null : pin); }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform"
                style={{ left: `${pin.x}%`, top: `${pin.y}%`, color: PIN_COLORS[pin.type] || "#888", fontSize: "14px", lineHeight: 1, background: "none", border: "none" }}
                title={pin.title}
              >
                <span style={{ filter: `drop-shadow(0 0 4px ${PIN_COLORS[pin.type]})` }}>{PIN_ICONS[pin.type]}</span>
              </button>
            ))}

            {/* Pending pin indicator */}
            {pendingCoords && (
              <div className="absolute w-3 h-3 border-2 border-white transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                style={{ left: `${pendingCoords.x}%`, top: `${pendingCoords.y}%` }} />
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2">
            {PIN_TYPES.map(t => (
              <div key={t} className="flex items-center gap-1">
                <span style={{ color: PIN_COLORS[t], fontSize: "10px" }}>{PIN_ICONS[t]}</span>
                <span className="text-xs" style={{ color: "#39ff1444" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: pin form / details */}
        <div className="space-y-3">
          {/* New pin form */}
          {showForm && (
            <div className="border p-3 space-y-2" style={{ borderColor: "#39ff14", background: "#060606" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: "#39ff14" }}>// NEW PIN</span>
                <button onClick={() => { setShowForm(false); setPendingCoords(null); }}><X size={12} style={{ color: "#39ff1455" }} /></button>
              </div>
              <input className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                placeholder="Title..." value={newPin.title} onChange={e => setNewPin(p => ({ ...p, title: e.target.value }))} />
              <select className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={newPin.type} onChange={e => setNewPin(p => ({ ...p, type: e.target.value }))}>
                {PIN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={newPin.status} onChange={e => setNewPin(p => ({ ...p, status: e.target.value }))}>
                {["Fresh", "Looted", "Unknown", "Active", "Cleared"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea className="w-full text-xs px-2 py-1 border bg-black resize-none" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                rows={2} placeholder="Notes..." value={newPin.note} onChange={e => setNewPin(p => ({ ...p, note: e.target.value }))} />
              <button onClick={handleSavePin} className="w-full text-xs py-1 border flex items-center justify-center gap-1"
                style={{ borderColor: "#39ff14", color: "#39ff14" }}>
                <Save size={11} /> SAVE PIN
              </button>
            </div>
          )}

          {/* Selected pin details */}
          {selectedPin && !showForm && (
            <div className="border p-3 space-y-2" style={{ borderColor: PIN_COLORS[selectedPin.type] || "#39ff14", background: "#060606" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: PIN_COLORS[selectedPin.type] }}>
                  {PIN_ICONS[selectedPin.type]} {selectedPin.title}
                </span>
                <button onClick={() => setSelectedPin(null)}><X size={12} style={{ color: "#39ff1455" }} /></button>
              </div>
              <div className="text-xs" style={{ color: "#39ff1466" }}>TYPE: {selectedPin.type}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "#39ff1066" }}>STATUS:</span>
                <button onClick={() => handleStatusCycle(selectedPin)} className="text-xs px-2 py-0.5 border"
                  style={{ borderColor: STATUS_COLORS[selectedPin.status], color: STATUS_COLORS[selectedPin.status] }}>
                  {selectedPin.status}
                </button>
              </div>
              {selectedPin.note && <div className="text-xs" style={{ color: "#39ff1488" }}>{selectedPin.note}</div>}
              <div className="text-xs" style={{ color: "#39ff1033" }}>
                COORDS: X{selectedPin.x?.toFixed(1)} Y{selectedPin.y?.toFixed(1)}
              </div>
              {selectedPin.placed_by && <div className="text-xs" style={{ color: "#39ff1033" }}>BY: {selectedPin.placed_by}</div>}
              <button onClick={() => handleDeletePin(selectedPin.id)}
                className="w-full text-xs py-1 border flex items-center justify-center gap-1 mt-1"
                style={{ borderColor: "#ff2020", color: "#ff2020" }}>
                <Trash2 size={11} /> REMOVE PIN
              </button>
            </div>
          )}

          {/* Pin list */}
          <div className="border" style={{ borderColor: "#1e3a1e", background: "#060606" }}>
            <div className="px-3 py-2 border-b text-xs font-bold" style={{ borderColor: "#1e3a1e", color: "#39ff14" }}>
              ACTIVE PINS ({filteredPins.length})
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "300px" }}>
              {filteredPins.length === 0
                ? <div className="p-3 text-xs" style={{ color: "#39ff1033" }}>// NO PINS</div>
                : filteredPins.map(pin => (
                  <button key={pin.id} onClick={() => setSelectedPin(pin)}
                    className="w-full text-left px-3 py-2 border-b hover:bg-green-950 transition-colors"
                    style={{ borderColor: "#0f1f0f" }}>
                    <div className="flex items-center gap-2">
                      <span style={{ color: PIN_COLORS[pin.type], fontSize: "12px" }}>{PIN_ICONS[pin.type]}</span>
                      <span className="text-xs flex-1 truncate" style={{ color: "#39ff14" }}>{pin.title}</span>
                      <span className="text-xs" style={{ color: STATUS_COLORS[pin.status] }}>●</span>
                    </div>
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}