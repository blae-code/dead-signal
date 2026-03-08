import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Plus, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { T } from "@/components/ui/TerminalCard";

const METRICS = [
  { value: "cpu", label: "CPU (%)" },
  { value: "ramUsedMB", label: "RAM (MB)" },
  { value: "diskMB", label: "Disk (MB)" },
  { value: "networkRxKB", label: "Net RX (KB/s)" },
  { value: "networkTxKB", label: "Net TX (KB/s)" },
];

const EMPTY = {
  name: "", metric: "cpu", operator: "gt", threshold: 80,
  notify_inapp: true, notify_email: false, email_address: "",
  enabled: true, cooldown_minutes: 15,
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
    if (!form.name.trim()) return;
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

  return (
    <div className="border" style={{ borderColor: T.border, background: T.bg1 }}>
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: T.border }}>
        <div className="flex items-center gap-2">
          <Bell size={10} style={{ color: T.amber }} />
          <span style={{ color: T.amber, fontSize: "10px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.15em" }}>ALERT RULES</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={runCheck}
            disabled={checking}
            className="text-xs px-2 py-0.5 border transition-opacity hover:opacity-80"
            style={{ borderColor: T.cyan + "66", color: T.cyan, fontSize: "9px" }}
          >
            {checking ? "CHECKING..." : "RUN CHECK"}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-2 py-0.5 border transition-opacity hover:opacity-80"
            style={{ borderColor: T.green + "66", color: T.green }}
          >
            <Plus size={10} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b px-3 py-2 space-y-2"
            style={{ borderColor: T.green + "44", background: T.green + "08" }}
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div style={{ color: T.textFaint, fontSize: "8px", marginBottom: "3px" }}>RULE NAME</div>
                <input
                  className="w-full px-2 py-1 border text-xs outline-none"
                  style={{ borderColor: T.border, background: "rgba(20,15,10,0.9)", color: T.text, fontSize: "11px" }}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. High CPU"
                />
              </div>
              <div>
                <div style={{ color: T.textFaint, fontSize: "8px", marginBottom: "3px" }}>METRIC</div>
                <select
                  className="w-full px-2 py-1 border text-xs outline-none"
                  style={{ borderColor: T.border, background: "rgba(20,15,10,0.9)", color: T.text, fontSize: "11px" }}
                  value={form.metric}
                  onChange={e => setForm({ ...form, metric: e.target.value })}
                >
                  {METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <div style={{ color: T.textFaint, fontSize: "8px", marginBottom: "3px" }}>OPERATOR</div>
                <select
                  className="w-full px-2 py-1 border text-xs outline-none"
                  style={{ borderColor: T.border, background: "rgba(20,15,10,0.9)", color: T.text, fontSize: "11px" }}
                  value={form.operator}
                  onChange={e => setForm({ ...form, operator: e.target.value })}
                >
                  <option value="gt">&gt; Greater than</option>
                  <option value="lt">&lt; Less than</option>
                </select>
              </div>
              <div>
                <div style={{ color: T.textFaint, fontSize: "8px", marginBottom: "3px" }}>THRESHOLD</div>
                <input
                  className="w-full px-2 py-1 border text-xs outline-none"
                  style={{ borderColor: T.border, background: "rgba(20,15,10,0.9)", color: T.text, fontSize: "11px" }}
                  type="number"
                  value={form.threshold}
                  onChange={e => setForm({ ...form, threshold: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving || !form.name.trim()}
                className="text-xs px-3 py-1 border transition-opacity hover:opacity-80"
                style={{ borderColor: T.green + "88", color: T.green, opacity: saving ? 0.5 : 1 }}
              >
                {saving ? "SAVING..." : "SAVE RULE"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="text-xs px-3 py-1 border"
                style={{ borderColor: T.border, color: T.textFaint }}
              >
                CANCEL
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="divide-y" style={{ divideColor: T.border }}>
        {rules.length === 0 ? (
          <div className="px-3 py-4 text-xs text-center" style={{ color: T.textFaint }}>// NO RULES DEFINED</div>
        ) : (
          rules.map(rule => (
            <div key={rule.id} className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${T.border}44` }}>
              <button
                onClick={() => toggle(rule)}
                style={{ width: "8px", height: "8px", borderRadius: "50%", background: rule.enabled ? T.green : T.textFaint, flexShrink: 0, border: "none" }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs truncate" style={{ color: T.text }}>{rule.name}</div>
                <div style={{ color: T.textFaint, fontSize: "9px" }}>
                  {rule.metric} {rule.operator === "gt" ? ">" : "<"} {rule.threshold}
                </div>
              </div>
              <button onClick={() => remove(rule.id)} className="hover:opacity-70">
                <X size={10} style={{ color: T.textFaint }} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}