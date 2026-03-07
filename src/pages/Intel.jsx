import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Radio, Plus, Trash2, Save, X, Pin } from "lucide-react";

const TYPES = ["Emergency", "Intel", "Ops", "General", "Maintenance"];
const TYPE_COLORS = { Emergency: "#ff2020", Intel: "#00e5ff", Ops: "#ff8000", General: "#39ff14", Maintenance: "#ffb000" };
const TYPE_ICONS = { Emergency: "⚠", Intel: "◈", Ops: "⚑", General: "◉", Maintenance: "⚙" };

const emptyAnn = { title: "", body: "", type: "General", pinned: false };

export default function Intel() {
  const [announcements, setAnnouncements] = useState([]);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyAnn);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.Announcement.list("-created_date").then(setAnnouncements).catch(() => {});
    const unsub = base44.entities.Announcement.subscribe(ev => {
      if (ev.type === "create") setAnnouncements(a => [ev.data, ...a]);
      if (ev.type === "update") setAnnouncements(a => a.map(x => x.id === ev.id ? ev.data : x));
      if (ev.type === "delete") setAnnouncements(a => a.filter(x => x.id !== ev.id));
    });
    return unsub;
  }, []);

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    const data = { ...form, posted_by: user?.full_name || user?.email || "Unknown" };
    if (editing) {
      const updated = await base44.entities.Announcement.update(editing, data);
      setAnnouncements(a => a.map(x => x.id === editing ? updated : x));
    } else {
      const created = await base44.entities.Announcement.create(data);
      setAnnouncements(a => [created, ...a]);
    }
    setForm(emptyAnn);
    setEditing(null);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.Announcement.delete(id);
    setAnnouncements(a => a.filter(x => x.id !== id));
  };

  const handlePin = async (ann) => {
    const updated = await base44.entities.Announcement.update(ann.id, { pinned: !ann.pinned });
    setAnnouncements(a => a.map(x => x.id === ann.id ? updated : x));
  };

  const filtered = filter === "ALL" ? announcements : announcements.filter(a => a.type === filter);
  const pinned = filtered.filter(a => a.pinned);
  const regular = filtered.filter(a => !a.pinned);
  const sorted = [...pinned, ...regular];

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <Radio size={16} style={{ color: "#ffb000" }} />
        <span className="text-sm font-bold tracking-widest" style={{ color: "#ffb000", fontFamily: "'Orbitron', monospace" }}>INTEL FEED</span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyAnn); }}
            className="text-xs px-3 py-1 border flex items-center gap-1"
            style={{ borderColor: "#ffb000", color: "#ffb000" }}>
            <Plus size={11} /> BROADCAST
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {["ALL", ...TYPES].map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className="text-xs px-3 py-1 border"
            style={{ borderColor: filter === t ? (TYPE_COLORS[t] || "#ffb000") : "#1e3a1e", color: filter === t ? (TYPE_COLORS[t] || "#ffb000") : "#39ff1044" }}>
            {t === "ALL" ? "ALL" : `${TYPE_ICONS[t]} ${t}`}
          </button>
        ))}
      </div>

      {/* Broadcast form */}
      {showForm && (
        <div className="border p-4 space-y-3" style={{ borderColor: "#ffb000", background: "#060606" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold" style={{ color: "#ffb000" }}>// {editing ? "EDIT BROADCAST" : "NEW BROADCAST"}</span>
            <button onClick={() => { setShowForm(false); setEditing(null); }}><X size={12} style={{ color: "#ffb00044" }} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>TITLE *</div>
              <input className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Broadcast title..." />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>TYPE</div>
              <select className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input type="checkbox" id="pinned" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))}
                className="accent-green-500" />
              <label htmlFor="pinned" className="text-xs" style={{ color: "#39ff1066" }}>PIN TO TOP</label>
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>BODY *</div>
            <textarea className="w-full text-xs px-2 py-1 border bg-black resize-none" rows={4}
              style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
              value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Broadcast message..." />
          </div>
          <button onClick={handleSave} className="text-xs px-4 py-1 border flex items-center gap-1"
            style={{ borderColor: "#ffb000", color: "#ffb000" }}>
            <Save size={11} /> {editing ? "UPDATE" : "TRANSMIT"}
          </button>
        </div>
      )}

      {/* Announcement list */}
      <div className="space-y-2">
        {sorted.length === 0
          ? <div className="p-4 text-xs border" style={{ borderColor: "#1e3a1e", color: "#39ff1033" }}>// NO TRANSMISSIONS ON RECORD</div>
          : sorted.map(a => (
            <div key={a.id} className="border p-4 space-y-2"
              style={{ borderColor: a.type === "Emergency" ? "#ff202088" : "#1e3a1e", background: "#060606" }}>
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-sm" style={{ color: TYPE_COLORS[a.type] }}>{TYPE_ICONS[a.type]}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold" style={{ color: TYPE_COLORS[a.type] || "#ffb000" }}>[{a.type?.toUpperCase()}]</span>
                    {a.pinned && <span className="text-xs" style={{ color: "#ffb000" }}>📌 PINNED</span>}
                    <span className="text-xs font-bold" style={{ color: "#39ff14" }}>{a.title}</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: "#39ff1088" }}>{a.body}</div>
                  <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "#39ff1033" }}>
                    {a.posted_by && <span>BY: {a.posted_by}</span>}
                    <span>{new Date(a.created_date).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handlePin(a)} className="p-1" title="Toggle pin">
                    <Pin size={11} style={{ color: a.pinned ? "#ffb000" : "#39ff1033" }} />
                  </button>
                  <button onClick={() => { setForm({ title: a.title, body: a.body, type: a.type, pinned: a.pinned }); setEditing(a.id); setShowForm(true); }}
                    className="p-1">
                    <Radio size={11} style={{ color: "#39ff1033" }} />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="p-1">
                    <Trash2 size={11} style={{ color: "#ff202044" }} />
                  </button>
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}