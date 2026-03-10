import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Plus, Edit2, Trash2, Save, Shield, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { T, PageHeader, StatGrid, Panel, FormPanel, Field, ActionBtn, TableHeader, TableRow, EmptyState, inputStyle, selectStyle, accentLine } from "@/components/ui/TerminalCard";
import VoiceChannelPanel from "@/components/voice/VoiceChannelPanel";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { buildClanRoomName, sanitizeRoomToken } from "@/lib/livekit-room-utils";
import { useLiveKit } from "@/hooks/use-livekit";

const ROLE_COLORS   = { Commander: T.orange, Lieutenant: T.amber, Scout: T.cyan, Engineer: T.green, Medic: "#ff5555", Grunt: T.textDim };
const STATUS_COLORS = { Active: T.green, Inactive: T.textDim, MIA: T.amber, KIA: T.red };
const pickByToken = (values, token) =>
  values.find((value) => typeof value === "string" && value.toLowerCase() === token) || "";
const pickFirst = (values) => values.find((value) => typeof value === "string" && value.trim()) || "";
const buildEmpty = (roles, statuses) => ({
  callsign: "",
  role: pickFirst(roles),
  status: pickFirst(statuses),
  steam_id: "",
  playtime_hours: 0,
  kills: 0,
  deaths: 0,
  notes: "",
});

export default function ClanRoster() {
  const { connectedRooms } = useLiveKit();
  const runtimeConfig = useRuntimeConfig();
  const queryClient = useQueryClient();
  const ROLES = runtimeConfig.getArray(["taxonomy", "clan_roles"]);
  const STATUSES = runtimeConfig.getArray(["taxonomy", "clan_statuses"]);
  const activeStatus = pickByToken(STATUSES, "active");
  const { data: members = [] } = useRealtimeEntityList({
    queryKey: ["clan-roster", "members"],
    entityName: "ClanMember",
    queryFn: () => base44.entities.ClanMember.list("-created_date"),
    patchStrategy: "patch",
  });
  const { data: user = null } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => base44.auth.me(),
    retry: 1,
  });
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => buildEmpty(ROLES, STATUSES));
  const isAdmin = user?.role === "admin";
  const userClanMembership = members.find((entry) => entry.user_email && user?.email && entry.user_email === user.email) || null;
  const clanRoomName = buildClanRoomName(sanitizeRoomToken(userClanMembership?.clan_id || "primary"));
  const clanRoomConnected = connectedRooms.includes(clanRoomName);

  useEffect(() => {
    if (form.role && form.status) return;
    setForm((prev) => ({ ...prev, ...buildEmpty(ROLES, STATUSES) }));
  }, [ROLES, STATUSES, form.role, form.status]);

  const handleSave = async () => {
    if (!form.callsign.trim()) return;
    if (editing) {
      await base44.entities.ClanMember.update(editing, { ...form, user_email: form.user_email || user?.email });
    } else {
      await base44.entities.ClanMember.create({ ...form, user_email: user?.email });
    }
    queryClient.invalidateQueries({ queryKey: ["clan-roster", "members"] });
    setForm(buildEmpty(ROLES, STATUSES)); setEditing(null); setShowForm(false);
  };

  const handleEdit = (m) => { setForm({ ...m }); setEditing(m.id); setShowForm(true); setSelected(null); };
  const handleDelete = async (id) => { await base44.entities.ClanMember.delete(id); queryClient.invalidateQueries({ queryKey: ["clan-roster", "members"] }); setSelected(null); };

  const handleStartClanCall = async (roomName) => {
    const targetRoom = roomName || clanRoomName;
    await base44.entities.Announcement.create({
      title: "CLAN VOICE CHANNEL ONLINE",
      body: `Join voice room: ${targetRoom}`,
      type: "Ops",
      pinned: true,
      posted_by: user?.full_name || user?.email || "System",
    }).catch(() => null);
  };

  const activeCount = activeStatus ? members.filter((member) => member.status === activeStatus).length : 0;
  const kdrAvg = members.length > 0
    ? (members.reduce((a, m) => a + (m.deaths > 0 ? m.kills / m.deaths : m.kills), 0) / members.length).toFixed(2)
    : "—";

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto" style={{ minHeight: "calc(100vh - 48px)" }}>
      <PageHeader icon={Users} title="CLAN ROSTER" color={T.amber}>
        <span style={{ color: clanRoomConnected ? T.green : T.textFaint, fontSize: "9px", letterSpacing: "0.08em" }}>
          CLAN VOICE {clanRoomConnected ? "ONLINE" : "STANDBY"}
        </span>
        {isAdmin && (
          <ActionBtn color={T.cyan} onClick={() => handleStartClanCall(clanRoomName)}>
            <ExternalLink size={10} /> START CLAN CALL
          </ActionBtn>
        )}
        {isAdmin && (
          <ActionBtn color={T.green} onClick={() => { setShowForm(!showForm); setEditing(null); setForm(buildEmpty(ROLES, STATUSES)); }}>
            <Plus size={10} /> ENLIST
          </ActionBtn>
        )}
      </PageHeader>
      {runtimeConfig.error && (
        <div className="border px-3 py-2 text-xs" style={{ borderColor: T.red + "66", color: T.red }}>
          RUNTIME TAXONOMY UNAVAILABLE
        </div>
      )}

      <StatGrid stats={[
        { label: "TOTAL OPERATORS", value: members.length,  color: T.amber },
        { label: "ACTIVE",          value: activeCount,     color: T.green },
        { label: "AVG K/D",         value: kdrAvg,          color: T.cyan },
      ]} />

      {showForm && isAdmin && (
        <FormPanel title={editing ? "EDIT OPERATOR" : "NEW OPERATOR"} onClose={() => { setShowForm(false); setEditing(null); setForm(buildEmpty(ROLES, STATUSES)); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CALLSIGN *">
              <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
                value={form.callsign} onChange={e => setForm(f => ({ ...f, callsign: e.target.value }))} placeholder="e.g. GHOST" />
            </Field>
            <Field label="STEAM ID">
              <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
                value={form.steam_id} onChange={e => setForm(f => ({ ...f, steam_id: e.target.value }))} placeholder="76561..." />
            </Field>
            <Field label="ROLE">
              <select className="w-full text-xs px-2 py-1.5 border outline-none" style={selectStyle}
                value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="STATUS">
              <select className="w-full text-xs px-2 py-1.5 border outline-none" style={selectStyle}
                value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="KILLS">
              <input type="number" className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
                value={form.kills} onChange={e => setForm(f => ({ ...f, kills: parseInt(e.target.value) || 0 }))} />
            </Field>
            <Field label="DEATHS">
              <input type="number" className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
                value={form.deaths} onChange={e => setForm(f => ({ ...f, deaths: parseInt(e.target.value) || 0 }))} />
            </Field>
            <div className="col-span-2">
              <Field label="NOTES / DOSSIER">
                <textarea className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none resize-none" rows={2} style={inputStyle}
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </Field>
            </div>
          </div>
          <ActionBtn color={T.green} onClick={handleSave}>
            <Save size={10} /> {editing ? "UPDATE" : "ENLIST"}
          </ActionBtn>
        </FormPanel>
      )}

      <VoiceChannelPanel
        title="CLAN VOICE CHANNELS"
        titleColor={T.cyan}
        includeMissionRooms={false}
        includeClanRoom={true}
        includeOpsRoom={true}
        onClanCallBroadcast={handleStartClanCall}
      />

      <Panel>
        <TableHeader columns={["CALLSIGN", "ROLE", "STATUS", "K/D", "HRS", ""]}
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px" }} />
        {members.length === 0
          ? <EmptyState message="NO OPERATORS ENLISTED" />
          : members.map(m => (
            <TableRow key={m.id} style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 80px" }}
              onClick={() => setSelected(selected?.id === m.id ? null : m)}>
              <span className="text-xs font-bold" style={{ color: T.text }}>{m.callsign}</span>
              <span className="text-xs" style={{ color: ROLE_COLORS[m.role] || T.textDim }}>{m.role}</span>
              <span className="text-xs flex items-center gap-1" style={{ color: STATUS_COLORS[m.status] }}>
                <span style={{ fontSize: "7px" }}>●</span>{m.status}
              </span>
              <span className="text-xs" style={{ color: T.textDim }}>{m.deaths > 0 ? (m.kills / m.deaths).toFixed(1) : m.kills}</span>
              <span className="text-xs" style={{ color: T.textFaint }}>{m.playtime_hours || 0}h</span>
              <div className="flex justify-end gap-1">
                <Link to={createPageUrl(`PlayerProfile?id=${m.id}`)} onClick={e => e.stopPropagation()}
                  className="p-1 hover:opacity-80" title="View Profile" style={{ textDecoration: "none" }}>
                  <ExternalLink size={10} style={{ color: T.cyan }} />
                </Link>
                {isAdmin && <>
                  <button onClick={e => { e.stopPropagation(); handleEdit(m); }} className="p-1 hover:opacity-80">
                    <Edit2 size={10} style={{ color: T.textDim }} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(m.id); }} className="p-1 hover:opacity-80">
                    <Trash2 size={10} style={{ color: T.red + "88" }} />
                  </button>
                </>}
              </div>
            </TableRow>
          ))
        }
      </Panel>

      {selected && (
        <Panel accentBorder={ROLE_COLORS[selected.role]}>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: T.border }}>
              <Shield size={12} style={{ color: ROLE_COLORS[selected.role] }} />
              <span className="text-xs font-bold tracking-widest" style={{ color: ROLE_COLORS[selected.role], fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>
                DOSSIER // {selected.callsign}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: "ROLE",      v: selected.role,                                          c: ROLE_COLORS[selected.role] },
                { l: "STATUS",    v: selected.status,                                        c: STATUS_COLORS[selected.status] },
                { l: "KILLS",     v: selected.kills || 0,                                    c: T.red },
                { l: "DEATHS",    v: selected.deaths || 0,                                   c: T.amber },
                { l: "K/D RATIO", v: selected.deaths > 0 ? (selected.kills / selected.deaths).toFixed(2) : (selected.kills || 0), c: T.green },
                { l: "PLAYTIME",  v: `${selected.playtime_hours || 0}h`,                    c: T.cyan },
                { l: "STEAM ID",  v: selected.steam_id || "—",                               c: T.textDim },
                { l: "ENLISTED",  v: new Date(selected.created_date).toLocaleDateString(),  c: T.textDim },
              ].map(({ l, v, c }) => (
                <div key={l}>
                  <div className="text-xs tracking-widest mb-1" style={{ color: T.textFaint, fontSize: "9px" }}>{l}</div>
                  <div className="text-xs font-bold" style={{ color: c }}>{v}</div>
                </div>
              ))}
            </div>
            {selected.notes && (
              <div className="pt-2 border-t text-xs" style={{ borderColor: T.border, color: T.textDim }}>
                <span style={{ color: T.textFaint }}>// NOTES: </span>{selected.notes}
              </div>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}