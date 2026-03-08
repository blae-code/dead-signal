import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { EmptyState, Panel, T } from "@/components/ui/TerminalCard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";

const allRatings = "__all__";

export default function VouchesPanel() {
  const [ratingFilter, setRatingFilter] = useState(allRatings);
  const { data: vouches = [] } = useRealtimeEntityList({
    queryKey: ["community", "vouches", "panel"],
    entityName: "PlayerVouch",
    queryFn: () => base44.entities.PlayerVouch.list("-created_date", 120).catch(() => []),
    refetchInterval: 20_000,
    patchStrategy: "patch",
  });

  const filtered = ratingFilter === allRatings
    ? vouches
    : vouches.filter((entry) => Number(entry.rating) === Number(ratingFilter));

  return (
    <div className="p-3 space-y-3">
      <Panel title="VOUCH FILTER" titleColor={T.green}>
        <div className="px-3 py-2 flex flex-wrap gap-2">
          {[allRatings, 5, 4, 3, 2, 1].map((value) => {
            const active = ratingFilter === value;
            const label = value === allRatings ? "ALL" : `${value}★`;
            return (
              <button
                type="button"
                key={String(value)}
                onClick={() => setRatingFilter(value)}
                className="border px-2 py-1 text-[9px]"
                style={{
                  borderColor: active ? `${T.green}66` : T.border,
                  color: active ? T.green : T.textDim,
                  background: active ? `${T.green}12` : "transparent",
                  fontFamily: "'Orbitron', monospace",
                  letterSpacing: "0.1em",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title={`PLAYER VOUCHES (${filtered.length})`} titleColor={T.green}>
        {filtered.length === 0 ? (
          <EmptyState message="NO VOUCH RECORDS FOR CURRENT FILTER" />
        ) : (
          <div style={{ maxHeight: "62vh", overflowY: "auto" }}>
            {filtered.map((entry) => (
              <div key={entry.id} className="px-3 py-2 border-b" style={{ borderColor: `${T.border}66` }}>
                <div className="flex items-center gap-2">
                  <span style={{ color: T.amber, fontSize: "10px", letterSpacing: "0.08em" }}>
                    {"★".repeat(Number(entry.rating || 0))}
                    {"☆".repeat(Math.max(0, 5 - Number(entry.rating || 0)))}
                  </span>
                  <span style={{ color: T.text, fontSize: "10px" }}>
                    {entry.target_callsign || entry.target_email || "Unknown Operator"}
                  </span>
                </div>
                {entry.comment && <div style={{ color: T.textDim, fontSize: "10px", marginTop: "2px" }}>{entry.comment}</div>}
                <div style={{ color: T.textFaint, fontSize: "9px", marginTop: "2px" }}>
                  by {entry.voucher_callsign || entry.voucher_email || "Unknown"} • {entry.created_date?.slice(0, 10)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
