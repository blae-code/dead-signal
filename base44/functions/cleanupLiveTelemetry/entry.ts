import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import { errorResponse, parseJsonBody, requireAdmin, requireMethod } from "./_shared/backend.ts";
import { requireEntityCollection, safeIsoNow } from "./_shared/liveTelemetryStore.ts";

const toFiniteInt = (value: unknown, fallback: number, min = 1): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return Math.floor(parsed);
};

const deleteOld = async (
  entity: any,
  rows: unknown[],
  getIso: (row: Record<string, unknown>) => string | null,
  cutoffMs: number,
): Promise<number> => {
  const candidates = (Array.isArray(rows) ? rows : []).filter((row) => {
    if (!row || typeof row !== "object") return false;
    const iso = getIso(row as Record<string, unknown>);
    if (!iso) return false;
    const parsed = Date.parse(iso);
    return Number.isFinite(parsed) && parsed < cutoffMs && typeof (row as Record<string, unknown>).id === "string";
  }) as Array<Record<string, unknown>>;

  if (candidates.length === 0) return 0;
  await Promise.all(candidates.map((row) => entity.delete(row.id).catch(() => null)));
  return candidates.length;
};

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    requireAdmin(user);
    const body = await parseJsonBody<{
      sample_retention_hours?: unknown;
      rollup_retention_days?: unknown;
    }>(req);

    const sampleRetentionHours = toFiniteInt(body.sample_retention_hours, 24);
    const rollupRetentionDays = toFiniteInt(body.rollup_retention_days, 30);
    const sampleCutoffMs = Date.now() - sampleRetentionHours * 60 * 60 * 1000;
    const rollupCutoffMs = Date.now() - rollupRetentionDays * 24 * 60 * 60 * 1000;

    const sampleEntity = requireEntityCollection(base44, "LiveTelemetrySample");
    const rollupEntity = requireEntityCollection(base44, "LiveTelemetryRollup");

    const [samples, rollups] = await Promise.all([
      sampleEntity.list("-timestamp", 10_000).catch(() => []),
      rollupEntity.list("-bucket_start", 10_000).catch(() => []),
    ]);

    const [deletedSamples, deletedRollups] = await Promise.all([
      deleteOld(sampleEntity, samples, (row) => {
        if (typeof row.timestamp === "string") return row.timestamp;
        if (typeof row.created_date === "string") return row.created_date;
        return null;
      }, sampleCutoffMs),
      deleteOld(rollupEntity, rollups, (row) => {
        if (typeof row.bucket_start === "string") return row.bucket_start;
        if (typeof row.updated_at === "string") return row.updated_at;
        return null;
      }, rollupCutoffMs),
    ]);

    console.info(JSON.stringify({
      op: "cleanup_live_telemetry",
      deleted_samples: deletedSamples,
      deleted_rollups: deletedRollups,
      sample_retention_hours: sampleRetentionHours,
      rollup_retention_days: rollupRetentionDays,
    }));

    return Response.json({
      success: true,
      deleted_samples: deletedSamples,
      deleted_rollups: deletedRollups,
      sample_retention_hours: sampleRetentionHours,
      rollup_retention_days: rollupRetentionDays,
      cleaned_at: safeIsoNow(),
    });
  } catch (error) {
    return errorResponse(error);
  }
});

