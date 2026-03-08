import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { invokeFunctionOrFallback } from "@/api/function-invoke";

const fetchLiveTelemetry = async ({ targetId, windowMinutes }) => {
  return invokeFunctionOrFallback("getLiveTelemetry", {
    target_id: targetId || undefined,
    window_minutes: windowMinutes,
  }, () => ({
    success: false,
    target_id: targetId || null,
    source: "unavailable",
    retrieved_at: new Date().toISOString(),
    window_minutes: windowMinutes,
    current: null,
    samples: [],
    rollups: [],
    source_health: [],
  }));

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

  return {
    ...query,
    targetId: query.data?.target_id ?? targetId ?? null,
    retrievedAt: query.data?.retrieved_at ?? null,
    current,
    samples: query.data?.samples ?? [],
    rollups: query.data?.rollups ?? [],
    sourceHealth: query.data?.source_health ?? [],
    ageMs,
    stale,
  };
};

