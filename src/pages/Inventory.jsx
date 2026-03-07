import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Package, Plus, Trash2, Save, X, Filter } from "lucide-react";

const CATEGORIES = ["Weapon", "Ammo", "Medical", "Food", "Water", "Tool", "Material", "Clothing", "Misc"];
const CONDITIONS = ["Pristine", "Good", "Worn", "Damaged", "Ruined"];
const LOCATIONS = ["Carried", "Stash", "Vehicle", "Base Storage"];
const CAT_COLORS = { Weapon: "#ff2020", Ammo: "#ff8000", Medical: "#ff5555", Food: "#39ff14", Water: "#00e5ff", Tool: "#ffb000", Material: "#888", Clothing: "#b088ff", Misc: "#555" };
const COND_COLORS = { Pristine: "#39ff14", Good: "#39ff1488", Worn: "#ffb000", Damaged: "#ff8000", Ruined: "#ff2020" };

const emptyItem = { item_name: "", category: "Misc", quantity: 1, condition: "Good", weight: 0, location: "Carried", notes: "" };

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyItem);
  const [editing, setEditing] = useState(null);
  const [filterCat, setFilterCat] = useState("ALL");
  const [filterLoc, setFilterLoc] = useState("ALL");

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      base44.entities.InventoryItem.filter({ owner_email: u.email }).then(setItems).catch(() => {});
    }).catch(() => {
      base44.entities.InventoryItem.list("-created_date").then(setItems).catch(() => {});
    });
  }, []);

  const handleSave = async () => {
    if (!form.item_name.trim()) return;
    const data = { ...form, owner_email: user?.email };
    if (editing) {
      const updated = await base44.entities.InventoryItem.update(editing, data);
      setItems(i => i.map(x => x.id === editing ? updated : x));
    } else {
      const created = await base44.entities.InventoryItem.create(data);
      setItems(i => [...i, created]);
    }
    setForm(emptyItem);
    setEditing(null);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.InventoryItem.delete(id);
    setItems(i => i.filter(x => x.id !== id));
  };

  const handleEdit = (item) => {
    setForm({ ...item });
    setEditing(item.id);
    setShowForm(true);
  };

  const filtered = items.filter(i =>
    (filterCat === "ALL" || i.category === filterCat) &&
    (filterLoc === "ALL" || i.location === filterLoc)
  );

  const totalWeight = filtered.reduce((a, i) => a + ((i.weight || 0) * (i.quantity || 1)), 0);
  const totalItems = filtered.reduce((a, i) => a + (i.quantity || 1), 0);

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat).length;
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <Package size={16} style={{ color: "#39ff14" }} />
        <span className="text-sm font-bold tracking-widest" style={{ color: "#39ff14", fontFamily: "'Orbitron', monospace" }}>INVENTORY</span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyItem); }}
            className="text-xs px-3 py-1 border flex items-center gap-1"
            style={{ borderColor: "#39ff14", color: "#39ff14" }}>
            <Plus size={11} /> ADD ITEM
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "TOTAL ITEMS", value: totalItems, color: "#39ff14" },
          { label: "TOTAL WEIGHT", value: `${totalWeight.toFixed(1)}kg`, color: "#ffb000" },
          { label: "CATEGORIES", value: Object.values(byCategory).filter(v => v > 0).length, color: "#00e5ff" },
          { label: "LOCATION", value: filterLoc === "ALL" ? "ALL" : filterLoc, color: "#39ff1088" },
        ].map(({ label, value, color }) => (
          <div key={label} className="border p-2" style={{ borderColor: "#1e3a1e", background: "#060606" }}>
            <div className="text-xs" style={{ color: "#39ff1044" }}>{label}</div>
            <div className="text-sm font-bold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.filter(c => byCategory[c] > 0).map(c => (
          <button key={c} onClick={() => setFilterCat(filterCat === c ? "ALL" : c)}
            className="text-xs px-2 py-1 border"
            style={{ borderColor: filterCat === c ? CAT_COLORS[c] : "#1e3a1e", color: filterCat === c ? CAT_COLORS[c] : "#39ff1044" }}>
            {c} ({byCategory[c]})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select className="text-xs px-2 py-1 border bg-black" style={{ borderColor: "#1e3a1e", color: "#39ff14" }}
          value={filterLoc} onChange={e => setFilterLoc(e.target.value)}>
          <option value="ALL">ALL LOCATIONS</option>
          {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="border p-4 space-y-3" style={{ borderColor: "#39ff14", background: "#060606" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold" style={{ color: "#39ff14" }}>// {editing ? "EDIT ITEM" : "ADD ITEM"}</span>
            <button onClick={() => { setShowForm(false); setEditing(null); setForm(emptyItem); }}><X size={12} style={{ color: "#39ff1044" }} /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>ITEM NAME *</div>
              <input className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} placeholder="e.g. AK-47" />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>QTY</div>
              <input type="number" min="1" className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>CATEGORY</div>
              <select className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>CONDITION</div>
              <select className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>LOCATION</div>
              <select className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}>
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>WEIGHT (kg)</div>
              <input type="number" step="0.1" className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.weight} onChange={e => setForm(f => ({ ...f, weight: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <button onClick={handleSave} className="text-xs px-4 py-1 border flex items-center gap-1"
            style={{ borderColor: "#39ff14", color: "#39ff14" }}>
            <Save size={11} /> {editing ? "UPDATE" : "ADD TO INVENTORY"}
          </button>
        </div>
      )}

      {/* Items table */}
      <div className="border" style={{ borderColor: "#1e3a1e", background: "#060606" }}>
        <div className="grid text-xs px-3 py-2 border-b" style={{ borderColor: "#1e3a1e", color: "#39ff1055", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 60px" }}>
          <span>ITEM</span><span>CAT</span><span>QTY</span><span>COND</span><span>LOC</span><span>WEIGHT</span><span></span>
        </div>
        {filtered.length === 0
          ? <div className="p-4 text-xs" style={{ color: "#39ff1033" }}>// INVENTORY EMPTY</div>
          : filtered.map(item => (
            <div key={item.id} className="grid px-3 py-2 border-b items-center"
              style={{ borderColor: "#0f1f0f", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 60px" }}>
              <span className="text-xs font-bold truncate" style={{ color: "#39ff14" }}>{item.item_name}</span>
              <span className="text-xs" style={{ color: CAT_COLORS[item.category] || "#888" }}>{item.category}</span>
              <span className="text-xs" style={{ color: "#39ff14" }}>x{item.quantity}</span>
              <span className="text-xs" style={{ color: COND_COLORS[item.condition] }}>{item.condition}</span>
              <span className="text-xs" style={{ color: "#39ff1066" }}>{item.location}</span>
              <span className="text-xs" style={{ color: "#39ff1044" }}>{((item.weight || 0) * (item.quantity || 1)).toFixed(1)}kg</span>
              <div className="flex justify-end gap-1">
                <button onClick={() => handleEdit(item)} className="p-1"><Package size={10} style={{ color: "#39ff1066" }} /></button>
                <button onClick={() => handleDelete(item.id)} className="p-1"><Trash2 size={10} style={{ color: "#ff202066" }} /></button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}