import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Crosshair, Plus, Save, ChevronDown, ChevronUp } from "lucide-react";
import { T, PageHeader, FormPanel, Field, ActionBtn, FilterPill, inputStyle, selectStyle, accentLine, GlowDot } from "@/components/ui/TerminalCard";
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

      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {STATUSES.map(s => (
          <div key={s} className="relative border p-2.5 text-center overflow-hidden" style={{ borderColor: T.border, background: T.bg1 }}>
            <div style={accentLine(STATUS_COLORS[s] || T.textFaint)} />
            <div className="text-base font-bold" style={{ color: STATUS_COLORS[s], fontFamily: "'Orbitron', monospace", textShadow: `0 0 12px ${STATUS_COLORS[s]}88` }}>
              {missions.filter(m => m.status === s).length}
            </div>
            <div className="text-xs tracking-widest mt-0.5" style={{ color: T.textFaint, fontSize: "9px" }}>{s.toUpperCase()}</div>
          </div>
        ))}
      </div>

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
          ? <div className="border px-3 py-6 text-xs text-center" style={{ borderColor: T.border, color: T.textFaint }}>// NO MISSIONS ON RECORD</div>
          : filtered.map(m => (
            <div key={m.id} className="relative border overflow-hidden" style={{ borderColor: expanded === m.id ? (STATUS_COLORS[m.status] + "88") : T.border, background: T.bg1 }}>
              {expanded === m.id && <div style={accentLine(STATUS_COLORS[m.status] || T.amber)} />}
              <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none" onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
                <div style={{ position: "absolute", left: 0, top: "15%", bottom: "15%", width: "2px", background: PRIORITY_COLORS[m.priority] || T.textDim, boxShadow: `0 0 4px ${PRIORITY_COLORS[m.priority] || T.textDim}` }} />
                <span className="text-xs px-1.5 py-0.5 border pl-2" style={{ borderColor: PRIORITY_COLORS[m.priority] + "88", color: PRIORITY_COLORS[m.priority], fontSize: "9px", letterSpacing: "0.1em" }}>
                  {m.priority?.toUpperCase()}
                </span>
                <span className="text-xs font-bold flex-1 truncate" style={{ color: T.text }}>{m.title}</span>
                <span className="text-xs flex items-center gap-1 flex-shrink-0" style={{ color: STATUS_COLORS[m.status] }}>
                  <GlowDot color={STATUS_COLORS[m.status] || T.textFaint} size={5} />{m.status}
                </span>
                {connectedRooms.includes(m.voice_room_name || buildMissionRoomName(m.id))
                  ? <span style={{ color: T.green, fontSize: "8px", letterSpacing: "0.08em", textShadow: `0 0 6px ${T.green}` }}>● VOICE</span>
                  : <span style={{ color: T.textGhost, fontSize: "8px", letterSpacing: "0.08em" }}>IDLE</span>
                }
                {expanded === m.id
                  ? <ChevronUp size={11} style={{ color: T.textFaint, flexShrink: 0 }} />
                  : <ChevronDown size={11} style={{ color: T.textFaint, flexShrink: 0 }} />
                }
              </div>

              {expanded === m.id && (
                <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: T.border }}>
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: T.textDim }}>{m.briefing}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {m.objective_coords && <div><span style={{ color: T.textFaint }}>COORDS: </span><span style={{ color: T.cyan }}>{m.objective_coords}</span></div>}
                    {m.reward          && <div><span style={{ color: T.textFaint }}>REWARD: </span><span style={{ color: T.amber }}>{m.reward}</span></div>}
                    {m.deadline        && <div><span style={{ color: T.textFaint }}>DEADLINE: </span><span style={{ color: T.red }}>{new Date(m.deadline).toLocaleDateString()}</span></div>}
                  </div>
                  {isAdmin && (
                  <div className="flex flex-wrap gap-1 pt-2 border-t" style={{ borderColor: T.border }}>
                    {STATUSES.map(s => (
                      <button key={s} onClick={() => handleStatusChange(m.id, s)}
                        className="text-xs px-2 py-0.5 border transition-colors"
                        style={{ borderColor: m.status === s ? STATUS_COLORS[s] : T.border, color: m.status === s ? STATUS_COLORS[s] : T.textFaint }}>
                        {s}
                      </button>
                    ))}
                    <button onClick={() => { setForm({ ...m }); setEditing(m.id); setShowForm(true); setExpanded(null); }}
                      className="text-xs px-2 py-0.5 border ml-auto" style={{ borderColor: T.border, color: T.textDim }}>
                      EDIT
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="text-xs px-2 py-0.5 border"
                      style={{ borderColor: T.red + "44", color: T.red + "88" }}>
                      DELETE
                    </button>
                  </div>
                  )}
                </div>
              )}
            </div>
          ))
        }
      </div>

    </div>
  );
}
