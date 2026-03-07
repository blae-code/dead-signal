import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { History, Trash2 } from "lucide-react";

const S = {
  border: "#1e1e1e",
  dim: "#555",
  text: "#c8c8c8",
  faint: "#333",
  warn: "#ffb000",
  danger: "#ff2020"
};

export default function AlertHistoryPanel({ refreshTick }) {
  const [history, setHistory] = useState([]);

  const load = () => {
    base44.entities.AlertHistory.list("-created_date", 100).then(setHistory).catch(() => {});
  };

  useEffect(() => {load();}, [refreshTick]);

  const clearAll = async () => {
    for (const h of history) {
      await base44.entities.AlertHistory.delete(h.id).catch(() => {});
    }
    setHistory([]);
  };

  const opLabel = (op) => op === 'gt' ? '>' : '<';

  const valueColor = (actual, op, threshold) => {
    const breached = op === 'gt' ? actual > threshold : actual < threshold;
    return breached ? S.danger : S.warn;
  };

  return null;








































}