import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import {
  errorResponse,
  fetchPanelServerResources,
  getDefaultPanelTargetId,
  listPanelTargets,
  parseJsonBody,
  requireAuthenticated,
  requireMethod,
} from "./_shared/backend.ts";
import { parsePanelResourceMetrics } from "./_shared/panelMetrics.ts";
import {
  asRecord,
  deriveMetricAvailability,
  deriveMetricSource,
  normalizeLiveMetrics,
  parseIsoAgeMs,
  safeIsoNow,
  tryGetEntityCollection,
  upsertByField,
} from "./_shared/liveTelemetryStore.ts";

type MetricSource = "live" | "unavailable";

const parseStaleMs = (): number => {
  const raw = Number(Deno.env.get("LIVE_TELEMETRY_STALE_MS") || "20000");
  if (!Number.isFinite(raw) || raw < 1_000) return 20_000;
  return Math.floor(raw);
};

const toMetricMap = (raw: unknown): Record<string, MetricSource> => {
  const data = asRecord(raw);
  const out: Record<string, MetricSource> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === "live" || value === "unavailable") {
      out[key] = value;
    }
  }
  return out;
};

const toAvailabilityMap = (raw: unknown): Record<string, boolean> => {
  const data = asRecord(raw);
  const out: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = value === true;
  }
  return out;
};

const buildMetricEnvelopes = (
  metrics: Record<string, unknown>,
  metricSource: Record<string, MetricSource>,
  metricAvailable: Record<string, boolean>,
  retrievedAt: string,
  staleMs: number,
): Record<string, Record<string, unknown>> => {
  const ageMs = parseIsoAgeMs(retrievedAt);
  const stale = ageMs === null ? true : ageMs > staleMs;
  const keys = new Set<string>([
    "state",
    "online",
    "cpu",
    "ramUsedMB",
    "diskMB",
    "uptimeSeconds",
    "uptime",
    "networkRxKB",
    "networkTxKB",
    "playerCount",
    "serverFps",
    "responseTime",
    "processCount",
    "activeConnections",
  ]);
  for (const key of Object.keys(metrics)) keys.add(key);
  for (const key of Object.keys(metricSource)) keys.add(key);
  for (const key of Object.keys(metricAvailable)) keys.add(key);

  const out: Record<string, Record<string, unknown>> = {};
  for (const key of keys) {
    const value = key in metrics ? metrics[key] : null;
    const source = metricSource[key] || (value === null || value === undefined ? "unavailable" : "live");
    const available = key in metricAvailable
      ? metricAvailable[key]
      : source === "live";
    out[key] = {
      value: value === undefined ? null : value,
      available,
      source,
      retrieved_at: retrievedAt,
      age_ms: ageMs,
      stale,
    };
  }
  return out;
};

const persistRelayCurrent = async (
  base44: any,
  targetId: string,
  metrics: Record<string, unknown>,
  metricSource: Record<string, MetricSource>,
  metricAvailable: Record<string, boolean>,
  retrievedAt: string,
): Promise<void> => {
  const currentEntity = tryGetEntityCollection(base44, "LiveTelemetryCurrent");
  if (!currentEntity) return;
  await upsertByField(currentEntity, "target_id", targetId, {
    target_id: targetId,
    retrieved_at: retrievedAt,
    source: "live",
    metric_source: metricSource,
    metric_available: metricAvailable,
    metrics,
    state: metrics.state ?? null,
    online: metrics.online ?? null,
    cpu: metrics.cpu ?? null,
    ramUsedMB: metrics.ramUsedMB ?? null,
    diskMB: metrics.diskMB ?? null,
    uptimeSeconds: metrics.uptimeSeconds ?? null,
    uptime: metrics.uptime ?? null,
    networkRxKB: metrics.networkRxKB ?? null,
    networkTxKB: metrics.networkTxKB ?? null,
    playerCount: metrics.playerCount ?? null,
    serverFps: metrics.serverFps ?? null,
    responseTime: metrics.responseTime ?? null,
    processCount: metrics.processCount ?? null,
    activeConnections: metrics.activeConnections ?? null,
    age_ms: 0,
  }).catch(() => null);
};

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    requireAuthenticated(await base44.auth.me());
    const body = await parseJsonBody<{ target_id?: unknown }>(req);
    const targetId = typeof body.target_id === "string" && body.target_id.trim()
      ? body.target_id.trim()
      : getDefaultPanelTargetId();
    const staleMs = parseStaleMs();
    const nowIso = safeIsoNow();

    let metrics = normalizeLiveMetrics({});
    let metricSource: Record<string, MetricSource> = deriveMetricSource(metrics);
    let metricAvailable: Record<string, boolean> = deriveMetricAvailability(metricSource);
    let retrievedAt = nowIso;
    let dataSource: "relay" | "panel_live" = "panel_live";

    const currentEntity = tryGetEntityCollection(base44, "LiveTelemetryCurrent");
    const relayRows = currentEntity
      ? await currentEntity.filter({ target_id: targetId }, "-retrieved_at", 1).catch(() => [])
      : [];
    const relayCurrent = Array.isArray(relayRows) && relayRows.length > 0 ? relayRows[0] as Record<string, unknown> : null;
    const relayRetrievedAt = relayCurrent && typeof relayCurrent.retrieved_at === "string" ? relayCurrent.retrieved_at : null;
    const relayAge = relayRetrievedAt ? parseIsoAgeMs(relayRetrievedAt) : null;
    const relayFresh = relayCurrent && relayAge !== null && relayAge <= staleMs;

    if (relayFresh) {
      const relayMetrics = relayCurrent?.metrics
        ? normalizeLiveMetrics(asRecord(relayCurrent.metrics))
        : normalizeLiveMetrics(relayCurrent as Record<string, unknown>);
      if (!relayMetrics.uptime && typeof relayCurrent?.uptime === "string") {
        relayMetrics.uptime = relayCurrent.uptime;
      }
      metrics = relayMetrics;
      metricSource = toMetricMap(relayCurrent?.metric_source);
      metricAvailable = toAvailabilityMap(relayCurrent?.metric_available);
      if (Object.keys(metricSource).length === 0) {
        metricSource = deriveMetricSource(metrics);
      }
      if (Object.keys(metricAvailable).length === 0) {
        metricAvailable = deriveMetricAvailability(metricSource);
      }
      retrievedAt = relayRetrievedAt || nowIso;
      dataSource = "relay";
    } else {
      const resourceData = await fetchPanelServerResources(targetId);
      const parsed = parsePanelResourceMetrics(resourceData);
      metrics = normalizeLiveMetrics({
        ...parsed.metrics,
        uptime: parsed.metrics.uptimeText,
      });
      metricSource = deriveMetricSource(metrics, parsed.metric_source as Record<string, unknown>);
      metricAvailable = deriveMetricAvailability(metricSource);
      retrievedAt = safeIsoNow();
      dataSource = "panel_live";
      await persistRelayCurrent(base44, targetId, metrics, metricSource, metricAvailable, retrievedAt);
    }

    const envelopes = buildMetricEnvelopes(metrics, metricSource, metricAvailable, retrievedAt, staleMs);
    const ageMs = parseIsoAgeMs(retrievedAt);
    const stale = ageMs === null ? true : ageMs > staleMs;

    return Response.json({
      online: metrics.online,
      state: metrics.state,
      cpu: metrics.cpu,
      ramUsedMB: metrics.ramUsedMB,
      diskMB: metrics.diskMB,
      uptime: metrics.uptime,
      uptimeSeconds: metrics.uptimeSeconds,
      networkRxKB: metrics.networkRxKB,
      networkTxKB: metrics.networkTxKB,
      playerCount: metrics.playerCount,
      serverFps: metrics.serverFps,
      responseTime: metrics.responseTime,
      processCount: metrics.processCount,
      activeConnections: metrics.activeConnections,
      retrieved_at: retrievedAt,
      target_id: targetId,
      metric_source: metricSource,
      metric_available: metricAvailable,
      metrics: envelopes,
      stale,
      stale_after_ms: staleMs,
      data_source: dataSource,
      available_targets: listPanelTargets(),
    });
  } catch (error) {
    return errorResponse(error);
  }
});

