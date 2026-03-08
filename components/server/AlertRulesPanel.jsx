import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Plus, Save, Trash2, PlayCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";

const EMPTY = {
  name: "",
  metric: "",
  operator: "",
  threshold: 80,
  notify_inapp: true,
  notify_email: false,
  email_address: "",
  enabled: true,
  cooldown_minutes: 15,
  auto_remediate: false,
  remediation_command: "",
};

const S = {
  border: "#2a1e10",
  dim: "#a79b8f",
  text: "#eee5d6",
  faint: "#776b5f",
  active: "#39ff14",
  warn: "#ffaa00",
  danger: "#ff2020",
  cyan: "#00e8ff",
};

export default function AlertRulesPanel({ onTriggered }) {
  const queryClient = useQueryClient();
  const runtimeConfig = useRuntimeConfig();
  const metrics = runtimeConfig.getArray(["alerting", "metrics"]);
  const operators = runtimeConfig.getArray(["alerting", "operators"]);
  const defaultMetric = metrics[0]?.value || "";
  const defaultOperator = operators[0]?.value || "";
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY, metric: defaultMetric, operator: defaultOperator });
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  const { data: rules = [] } = useRealtimeEntityList({
    queryKey: ["alert-rules"],
    entityName: "AlertRule",
    queryFn: () => base44.entities.AlertRule.list("-created_date", 50),
    patchStrategy: "patch",
  });

  const save = async () => {
    if (!form.name.trim()) {
      setError("Rule name is required.");
      return;
    }
    if (!form.metric || !form.operator) {
      setError("Runtime alert metric/operator catalog unavailable.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await base44.entities.AlertRule.create({
        ...form,
        threshold: Number(form.threshold),
        cooldown_minutes: Number(form.cooldown_minutes),
      });
      setForm({ ...EMPTY, metric: defaultMetric, operator: defaultOperator });
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
    } catch (err) {
      setError(err?.message || "Failed to save alert rule.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await base44.entities.AlertRule.delete(id).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
  };

  const toggle = async (rule) => {
    const enabled = !rule.enabled;
    await base44.entities.AlertRule.update(rule.id, { enabled }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
  };

  const runCheck = async () => {
    setChecking(true);
    setError(null);
    try {
      const response = await base44.functions.invoke("checkAlerts", {});
      if (response?.data?.triggered?.length > 0 && onTriggered) {
        onTriggered(response.data.triggered);
      }
    } catch (err) {
      setError(err?.message || "Failed to run alert check.");
    } finally {
      setChecking(false);
    }
  };

  const enabledCount = useMemo(
    () => rules.filter((rule) => rule.enabled).length,
    [rules],
  );
  const metricLabel = (metric) => metrics.find((item) => item.value === metric)?.label || metric;
  const opLabel = (operator) => operators.find((item) => item.value === operator)?.label || operator;

  return (
    <div className="border terminal-card" style={{ borderColor: S.border, background: "#1c1c20" }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: S.border }}>
        <Bell size={11} style={{ color: S.warn }} />
        <span className="text-xs font-bold tracking-widest" style={{ color: S.warn, fontFamily: "'Orbitron', monospace" }}>
          ALERT RULES ({enabledCount}/{rules.length} ACTIVE)
        </span>
        <button onClick={runCheck} disabled={checking} className="ml-auto flex items-center gap-1 text-xs px-2 py-1 border" style={{ borderColor: S.cyan + "77", color: S.cyan }}>
          <PlayCircle size={10} />
          {checking ? "CHECKING..." : "RUN CHECK"}
        </button>
        <button onClick={() => setShowForm((value) => !value)} className="flex items-center gap-1 text-xs px-2 py-1 border" style={{ borderColor: S.warn + "77", color: S.warn }}>
          <Plus size={10} />
          RULE
        </button>
      </div>

      {runtimeConfig.error && (
        <div className="px-3 py-2 text-xs border-b" style={{ borderColor: S.border, color: S.danger }}>
          RUNTIME ALERT CATALOG UNAVAILABLE
        </div>
      )}

      {showForm && (
        <div className="p-3 border-b space-y-2" style={{ borderColor: S.border }}>
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Rule name"
            className="w-full text-xs px-2 py-1.5 border bg-transparent outline-none"
            style={{ borderColor: S.border, color: S.text, background: "#18181c" }}
          />
          <div className="grid grid-cols-3 gap-2">
            <select
              className="text-xs px-2 py-1.5 border bg-transparent outline-none"
              style={{ borderColor: S.border, color: S.text, background: "#18181c" }}
              value={form.metric}
              onChange={(event) => setForm((prev) => ({ ...prev, metric: event.target.value }))}
            >
              {metrics.map((metric) => (
                <option key={metric.value} value={metric.value}>
                  {metric.label}
                </option>
              ))}
            </select>
            <select
              className="text-xs px-2 py-1.5 border bg-transparent outline-none"
              style={{ borderColor: S.border, color: S.text, background: "#18181c" }}
              value={form.operator}
              onChange={(event) => setForm((prev) => ({ ...prev, operator: event.target.value }))}
            >
              {operators.map((operator) => (
                <option key={operator.value} value={operator.value}>
                  {operator.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={form.threshold}
              onChange={(event) => setForm((prev) => ({ ...prev, threshold: event.target.value }))}
              className="text-xs px-2 py-1.5 border bg-transparent outline-none"
              style={{ borderColor: S.border, color: S.text, background: "#18181c" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={form.cooldown_minutes}
              onChange={(event) => setForm((prev) => ({ ...prev, cooldown_minutes: event.target.value }))}
              className="text-xs px-2 py-1.5 border bg-transparent outline-none"
              style={{ borderColor: S.border, color: S.text, background: "#18181c" }}
              placeholder="Cooldown (minutes)"
            />
            <input
              type="email"
              value={form.email_address}
              onChange={(event) => setForm((prev) => ({ ...prev, email_address: event.target.value }))}
              className="text-xs px-2 py-1.5 border bg-transparent outline-none"
              style={{ borderColor: S.border, color: S.text }}
              placeholder="Alert email (optional)"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: S.text }}>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.notify_inapp} onChange={(event) => setForm((prev) => ({ ...prev, notify_inapp: event.target.checked }))} />
              IN-APP
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.notify_email} onChange={(event) => setForm((prev) => ({ ...prev, notify_email: event.target.checked }))} />
              EMAIL
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: S.text }}>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.auto_remediate} onChange={(event) => setForm((prev) => ({ ...prev, auto_remediate: event.target.checked }))} />
              AUTO-REMEDIATE
            </label>
            <input
              value={form.remediation_command}
              onChange={(event) => setForm((prev) => ({ ...prev, remediation_command: event.target.value }))}
              placeholder="remediation command"
              className="text-xs px-2 py-1.5 border bg-transparent outline-none"
              style={{ borderColor: S.border, color: S.text }}
            />
          </div>
          <button onClick={save} disabled={saving || metrics.length === 0 || operators.length === 0} className="text-xs px-3 py-1.5 border flex items-center gap-1" style={{ borderColor: S.active + "88", color: S.active }}>
            <Save size={10} />
            {saving ? "SAVING..." : "SAVE RULE"}
          </button>
        </div>
      )}

      {error && (
        <div className="px-3 py-2 text-xs border-b" style={{ borderColor: S.border, color: S.danger }}>
          {error}
        </div>
      )}

      <div className="max-h-72 overflow-y-auto">
        {rules.length === 0 ? (
          <div className="px-3 py-4 text-xs" style={{ color: S.faint }}>
            NO ALERT RULES
          </div>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="px-3 py-2 border-b flex items-start gap-2" style={{ borderColor: S.border }}>
              <button onClick={() => toggle(rule)} className="text-xs px-1.5 py-0.5 border" style={{ borderColor: rule.enabled ? S.active + "88" : S.dim + "66", color: rule.enabled ? S.active : S.dim }}>
                {rule.enabled ? "ON" : "OFF"}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold" style={{ color: S.text }}>
                  {rule.name}
                </div>
                <div className="text-xs" style={{ color: S.dim }}>
                  {metricLabel(rule.metric)} {opLabel(rule.operator)} {rule.threshold} • cooldown {rule.cooldown_minutes || 15}m
                </div>
              </div>
              <button onClick={() => remove(rule.id)} className="p-1" title="Delete rule">
                <Trash2 size={10} style={{ color: S.danger }} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


