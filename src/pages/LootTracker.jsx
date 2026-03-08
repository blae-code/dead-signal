import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Package, Plus, Trash2 } from "lucide-react";
import { T, PageHeader, Panel, FormPanel, Field, FilterPill, ActionBtn, TableHeader, TableRow, EmptyState } from "@/components/ui/TerminalCard";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";

const pickByToken = (values, token) =>
  values.find((value) => typeof value === "string" && value.toLowerCase() === token) || "";
const pickFirst = (values) => values.find((value) => typeof value === "string" && value.trim()) || "";
const pickFirstNonAll = (values) =>
  values.find((value) => typeof value === "string" && value.toLowerCase() !== "all") || pickFirst(values);

const buildEmpty = (cats, conditions) => ({
  item_name: "",
  category: pickFirstNonAll(cats),
  quantity: 1,
  condition: pickFirst(conditions),
  location_name: "",
  x: "",
  y: "",
  notes: "",
});

const COND_COLORS = { Pristine: T.green, Good: T.cyan, Worn: T.amber, Damaged: T.orange, Ruined: T.red };

export default function LootTracker() {
  const runtimeConfig = useRuntimeConfig();
  const CATS = runtimeConfig.getArray(["taxonomy", "loot_categories"]);
  const CONDITIONS = runtimeConfig.getArray(["taxonomy", "inventory_conditions"]);
  const allFilter = pickByToken(CATS, "all") || pickFirst(CATS);
  const [user, setUser] = useState(null);
  const [finds, setFinds] = useState([]);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => buildEmpty(CATS, CONDITIONS));

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const data = await base44.entities.LootFind.filter({ player_email: u.email }, "-created_date", 200);
      setFinds(data);
    };
    load();
  }, []);

  useEffect(() => {
    if (!filter && allFilter) setFilter(allFilter);
  }, [allFilter, filter]);

  useEffect(() => {
    if (!form.category || !form.condition) {
      setForm((prev) => ({ ...prev, ...buildEmpty(CATS, CONDITIONS) }));
    }
  }, [CATS, CONDITIONS, form.category, form.condition]);

  const handleSave = async () => {
    const entry = { ...form, player_email: user.email, quantity: Number(form.quantity) || 1 };
    if (form.x) entry.x = Number(form.x);
    if (form.y) entry.y = Number(form.y);
    const created = await base44.entities.LootFind.create(entry);
    setFinds(prev => [created, ...prev]);
    setForm(buildEmpty(CATS, CONDITIONS));
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.LootFind.delete(id);
    setFinds(prev => prev.filter(f => f.id !== id));
  };

  const filtered = filter && filter !== allFilter ? finds.filter((find) => find.category === filter) : finds;

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <PageHeader icon={Package} title="LOOT TRACKER" color={T.green}>
        <ActionBtn color={T.green} onClick={() => setShowForm(!showForm)}>
          <Plus size={10} /> LOG FIND
        </ActionBtn>
      </PageHeader>
      {runtimeConfig.error && (
        <div className="border px-3 py-2 text-xs" style={{ borderColor: T.red + "66", color: T.red }}>
          RUNTIME TAXONOMY UNAVAILABLE
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {["Total Finds","Unique Items","Locations"].map((label, i) => {
          const values = [finds.length, new Set(finds.map(f => f.item_name)).size, new Set(finds.map(f => f.location_name).filter(Boolean)).size];
          return (
            <div key={label} className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
              <div style={{ color: T.textFaint, fontSize: "9px", letterSpacing: "0.1em" }}>{label.toUpperCase()}</div>
              <div style={{ color: T.green, fontFamily: "'Orbitron', monospace", fontSize: "18px", fontWeight: "bold" }}>{values[i]}</div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <FormPanel title="LOG LOOT FIND" titleColor={T.green} onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ITEM NAME *">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} placeholder="e.g. AKM" />
            </Field>
            <Field label="CATEGORY">
              <select className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {CATS.slice(1).map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="QTY">
              <input type="number" className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
            </Field>
            <Field label="CONDITION">
              <select className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}>
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="LOCATION NAME">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.location_name} onChange={e => setForm({...form, location_name: e.target.value})} placeholder="e.g. Police Station" />
            </Field>
            <Field label="NOTES">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional notes" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ActionBtn color={T.textDim} onClick={() => setShowForm(false)}>CANCEL</ActionBtn>
            <ActionBtn color={T.green} onClick={handleSave} disabled={!form.item_name}>SAVE</ActionBtn>
          </div>
        </FormPanel>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-1">
        {CATS.map(c => <FilterPill key={c} label={c} active={filter === c} color={T.green} onClick={() => setFilter(c)} />)}
      </div>

      {/* Table */}
      <Panel title={`FINDS (${filtered.length})`} titleColor={T.green}>
        <TableHeader columns={["ITEM","CATEGORY","QTY","CONDITION","LOCATION","DATE",""]}
          style={{ gridTemplateColumns: "2fr 1fr 0.5fr 1fr 1.5fr 1fr 0.5fr" }} />
        {filtered.length === 0 ? <EmptyState message="NO LOOT LOGGED YET" /> :
          filtered.map(f => (
            <TableRow key={f.id} style={{ gridTemplateColumns: "2fr 1fr 0.5fr 1fr 1.5fr 1fr 0.5fr" }}>
              <span style={{ color: T.text, fontSize: "11px" }}>{f.item_name}</span>
              <span style={{ color: T.textDim, fontSize: "10px" }}>{f.category}</span>
              <span style={{ color: T.cyan, fontSize: "10px" }}>{f.quantity}</span>
              <span style={{ color: COND_COLORS[f.condition] || T.textDim, fontSize: "10px" }}>{f.condition}</span>
              <span style={{ color: T.textFaint, fontSize: "10px" }}>{f.location_name || "—"}</span>
              <span style={{ color: T.textFaint, fontSize: "10px" }}>{f.created_date ? f.created_date.slice(0,10) : "—"}</span>
              <button onClick={() => handleDelete(f.id)} className="p-1 hover:opacity-70">
                <Trash2 size={10} style={{ color: T.red + "88" }} />
              </button>
            </TableRow>
          ))
        }
      </Panel>
    </div>
  );
}
