import { useMemo } from "react";

const parseMetricEnvelope = (status, metricKey) => {
  const envelope = status?.metrics?.[metricKey];
  if (envelope && typeof envelope === "object") {
    return {
      value: envelope.value ?? null,
      available: envelope.available === true,
      source: typeof envelope.source === "string" ? envelope.source : (envelope.available ? "live" : "unavailable"),
      retrievedAt: envelope.retrieved_at ?? status?.retrieved_at ?? null,
      ageMs: typeof envelope.age_ms === "number" ? envelope.age_ms : null,
      stale: envelope.stale === true,
    };
  }

  const value = status?.[metricKey];
  const available = status?.metric_available?.[metricKey] === true
    || (value !== null && value !== undefined);
  const source = status?.metric_source?.[metricKey]
    || (available ? "live" : "unavailable");
  return {
    value: value ?? null,
    available,
    source,
    retrievedAt: status?.retrieved_at ?? null,
    ageMs: null,
    stale: status?.stale === true,
  };
};

export const useLiveMetric = (status, metricKey) => useMemo(
  () => parseMetricEnvelope(status, metricKey),
  [status, metricKey],
);

