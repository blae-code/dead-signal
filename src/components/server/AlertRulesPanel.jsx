import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, Save, X } from "lucide-react";

const METRICS = [
{ value: "cpu", label: "CPU Usage (%)" },
{ value: "ramUsedMB", label: "RAM Used (MB)" },
{ value: "diskMB", label: "Disk Used (MB)" },
{ value: "networkRxKB", label: "Net Download (KB/s)" },
{ value: "networkTxKB", label: "Net Upload (KB/s)" }];


const EMPTY = {
  name: "", metric: "cpu", operator: "gt", threshold: 80,
  notify_inapp: true, notify_email: false, email_address: "",
  enabled: true, cooldown_minutes: 15
};

const S = {
  border: "#1e1e1e",
  dim: "#555",
  text: "#c8c8c8",
  faint: "#333",
  active: "#39ff14", // status only – used for enabled toggle
  warn: "#ffb000",
  danger: "#ff2020"
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
    setRules((prev) => [record, ...prev]);
    setForm(EMPTY);
    setShowForm(false);
    setSaving(false);
  };

  const remove = async (id) => {
    await base44.entities.AlertRule.delete(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const toggle = async (rule) => {
    await base44.entities.AlertRule.update(rule.id, { enabled: !rule.enabled });
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
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
  const metricLabel = (m) => METRICS.find((x) => x.value === m)?.label || m;

  return null;



















































































































































}