import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, Save, X } from "lucide-react";

const METRICS = [
  { value: "cpu",          label: "CPU Usage (%)" },
  { value: "ramUsedMB",    label: "RAM Used (MB)" },
  { value: "diskMB",       label: "Disk Used (MB)" },
  { value: "networkRxKB",  label: "Net Download (KB/s)" },
  { value: "networkTxKB",  label: "Net Upload (KB/s)" },
];

const EMPTY = {
  name: "", metric: "cpu", operator: "gt", threshold: 80,
  notify_inapp: true, notify_email: false, email_address: "",
  enabled: true, cooldown_minutes: 15,
};

const S = {
  border: "#1e1e1e",
  dim: "#555",
  text: "#c8c8c8",
  faint: "#333",
  active: "#39ff14",   // status only – used for enabled toggle
  warn: "#ffb000",
  danger: "#ff2020",
};

export default function AlertRulesPanel({ onTriggered }) {
  const [rules, setRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    base44.entities.AlertRule.list("-created_date", 50).then(setRules).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    const record = await base44.entities.AlertRule.create({ ...form, threshold: Number(form.threshold), cooldown_minutes: Number(form.cooldown_minutes) });
    setRules(prev => [record, ...prev]);
    setForm(EMPTY);
    setShowForm(false);
    setSaving(false);
  };

  const remove = async (id) => {
    await base44.entities.AlertRule.delete(id);
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const toggle = async (rule) => {
    await base44.entities.AlertRule.update(rule.id, { enabled: !rule.enabled });
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
  };

  const runCheck = async () => {
    setChecking(true);
    try {
      const res = await base44.functions.invoke('checkAlerts', {});
      if (res.data?.triggered?.length > 0 && onTriggered) onTriggered(res.data.triggered);
    } catch (e) {}
    setChecking(false);
  };

  const opLabel = (op) => op === 'gt' ? '>' : '<';
  const metricLabel = (m) => METRICS.find(x => x.value === m)?.label || m;

  return (
    <div className="border" style={{ borderColor: S.border, background: "#060606" }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: S.border }}>
        <Bell size={11} style={{ color: S.text }} />
        <span className="text-xs font-bold tracking-widest" style={{ color: S.text, fontFamily: "'Orbitron', monospace" }}>ALERT RULES</span>
        <div className="ml-auto flex gap-2">
          <button
            onClick={runCheck}
            disabled={checking}
            className="text-xs px-2 py-0.5 border"
            style={{ borderColor: S.dim, color: checking ? S.faint : S.text }}
          >
            {checking ? "CHECKING..." : "RUN CHECK"}
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            className="text-xs px-2 py-0.5 border flex items-center gap-1"
            style={{ borderColor: S.dim, color: S.text }}
          >
            {showForm ? <X size={9} /> : <Plus size={9} />}
            {showForm ? "CANCEL" : "NEW RULE"}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="p-3 border-b space-y-2" style={{ borderColor: S.border, background: "#080808" }}>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-xs block mb-1" style={{ color: S.dim }}>RULE NAME</label>
              <input
                className="w-full text-xs px-2 py-1 border bg-transparent outline-none"
                style={{ borderColor: S.border, color: S.text }}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. High CPU Alert"
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: S.dim }}>METRIC</label>
              <select
                className="w-full text-xs px-2 py-1 border outline-none"
                style={{ borderColor: S.border, color: S.text, background: "#0a0a0a" }}
                value={form.metric}
                onChange={e => setForm(f => ({ ...f, metric: e.target.value }))}
              >
                {METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-shrink-0">
                <label className="text-xs block mb-1" style={{ color: S.dim }}>COND</label>
                <select
                  className="text-xs px-2 py-1 border outline-none"
                  style={{ borderColor: S.border, color: S.text, background: "#0a0a0a", width: "60px" }}
                  value={form.operator}
                  onChange={e => setForm(f => ({ ...f, operator: e.target.value }))}
                >
                  <option value="gt">&gt;</option>
                  <option value="lt">&lt;</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs block mb-1" style={{ color: S.dim }}>THRESHOLD</label>
                <input
                  type="number"
                  className="w-full text-xs px-2 py-1 border bg-transparent outline-none"
                  style={{ borderColor: S.border, color: S.text }}
                  value={form.threshold}
                  onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: S.dim }}>COOLDOWN (MIN)</label>
              <input
                type="number"
                className="w-full text-xs px-2 py-1 border bg-transparent outline-none"
                style={{ borderColor: S.border, color: S.text }}
                value={form.cooldown_minutes}
                onChange={e => setForm(f => ({ ...f, cooldown_minutes: e.target.value }))}
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.notify_inapp} onChange={e => setForm(f => ({ ...f, notify_inapp: e.target.checked }))} />
                <span className="text-xs" style={{ color: S.dim }}>IN-APP</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.notify_email} onChange={e => setForm(f => ({ ...f, notify_email: e.target.checked }))} />
                <span className="text-xs" style={{ color: S.dim }}>EMAIL</span>
              </label>
            </div>
            {form.notify_email && (
              <div className="col-span-2">
                <label className="text-xs block mb-1" style={{ color: S.dim }}>EMAIL ADDRESS</label>
                <input
                  type="email"
                  className="w-full text-xs px-2 py-1 border bg-transparent outline-none"
                  style={{ borderColor: S.border, color: S.text }}
                  value={form.email_address}
                  onChange={e => setForm(f => ({ ...f, email_address: e.target.value }))}
                  placeholder="alerts@example.com"
                />
              </div>
            )}
          </div>
          <button
            onClick={save}
            disabled={saving || !form.name}
            className="text-xs px-3 py-1 border flex items-center gap-1 mt-1"
            style={{ borderColor: S.dim, color: saving || !form.name ? S.faint : S.text }}
          >
            <Save size={9} /> {saving ? "SAVING..." : "SAVE RULE"}
          </button>
        </div>
      )}

      {/* Rules list */}
      <div className="divide-y" style={{ divideColor: S.border }}>
        {rules.length === 0 && (
          <div className="px-3 py-4 text-xs" style={{ color: S.faint }}>// NO ALERT RULES DEFINED</div>
        )}
        {rules.map(rule => (
          <div key={rule.id} className="flex items-center gap-3 px-3 py-2">
            <button onClick={() => toggle(rule)}>
              {rule.enabled
                ? <ToggleRight size={14} style={{ color: S.active }} />
                : <ToggleLeft size={14} style={{ color: S.faint }} />
              }
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-xs truncate" style={{ color: rule.enabled ? S.text : S.faint }}>{rule.name}</div>
              <div className="text-xs mt-0.5" style={{ color: S.dim }}>
                {metricLabel(rule.metric)} {opLabel(rule.operator)} {rule.threshold}
                {" · "}
                {[rule.notify_inapp && "IN-APP", rule.notify_email && "EMAIL"].filter(Boolean).join(", ") || "no notify"}
              </div>
            </div>
            <button onClick={() => remove(rule.id)}>
              <Trash2 size={11} style={{ color: S.faint }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}