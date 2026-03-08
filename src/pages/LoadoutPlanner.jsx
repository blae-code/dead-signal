import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Plus, Trash2, Star } from "lucide-react";
import { T, PageHeader, FormPanel, Field, ActionBtn, EmptyState } from "@/components/ui/TerminalCard";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";

const ROLE_COLORS = { Combat: T.red, Scavenger: T.amber, Medic: T.green, Scout: T.cyan, Builder: "#b8a890", Generalist: T.textDim };
const pickFirst = (values) => values.find((value) => typeof value === "string" && value.trim()) || "";
const buildEmpty = (roles, defaultSlots) => ({
  name: "",
  role: pickFirst(roles),
  notes: "",
  is_active: false,
  slots: defaultSlots.map((slot) => ({ slot, item: "", notes: "" })),
});

export default function LoadoutPlanner() {
  const runtimeConfig = useRuntimeConfig();
  const ROLES = runtimeConfig.getArray(["taxonomy", "loadout_roles"]);
  const DEFAULT_SLOTS = runtimeConfig.getArray(["taxonomy", "loadout_default_slots"]);
  const [user, setUser] = useState(null);
  const [loadouts, setLoadouts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => buildEmpty(ROLES, DEFAULT_SLOTS));
  const [editingId, setEditingId] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (form.role && Array.isArray(form.slots) && form.slots.length > 0) return;
    setForm((prev) => ({ ...prev, ...buildEmpty(ROLES, DEFAULT_SLOTS) }));
  }, [ROLES, DEFAULT_SLOTS, form.role, form.slots]);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const data = await base44.entities.Loadout.filter({ player_email: u.email }, "-created_date");
      setLoadouts(data);
    };
    load();
  }, []);

  const handleSave = async () => {
    const entry = { ...form, player_email: user.email };
    if (editingId) {
      const updated = await base44.entities.Loadout.update(editingId, entry);
      setLoadouts(prev => prev.map(l => l.id === editingId ? updated : l));
    } else {
      const created = await base44.entities.Loadout.create(entry);
      setLoadouts(prev => [created, ...prev]);
    }
    setForm(buildEmpty(ROLES, DEFAULT_SLOTS));
    setShowForm(false);
    setEditingId(null);
  };

  const handleSetActive = async (l) => {
    // Deactivate all, activate selected
    const updates = loadouts.map(x =>
      base44.entities.Loadout.update(x.id, { is_active: x.id === l.id })
    );
    await Promise.all(updates);
    setLoadouts(prev => prev.map(x => ({ ...x, is_active: x.id === l.id })));
  };

  const handleDelete = async (id) => {
    await base44.entities.Loadout.delete(id);
    setLoadouts(prev => prev.filter(l => l.id !== id));
  };

  const handleEdit = (l) => {
    setForm({
      name: l.name, role: l.role, notes: l.notes || "", is_active: l.is_active || false,
      slots: l.slots?.length ? l.slots : DEFAULT_SLOTS.map(s => ({ slot: s, item: "", notes: "" }))
    });
    setEditingId(l.id);
    setShowForm(true);
  };

  const updateSlot = (idx, field, value) => {
    const slots = [...form.slots];
    slots[idx] = { ...slots[idx], [field]: value };
    setForm({ ...form, slots });
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <PageHeader icon={Shield} title="LOADOUT PLANNER" color={T.cyan}>
        <ActionBtn color={T.cyan} onClick={() => { setShowForm(!showForm); setForm(buildEmpty(ROLES, DEFAULT_SLOTS)); setEditingId(null); }}>
          <Plus size={10} /> NEW LOADOUT
        </ActionBtn>
      </PageHeader>
      {runtimeConfig.error && (
        <div className="border px-3 py-2 text-xs" style={{ borderColor: T.red + "66", color: T.red }}>
          RUNTIME TAXONOMY UNAVAILABLE
        </div>
      )}

      {showForm && (
        <FormPanel title={editingId ? "EDIT LOADOUT" : "NEW LOADOUT"} titleColor={T.cyan} onClose={() => { setShowForm(false); setEditingId(null); }}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label="LOADOUT NAME *">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Raid Setup" />
            </Field>
            <Field label="ROLE">
              <select className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="NOTES" >
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional notes" />
            </Field>
          </div>

          {/* Slots */}
          <div style={{ color: T.textFaint, fontSize: "9px", letterSpacing: "0.15em", marginBottom: 8 }}>// GEAR SLOTS</div>
          <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
            {form.slots.map((s, i) => (
              <div key={i} className="grid gap-2" style={{ gridTemplateColumns: "1fr 2fr 1fr" }}>
                <div className="border p-2" style={{ borderColor: T.border, background: T.bg0, color: T.textFaint, fontSize: "10px", display: "flex", alignItems: "center" }}>
                  {s.slot}
                </div>
                <input className="border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                  value={s.item} onChange={e => updateSlot(i, "item", e.target.value)} placeholder="Item name" />
                <input className="border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                  value={s.notes} onChange={e => updateSlot(i, "notes", e.target.value)} placeholder="Notes" />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <ActionBtn color={T.textDim} onClick={() => { setShowForm(false); setEditingId(null); }}>CANCEL</ActionBtn>
            <ActionBtn color={T.cyan} onClick={handleSave} disabled={!form.name}>SAVE</ActionBtn>
          </div>
        </FormPanel>
      )}

      {loadouts.length === 0 ? (
        <EmptyState message="NO LOADOUTS SAVED — BUILD YOUR FIRST KIT" />
      ) : (
        <div className="space-y-2">
          {loadouts.map(l => {
            const roleColor = ROLE_COLORS[l.role] || T.textDim;
            const isExpanded = expanded === l.id;
            return (
              <div key={l.id} className="border" style={{ borderColor: l.is_active ? T.cyan + "66" : T.border, background: T.bg1 }}>
                <div className="flex items-center justify-between px-3 py-3 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : l.id)}>
                  <div className="flex items-center gap-3">
                    {l.is_active && <Star size={10} style={{ color: T.cyan }} />}
                    <div>
                      <div style={{ color: T.text, fontSize: "12px", fontWeight: "bold" }}>{l.name}</div>
                      <div style={{ color: roleColor, fontSize: "9px", letterSpacing: "0.1em" }}>{l.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.is_active && <span style={{ color: T.cyan, fontSize: "9px", border: `1px solid ${T.cyan}55`, padding: "1px 6px" }}>ACTIVE</span>}
                    <ActionBtn small color={T.cyan} onClick={e => { e.stopPropagation(); handleSetActive(l); }}>SET ACTIVE</ActionBtn>
                    <ActionBtn small color={T.textDim} onClick={e => { e.stopPropagation(); handleEdit(l); }}>EDIT</ActionBtn>
                    <button onClick={e => { e.stopPropagation(); handleDelete(l.id); }} className="p-1 hover:opacity-70">
                      <Trash2 size={10} style={{ color: T.red + "88" }} />
                    </button>
                  </div>
                </div>

                {isExpanded && l.slots?.length > 0 && (
                  <div className="border-t px-3 py-2" style={{ borderColor: T.border }}>
                    <div className="grid gap-1">
                      {l.slots.filter(s => s.item).map((s, i) => (
                        <div key={i} className="flex items-center gap-2 py-1 border-b" style={{ borderColor: T.border + "44" }}>
                          <span style={{ color: T.textFaint, fontSize: "9px", minWidth: 100 }}>{s.slot}</span>
                          <span style={{ color: T.text, fontSize: "11px" }}>{s.item}</span>
                          {s.notes && <span style={{ color: T.textDim, fontSize: "9px" }}>({s.notes})</span>}
                        </div>
                      ))}
                      {l.slots.filter(s => s.item).length === 0 && (
                        <div style={{ color: T.textFaint, fontSize: "10px" }}>// No items filled in yet</div>
                      )}
                    </div>
                    {l.notes && <div style={{ color: T.textDim, fontSize: "10px", marginTop: 8 }}>Notes: {l.notes}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
