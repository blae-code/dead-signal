import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Package, Plus, Trash2, Save, X } from "lucide-react";
import { T, PageHeader, Panel, FormPanel, Field, FilterPill, ActionBtn, TableHeader, TableRow, EmptyState, inputStyle, selectStyle } from "@/components/ui/TerminalCard";

const CATEGORIES = ["Weapon","Ammo","Medical","Food","Water","Tool","Material","Clothing","Misc"];
const CONDITIONS = ["Pristine","Good","Worn","Damaged","Ruined"];
const LOCATIONS  = ["Carried","Stash","Vehicle","Base Storage"];
const CAT_COLORS  = { Weapon: T.red, Ammo: T.orange, Medical: "#ff5555", Food: T.green, Water: T.cyan, Tool: T.amber, Material: T.textDim, Clothing: "#b088ff", Misc: T.textFaint };
const COND_COLORS = { Pristine: T.green, Good: T.green + "88", Worn: T.amber, Damaged: T.orange, Ruined: T.red };

const empty = { item_name: "", category: "Misc", quantity: 1, condition: "Good", weight: 0, location: "Carried", notes: "" };

export default function Inventory() {
  const [items, setItems]       = useState([]);
  const [user, setUser] = useState(null);
  const isAdmin = user?.role === "admin";
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(empty);
  const [editing, setEditing]   = useState(null);
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
      const u = await base44.entities.InventoryItem.update(editing, data);
      setItems(i => i.map(x => x.id === editing ? u : x));
    } else {
      const c = await base44.entities.InventoryItem.create(data);
      setItems(i => [...i, c]);
    }
    setForm(empty); setEditing(null); setShowForm(false);
  };

  const handleDelete = async (id) => { await base44.entities.InventoryItem.delete(id); setItems(i => i.filter(x => x.id !== id)); };
  const handleEdit = (item) => { setForm({ ...item }); setEditing(item.id); setShowForm(true); };

  const filtered = items.filter(i =>
    (filterCat === "ALL" || i.category === filterCat) &&
    (filterLoc === "ALL" || i.location === filterLoc)
  );

  const totalWeight = filtered.reduce((a, i) => a + ((i.weight || 0) * (i.quantity || 1)), 0);
  const totalItems  = filtered.reduce((a, i) => a + (i.quantity || 1), 0);
  const byCategory  = CATEGORIES.reduce((acc, c) => { acc[c] = items.filter(i => i.category === c).length; return acc; }, {});

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <PageHeader icon={Package} title="INVENTORY" color={T.green}>
        {isAdmin && (
          <ActionBtn color={T.green} onClick={() => { setShowForm(!showForm); setEditing(null); setForm(empty); }}>
            <Plus size={10} /> ADD ITEM
          </ActionBtn>
        )}
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "TOTAL ITEMS",   value: totalItems,                                      color: T.green },
          { label: "TOTAL WEIGHT",  value: `${totalWeight.toFixed(1)}kg`,                  color: T.amber },
          { label: "CATEGORIES",    value: Object.values(byCategory).filter(v => v > 0).length, color: T.cyan },
          { label: "LOCATION",      value: filterLoc === "ALL" ? "ALL" : filterLoc.toUpperCase(), color: T.textDim },
        ].map(({ label, value, color }) => (
          <div key={label} className="border p-2.5" style={{ borderColor: T.border, background: T.bg1 }}>
            <div className="text-xs tracking-widest" style={{ color: T.textFaint, fontSize: "9px" }}>{label}</div>
            <div className="text-sm font-bold mt-1" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1.5">
        <FilterPill label="ALL" active={filterCat === "ALL"} color={T.green} onClick={() => setFilterCat("ALL")} />
        {CATEGORIES.filter(c => byCategory[c] > 0).map(c => (
          <FilterPill key={c} label={`${c} (${byCategory[c]})`} active={filterCat === c}
            color={CAT_COLORS[c]} onClick={() => setFilterCat(filterCat === c ? "ALL" : c)} />
        ))}
      </div>

      {/* Location filter */}
      <div className="flex gap-1.5 flex-wrap">
        <FilterPill label="ALL LOCATIONS" active={filterLoc === "ALL"} color={T.green} onClick={() => setFilterLoc("ALL")} />
        {LOCATIONS.map(l => (
          <FilterPill key={l} label={l} active={filterLoc === l} color={T.textDim} onClick={() => setFilterLoc(filterLoc === l ? "ALL" : l)} />
        ))}
      </div>

      {showForm && isAdmin && (
        <FormPanel title={editing ? "EDIT ITEM" : "ADD ITEM"} onClose={() => { setShowForm(false); setEditing(null); setForm(empty); }}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Field label="ITEM NAME *">
                <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
                  value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} placeholder="e.g. AK-47" />
              </Field>
            </div>
            <Field label="QTY">
              <input type="number" min="1" className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
                value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
            </Field>
            <Field label="CATEGORY">
              <select className="w-full text-xs px-2 py-1.5 border outline-none" style={selectStyle}
                value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="CONDITION">
              <select className="w-full text-xs px-2 py-1.5 border outline-none" style={selectStyle}
                value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="LOCATION">
              <select className="w-full text-xs px-2 py-1.5 border outline-none" style={selectStyle}
                value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}>
                {LOCATIONS.map(l => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="WEIGHT (kg)">
              <input type="number" step="0.1" className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
                value={form.weight} onChange={e => setForm(f => ({ ...f, weight: parseFloat(e.target.value) || 0 }))} />
            </Field>
          </div>
          <ActionBtn color={T.green} onClick={handleSave}>
            <Save size={10} /> {editing ? "UPDATE" : "ADD TO INVENTORY"}
          </ActionBtn>
        </FormPanel>
      )}

      <Panel>
        <TableHeader columns={["ITEM", "CAT", "QTY", "COND", "LOC", "WEIGHT", ""]}
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 56px" }} />
        {filtered.length === 0
          ? <EmptyState message="INVENTORY EMPTY" />
          : filtered.map(item => (
            <TableRow key={item.id} style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 56px" }}>
              <span className="text-xs font-bold truncate" style={{ color: T.text }}>{item.item_name}</span>
              <span className="text-xs" style={{ color: CAT_COLORS[item.category] || T.textDim }}>{item.category}</span>
              <span className="text-xs" style={{ color: T.text }}>×{item.quantity}</span>
              <span className="text-xs" style={{ color: COND_COLORS[item.condition] }}>{item.condition}</span>
              <span className="text-xs" style={{ color: T.textDim }}>{item.location}</span>
              <span className="text-xs" style={{ color: T.textFaint }}>{((item.weight || 0) * (item.quantity || 1)).toFixed(1)}kg</span>
              {isAdmin && (
              <div className="flex justify-end gap-1">
                <button onClick={() => handleEdit(item)} className="p-1 hover:opacity-80"><Package size={10} style={{ color: T.textDim }} /></button>
                <button onClick={() => handleDelete(item.id)} className="p-1 hover:opacity-80"><Trash2 size={10} style={{ color: T.red + "88" }} /></button>
              </div>
              )}
            </TableRow>
          ))
        }
      </Panel>
    </div>
  );
}