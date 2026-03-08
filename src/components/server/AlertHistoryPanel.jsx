import { useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { History, Trash2 } from "lucide-react";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import { useQueryClient } from "@tanstack/react-query";

const S = {
  border: "#1e1e1e",
  dim: "#555",
  faint: "#333",
  warn: "#ffb000",
  danger: "#ff2020",
  text: "#c8c8c8",
};

const opLabel = (op) => ({
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  eq: "=",
  neq: "!=",
}[op] || op);

const valueColor = (actual, op, threshold) => {
  const breached = op === "gt" || op === "gte"
    ? actual >= threshold
    : op === "lt" || op === "lte"
      ? actual <= threshold
      : actual === threshold;
  return breached ? S.danger : S.warn;
};

export default function AlertHistoryPanel({ refreshTick }) {
  const queryClient = useQueryClient();
  const { data: history = [] } = useRealtimeEntityList({
    queryKey: ["alert-history"],
    entityName: "AlertHistory",
    queryFn: () => base44.entities.AlertHistory.list("-created_date", 100).catch(() => []),
    patchStrategy: "patch",
  });

  useEffect(() => {
    if (!refreshTick) return;
    queryClient.invalidateQueries({ queryKey: ["alert-history"] });
  }, [queryClient, refreshTick]);

  const clearAll = async () => {
    await Promise.all(history.map((entry) => base44.entities.AlertHistory.delete(entry.id).catch(() => {})));
    queryClient.invalidateQueries({ queryKey: ["alert-history"] });
  };

  const breachedCount = useMemo(
    () => history.length,
    [history.length],
  );

  return (
    <div className="border" style={{ borderColor: S.border, background: "#060606" }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: S.border }}>
        <History size={11} style={{ color: S.warn }} />
        <span
          className="text-xs font-bold tracking-widest"
          style={{ color: S.warn, fontFamily: "'Orbitron', monospace" }}
        >
          ALERT HISTORY ({breachedCount})
        </span>
        {history.length > 0 && (
          <button
            onClick={clearAll}
            className="ml-auto flex items-center gap-1 text-xs px-2 py-1 border"
            style={{ borderColor: S.danger + "77", color: S.danger }}
          >
            <Trash2 size={10} />
            CLEAR
          </button>
        )}
      </div>

      <div className="max-h-72 overflow-y-auto">
        {history.length === 0 ? (
          <div className="px-3 py-4 text-xs" style={{ color: S.faint }}>
            // NO ALERT TRIGGERS
          </div>
        ) : (
          history.map((item) => (
            <div key={item.id} className="px-3 py-2 border-b text-xs" style={{ borderColor: S.border }}>
              <div className="flex items-center justify-between gap-2">
                <span style={{ color: S.text, fontWeight: 700 }}>{item.rule_name || "Rule Triggered"}</span>
                <span style={{ color: S.dim }}>{item.created_date?.slice(0, 19)?.replace("T", " ") || ""}</span>
              </div>
              <div style={{ color: valueColor(item.actual_value, item.operator, item.threshold) }}>
                {item.metric} {opLabel(item.operator)} {item.threshold} • actual {item.actual_value}
              </div>
              <div style={{ color: S.dim }}>
                target: {item.target_id || "default"} • source: {item.source || "live"}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
