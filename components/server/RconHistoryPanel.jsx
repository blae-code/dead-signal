import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { History, RotateCcw, Trash2 } from "lucide-react";

const S = {
  border: "#2a1e10",
  dim: "#8a7a6a",
  text: "#e8dcc8",
  faint: "#4a3a2a",
  cyan: "#00e8ff",
  green: "#39ff14",
  red: "#ff2020",
};

export default function RconHistoryPanel({ onRerun }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    base44.entities.RconHistory.list("-created_date", 30).then(setHistory).catch(() => {});
  }, []);

  // Listen for new entries added externally
  useEffect(() => {
    const unsub = base44.entities.RconHistory.subscribe((ev) => {
      if (ev.type === "create") setHistory(prev => [ev.data, ...prev].slice(0, 30));
    });
    return unsub;
  }, []);

  const clearAll = async () => {
    await Promise.all(history.map(h => base44.entities.RconHistory.delete(h.id))).catch(() => {});
    setHistory([]);
  };

  return (
    <div className="border terminal-card" style={{ borderColor: S.border, background: "#1c1c20" }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: S.border }}>
        <History size={11} style={{ color: S.cyan }} />
        <span className="text-xs font-bold tracking-widest" style={{ color: S.cyan, fontFamily: "'Orbitron', monospace" }}>CMD HISTORY</span>
        {history.length > 0 && (
          <button onClick={clearAll} className="ml-auto flex items-center gap-1 text-xs" style={{ color: S.faint }}>
            <Trash2 size={10} /> CLEAR
          </button>
        )}
      </div>

      <div className="overflow-y-auto divide-y" style={{ maxHeight: "220px", divideColor: S.border }}>
        {history.length === 0 ? (
          <div className="px-3 py-4 text-xs" style={{ color: S.faint }}>// NO COMMAND HISTORY</div>
        ) : (
          history.map(h => (
            <div key={h.id} className="flex items-start gap-2 px-3 py-2 group">
              <div className="flex-1 min-w-0">
                <div className="text-xs truncate font-bold" style={{ color: h.success !== false ? S.cyan : S.red }}>
                  &gt; {h.command}
                </div>
                {h.output && (
                  <div className="text-xs mt-0.5 truncate" style={{ color: S.dim }}>{h.output}</div>
                )}
                <div className="text-xs mt-0.5" style={{ color: S.faint }}>
                  {new Date(h.created_date).toLocaleTimeString("en-US", { hour12: false })}
                </div>
              </div>
              <button
                onClick={() => onRerun && onRerun(h.command)}
                title="Re-run command"
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
                style={{ color: S.dim }}
              >
                <RotateCcw size={11} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
