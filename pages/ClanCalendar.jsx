import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, Plus, Trash2, Users, Clock } from "lucide-react";
import { T, PageHeader, Panel, FormPanel, Field, FilterPill, ActionBtn, EmptyState } from "@/components/ui/TerminalCard";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";

const TYPE_COLORS = { Raid: T.red, "Loot Run": T.amber, "Base Building": T.textDim, Training: T.cyan, Meeting: T.green, Social: "#b060ff", Other: T.textDim };
const pickByToken = (values, token) =>
  values.find((value) => typeof value === "string" && value.toLowerCase() === token) || "";
const pickFirst = (values) => values.find((value) => typeof value === "string" && value.trim()) || "";
const pickFirstNonAll = (values) =>
  values.find((value) => typeof value === "string" && value.toLowerCase() !== "all") || pickFirst(values);
const buildEmpty = (types) => ({
  title: "",
  type: pickFirstNonAll(types),
  description: "",
  scheduled_at: "",
  duration_minutes: 60,
  max_players: "",
  notes: "",
  location_coords: "",
});

export default function ClanCalendar() {
  const runtimeConfig = useRuntimeConfig();
  const EVENT_TYPES = runtimeConfig.getArray(["taxonomy", "clan_event_types"]);
  const EVENT_STATUSES = runtimeConfig.getArray(["taxonomy", "clan_event_statuses"]);
  const allFilter = pickByToken(EVENT_TYPES, "all") || pickFirst(EVENT_TYPES);
  const upcomingStatus = pickByToken(EVENT_STATUSES, "upcoming") || pickFirst(EVENT_STATUSES);
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => buildEmpty(EVENT_TYPES));
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!form.type) {
      setForm((prev) => ({ ...prev, ...buildEmpty(EVENT_TYPES) }));
    }
  }, [EVENT_TYPES, form.type]);

  useEffect(() => {
    if (!filter && allFilter) setFilter(allFilter);
  }, [allFilter, filter]);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      setIsAdmin(u.role === "admin");
      const members = await base44.entities.ClanMember.filter({ user_email: u.email });
      if (members.length) setMember(members[0]);
      const data = await base44.entities.ClanEvent.list("scheduled_at", 100);
      setEvents(data);
    };
    load();
  }, []);

  const handleSave = async () => {
    const entry = {
      ...form,
      organizer_email: user.email,
      duration_minutes: Number(form.duration_minutes),
      max_players: form.max_players ? Number(form.max_players) : undefined,
      attendees: [],
    };
    if (upcomingStatus) entry.status = upcomingStatus;
    const created = await base44.entities.ClanEvent.create(entry);
    setEvents(prev => [...prev, created].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)));
    setForm(buildEmpty(EVENT_TYPES));
    setShowForm(false);
  };

  const handleRSVP = async (evt) => {
    const callsign = member?.callsign || user.full_name || user.email;
    const attendees = evt.attendees || [];
    const isIn = attendees.includes(callsign);
    const updated = await base44.entities.ClanEvent.update(evt.id, {
      attendees: isIn ? attendees.filter(a => a !== callsign) : [...attendees, callsign]
    });
    setEvents(prev => prev.map(e => e.id === evt.id ? updated : e));
  };

  const handleDelete = async (id) => {
    await base44.entities.ClanEvent.delete(id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const now = new Date();
  const filtered = !filter || filter === allFilter ? events : events.filter((event) => event.type === filter);
  const upcoming = filtered.filter(e => new Date(e.scheduled_at) >= now);
  const past = filtered.filter(e => new Date(e.scheduled_at) < now);

  const formatDate = (dt) => {
    if (!dt) return "—";
    return new Date(dt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const EventCard = ({ evt }) => {
    const typeColor = TYPE_COLORS[evt.type] || T.textDim;
    const callsign = member?.callsign || user?.full_name || user?.email;
    const attending = (evt.attendees || []).includes(callsign);
    const isPast = new Date(evt.scheduled_at) < now;

    return (
      <div className="px-3 py-3 border-b" style={{ borderColor: T.border + "66", opacity: isPast ? 0.6 : 1 }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span style={{ color: T.text, fontSize: "12px", fontWeight: "bold" }}>{evt.title}</span>
              <span style={{ color: typeColor, fontSize: "9px", border: `1px solid ${typeColor}44`, padding: "1px 6px" }}>{evt.type}</span>
              <span style={{ color: evt.status === upcomingStatus ? T.green : T.textDim, fontSize: "9px" }}>[{evt.status}]</span>
            </div>
            <div className="flex items-center gap-3 text-xs mb-1" style={{ color: T.textDim }}>
              <span><Clock size={9} style={{ display: "inline", marginRight: 3 }} />{formatDate(evt.scheduled_at)}</span>
              <span>{evt.duration_minutes}min</span>
              {evt.max_players && <span><Users size={9} style={{ display: "inline", marginRight: 3 }} />Max: {evt.max_players}</span>}
            </div>
            {evt.description && <div style={{ color: T.textFaint, fontSize: "10px", marginBottom: 4 }}>{evt.description}</div>}
            {evt.attendees?.length > 0 && (
              <div style={{ color: T.green, fontSize: "9px" }}>
                ✓ {evt.attendees.length} attending: {evt.attendees.slice(0, 4).join(", ")}{evt.attendees.length > 4 ? ` +${evt.attendees.length - 4}` : ""}
              </div>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0 ml-2">
            {!isPast && (
              <ActionBtn small color={attending ? T.textDim : T.green} onClick={() => handleRSVP(evt)}>
                {attending ? "LEAVE" : "JOIN"}
              </ActionBtn>
            )}
            {isAdmin && (
              <button onClick={() => handleDelete(evt.id)} className="p-1 hover:opacity-70">
                <Trash2 size={10} style={{ color: T.red + "88" }} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <PageHeader icon={Calendar} title="CLAN CALENDAR" color={T.cyan}>
        {isAdmin && (
          <ActionBtn color={T.cyan} onClick={() => setShowForm(!showForm)}>
            <Plus size={10} /> SCHEDULE EVENT
          </ActionBtn>
        )}
      </PageHeader>
      {runtimeConfig.error && (
        <div className="border px-3 py-2 text-xs" style={{ borderColor: T.red + "66", color: T.red }}>
          RUNTIME TAXONOMY UNAVAILABLE
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
          <div style={{ color: T.textFaint, fontSize: "9px" }}>UPCOMING</div>
          <div style={{ color: T.cyan, fontFamily: "'Orbitron', monospace", fontSize: "20px" }}>{upcoming.length}</div>
        </div>
        <div className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
          <div style={{ color: T.textFaint, fontSize: "9px" }}>THIS WEEK</div>
          <div style={{ color: T.green, fontFamily: "'Orbitron', monospace", fontSize: "20px" }}>
            {upcoming.filter(e => (new Date(e.scheduled_at) - now) < 7 * 86400000).length}
          </div>
        </div>
        <div className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
          <div style={{ color: T.textFaint, fontSize: "9px" }}>PAST</div>
          <div style={{ color: T.textDim, fontFamily: "'Orbitron', monospace", fontSize: "20px" }}>{past.length}</div>
        </div>
      </div>

      {showForm && isAdmin && (
        <FormPanel title="SCHEDULE EVENT" titleColor={T.cyan} onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="TITLE *">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </Field>
            <Field label="TYPE">
              <select className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                {EVENT_TYPES.slice(1).map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="DATE & TIME *">
              <input type="datetime-local" className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
            </Field>
            <Field label="DURATION (MIN)">
              <input type="number" className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: e.target.value})} />
            </Field>
            <Field label="MAX PLAYERS">
              <input type="number" className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.max_players} onChange={e => setForm({...form, max_players: e.target.value})} placeholder="Optional" />
            </Field>
            <Field label="DESCRIPTION">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Optional" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ActionBtn color={T.textDim} onClick={() => setShowForm(false)}>CANCEL</ActionBtn>
            <ActionBtn color={T.cyan} onClick={handleSave} disabled={!form.title || !form.scheduled_at}>SCHEDULE</ActionBtn>
          </div>
        </FormPanel>
      )}

      <div className="flex flex-wrap gap-1">
        {EVENT_TYPES.map(t => <FilterPill key={t} label={t} active={filter === t} color={T.cyan} onClick={() => setFilter(t)} />)}
      </div>

      <Panel title={`UPCOMING (${upcoming.length})`} titleColor={T.cyan}>
        {upcoming.length === 0 ? <EmptyState message="NO UPCOMING EVENTS — SCHEDULE A OP" /> :
          upcoming.map(e => <EventCard key={e.id} evt={e} />)}
      </Panel>

      {past.length > 0 && (
        <Panel title={`PAST EVENTS (${past.length})`} titleColor={T.textDim}>
          {past.slice(-5).reverse().map(e => <EventCard key={e.id} evt={e} />)}
        </Panel>
      )}
    </div>
  );
}
