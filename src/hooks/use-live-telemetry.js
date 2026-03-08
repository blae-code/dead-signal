import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const fetchLiveTelemetry = async ({ targetId, windowMinutes }) => {
  const response = await base44.functions.invoke("getLiveTelemetry", {
    target_id: targetId || undefined,
    window_minutes: windowMinutes,
  });
  if (response?.data && !response.data.error) {
    return response.data;
  }
  throw new Error(response?.data?.error || "Failed to fetch live telemetry.");
};

export const useLiveTelemetry = ({
  targetId = null,
  windowMinutes = 60,
  enabled = true,
  refetchInterval = 5_000,
} = {}) => {
  const queryClient = useQueryClient();
  const queryKey = ["live-telemetry", targetId || "default", windowMinutes];
  const query = useQuery({
    queryKey,
    queryFn: () => fetchLiveTelemetry({ targetId, windowMinutes }),
    enabled,
    staleTime: 2_500,
    refetchInterval: enabled ? refetchInterval : false,
    retry: 1,
  });

  useEffect(() => {
    if (!enabled) return;
    const entity = base44?.entities?.LiveTelemetryCurrent;
    if (!entity?.subscribe) return;
    const unsub = entity.subscribe((event) => {
      const eventTarget = event?.data?.target_id || null;
      if (targetId && eventTarget && eventTarget !== targetId) return;
      queryClient.invalidateQueries({ queryKey });
    });
    return () => unsub?.();
  }, [enabled, queryClient, queryKey, targetId]);

  const current = query.data?.current ?? null;
  const ageMs = typeof current?.age_ms === "number" ? current.age_ms : null;
  const stale = typeof current?.stale === "boolean" ? current.stale : true;
  const source = query.data?.source || "unavailable";
  const freshness = source === "unavailable"
    ? "unavailable"
    : (stale ? "stale" : "fresh");

  return {
    ...query,
    targetId: query.data?.target_id ?? targetId ?? null,
    source,
    freshness,
    retrievedAt: query.data?.retrieved_at ?? null,
    current,
    samples: query.data?.samples ?? [],
    rollups: query.data?.rollups ?? [],
    sourceHealth: query.data?.source_health ?? [],
    ageMs,
    stale,
  };
};

