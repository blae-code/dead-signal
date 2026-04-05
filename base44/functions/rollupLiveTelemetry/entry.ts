import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import {
  errorResponse,
  getDefaultPanelTargetId,
  parseJsonBody,
  requireAdmin,
  requireMethod,
} from "./_shared/backend.ts";
import { requireEntityCollection, safeIsoNow, upsertByField } from "./_shared/liveTelemetryStore.ts";

interface BucketMetricState {
  sum: number;
  min: number;
  max: number;
  count: number;
}

interface BucketState {
  timestamp: string;
  sample_count: number;
  metrics: Record<string, BucketMetricState>;
}

const METRIC_FIELDS: Array<{ source: string; key: string }> = [
  { source: "cpu_percent", key: "cpu" },
  { source: "ram_used_mb", key: "ramUsedMB" },
  { source: "disk_used_mb", key: "diskMB" },
  { source: "network_rx_kb", key: "networkRxKB" },
  { source: "network_tx_kb", key: "networkTxKB" },
  { source: "player_count", key: "playerCount" },
  { source: "server_fps", key: "serverFps" },
  { source: "response_time_ms", key: "responseTime" },
  { source: "process_count", key: "processCount" },
  { source: "active_connections", key: "activeConnections" },
];

const floorToBucket = (isoTime: string, bucketMinutes: number): string => {
  const parsed = Date.parse(isoTime);
  if (!Number.isFinite(parsed)) return isoTime;
  const bucketMs = Math.max(1, bucketMinutes) * 60_000;
  const floored = Math.floor(parsed / bucketMs) * bucketMs;
  return new Date(floored).toISOString();
};

const toFinite = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    requireAdmin(user);
    const body = await parseJsonBody<{
      target_id?: unknown;
      bucket_minutes?: unknown;
      lookback_minutes?: unknown;
    }>(req);

    const targetId = typeof body.target_id === "string" && body.target_id.trim()
      ? body.target_id.trim()
      : getDefaultPanelTargetId();
    const bucketMinutesRaw = Number(body.bucket_minutes);
    const lookbackMinutesRaw = Number(body.lookback_minutes);
    const bucketMinutes = Number.isFinite(bucketMinutesRaw) && bucketMinutesRaw > 0
      ? Math.floor(bucketMinutesRaw)
      : 1;
    const lookbackMinutes = Number.isFinite(lookbackMinutesRaw) && lookbackMinutesRaw > 0
      ? Math.floor(lookbackMinutesRaw)
      : 180;

    const sampleEntity = requireEntityCollection(base44, "LiveTelemetrySample");
    const rollupEntity = requireEntityCollection(base44, "LiveTelemetryRollup");
    const started = Date.now();

    const rawSamples = await sampleEntity
      .list("-timestamp", 5_000)
      .catch(() => []);
    const cutoffMs = Date.now() - lookbackMinutes * 60_000;
    const samples = (Array.isArray(rawSamples) ? rawSamples : []).filter((sample) => {
      if (!sample || typeof sample !== "object") return false;
      if (sample.target_id !== targetId) return false;
      const iso = typeof sample.timestamp === "string"
        ? sample.timestamp
        : (typeof sample.created_date === "string" ? sample.created_date : "");
      const ms = Date.parse(iso);
      return Number.isFinite(ms) && ms >= cutoffMs;
    });

    const buckets = new Map<string, BucketState>();
    for (const sample of samples) {
      const iso = typeof sample.timestamp === "string"
        ? sample.timestamp
        : (typeof sample.created_date === "string" ? sample.created_date : safeIsoNow());
      const bucket = floorToBucket(iso, bucketMinutes);
      const state = buckets.get(bucket) || {
        timestamp: bucket,
        sample_count: 0,
        metrics: {},
      };
      state.sample_count += 1;
      for (const metric of METRIC_FIELDS) {
        const value = toFinite((sample as Record<string, unknown>)[metric.source]);
        if (value === null) continue;
        const metricState = state.metrics[metric.key] || { sum: 0, min: value, max: value, count: 0 };
        metricState.sum += value;
        metricState.count += 1;
        metricState.min = Math.min(metricState.min, value);
        metricState.max = Math.max(metricState.max, value);
        state.metrics[metric.key] = metricState;
      }
      buckets.set(bucket, state);
    }

    const persisted = await Promise.all(
      Array.from(buckets.values()).map(async (bucket) => {
        const metrics: Record<string, unknown> = {};
        for (const [key, metric] of Object.entries(bucket.metrics)) {
          metrics[key] = {
            avg: metric.count > 0 ? metric.sum / metric.count : null,
            min: metric.count > 0 ? metric.min : null,
            max: metric.count > 0 ? metric.max : null,
            count: metric.count,
          };
        }

        const bucketKey = `${targetId}:${bucket.timestamp}:${bucketMinutes}`;
        return await upsertByField(rollupEntity, "bucket_key", bucketKey, {
          bucket_key: bucketKey,
          target_id: targetId,
          bucket_start: bucket.timestamp,
          bucket_minutes: bucketMinutes,
          sample_count: bucket.sample_count,
          metrics,
          updated_at: safeIsoNow(),
        });
      }),
    );

    console.info(JSON.stringify({
      op: "rollup_live_telemetry",
      target_id: targetId,
      bucket_minutes: bucketMinutes,
      lookback_minutes: lookbackMinutes,
      sample_count: samples.length,
      rollup_count: persisted.length,
      duration_ms: Date.now() - started,
    }));

    return Response.json({
      success: true,
      target_id: targetId,
      bucket_minutes: bucketMinutes,
      lookback_minutes: lookbackMinutes,
      sample_count: samples.length,
      rollup_count: persisted.length,
      duration_ms: Date.now() - started,
      retrieved_at: safeIsoNow(),
    });
  } catch (error) {
    return errorResponse(error);
  }
});

