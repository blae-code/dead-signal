import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Skull, Plus, Trash2, CheckCircle } from "lucide-react";
import { T, PageHeader, Panel, FormPanel, Field, ActionBtn, EmptyState } from "@/components/ui/TerminalCard";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";

const pickFirst = (values) => values.find((value) => typeof value === "string" && value.trim()) || "";

const buildEmpty = (causes) => ({
  cause: pickFirst(causes),
  x: "",
  y: "",
  location_name: "",
  gear_lost: "",
  notes: "",
});

export default function DeathMap() {
  const runtimeConfig = useRuntimeConfig();
  const CAUSES = runtimeConfig.getArray(["taxonomy", "death_causes"]);
  const causeColors = useRef({});
  const [user, setUser] = useState(null);
  const [deaths, setDeaths] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(() => buildEmpty(CAUSES));
  const [placing, setPlacing] = useState(false);
  const [selected, setSelected] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      setUser(u);
      const data = await base44.entities.DeathMark.filter({ player_email: u.email }, "-created_date", 100);
      setDeaths(data);
    };
    load();
  }, []);

  useEffect(() => {
    if (!form.cause) {
      setForm((prev) => ({ ...prev, ...buildEmpty(CAUSES) }));
    }
  }, [CAUSES, form.cause]);

  useEffect(() => {
    causeColors.current = Object.fromEntries(
      CAUSES.map((cause, index) => [cause, [T.green, T.red, T.amber, T.orange, T.cyan, "#88ccff", T.textDim][index % 7]]),
    );
  }, [CAUSES]);

  const handleMapClick = (e) => {
    if (!placing) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 14500);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 14500);
    setForm(prev => ({ ...prev, x, y }));
    setPlacing(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    const entry = { ...form, player_email: user.email, x: Number(form.x), y: Number(form.y) };
    const created = await base44.entities.DeathMark.create(entry);
    setDeaths(prev => [created, ...prev]);
    setForm(buildEmpty(CAUSES));
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.DeathMark.delete(id);
    setDeaths(prev => prev.filter(d => d.id !== id));
  };

  const handleRecover = async (d) => {
    const updated = await base44.entities.DeathMark.update(d.id, { recovered: !d.recovered });
    setDeaths(prev => prev.map(x => x.id === d.id ? updated : x));
  };

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto" style={{ minHeight: "calc(100vh - 48px)" }}>
      <PageHeader icon={Skull} title="DEATH MAP" color={T.red}>
        <ActionBtn color={placing ? T.amber : T.red} onClick={() => { setPlacing(!placing); setShowForm(false); }}>
          <Plus size={10} /> {placing ? "CANCEL PLACEMENT" : "MARK DEATH"}
        </ActionBtn>
        <ActionBtn color={T.green} onClick={() => { setPlacing(false); setShowForm(true); setForm(buildEmpty(CAUSES)); }}>
          + MANUAL ENTRY
        </ActionBtn>
      </PageHeader>
      {runtimeConfig.error && (
        <div className="border px-3 py-2 text-xs" style={{ borderColor: T.red + "66", color: T.red }}>
          RUNTIME TAXONOMY UNAVAILABLE
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
          <div style={{ color: T.textFaint, fontSize: "9px" }}>TOTAL DEATHS</div>
          <div style={{ color: T.red, fontFamily: "'Orbitron', monospace", fontSize: "20px" }}>{deaths.length}</div>
        </div>
        <div className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
          <div style={{ color: T.textFaint, fontSize: "9px" }}>GEAR RECOVERED</div>
          <div style={{ color: T.green, fontFamily: "'Orbitron', monospace", fontSize: "20px" }}>{deaths.filter(d => d.recovered).length}</div>
        </div>
        <div className="border p-3 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
          <div style={{ color: T.textFaint, fontSize: "9px" }}>GEAR LOST</div>
          <div style={{ color: T.amber, fontFamily: "'Orbitron', monospace", fontSize: "20px" }}>{deaths.filter(d => !d.recovered).length}</div>
        </div>
      </div>

      {/* Map */}
      <Panel title={placing ? "// CLICK ON MAP TO MARK DEATH LOCATION" : "// DEATH LOCATIONS"} titleColor={placing ? T.amber : T.red}>
        <div
          ref={mapRef}
          onClick={handleMapClick}
          style={{
            position: "relative", width: "100%", paddingTop: "56.25%",
            background: `linear-gradient(135deg, ${T.bg1} 0%, ${T.bg1} 100%)`,
            border: placing ? `2px solid ${T.red}` : "none",
            cursor: placing ? "crosshair" : "default",
            overflow: "hidden"
          }}>
          {/* Grid */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <defs>
              <pattern id="grid-death" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke={T.borderBright} strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-death)" />
          </svg>

          {/* Death markers */}
          {deaths.map(d => {
            const px = (d.x / 14500) * 100;
            const py = (d.y / 14500) * 100;
            return (
              <div key={d.id}
                onClick={e => { e.stopPropagation(); setSelected(selected?.id === d.id ? null : d); }}
                style={{
                  position: "absolute", left: `${px}%`, top: `${py}%`,
                  transform: "translate(-50%, -50%)",
                  cursor: "pointer", zIndex: 10
                }}>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%",
                  background: d.recovered ? T.green + "44" : T.red + "88",
                  border: `2px solid ${d.recovered ? T.green : T.red}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 0 8px ${d.recovered ? T.green : T.red}66`
                }}>
                  <Skull size={7} style={{ color: d.recovered ? T.green : T.red }} />
                </div>
                {selected?.id === d.id && (
                  <div style={{
                    position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)",
                    background: T.bg1, border: `1px solid ${T.border}`, padding: "6px 10px",
                    minWidth: 140, zIndex: 20, fontSize: "10px"
                  }}>
                    <div style={{ color: T.amber, fontWeight: "bold", marginBottom: 2 }}>{d.location_name || `(${d.x}, ${d.y})`}</div>
                    <div style={{ color: causeColors.current[d.cause] || T.textDim }}>Cause: {d.cause}</div>
                    {d.gear_lost && <div style={{ color: T.textDim }}>Lost: {d.gear_lost}</div>}
                    <div style={{ color: d.recovered ? T.green : T.textFaint }}>
                      {d.recovered ? "✓ RECOVERED" : "UNRECOVERED"}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Form */}
      {showForm && (
        <FormPanel title="LOG DEATH" titleColor={T.red} onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CAUSE OF DEATH">
              <select className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.cause} onChange={e => setForm({...form, cause: e.target.value})}>
                {CAUSES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="LOCATION NAME">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.location_name} onChange={e => setForm({...form, location_name: e.target.value})} placeholder="e.g. Airfield" />
            </Field>
            <Field label="X COORD">
              <input type="number" className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.x} onChange={e => setForm({...form, x: e.target.value})} />
            </Field>
            <Field label="Y COORD">
              <input type="number" className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.y} onChange={e => setForm({...form, y: e.target.value})} />
            </Field>
            <Field label="GEAR LOST">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.gear_lost} onChange={e => setForm({...form, gear_lost: e.target.value})} placeholder="e.g. M4, 200 rounds" />
            </Field>
            <Field label="NOTES">
              <input className="w-full border p-2 text-xs" style={{ borderColor: T.border, background: T.bg1, color: T.text }}
                value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ActionBtn color={T.textDim} onClick={() => setShowForm(false)}>CANCEL</ActionBtn>
            <ActionBtn color={T.red} onClick={handleSave}>LOG DEATH</ActionBtn>
          </div>
        </FormPanel>
      )}

      {/* Death list */}
      <Panel title={`DEATH LOG (${deaths.length})`} titleColor={T.red}>
        {deaths.length === 0 ? <EmptyState message="NO DEATHS LOGGED — STAY ALIVE OPERATOR" /> :
          deaths.map(d => (
            <div key={d.id} className="flex items-center justify-between px-3 py-2 border-b"
              style={{ borderColor: T.border + "66" }}>
              <div className="flex items-center gap-3">
                <Skull size={10} style={{ color: d.recovered ? T.green : T.red }} />
                <div>
                  <div style={{ color: T.text, fontSize: "11px" }}>{d.location_name || `Grid (${d.x}, ${d.y})`}</div>
                  <div style={{ color: causeColors.current[d.cause] || T.textDim, fontSize: "9px" }}>{d.cause} · {d.created_date?.slice(0,10)}</div>
                  {d.gear_lost && <div style={{ color: T.textFaint, fontSize: "9px" }}>Lost: {d.gear_lost}</div>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleRecover(d)} className="p-1 hover:opacity-80" title="Toggle recovered">
                  <CheckCircle size={10} style={{ color: d.recovered ? T.green : T.textFaint }} />
                </button>
                <button onClick={() => handleDelete(d.id)} className="p-1 hover:opacity-80">
                  <Trash2 size={10} style={{ color: T.red + "88" }} />
                </button>
              </div>
            </div>
          ))
        }
      </Panel>
    </div>
  );
}
