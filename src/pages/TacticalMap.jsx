import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Map, Plus, Trash2, X, Save, Radio, RadioTower } from "lucide-react";
import { T, PageHeader, Panel, FormPanel, Field, ActionBtn, EmptyState, inputStyle, selectStyle } from "@/components/ui/TerminalCard";

const PIN_TYPES = ["Loot Cache","Safe House","Danger Zone","Resource Node","Enemy Sighting","Clan Base","Vehicle Spawn","Objective","Other"];
const PIN_COLORS = { "Loot Cache": T.amber, "Safe House": T.green, "Danger Zone": T.red, "Resource Node": T.cyan, "Enemy Sighting": T.red, "Clan Base": T.green, "Vehicle Spawn": T.cyan, "Objective": T.orange, "Other": T.textDim };
const PIN_ICONS  = { "Loot Cache": "◆", "Safe House": "⌂", "Danger Zone": "☢", "Resource Node": "◉", "Enemy Sighting": "☠", "Clan Base": "⚑", "Vehicle Spawn": "⊞", "Objective": "✦", "Other": "●" };
const STATUS_COLORS = { Fresh: T.green, Looted: T.textDim, Unknown: T.amber, Active: T.cyan, Cleared: T.textFaint };

export default function TacticalMap() {
  const canvasRef = useRef(null);
  const [pins, setPins]           = useState([]);
  const [playerLocs, setPlayerLocs] = useState([]);
  const [placing, setPlacing]     = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [filterType, setFilterType]   = useState("ALL");
  const [newPin, setNewPin]       = useState({ title: "", type: "Loot Cache", note: "", status: "Unknown" });
  const [pendingCoords, setPendingCoords] = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [user, setUser] = useState(null);
  const [sharing, setSharing]     = useState(false);
  const [myCallsign, setMyCallsign] = useState("");
  const sharingRef = useRef(false);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      // Try to find callsign from ClanMember
      if (u) {
        base44.entities.ClanMember.filter({ user_email: u.email }).then(members => {
          setMyCallsign(members?.[0]?.callsign || u.full_name || u.email);
        }).catch(() => setMyCallsign(u.full_name || u.email));
      }
    }).catch(() => {});

    base44.entities.MapPin.list("-created_date", 100).then(setPins).catch(() => {});
    base44.entities.PlayerLocation.list("-timestamp", 50).then(setPlayerLocs).catch(() => {});

    const unsubPins = base44.entities.MapPin.subscribe(ev => {
      if (ev.type === "create") setPins(p => [...p, ev.data]);
      if (ev.type === "update") setPins(p => p.map(x => x.id === ev.id ? ev.data : x));
      if (ev.type === "delete") setPins(p => p.filter(x => x.id !== ev.id));
    });
    const unsubLocs = base44.entities.PlayerLocation.subscribe(ev => {
      if (ev.type === "create") setPlayerLocs(p => [...p, ev.data]);
      if (ev.type === "update") setPlayerLocs(p => p.map(x => x.id === ev.id ? ev.data : x));
      if (ev.type === "delete") setPlayerLocs(p => p.filter(x => x.id !== ev.id));
    });
    return () => { unsubPins(); unsubLocs(); };
  }, []);

  // Throttled location broadcast — every 10 seconds while sharing is on
  useEffect(() => {
    sharingRef.current = sharing;
  }, [sharing]);

  useEffect(() => {
    if (!sharing || !myCallsign) return;
    const broadcast = () => {
      if (!sharingRef.current) return;
      // Use a random position in map space as a placeholder — in a real game this would
      // come from the game client. Here we store the last manually clicked position or center.
      // Players can click the map to update their position while sharing is active.
    };
    broadcast();
    const interval = setInterval(broadcast, 10000);
    return () => clearInterval(interval);
  }, [sharing, myCallsign]);

  const pushMyLocation = async (x, y) => {
    if (!myCallsign) return;
    try {
      await base44.functions.invoke("updatePlayerLocation", { x, y, callsign: myCallsign, in_vehicle: false });
    } catch (e) { /* silent */ }
  };

  const handleMapClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = parseFloat(((e.clientX - rect.left) / rect.width * 100).toFixed(2));
    const y = parseFloat(((e.clientY - rect.top) / rect.height * 100).toFixed(2));

    if (sharing) {
      // Update this player's location on click while sharing
      pushMyLocation(x, y);
      return;
    }
    if (!placing || !isAdmin) return;
    setPendingCoords({ x, y });
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
      <PageHeader icon={Map} title="TACTICAL MAP" color={T.cyan}>
        <select className="text-xs px-2 py-1.5 border outline-none" style={{ ...selectStyle, minWidth: "120px" }}
          value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="ALL">ALL TYPES</option>
          {PIN_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <ActionBtn color={sharing ? T.green : T.textDim}
          onClick={() => setSharing(s => !s)}>
          {sharing ? <RadioTower size={10} /> : <Radio size={10} />}
          {sharing ? "SHARING POS" : "SHARE POS"}
        </ActionBtn>
        {isAdmin && (
          <ActionBtn color={placing ? T.amber : T.cyan} onClick={() => { setPlacing(!placing); setShowForm(false); }}>
            <Plus size={10} /> {placing ? "CANCEL" : "DROP PIN"}
          </ActionBtn>
        )}
      </PageHeader>

      {placing && (
        <div className="text-xs px-3 py-2 border" style={{ borderColor: T.amber + "88", color: T.amber, background: T.amber + "0d" }}>
          ⚠ CLICK ON THE MAP TO PLACE PIN
        </div>
      )}
      {sharing && (
        <div className="text-xs px-3 py-2 border" style={{ borderColor: T.green + "88", color: T.green, background: T.green + "0d" }}>
          ● LOCATION SHARING ACTIVE — CLICK MAP TO UPDATE YOUR POSITION
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map canvas */}
        <div className="lg:col-span-2 space-y-2">
          <div
            ref={canvasRef}
            onClick={handleMapClick}
            className="relative border overflow-hidden"
            style={{
              borderColor: T.border,
              background: "#040a04",
              aspectRatio: "16/10",
              cursor: placing ? "crosshair" : "default",
              backgroundImage: `linear-gradient(rgba(57,255,20,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,0.025) 1px, transparent 1px)`,
              backgroundSize: "5% 5%",
            }}
          >
            {[...Array(10)].map((_, i) => (
              <span key={`col-${i}`} className="absolute" style={{ left: `${i * 10 + 1}%`, top: "1%", color: T.textFaint, fontSize: "8px", letterSpacing: "0.05em" }}>
                {String.fromCharCode(65 + i)}
              </span>
            ))}
            {[...Array(8)].map((_, i) => (
              <span key={`row-${i}`} className="absolute" style={{ top: `${i * 12 + 2}%`, left: "0.4%", color: T.textFaint, fontSize: "8px" }}>
                {i + 1}
              </span>
            ))}
            <div className="absolute top-2 right-2 text-xs font-bold" style={{ color: T.textFaint, fontSize: "9px", letterSpacing: "0.1em" }}>N↑</div>

            {filteredPins.map(pin => (
              <button key={pin.id}
                onClick={e => { e.stopPropagation(); setSelectedPin(pin === selectedPin ? null : pin); }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform"
                style={{ left: `${pin.x}%`, top: `${pin.y}%`, color: PIN_COLORS[pin.type] || T.textDim, fontSize: "14px", lineHeight: 1, background: "none", border: "none" }}
                title={pin.title}
              >
                <span style={{ filter: `drop-shadow(0 0 3px ${PIN_COLORS[pin.type]})` }}>{PIN_ICONS[pin.type]}</span>
              </button>
            ))}

            {pendingCoords && (
              <div className="absolute w-3 h-3 border-2 border-white transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                style={{ left: `${pendingCoords.x}%`, top: `${pendingCoords.y}%` }} />
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {PIN_TYPES.map(t => (
              <div key={t} className="flex items-center gap-1">
                <span style={{ color: PIN_COLORS[t], fontSize: "9px" }}>{PIN_ICONS[t]}</span>
                <span style={{ color: T.textFaint, fontSize: "9px" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {showForm && (
            <FormPanel title="NEW PIN" onClose={() => { setShowForm(false); setPendingCoords(null); }}>
              <Field label="TITLE">
                <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
                  placeholder="Title..." value={newPin.title} onChange={e => setNewPin(p => ({ ...p, title: e.target.value }))} />
              </Field>
              <Field label="TYPE">
                <select className="w-full text-xs px-2 py-1.5 border outline-none" style={selectStyle}
                  value={newPin.type} onChange={e => setNewPin(p => ({ ...p, type: e.target.value }))}>
                  {PIN_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="STATUS">
                <select className="w-full text-xs px-2 py-1.5 border outline-none" style={selectStyle}
                  value={newPin.status} onChange={e => setNewPin(p => ({ ...p, status: e.target.value }))}>
                  {["Fresh","Looted","Unknown","Active","Cleared"].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="NOTES">
                <textarea className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none resize-none" style={inputStyle}
                  rows={2} placeholder="Notes..." value={newPin.note} onChange={e => setNewPin(p => ({ ...p, note: e.target.value }))} />
              </Field>
              <ActionBtn color={T.green} onClick={handleSavePin}>
                <Save size={10} /> SAVE PIN
              </ActionBtn>
            </FormPanel>
          )}

          {selectedPin && !showForm && (
            <Panel accentBorder={PIN_COLORS[selectedPin.type]}>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: PIN_COLORS[selectedPin.type] }}>
                    {PIN_ICONS[selectedPin.type]} {selectedPin.title}
                  </span>
                  <button onClick={() => setSelectedPin(null)} style={{ color: T.textFaint }}><X size={11} /></button>
                </div>
                <div className="text-xs" style={{ color: T.textDim }}>TYPE: {selectedPin.type}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: T.textFaint }}>STATUS:</span>
                  <button onClick={() => handleStatusCycle(selectedPin)}
                    className="text-xs px-2 py-0.5 border transition-colors"
                    style={{ borderColor: STATUS_COLORS[selectedPin.status], color: STATUS_COLORS[selectedPin.status] }}>
                    {selectedPin.status}
                  </button>
                </div>
                {selectedPin.note && <p className="text-xs" style={{ color: T.textDim }}>{selectedPin.note}</p>}
                <div className="text-xs" style={{ color: T.textFaint }}>COORDS: X{selectedPin.x?.toFixed(1)} Y{selectedPin.y?.toFixed(1)}</div>
                {selectedPin.placed_by && <div className="text-xs" style={{ color: T.textFaint }}>BY: {selectedPin.placed_by}</div>}
                {isAdmin && (
                  <ActionBtn color={T.red} onClick={() => handleDeletePin(selectedPin.id)}>
                    <Trash2 size={10} /> REMOVE PIN
                  </ActionBtn>
                )}
              </div>
            </Panel>
          )}

          <Panel title={`ACTIVE PINS (${filteredPins.length})`}>
            <div className="overflow-y-auto" style={{ maxHeight: "300px" }}>
              {filteredPins.length === 0
                ? <EmptyState message="NO PINS" />
                : filteredPins.map(pin => (
                  <button key={pin.id} onClick={() => setSelectedPin(pin)}
                    className="w-full text-left px-3 py-2 border-b flex items-center gap-2 hover:bg-white hover:bg-opacity-5 transition-colors"
                    style={{ borderColor: T.border + "55" }}>
                    <span style={{ color: PIN_COLORS[pin.type], fontSize: "11px" }}>{PIN_ICONS[pin.type]}</span>
                    <span className="text-xs flex-1 truncate" style={{ color: T.text }}>{pin.title}</span>
                    <span style={{ color: STATUS_COLORS[pin.status], fontSize: "7px" }}>●</span>
                  </button>
                ))
              }
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}