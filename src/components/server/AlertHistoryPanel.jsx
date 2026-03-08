import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { History, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { T } from "@/components/ui/TerminalCard";

export default function AlertHistoryPanel({ refreshTick }) {
  const [history, setHistory] = useState([]);

  const load = () => {
    base44.entities.AlertHistory.list("-created_date", 50).then(setHistory).catch(() => {});
  };

  useEffect(() => { load(); }, [refreshTick]);

  const clearAll = async () => {
    for (const h of history) {
      await base44.entities.AlertHistory.delete(h.id).catch(() => {});
    }
    setHistory([]);
  };

  const severityColor = (s) => ({ CRITICAL: T.red, ALERT: T.orange, WARN: T.amber }[s] || T.textFaint);

  return (
    <div className="border" style={{ borderColor: T.border, background: T.bg1 }}>
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: T.border }}>
        <div className="flex items-center gap-2">
          <History size={10} style={{ color: T.red }} />
          <span style={{ color: T.red, fontSize: "10px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.15em" }}>ALERT HISTORY</span>
        </div>
        {history.length > 0 && (
          <button onClick={clearAll} className="hover:opacity-70 transition-opacity">
            <Trash2 size={10} style={{ color: T.textFaint }} />
          </button>
        )}
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: "200px" }}>
        {history.length === 0 ? (
          <div className="px-3 py-4 text-xs text-center" style={{ color: T.textFaint }}>// NO ALERT HISTORY</div>
        ) : (
          history.map((h, i) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-start gap-2 px-3 py-2"
              style={{ borderBottom: `1px solid ${T.border}44` }}
            >
              <div
                style={{ width: "6px", height: "6px", borderRadius: "50%", background: severityColor(h.severity), flexShrink: 0, marginTop: "3px" }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs" style={{ color: T.text, fontSize: "10px" }}>{h.rule_name || h.metric}</div>
                <div style={{ color: T.textFaint, fontSize: "9px" }}>
                  {h.metric} {h.operator === "gt" ? ">" : "<"} {h.threshold} — actual: <span style={{ color: severityColor(h.severity) }}>{h.actual}</span>
                </div>
              </div>
              <div style={{ color: T.textFaint, fontSize: "8px", flexShrink: 0 }}>
                {new Date(h.created_date).toLocaleTimeString("en-US", { hour12: false })}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}