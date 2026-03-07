import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { History, Trash2 } from "lucide-react";

const S = {
  border: "#1e1e1e",
  dim: "#555",
  text: "#c8c8c8",
  faint: "#333",
  warn: "#ffb000",
  danger: "#ff2020",
};

export default function AlertHistoryPanel({ refreshTick }) {
  const [history, setHistory] = useState([]);

  const load = () => {
    base44.entities.AlertHistory.list("-created_date", 100).then(setHistory).catch(() => {});
  };

  useEffect(() => { load(); }, [refreshTick]);

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

  return (
    <div className="border" style={{ borderColor: S.border, background: "#060606" }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: S.border }}>
        <History size={11} style={{ color: S.text }} />
        <span className="text-xs font-bold tracking-widest" style={{ color: S.text, fontFamily: "'Orbitron', monospace" }}>ALERT HISTORY</span>
        <span className="text-xs ml-1" style={{ color: S.faint }}>({history.length})</span>
        {history.length > 0 && (
          <button onClick={clearAll} className="ml-auto flex items-center gap-1 text-xs" style={{ color: S.faint }}>
            <Trash2 size={10} /> CLEAR
          </button>
        )}
      </div>

      <div className="overflow-y-auto" style={{ height: "240px" }}>
        {history.length === 0 ? (
          <div className="px-3 py-4 text-xs" style={{ color: S.faint }}>// NO ALERTS FIRED YET</div>
        ) : (
          history.map(h => (
            <div key={h.id} className="flex gap-3 px-3 py-2 border-b text-xs" style={{ borderColor: S.border }}>
              <span className="flex-shrink-0" style={{ color: S.faint }}>
                {new Date(h.created_date).toLocaleString("en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
              <div className="flex-1 min-w-0">
                <span style={{ color: S.text }}>{h.rule_name}</span>
                <span className="ml-2" style={{ color: S.dim }}>
                  {h.metric} {opLabel(h.operator)} {h.threshold}
                </span>
              </div>
              <span style={{ color: valueColor(h.actual_value, h.operator, h.threshold), flexShrink: 0 }}>
                {h.actual_value}
              </span>
              <div className="flex gap-1 flex-shrink-0">
                {h.notified_inapp && <span className="px-1 border" style={{ borderColor: S.faint, color: S.dim }}>APP</span>}
                {h.notified_email && <span className="px-1 border" style={{ borderColor: S.faint, color: S.dim }}>MAIL</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}