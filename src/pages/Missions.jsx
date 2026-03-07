import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Crosshair, Plus, X, Save, Trash2, ChevronDown, ChevronUp } from "lucide-react";

const STATUSES = ["Pending", "Active", "Complete", "Failed", "Aborted"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const STATUS_COLORS = { Pending: "#ffb000", Active: "#39ff14", Complete: "#00e5ff", Failed: "#ff2020", Aborted: "#555" };
const PRIORITY_COLORS = { Critical: "#ff2020", High: "#ff8000", Medium: "#ffb000", Low: "#39ff14" };

const emptyMission = { title: "", briefing: "", status: "Pending", priority: "Medium", objective_coords: "", reward: "", deadline: "", debrief_notes: "" };

export default function Missions() {
  const [missions, setMissions] = useState([]);
  const [members, setMembers] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyMission);
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    base44.entities.Mission.list("-created_date").then(setMissions).catch(() => {});
    base44.entities.ClanMember.list().then(setMembers).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (editing) {
      const updated = await base44.entities.Mission.update(editing, form);
      setMissions(m => m.map(x => x.id === editing ? updated : x));
    } else {
      const created = await base44.entities.Mission.create(form);
      setMissions(m => [created, ...m]);
    }
    setForm(emptyMission);
    setEditing(null);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.Mission.delete(id);
    setMissions(m => m.filter(x => x.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const handleStatusChange = async (id, status) => {
    const updated = await base44.entities.Mission.update(id, { status });
    setMissions(m => m.map(x => x.id === id ? updated : x));
  };

  const filtered = filterStatus === "ALL" ? missions : missions.filter(m => m.status === filterStatus);

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <Crosshair size={16} style={{ color: "#ff2020" }} />
        <span className="text-sm font-bold tracking-widest" style={{ color: "#ff2020", fontFamily: "'Orbitron', monospace" }}>MISSION BOARD</span>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <select className="text-xs px-2 py-1 border bg-black" style={{ borderColor: "#1e3a1e", color: "#39ff14" }}
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="ALL">ALL</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyMission); }}
            className="text-xs px-3 py-1 border flex items-center gap-1"
            style={{ borderColor: "#ff2020", color: "#ff2020" }}>
            <Plus size={11} /> NEW MISSION
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {STATUSES.map(s => (
          <div key={s} className="border p-2 text-center" style={{ borderColor: "#1e3a1e", background: "#060606" }}>
            <div className="text-lg font-bold" style={{ color: STATUS_COLORS[s], fontFamily: "'Orbitron', monospace" }}>
              {missions.filter(m => m.status === s).length}
            </div>
            <div className="text-xs" style={{ color: "#39ff1044" }}>{s.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Mission form */}
      {showForm && (
        <div className="border p-4 space-y-3" style={{ borderColor: "#ff2020", background: "#060606" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold" style={{ color: "#ff2020" }}>// {editing ? "EDIT MISSION" : "NEW MISSION BRIEFING"}</span>
            <button onClick={() => { setShowForm(false); setEditing(null); }}><X size={12} style={{ color: "#ff202044" }} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>MISSION TITLE *</div>
              <input className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Operation..." />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>PRIORITY</div>
              <select className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
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
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>OBJECTIVE COORDS</div>
              <input className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.objective_coords} onChange={e => setForm(f => ({ ...f, objective_coords: e.target.value }))} placeholder="Grid E4..." />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>REWARD / OBJECTIVE</div>
              <input className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.reward} onChange={e => setForm(f => ({ ...f, reward: e.target.value }))} placeholder="Loot / XP..." />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>DEADLINE</div>
              <input type="datetime-local" className="w-full text-xs px-2 py-1 border bg-black" style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
                value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "#39ff1066" }}>BRIEFING *</div>
            <textarea className="w-full text-xs px-2 py-1 border bg-black resize-none" rows={3}
              style={{ borderColor: "#2a2a2a", color: "#39ff14" }}
              value={form.briefing} onChange={e => setForm(f => ({ ...f, briefing: e.target.value }))}
              placeholder="Mission objectives and intel..." />
          </div>
          <button onClick={handleSave} className="text-xs px-4 py-1 border flex items-center gap-1"
            style={{ borderColor: "#ff2020", color: "#ff2020" }}>
            <Save size={11} /> {editing ? "UPDATE" : "POST MISSION"}
          </button>
        </div>
      )}

      {/* Mission list */}
      <div className="space-y-2">
        {filtered.length === 0
          ? <div className="p-4 text-xs" style={{ color: "#39ff1033" }}>// NO MISSIONS ON RECORD</div>
          : filtered.map(m => (
            <div key={m.id} className="border" style={{ borderColor: expanded === m.id ? STATUS_COLORS[m.status] : "#1e3a1e", background: "#060606" }}>
              {/* Header */}
              <div className="flex items-center gap-3 px-3 py-2 cursor-pointer" onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
                <span className="text-xs px-1 border" style={{ borderColor: PRIORITY_COLORS[m.priority], color: PRIORITY_COLORS[m.priority] }}>
                  {m.priority?.toUpperCase()}
                </span>
                <span className="text-xs font-bold flex-1" style={{ color: "#39ff14" }}>{m.title}</span>
                <span className="text-xs" style={{ color: STATUS_COLORS[m.status] }}>● {m.status}</span>
                {expanded === m.id ? <ChevronUp size={12} style={{ color: "#39ff1055" }} /> : <ChevronDown size={12} style={{ color: "#39ff1055" }} />}
              </div>
              {/* Expanded */}
              {expanded === m.id && (
                <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "#1e3a1e" }}>
                  <div className="text-xs mt-2" style={{ color: "#39ff1088" }}>{m.briefing}</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {m.objective_coords && <div><span style={{ color: "#39ff1033" }}>COORDS: </span><span style={{ color: "#00e5ff" }}>{m.objective_coords}</span></div>}
                    {m.reward && <div><span style={{ color: "#39ff1033" }}>REWARD: </span><span style={{ color: "#ffb000" }}>{m.reward}</span></div>}
                    {m.deadline && <div><span style={{ color: "#39ff1033" }}>DEADLINE: </span><span style={{ color: "#ff2020" }}>{new Date(m.deadline).toLocaleDateString()}</span></div>}
                  </div>
                  {/* Status controls */}
                  <div className="flex flex-wrap gap-1 pt-1 border-t" style={{ borderColor: "#1e3a1e" }}>
                    {STATUSES.map(s => (
                      <button key={s} onClick={() => handleStatusChange(m.id, s)}
                        className="text-xs px-2 py-0.5 border"
                        style={{ borderColor: m.status === s ? STATUS_COLORS[s] : "#1e3a1e", color: m.status === s ? STATUS_COLORS[s] : "#39ff1033" }}>
                        {s}
                      </button>
                    ))}
                    <button onClick={() => { setForm({ ...m }); setEditing(m.id); setShowForm(true); setExpanded(null); }}
                      className="text-xs px-2 py-0.5 border ml-auto" style={{ borderColor: "#1e3a1e", color: "#39ff1055" }}>
                      EDIT
                    </button>
                    <button onClick={() => handleDelete(m.id)}
                      className="text-xs px-2 py-0.5 border" style={{ borderColor: "#ff202044", color: "#ff202066" }}>
                      DELETE
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
}