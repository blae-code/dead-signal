import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Package2, Plus, CheckCircle, Trash2 } from "lucide-react";
import { T, PageHeader, Panel, FormPanel, Field, FilterPill, ActionBtn, TableHeader, TableRow, EmptyState } from "@/components/ui/TerminalCard";

const CATS = ["All","Weapon","Ammo","Medical","Food","Water","Tool","Material","Clothing","Misc"];
const URGENCY_COLORS = { Low: T.textDim, Medium: T.amber, High: T.orange, Critical: T.red };
const STATUS_FILTERS = ["All","Open","Fulfilled","Cancelled"];
const empty = { item_name: "", category: "Misc", quantity: 1, urgency: "Medium", notes: "" };

export default function LootSharing() {
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("Open");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const members = await base44.entities.ClanMember.filter({ user_email: u.email });
      if (members.length) setMember(members[0]);
      const data = await base44.entities.LootRequest.list("-created_date", 100);
      setRequests(data);
    };
    load();

    const unsub = base44.entities.LootRequest.subscribe(event => {
      if (event.type === "create") setRequests(prev => [event.data, ...prev]);
      if (event.type === "update") setRequests(prev => prev.map(r => r.id === event.id ? event.data : r));
      if (event.type === "delete") setRequests(prev => prev.filter(r => r.id !== event.id));
    });
    return unsub;
  }, []);

  const handlePost = async () => {
    const entry = {
      ...form,
      requester_email: user.email,
      requester_callsign: member?.callsign || user.full_name || user.email,
      quantity: Number(form.quantity),
      status: "Open"
    };
    await base44.entities.LootRequest.create(entry);
    setForm(empty);
    setShowForm(false);
  };

  const handleFulfill = async (r) => {
    await base44.entities.LootRequest.update(r.id, {
      status: "Fulfilled",
      fulfilled_by: member?.callsign || user.full_name || user.email
    });
  };

  const handleCancel = async (r) => {
    await base44.entities.LootRequest.update(r.id, { status: "Cancelled" });
  };

  const handleDelete = async (id) => {
    await base44.entities.LootRequest.delete(id);
  };

  const filtered = filter === "All" ? requests : requests.filter(r => r.status === filter);

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <PageHeader icon={Package2} title="LOOT SHARING" color={T.amber}>
        <ActionBtn color={T.amber} onClick={() => setShowForm(!showForm)}>
          <Plus size={10} /> REQUEST ITEM
        </ActionBtn>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {["Open","Fulfilled","Cancelled"].map(s => (
          <div key={s} className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
            <div style={{ color: T.textFaint, fontSize: "9px" }}>{s.toUpperCase()}</div>
            <div style={{ color: s === "Open" ? T.amber : s === "Fulfilled" ? T.green : T.textDim, fontFamily: "'Orbitron', monospace", fontSize: "18px" }}>
              {requests.filter(r => r.status === s).length}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <FormPanel title="REQUEST ITEM" titleColor={T.amber} onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ITEM NAME *">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} placeholder="e.g. Bandage Kit" />
            </Field>
            <Field label="CATEGORY">
              <select className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {CATS.slice(1).map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="QTY NEEDED">
              <input type="number" className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
            </Field>
            <Field label="URGENCY">
              <select className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.urgency} onChange={e => setForm({...form, urgency: e.target.value})}>
                {["Low","Medium","High","Critical"].map(u => <option key={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="NOTES">
              <input className="w-full border p-2 text-xs col-span-2" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Where you are, why you need it..." />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ActionBtn color={T.textDim} onClick={() => setShowForm(false)}>CANCEL</ActionBtn>
            <ActionBtn color={T.amber} onClick={handlePost} disabled={!form.item_name}>POST REQUEST</ActionBtn>
          </div>
        </FormPanel>
      )}

      <div className="flex flex-wrap gap-1">
        {STATUS_FILTERS.map(s => <FilterPill key={s} label={s} active={filter === s} color={T.amber} onClick={() => setFilter(s)} />)}
      </div>

      <Panel title={`REQUESTS (${filtered.length})`} titleColor={T.amber}>
        {filtered.length === 0 ? <EmptyState message="NO REQUESTS — CLAN IS WELL SUPPLIED" /> :
          filtered.map(r => (
            <div key={r.id} className="px-3 py-3 border-b" style={{ borderColor: T.border + "66" }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: T.text, fontSize: "12px", fontWeight: "bold" }}>{r.item_name}</span>
                    <span style={{ color: T.textFaint, fontSize: "10px" }}>×{r.quantity}</span>
                    <span style={{ color: URGENCY_COLORS[r.urgency], fontSize: "9px", border: `1px solid ${URGENCY_COLORS[r.urgency]}44`, padding: "1px 6px" }}>
                      {r.urgency}
                    </span>
                    <span style={{ color: r.status === "Open" ? T.amber : r.status === "Fulfilled" ? T.green : T.textDim, fontSize: "9px" }}>
                      [{r.status}]
                    </span>
                  </div>
                  <div style={{ color: T.textDim, fontSize: "10px" }}>
                    Requested by: <span style={{ color: T.amber }}>{r.requester_callsign || r.requester_email}</span>
                    {r.fulfilled_by && <> · Fulfilled by: <span style={{ color: T.green }}>{r.fulfilled_by}</span></>}
                    {" "}· {r.created_date?.slice(0,10)}
                  </div>
                  {r.notes && <div style={{ color: T.textFaint, fontSize: "10px", marginTop: 2 }}>{r.notes}</div>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {r.status === "Open" && r.requester_email !== user?.email && (
                    <ActionBtn small color={T.green} onClick={() => handleFulfill(r)}>
                      <CheckCircle size={9} /> FULFILL
                    </ActionBtn>
                  )}
                  {r.status === "Open" && r.requester_email === user?.email && (
                    <ActionBtn small color={T.textDim} onClick={() => handleCancel(r)}>CANCEL</ActionBtn>
                  )}
                  <button onClick={() => handleDelete(r.id)} className="p-1 hover:opacity-70">
                    <Trash2 size={10} style={{ color: T.red + "66" }} />
                  </button>
                </div>
              </div>
            </div>
          ))
        }
      </Panel>
    </div>
  );
}