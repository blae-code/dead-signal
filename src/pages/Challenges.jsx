import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Target, Plus, Trash2, CheckCircle } from "lucide-react";
import { T, PageHeader, Panel, FormPanel, Field, FilterPill, ActionBtn, EmptyState } from "@/components/ui/TerminalCard";

const CATS = ["All","Combat","Survival","Looting","Social","Exploration"];
const CAT_COLORS = { Combat: T.red, Survival: T.green, Looting: T.amber, Social: T.cyan, Exploration: "#b8a890" };
const empty = { title: "", description: "", category: "Combat", target: 10, progress: 0, deadline: "", reward_notes: "" };

export default function Challenges() {
  const [user, setUser] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const data = await base44.entities.Challenge.filter({ player_email: u.email }, "-created_date");
      setChallenges(data);
    };
    load();
  }, []);

  const handleSave = async () => {
    const entry = { ...form, player_email: user.email, target: Number(form.target), progress: Number(form.progress) };
    const created = await base44.entities.Challenge.create(entry);
    setChallenges(prev => [created, ...prev]);
    setForm(empty);
    setShowForm(false);
  };

  const handleProgress = async (c, delta) => {
    const newProg = Math.min(c.target, Math.max(0, (c.progress || 0) + delta));
    const completed = newProg >= c.target;
    const updated = await base44.entities.Challenge.update(c.id, { progress: newProg, completed });
    setChallenges(prev => prev.map(x => x.id === c.id ? updated : x));
  };

  const handleDelete = async (id) => {
    await base44.entities.Challenge.delete(id);
    setChallenges(prev => prev.filter(c => c.id !== id));
  };

  const filtered = filter === "All" ? challenges : challenges.filter(c => c.category === filter);
  const active = filtered.filter(c => !c.completed);
  const done = filtered.filter(c => c.completed);

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <PageHeader icon={Target} title="CHALLENGES" color={T.amber}>
        <ActionBtn color={T.amber} onClick={() => setShowForm(!showForm)}>
          <Plus size={10} /> NEW CHALLENGE
        </ActionBtn>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
          <div style={{ color: T.textFaint, fontSize: "9px" }}>ACTIVE</div>
          <div style={{ color: T.amber, fontFamily: "'Orbitron', monospace", fontSize: "20px" }}>{challenges.filter(c=>!c.completed).length}</div>
        </div>
        <div className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
          <div style={{ color: T.textFaint, fontSize: "9px" }}>COMPLETED</div>
          <div style={{ color: T.green, fontFamily: "'Orbitron', monospace", fontSize: "20px" }}>{challenges.filter(c=>c.completed).length}</div>
        </div>
        <div className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
          <div style={{ color: T.textFaint, fontSize: "9px" }}>TOTAL</div>
          <div style={{ color: T.cyan, fontFamily: "'Orbitron', monospace", fontSize: "20px" }}>{challenges.length}</div>
        </div>
      </div>

      {showForm && (
        <FormPanel title="NEW CHALLENGE" titleColor={T.amber} onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="TITLE *">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Kill 50 zombies" />
            </Field>
            <Field label="CATEGORY">
              <select className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {CATS.slice(1).map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="TARGET">
              <input type="number" className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.target} onChange={e => setForm({...form, target: e.target.value})} />
            </Field>
            <Field label="DEADLINE">
              <input type="date" className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
            </Field>
            <Field label="DESCRIPTION">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Optional details" />
            </Field>
            <Field label="REWARD">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.reward_notes} onChange={e => setForm({...form, reward_notes: e.target.value})} placeholder="e.g. Get a new gun" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ActionBtn color={T.textDim} onClick={() => setShowForm(false)}>CANCEL</ActionBtn>
            <ActionBtn color={T.amber} onClick={handleSave} disabled={!form.title}>CREATE</ActionBtn>
          </div>
        </FormPanel>
      )}

      <div className="flex flex-wrap gap-1">
        {CATS.map(c => <FilterPill key={c} label={c} active={filter === c} color={T.amber} onClick={() => setFilter(c)} />)}
      </div>

      {/* Active */}
      <Panel title={`ACTIVE (${active.length})`} titleColor={T.amber}>
        {active.length === 0 ? <EmptyState message="NO ACTIVE CHALLENGES — SET A GOAL OPERATOR" /> :
          active.map(c => {
            const pct = Math.round(((c.progress || 0) / c.target) * 100);
            const color = CAT_COLORS[c.category] || T.amber;
            return (
              <div key={c.id} className="px-3 py-3 border-b" style={{ borderColor: T.border + "66" }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div style={{ color: T.text, fontSize: "12px", fontWeight: "bold" }}>{c.title}</div>
                    {c.description && <div style={{ color: T.textDim, fontSize: "10px" }}>{c.description}</div>}
                    <div className="flex gap-2 mt-1">
                      <span style={{ color, fontSize: "9px", border: `1px solid ${color}44`, padding: "1px 6px" }}>{c.category}</span>
                      {c.deadline && <span style={{ color: T.textFaint, fontSize: "9px" }}>DUE: {c.deadline}</span>}
                      {c.reward_notes && <span style={{ color: T.amber, fontSize: "9px" }}>🏆 {c.reward_notes}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleProgress(c, -1)} style={{ color: T.textFaint, fontSize: "16px", lineHeight: 1 }}>−</button>
                    <span style={{ color: T.text, fontSize: "11px", minWidth: 30, textAlign: "center" }}>{c.progress}/{c.target}</span>
                    <button onClick={() => handleProgress(c, 1)} style={{ color: T.green, fontSize: "16px", lineHeight: 1 }}>+</button>
                    <button onClick={() => handleDelete(c.id)} className="p-1 ml-1 hover:opacity-70">
                      <Trash2 size={9} style={{ color: T.red + "88" }} />
                    </button>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ height: 3, background: T.border, borderRadius: 0 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.3s" }} />
                </div>
                <div style={{ color: T.textFaint, fontSize: "9px", marginTop: 2 }}>{pct}% COMPLETE</div>
              </div>
            );
          })
        }
      </Panel>

      {/* Completed */}
      {done.length > 0 && (
        <Panel title={`COMPLETED (${done.length})`} titleColor={T.green}>
          {done.map(c => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: T.border + "44" }}>
              <div className="flex items-center gap-2">
                <CheckCircle size={10} style={{ color: T.green }} />
                <span style={{ color: T.textDim, fontSize: "11px", textDecoration: "line-through" }}>{c.title}</span>
              </div>
              <button onClick={() => handleDelete(c.id)} className="p-1 hover:opacity-70">
                <Trash2 size={9} style={{ color: T.red + "66" }} />
              </button>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}