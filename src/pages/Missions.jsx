import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Crosshair, Plus, Save, ChevronDown, ChevronUp } from "lucide-react";
import { T, PageHeader, FormPanel, Field, ActionBtn, FilterPill, inputStyle, selectStyle, accentLine, GlowDot, StatGrid } from "@/components/ui/TerminalCard";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";
import { useVoiceSession } from "@/hooks/voice/useVoiceSession.jsx";

const sanitizeRoomToken = (value, fallback = "channel") => {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
};

const buildMissionRoomName = (missionId) => `mission-${sanitizeRoomToken(missionId, "unknown")}`;


const STATUS_COLORS   = { Pending: T.amber, Active: T.green, Complete: T.cyan, Failed: T.red, Aborted: T.textDim };
const PRIORITY_COLORS = { Critical: T.red, High: T.orange, Medium: T.amber, Low: T.green };
const STATUS_FILTER_ALL = "__all__";
const pickFirst = (values) => values.find((value) => typeof value === "string" && value.trim()) || "";

const buildEmpty = (statuses, priorities) => ({
  title: "",
  briefing: "",
  status: pickFirst(statuses),
  priority: pickFirst(priorities),
  objective_coords: "",
  reward: "",
  deadline: "",
  debrief_notes: "",
});

export default function Missions() {
  const { voiceSessionState } = useVoiceSession();
  const connectedRooms = voiceSessionState.connectedNetIds;
  const runtimeConfig = useRuntimeConfig();
  const STATUSES = runtimeConfig.getArray(["taxonomy", "mission_statuses"]);
  const PRIORITIES = runtimeConfig.getArray(["taxonomy", "mission_priorities"]);
  const [missions, setMissions] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => buildEmpty(STATUSES, PRIORITIES));
  const [filterStatus, setFilterStatus] = useState(STATUS_FILTER_ALL);
  const [user, setUser] = useState(null);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.Mission.list("-created_date").then(setMissions).catch(() => {});
  }, []);

  useEffect(() => {
    setForm((prev) => {
      if (prev.status && prev.priority) return prev;
      return buildEmpty(STATUSES, PRIORITIES);
    });
  }, [STATUSES, PRIORITIES]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const buildPayload = (missionId) => ({
      ...form,
      voice_room_name: form.voice_room_name || buildMissionRoomName(missionId || editing || "pending"),
    });

    const persistWithFallback = async (saveFn, idHint) => {
      const payload = buildPayload(idHint);
      try {
        return await saveFn(payload);
      } catch (error) {
        // Entity schema may not include voice_room_name in every environment.
        const fallbackPayload = { ...form };
        return await saveFn(fallbackPayload);
      }
    };

    if (editing) {
      const u = await persistWithFallback((payload) => base44.entities.Mission.update(editing, payload), editing);
      setMissions(m => m.map(x => x.id === editing ? u : x));
    } else {
      const c = await persistWithFallback((payload) => base44.entities.Mission.create(payload), null);
      const roomName = c?.voice_room_name || buildMissionRoomName(c?.id);
      if (c?.id && !c?.voice_room_name) {
        const patched = await base44.entities.Mission.update(c.id, { voice_room_name: roomName }).catch(() => c);
        setMissions(m => [patched, ...m]);
      } else {
        setMissions(m => [c, ...m]);
      }
    }
    setForm(buildEmpty(STATUSES, PRIORITIES)); setEditing(null); setShowForm(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.Mission.delete(id);
    setMissions(m => m.filter(x => x.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const handleStatusChange = async (id, status) => {
    const u = await base44.entities.Mission.update(id, { status });
    setMissions(m => m.map(x => x.id === id ? u : x));
  };

  const filtered = filterStatus === STATUS_FILTER_ALL ? missions : missions.filter((mission) => mission.status === filterStatus);

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto" style={{ minHeight: "calc(100vh - 48px)" }}>
      <PageHeader icon={Crosshair} title="MISSION BOARD" color={T.red}>
        {isAdmin && (
          <ActionBtn color={T.red} onClick={() => { setShowForm(!showForm); setEditing(null); setForm(buildEmpty(STATUSES, PRIORITIES)); }}>
            <Plus size={10} /> NEW MISSION
          </ActionBtn>
        )}
      </PageHeader>

      <div className="flex flex-wrap gap-1">
        <FilterPill label="ALL" active={filterStatus === STATUS_FILTER_ALL} onClick={() => setFilterStatus(STATUS_FILTER_ALL)} />
        {STATUSES.map(s => (
          <FilterPill key={s} label={s} color={STATUS_COLORS[s]} active={filterStatus === s} onClick={() => setFilterStatus(s)} />
        ))}
      </div>

      {runtimeConfig.error && (
        <div className="border px-3 py-2 text-xs" style={{ borderColor: T.red + "66", color: T.red }}>
          RUNTIME TAXONOMY UNAVAILABLE
        </div>
      )}

      <StatGrid stats={STATUSES.map(s => ({
        label: s.toUpperCase(),
        value: missions.filter(m => m.status === s).length,
        color: STATUS_COLORS[s] || T.textFaint,
        sub: `${Math.round((missions.filter(m => m.status === s).length / Math.max(missions.length, 1)) * 100)}%`,
      }))} />

      {showForm && isAdmin && (
        <FormPanel title={editing ? "EDIT MISSION" : "NEW MISSION BRIEFING"} titleColor={T.red} onClose={() => { setShowForm(false); setEditing(null); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="MISSION TITLE *">
              <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Operation..." />
            </Field>
            <Field label="PRIORITY">
              <select className="w-full text-xs px-2 py-1.5 border outline-none" style={selectStyle}
                value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="STATUS">
              <select className="w-full text-xs px-2 py-1.5 border outline-none" style={selectStyle}
                value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="OBJECTIVE COORDS">
              <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
                value={form.objective_coords} onChange={e => setForm(f => ({ ...f, objective_coords: e.target.value }))} placeholder="Grid E4..." />
            </Field>
            <Field label="REWARD / OBJECTIVE">
              <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
                value={form.reward} onChange={e => setForm(f => ({ ...f, reward: e.target.value }))} placeholder="Loot / XP..." />
            </Field>
            <Field label="DEADLINE">
              <input type="datetime-local" className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
                value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            </Field>
            <div className="md:col-span-2">
              <Field label="BRIEFING *">
                <textarea className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none resize-none" rows={3} style={inputStyle}
                  value={form.briefing} onChange={e => setForm(f => ({ ...f, briefing: e.target.value }))}
                  placeholder="Mission objectives and intel..." />
              </Field>
            </div>
          </div>
          <ActionBtn color={T.red} onClick={handleSave}>
            <Save size={10} /> {editing ? "UPDATE" : "POST MISSION"}
          </ActionBtn>
        </FormPanel>
      )}

      <div className="space-y-2">
        {filtered.length === 0
          ? (
            <div className="border px-3 py-8 text-center relative overflow-hidden" style={{ borderColor: T.border, background: T.bg3 }}>
              <div style={accentLine(T.textFaint)} />
              <div style={{ fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.2em", color: T.textFaint }}>▸ NO MISSIONS ON RECORD</div>
            </div>
          )
          : filtered.map(m => {
            const statusColor = STATUS_COLORS[m.status] || T.textFaint;
            const priorityColor = PRIORITY_COLORS[m.priority] || T.textDim;
            const isExpanded = expanded === m.id;
            return (
              <div key={m.id} className="relative overflow-hidden transition-all"
                style={{
                  border: `1px solid ${isExpanded ? statusColor + "66" : T.borderHi}`,
                  background: isExpanded
                    ? `linear-gradient(135deg, ${T.bg2} 0%, ${T.bg3} 100%)`
                    : T.bg1,
                  boxShadow: isExpanded ? `inset 0 0 30px ${statusColor}06, 0 4px 16px rgba(0,0,0,0.5)` : "none",
                }}>
                {isExpanded && <div style={accentLine(statusColor)} />}
                {/* priority bar */}
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: priorityColor, boxShadow: `0 0 6px ${priorityColor}88` }} />

                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none" onClick={() => setExpanded(isExpanded ? null : m.id)}>
                  {/* Priority badge */}
                  <span className="flex-shrink-0 px-1.5 py-0.5 border text-center" style={{
                    borderColor: priorityColor + "77",
                    color: priorityColor,
                    background: `${priorityColor}12`,
                    fontSize: "8px",
                    fontFamily: "'Orbitron', monospace",
                    letterSpacing: "0.08em",
                    minWidth: 48,
                    boxShadow: `0 0 6px ${priorityColor}22`,
                  }}>
                    {m.priority?.toUpperCase()}
                  </span>

                  {/* Title */}
                  <span className="flex-1 truncate" style={{ color: T.text, fontSize: "12px", fontFamily: "'Share Tech Mono', monospace" }}>{m.title}</span>

                  {/* Status */}
                  <span className="flex items-center gap-1.5 flex-shrink-0 px-2 py-0.5 border" style={{
                    borderColor: statusColor + "55",
                    color: statusColor,
                    background: `${statusColor}0d`,
                    fontSize: "9px",
                    fontFamily: "'Orbitron', monospace",
                  }}>
                    <GlowDot color={statusColor} size={5} pulse={m.status === "Active"} />{m.status}
                  </span>

                  {/* Voice indicator */}
                  {connectedRooms.includes(m.voice_room_name || buildMissionRoomName(m.id))
                    ? <span className="flex-shrink-0" style={{ color: T.green, fontSize: "8px", letterSpacing: "0.1em", fontFamily:"'Orbitron', monospace", textShadow: `0 0 6px ${T.green}` }}>◉ LIVE</span>
                    : <span className="flex-shrink-0" style={{ color: T.textGhost, fontSize: "8px" }}>◌ IDLE</span>
                  }

                  {isExpanded
                    ? <ChevronUp size={12} style={{ color: statusColor, flexShrink: 0 }} />
                    : <ChevronDown size={12} style={{ color: T.textFaint, flexShrink: 0 }} />
                  }
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: T.border }}>
                    {m.briefing && (
                      <p className="text-xs mt-3 leading-relaxed px-3 py-2 border-l-2" style={{ color: T.textDim, borderLeftColor: statusColor + "55", background: `${statusColor}06` }}>{m.briefing}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs mt-2">
                      {m.objective_coords && (
                        <div className="border px-2 py-1.5" style={{ borderColor: T.cyan + "33", background: T.cyan + "08" }}>
                          <div style={{ color: T.textFaint, fontSize: "7px", fontFamily:"'Orbitron', monospace", letterSpacing:"0.15em", marginBottom:2 }}>COORDINATES</div>
                          <span style={{ color: T.cyan, fontFamily:"'Orbitron', monospace", fontSize:"11px" }}>{m.objective_coords}</span>
                        </div>
                      )}
                      {m.reward && (
                        <div className="border px-2 py-1.5" style={{ borderColor: T.amber + "33", background: T.amber + "08" }}>
                          <div style={{ color: T.textFaint, fontSize: "7px", fontFamily:"'Orbitron', monospace", letterSpacing:"0.15em", marginBottom:2 }}>REWARD</div>
                          <span style={{ color: T.amber, fontSize:"11px" }}>{m.reward}</span>
                        </div>
                      )}
                      {m.deadline && (
                        <div className="border px-2 py-1.5" style={{ borderColor: T.red + "33", background: T.red + "08" }}>
                          <div style={{ color: T.textFaint, fontSize: "7px", fontFamily:"'Orbitron', monospace", letterSpacing:"0.15em", marginBottom:2 }}>DEADLINE</div>
                          <span style={{ color: T.red, fontSize:"11px" }}>{new Date(m.deadline).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t" style={{ borderColor: T.border }}>
                        <span style={{ color: T.textFaint, fontSize:"8px", fontFamily:"'Orbitron', monospace", letterSpacing:"0.12em", marginRight:4 }}>SET STATUS:</span>
                        {STATUSES.map(s => (
                          <button key={s} onClick={() => handleStatusChange(m.id, s)}
                            className="text-xs px-2 py-0.5 border transition-all"
                            style={{
                              borderColor: m.status === s ? STATUS_COLORS[s] + "88" : T.border,
                              color: m.status === s ? STATUS_COLORS[s] : T.textFaint,
                              background: m.status === s ? `${STATUS_COLORS[s]}14` : "transparent",
                              fontFamily:"'Orbitron', monospace",
                              fontSize:"8px",
                              boxShadow: m.status === s ? `0 0 6px ${STATUS_COLORS[s]}22` : "none",
                            }}>
                            {s}
                          </button>
                        ))}
                        <div className="flex gap-1 ml-auto">
                          <button onClick={() => { setForm({ ...m }); setEditing(m.id); setShowForm(true); setExpanded(null); }}
                            className="text-xs px-2 py-0.5 border" style={{ borderColor: T.border, color: T.textDim }}>
                            EDIT
                          </button>
                          <button onClick={() => handleDelete(m.id)} className="text-xs px-2 py-0.5 border"
                            style={{ borderColor: T.red + "44", color: T.red + "88", background: T.red + "08" }}>
                            DELETE
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        }
      </div>

    </div>
  );
}