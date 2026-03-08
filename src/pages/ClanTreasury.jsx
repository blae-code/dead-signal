import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Database, Plus, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { T, PageHeader, Panel, FormPanel, Field, FilterPill, ActionBtn, TableHeader, TableRow, EmptyState } from "@/components/ui/TerminalCard";

const CATS = ["All","Weapon","Ammo","Medical","Food","Water","Tool","Material","Clothing","Misc"];
const empty = { item_name: "", category: "Misc", quantity: 1, action: "Deposit", reason: "" };

export default function ClanTreasury() {
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const members = await base44.entities.ClanMember.filter({ user_email: u.email });
      if (members.length) setMember(members[0]);
      const data = await base44.entities.TreasuryEntry.list("-created_date", 200);
      setEntries(data);
    };
    load();
  }, []);

  const handleSave = async () => {
    const entry = {
      ...form,
      contributor_email: user.email,
      contributor_callsign: member?.callsign || user.full_name || user.email,
      quantity: Number(form.quantity)
    };
    const created = await base44.entities.TreasuryEntry.create(entry);
    setEntries(prev => [created, ...prev]);
    setForm(empty);
    setShowForm(false);
  };

  // Compute current stock per item (deposits - withdrawals)
  const computeStock = () => {
    const map = {};
    entries.forEach(e => {
      if (!map[e.item_name]) map[e.item_name] = { item: e.item_name, category: e.category, total: 0 };
      map[e.item_name].total += e.action === "Deposit" ? e.quantity : -e.quantity;
    });
    return Object.values(map).filter(s => s.total > 0).sort((a, b) => b.total - a.total);
  };

  const filtered = entries.filter(e => {
    const catOk = filter === "All" || e.category === filter;
    const actOk = actionFilter === "All" || e.action === actionFilter;
    return catOk && actOk;
  });

  const stock = computeStock();
  const totalDeposits = entries.filter(e => e.action === "Deposit").reduce((a, e) => a + e.quantity, 0);
  const totalWithdrawals = entries.filter(e => e.action === "Withdrawal").reduce((a, e) => a + e.quantity, 0);

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <PageHeader icon={Database} title="CLAN TREASURY" color={T.amber}>
        <ActionBtn color={T.amber} onClick={() => setShowForm(!showForm)}>
          <Plus size={10} /> LOG TRANSACTION
        </ActionBtn>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
          <div style={{ color: T.textFaint, fontSize: "9px" }}>TOTAL IN</div>
          <div style={{ color: T.green, fontFamily: "'Orbitron', monospace", fontSize: "20px" }}>{totalDeposits}</div>
        </div>
        <div className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
          <div style={{ color: T.textFaint, fontSize: "9px" }}>TOTAL OUT</div>
          <div style={{ color: T.red, fontFamily: "'Orbitron', monospace", fontSize: "20px" }}>{totalWithdrawals}</div>
        </div>
        <div className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
          <div style={{ color: T.textFaint, fontSize: "9px" }}>UNIQUE ITEMS</div>
          <div style={{ color: T.amber, fontFamily: "'Orbitron', monospace", fontSize: "20px" }}>{stock.length}</div>
        </div>
      </div>

      {/* Current Stock */}
      {stock.length > 0 && (
        <Panel title="CURRENT STOCK" titleColor={T.green}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3">
            {stock.map(s => (
              <div key={s.item} className="border px-3 py-2 flex items-center justify-between" style={{ borderColor: T.border, background: T.bg0 }}>
                <div>
                  <div style={{ color: T.text, fontSize: "11px" }}>{s.item}</div>
                  <div style={{ color: T.textFaint, fontSize: "9px" }}>{s.category}</div>
                </div>
                <div style={{ color: T.green, fontFamily: "'Orbitron', monospace", fontSize: "16px" }}>{s.total}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {showForm && (
        <FormPanel title="LOG TRANSACTION" titleColor={T.amber} onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ITEM NAME *">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} />
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
            <Field label="ACTION">
              <select className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.action} onChange={e => setForm({...form, action: e.target.value})}>
                <option>Deposit</option>
                <option>Withdrawal</option>
              </select>
            </Field>
            <Field label="REASON">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Optional reason" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ActionBtn color={T.textDim} onClick={() => setShowForm(false)}>CANCEL</ActionBtn>
            <ActionBtn color={T.amber} onClick={handleSave} disabled={!form.item_name}>LOG</ActionBtn>
          </div>
        </FormPanel>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {["All","Deposit","Withdrawal"].map(a => (
            <FilterPill key={a} label={a} active={actionFilter === a} color={a === "Deposit" ? T.green : a === "Withdrawal" ? T.red : T.amber} onClick={() => setActionFilter(a)} />
          ))}
        </div>
        <div className="flex gap-1">
          {["All","Weapon","Ammo","Medical","Food","Water","Tool"].map(c => (
            <FilterPill key={c} label={c} active={filter === c} color={T.amber} onClick={() => setFilter(c)} />
          ))}
        </div>
      </div>

      <Panel title={`TRANSACTION LOG (${filtered.length})`} titleColor={T.amber}>
        <TableHeader columns={["ITEM","CAT","QTY","ACTION","BY","REASON","DATE"]}
          style={{ gridTemplateColumns: "2fr 1fr 0.5fr 1fr 1.5fr 2fr 1fr" }} />
        {filtered.length === 0 ? <EmptyState message="NO TRANSACTIONS LOGGED" /> :
          filtered.map(e => (
            <TableRow key={e.id} style={{ gridTemplateColumns: "2fr 1fr 0.5fr 1fr 1.5fr 2fr 1fr" }}>
              <span style={{ color: T.text, fontSize: "11px" }}>{e.item_name}</span>
              <span style={{ color: T.textFaint, fontSize: "9px" }}>{e.category}</span>
              <span style={{ color: T.cyan, fontSize: "10px" }}>{e.quantity}</span>
              <span style={{ color: e.action === "Deposit" ? T.green : T.red, fontSize: "10px" }}>
                {e.action === "Deposit" ? "↑" : "↓"} {e.action}
              </span>
              <span style={{ color: T.amber, fontSize: "10px" }}>{e.contributor_callsign || e.contributor_email}</span>
              <span style={{ color: T.textFaint, fontSize: "9px" }}>{e.reason || "—"}</span>
              <span style={{ color: T.textFaint, fontSize: "9px" }}>{e.created_date?.slice(0,10)}</span>
            </TableRow>
          ))
        }
      </Panel>
    </div>
  );
}