import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Radio, Plus, Trash2, Save, Pin } from "lucide-react";
import { T, PageHeader, FormPanel, Field, FilterPill, ActionBtn, inputStyle, selectStyle } from "@/components/ui/TerminalCard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";

const TYPE_COLORS = { Emergency: T.red, Intel: T.cyan, Ops: T.orange, General: T.green, Maintenance: T.amber };
const TYPE_ICONS  = { Emergency: "⚠", Intel: "◈", Ops: "⚑", General: "◉", Maintenance: "⚙" };
const ALL_FILTER = "__all__";
const pickFirst = (values) => values.find((value) => typeof value === "string" && value.trim()) || "";
const buildEmpty = (types) => ({
  title: "",
  body: "",
  type: pickFirst(types),
  pinned: false,
});

export default function Intel() {
  const queryClient = useQueryClient();
  const runtimeConfig = useRuntimeConfig();
  const TYPES = runtimeConfig.getArray(["taxonomy", "intel_types"]);
  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => base44.auth.me(),
    staleTime: 60_000,
  });
  const { data: announcements = [] } = useQuery({
    queryKey: ["intel", "announcements"],
    queryFn: () => base44.entities.Announcement.list("-created_date"),
    staleTime: 15_000,
  });
  const isAdmin = user?.role === "admin";
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]     = useState(() => buildEmpty(TYPES));
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState(ALL_FILTER);

  useEffect(() => {
    if (form.type) return;
    setForm((prev) => ({ ...prev, ...buildEmpty(TYPES) }));
  }, [TYPES, form.type]);

  useEffect(() => {
    const unsub = base44.entities.Announcement.subscribe(ev => {
      queryClient.setQueryData(["intel", "announcements"], (current = []) => {
        if (ev.type === "create") return [ev.data, ...current];
        if (ev.type === "update") return current.map((entry) => entry.id === ev.id ? ev.data : entry);
        if (ev.type === "delete") return current.filter((entry) => entry.id !== ev.id);
        return current;
      });
    });
    return unsub;
  }, [queryClient]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    const data = { ...form, posted_by: user?.full_name || user?.email || "Unknown" };
    if (editing) {
      const u = await base44.entities.Announcement.update(editing, data);
      queryClient.setQueryData(["intel", "announcements"], (current = []) =>
        current.map((entry) => entry.id === editing ? u : entry),
      );
    } else {
      const c = await base44.entities.Announcement.create(data);
      queryClient.setQueryData(["intel", "announcements"], (current = []) => [c, ...current]);
    }
    setForm(buildEmpty(TYPES)); setEditing(null); setShowForm(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.Announcement.delete(id);
    queryClient.setQueryData(["intel", "announcements"], (current = []) =>
      current.filter((entry) => entry.id !== id),
    );
  };
  const handlePin = async (ann) => {
    const u = await base44.entities.Announcement.update(ann.id, { pinned: !ann.pinned });
    queryClient.setQueryData(["intel", "announcements"], (current = []) =>
      current.map((entry) => entry.id === ann.id ? u : entry),
    );
  };

  const filtered = filter === ALL_FILTER ? announcements : announcements.filter(a => a.type === filter);
  const sorted   = [...filtered.filter(a => a.pinned), ...filtered.filter(a => !a.pinned)];

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto" style={{ minHeight: "calc(100vh - 48px)" }}>
      <PageHeader icon={Radio} title="INTEL FEED" color={T.amber}>
        {isAdmin && (
          <ActionBtn color={T.amber} onClick={() => { setShowForm(!showForm); setEditing(null); setForm(buildEmpty(TYPES)); }}>
            <Plus size={10} /> BROADCAST
          </ActionBtn>
        )}
      </PageHeader>
      {runtimeConfig.error && (
        <div className="border px-3 py-2 text-xs" style={{ borderColor: T.red + "66", color: T.red }}>
          RUNTIME TAXONOMY UNAVAILABLE
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        <FilterPill label="ALL" active={filter === ALL_FILTER} color={T.amber} onClick={() => setFilter(ALL_FILTER)} />
        {TYPES.map(t => (
          <FilterPill key={t} label={`${TYPE_ICONS[t]} ${t}`} active={filter === t}
            color={TYPE_COLORS[t]} onClick={() => setFilter(t)} />
        ))}
      </div>

      {showForm && isAdmin && (
        <FormPanel title={editing ? "EDIT BROADCAST" : "NEW BROADCAST"} titleColor={T.amber}
          onClose={() => { setShowForm(false); setEditing(null); }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="TITLE *">
                <input className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none" style={inputStyle}
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Broadcast title..." />
              </Field>
            </div>
            <Field label="TYPE">
              <select className="w-full text-xs px-2 py-1.5 border outline-none" style={selectStyle}
                value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} className="accent-yellow-400" />
                <span className="text-xs tracking-widest" style={{ color: T.textDim, fontSize: "9px" }}>PIN TO TOP</span>
              </label>
            </div>
            <div className="col-span-2">
              <Field label="BODY *">
                <textarea className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none resize-none" rows={4} style={inputStyle}
                  value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Broadcast message..." />
              </Field>
            </div>
          </div>
          <ActionBtn color={T.amber} onClick={handleSave}>
            <Save size={10} /> {editing ? "UPDATE" : "TRANSMIT"}
          </ActionBtn>
        </FormPanel>
      )}

      <div className="space-y-2">
        {sorted.length === 0
          ? <div className="border px-3 py-6 text-xs text-center" style={{ borderColor: T.border, color: T.textFaint }}>// NO TRANSMISSIONS ON RECORD</div>
          : sorted.map(a => {
            const tc = TYPE_COLORS[a.type] || T.amber;
            return (
              <div key={a.id} className="border p-4 space-y-2"
                style={{ borderColor: a.pinned ? tc + "66" : T.border, background: T.bg1 }}>
                <div className="flex items-start gap-3">
                  {/* Type badge */}
                  <div className="flex-shrink-0 mt-0.5 w-6 h-6 border flex items-center justify-center text-xs"
                    style={{ borderColor: tc + "44", background: tc + "11", color: tc }}>
                    {TYPE_ICONS[a.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold tracking-wider" style={{ color: tc, fontSize: "10px" }}>[{a.type?.toUpperCase()}]</span>
                      {a.pinned && <span className="text-xs tracking-widest" style={{ color: T.amber, fontSize: "9px" }}>📌 PINNED</span>}
                      <span className="text-xs font-bold" style={{ color: T.text }}>{a.title}</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: T.textDim }}>{a.body}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: T.textFaint, fontSize: "9px" }}>
                      {a.posted_by && <span>BY: {a.posted_by}</span>}
                      <span>{new Date(a.created_date).toLocaleString()}</span>
                    </div>
                  </div>
                  {isAdmin && (
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => handlePin(a)} className="p-1 hover:opacity-80" title="Toggle pin">
                      <Pin size={11} style={{ color: a.pinned ? T.amber : T.textFaint }} />
                    </button>
                    <button onClick={() => { setForm({ title: a.title, body: a.body, type: a.type, pinned: a.pinned }); setEditing(a.id); setShowForm(true); }}
                      className="p-1 hover:opacity-80">
                      <Radio size={11} style={{ color: T.textFaint }} />
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="p-1 hover:opacity-80">
                      <Trash2 size={11} style={{ color: T.red + "66" }} />
                    </button>
                  </div>
                  )}
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}
