import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import {
  errorResponse,
  getDefaultPanelTargetId,
  parseJsonBody,
  requireAuthenticated,
  requireMethod,
} from "./_shared/backend.ts";
import { parseIsoAgeMs, requireEntityCollection, safeIsoNow } from "./_shared/liveTelemetryStore.ts";

const toPositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    requireAuthenticated(await base44.auth.me());
    const body = await parseJsonBody<{
      target_id?: unknown;
      window_minutes?: unknown;
      include_rollups?: unknown;
      include_source_health?: unknown;
    }>(req);
    const targetId = typeof body.target_id === "string" && body.target_id.trim()
      ? body.target_id.trim()
      : getDefaultPanelTargetId();
    const windowMinutes = toPositiveInt(body.window_minutes, 60);
    const includeRollups = body.include_rollups !== false;
    const includeSourceHealth = body.include_source_health !== false;

    const currentEntity = requireEntityCollection(base44, "LiveTelemetryCurrent");
    const sampleEntity = requireEntityCollection(base44, "LiveTelemetrySample");
    const rollupEntity = includeRollups ? requireEntityCollection(base44, "LiveTelemetryRollup") : null;
    const sourceHealthEntity = includeSourceHealth ? requireEntityCollection(base44, "LiveSourceHealth") : null;

    const cutoffMs = Date.now() - windowMinutes * 60_000;
    const [currentList, sampleList, rollupList, sourceHealthList] = await Promise.all([
      currentEntity.filter({ target_id: targetId }, "-retrieved_at", 1).catch(() => []),
      sampleEntity.list("-timestamp", 2_000).catch(() => []),
      rollupEntity ? rollupEntity.list("-bucket_start", 2_000).catch(() => []) : Promise.resolve([]),
      sourceHealthEntity ? sourceHealthEntity.list("-timestamp", 500).catch(() => []) : Promise.resolve([]),
    ]);

    const current = Array.isArray(currentList) && currentList.length > 0 ? currentList[0] : null;
    const samples = (Array.isArray(sampleList) ? sampleList : []).filter((row) => {
      if (!row || typeof row !== "object") return false;
      if (row.target_id !== targetId) return false;
      const iso = typeof row.timestamp === "string" ? row.timestamp : (typeof row.created_date === "string" ? row.created_date : "");
      const parsed = Date.parse(iso);
      return Number.isFinite(parsed) && parsed >= cutoffMs;
    });
    const rollups = (Array.isArray(rollupList) ? rollupList : []).filter((row) => {
      if (!row || typeof row !== "object") return false;
      if (row.target_id !== targetId) return false;
      const iso = typeof row.bucket_start === "string" ? row.bucket_start : (typeof row.updated_at === "string" ? row.updated_at : "");
      const parsed = Date.parse(iso);
      return Number.isFinite(parsed) && parsed >= cutoffMs;
    });
    const sourceHealth = (Array.isArray(sourceHealthList) ? sourceHealthList : []).filter((row) => {
      if (!row || typeof row !== "object") return false;
      if (row.target_id !== targetId) return false;
      const iso = typeof row.timestamp === "string" ? row.timestamp : (typeof row.created_date === "string" ? row.created_date : "");
      const parsed = Date.parse(iso);
      return Number.isFinite(parsed) && parsed >= cutoffMs;
    });

    const currentAgeMs = current ? parseIsoAgeMs((current as Record<string, unknown>).retrieved_at) : null;
    return Response.json({
      success: true,
      target_id: targetId,
      source: current ? "live" : "unavailable",
      retrieved_at: safeIsoNow(),
      window_minutes: windowMinutes,
      current: current
        ? {
          ...current,
          age_ms: currentAgeMs,
          stale: currentAgeMs === null ? true : currentAgeMs > windowMinutes * 60_000,
        }
        : null,
      samples,
      rollups,
      source_health: sourceHealth,
    });
  } catch (error) {
    return errorResponse(error);
  }
});

