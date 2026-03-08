import { AlertTriangle, Clock3, RefreshCw, Wifi } from "lucide-react";
import { T, StatusBadge } from "@/components/ui/TerminalCard";

const SOURCE_COLORS = {
  live: T.green,
  relay: T.cyan,
  panel_live: T.green,
  fallback: T.amber,
  unavailable: T.red,
  best_effort_live: T.amber,
  disabled: T.textFaint,
};

const toAgeLabel = (ageMs) => {
  if (typeof ageMs !== "number" || !Number.isFinite(ageMs) || ageMs < 0) {
    return "AGE N/A";
  }
  if (ageMs < 1000) {
    return `${Math.round(ageMs)}ms`;
  }
  if (ageMs < 60_000) {
    return `${(ageMs / 1000).toFixed(1)}s`;
  }
  return `${Math.round(ageMs / 60_000)}m`;
};

export default function LiveStatusStrip({
  label = "LIVE SOURCE",
  source = "unavailable",
  retrievedAt = null,
  loading = false,
  error = null,
  staleAfterMs = 30_000,
  staleOverride = null,
  onRetry = null,
  extraBadges = [],
}) {
  const parsedRetrievedAt = typeof retrievedAt === "string" ? Date.parse(retrievedAt) : NaN;
  const ageMs = Number.isFinite(parsedRetrievedAt) ? Math.max(0, Date.now() - parsedRetrievedAt) : null;
  const stale = typeof staleOverride === "boolean"
    ? staleOverride
    : (typeof ageMs === "number" ? ageMs > staleAfterMs : true);
  const sourceColor = SOURCE_COLORS[source] || T.textDim;

  return (
    <div
      className="border px-3 py-2 flex flex-wrap items-center gap-2"
      style={{
        borderColor: error ? T.red + "66" : T.border,
        background: error ? T.red + "10" : "rgba(0,0,0,0.25)",
      }}
    >
      <div className="flex items-center gap-1.5">
        <Wifi size={10} style={{ color: sourceColor }} />
        <span style={{ color: T.textFaint, fontSize: "9px", letterSpacing: "0.14em" }}>{label}</span>
      </div>

      <StatusBadge label={`SOURCE: ${String(source || "unavailable").toUpperCase()}`} color={sourceColor} />
      <StatusBadge label={stale ? "STALE" : "FRESH"} color={stale ? T.amber : T.green} />
      <StatusBadge label={`AGE: ${toAgeLabel(ageMs)}`} color={stale ? T.amber : T.textDim} />

      {extraBadges.map((badge) => (
        <StatusBadge
          key={`${badge.label}-${badge.color}`}
          label={badge.label}
          color={badge.color || T.textDim}
        />
      ))}

      {loading && (
        <span className="inline-flex items-center gap-1" style={{ color: T.cyan, fontSize: "9px" }}>
          <Clock3 size={10} />
          SYNCING
        </span>
      )}

      {error && (
        <span className="inline-flex items-center gap-1" style={{ color: T.red, fontSize: "9px" }}>
          <AlertTriangle size={10} />
          {String(error)}
        </span>
      )}

      {onRetry && (
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-1 border px-2 py-1 text-xs"
          style={{ borderColor: T.borderHi, color: T.textDim }}
          onClick={onRetry}
        >
          <RefreshCw size={10} />
          RETRY
        </button>
      )}
    </div>
  );
}
