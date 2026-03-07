import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Plus, Edit2, Trash2, Save, X, Shield, Activity } from "lucide-react";

const ROLES = ["Commander", "Lieutenant", "Scout", "Engineer", "Medic", "Grunt"];
const STATUSES = ["Active", "Inactive", "MIA", "KIA"];
const ROLE_COLORS = { Commander: "#ff8000", Lieutenant: "#ffb000", Scout: "#00e5ff", Engineer: "#39ff14", Medic: "#ff5555", Grunt: "#888" };
const STATUS_COLORS = { Active: "#39ff14", Inactive: "#555", MIA: "#ffb000", KIA: "#ff2020" };

const emptyMember = { callsign: "", role: "Grunt", status: "Active", steam_id: "", playtime_hours: 0, kills: 0, deaths: 0, notes: "" };

export default function ClanRoster() {
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyMember);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.ClanMember.list("-created_date").then(setMembers).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!form.callsign.trim()) return;
    if (editing) {
      const updated = await base44.entities.ClanMember.update(editing, { ...form, user_email: form.user_email || user?.email });
      setMembers(m => m.map(x => x.id === editing ? updated : x));
    } else {
      const created = await base44.entities.ClanMember.create({ ...form, user_email: user?.email });
      setMembers(m => [...m, created]);
    }
    setForm(emptyMember);
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (member) => {
    setForm({ ...member });
    setEditing(member.id);
    setShowForm(true);
    setSelected(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.ClanMember.delete(id);
    setMembers(m => m.filter(x => x.id !== id));
    setSelected(null);
  };

  const activeCount = members.filter(m => m.status === "Active").length;
  const kdrAvg = members.length > 0
    ? (members.reduce((a, m) => a + (m.deaths > 0 ? m.kills / m.deaths : m.kills), 0) / members.length).toFixed(2)
    : "—";

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <Users size={16} style={{ color: "#ffb000" }} />
        <span className="text-sm font-bold tracking-widest" style={{ color: "#ffb000", fontFamily: "'Orbitron', monospace" }}>CLAN ROSTER</span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyMember); }}
            className="text-xs px-3 py-1 border flex items-center gap-1"
            style={{ borderColor: "#39ff14", color: "#39ff14" }}>
            <Plus size={11} /> ENLIST
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "TOTAL OPERATORS", value: members.length, color: "#ffb000" },
          { label: "ACTIVE", value: activeCount, color: "#39ff14" },
          { label: "AVG K/D", value: kdrAvg, color: "#00e5ff" },
        ].map(({ label, value, color }) => (
          <div key={label} className="border p-3 text-center" style={{ borderColor: "#1e3a1e", background: "#060606" }}>
            <div className="text-xs mb-1" style={{ color: "#39ff1055" }}>{label}</div>
            <div className="text-xl font-bold" style={{ color, fontFamily: "'Orbitron', monospace" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Enlist form */}
      {showForm && (
        <div className="border p-4 space-y-3" style={{ borderColor: "#39ff14", background: "#060606" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold" style={{ color: "#39ff14" }}>// {editing ? "EDIT OPERATOR" : "NEW OPERATOR"}</span>
            <button onClick={() => { setShowForm(false); setEditing(null); setForm(emptyMember); }}>
              <X size={12} style={{ color: "#39ff1044" }} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>CALLSIGN *</div>
              <input className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.callsign} onChange={e => setForm(f => ({ ...f, callsign: e.target.value }))} placeholder="e.g. GHOST" />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>STEAM ID</div>
              <input className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.steam_id} onChange={e => setForm(f => ({ ...f, steam_id: e.target.value }))} placeholder="76561..." />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>ROLE</div>
              <select className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>STATUS</div>
              <select className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>KILLS</div>
              <input type="number" className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.kills} onChange={e => setForm(f => ({ ...f, kills: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>DEATHS</div>
              <input type="number" className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.deaths} onChange={e => setForm(f => ({ ...f, deaths: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>NOTES / DOSSIER</div>
            <textarea className="w-full text-xs px-2 py-1 border bg-black resize-none" rows={2}
              style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button onClick={handleSave} className="text-xs px-4 py-1 border flex items-center gap-1"
            style={{ borderColor: "#39ff14", color: "#39ff14" }}>
            <Save size={11} /> {editing ? "UPDATE" : "ENLIST"}
          </button>
        </div>
      )}

      {/* Roster table */}
      <div className="border" style={{ borderColor: "#1e3a1e", background: "#060606" }}>
        <div className="grid text-xs px-3 py-2 border-b" style={{ borderColor: "#1e3a1e", color: "#39ff1055", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px" }}>
          <span>CALLSIGN</span><span>ROLE</span><span>STATUS</span><span>K/D</span><span>HRS</span><span className="text-right">OPS</span>
        </div>
        {members.length === 0
          ? <div className="p-4 text-xs" style={{ color: "#39ff1033" }}>// NO OPERATORS ENLISTED</div>
          : members.map(m => (
            <div key={m.id} className="grid px-3 py-2 border-b cursor-pointer hover:bg-green-950 transition-colors"
              style={{ borderColor: "#0f1f0f", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px" }}
              onClick={() => setSelected(selected?.id === m.id ? null : m)}>
              <span className="text-xs font-bold" style={{ color: "#39ff14" }}>{m.callsign}</span>
              <span className="text-xs" style={{ color: ROLE_COLORS[m.role] || "#888" }}>{m.role}</span>
              <span className="text-xs" style={{ color: STATUS_COLORS[m.status] || "#888" }}>
                <span style={{ fontSize: "8px" }}>●</span> {m.status}
              </span>
              <span className="text-xs" style={{ color: "#39ff1088" }}>
                {m.deaths > 0 ? (m.kills / m.deaths).toFixed(1) : m.kills}
              </span>
              <span className="text-xs" style={{ color: "#39ff1055" }}>{m.playtime_hours || 0}h</span>
              <div className="flex justify-end gap-1">
                <button onClick={e => { e.stopPropagation(); handleEdit(m); }} className="p-1">
                  <Edit2 size={10} style={{ color: "#39ff1066" }} />
                </button>
                <button onClick={e => { e.stopPropagation(); handleDelete(m.id); }} className="p-1">
                  <Trash2 size={10} style={{ color: "#ff202066" }} />
                </button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Selected dossier */}
      {selected && (
        <div className="border p-4" style={{ borderColor: ROLE_COLORS[selected.role] || "#39ff14", background: "#060606" }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} style={{ color: ROLE_COLORS[selected.role] }} />
            <span className="text-sm font-bold tracking-widest" style={{ color: ROLE_COLORS[selected.role], fontFamily: "'Orbitron', monospace" }}>
              DOSSIER // {selected.callsign}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              { l: "ROLE", v: selected.role, c: ROLE_COLORS[selected.role] },
              { l: "STATUS", v: selected.status, c: STATUS_COLORS[selected.status] },
              { l: "KILLS", v: selected.kills || 0, c: "#ff2020" },
              { l: "DEATHS", v: selected.deaths || 0, c: "#ffb000" },
              { l: "K/D RATIO", v: selected.deaths > 0 ? (selected.kills / selected.deaths).toFixed(2) : (selected.kills || 0), c: "#39ff14" },
              { l: "PLAYTIME", v: `${selected.playtime_hours || 0}h`, c: "#00e5ff" },
              { l: "STEAM ID", v: selected.steam_id || "—", c: "#39ff1066" },
              { l: "ENLISTED", v: new Date(selected.created_date).toLocaleDateString(), c: "#39ff1066" },
            ].map(({ l, v, c }) => (
              <div key={l}>
                <div style={{ color: "#39ff1033" }}>{l}</div>
                <div className="font-bold mt-0.5" style={{ color: c }}>{v}</div>
              </div>
            ))}
          </div>
          {selected.notes && (
            <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: "#1e3a1e", color: "#39ff1088" }}>
              <span style={{ color: "#39ff1044" }}>// NOTES: </span>{selected.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}