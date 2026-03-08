import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import {
  AppError,
  errorResponse,
  fetchPanelServerDetails,
  fetchPanelServerResources,
  getDefaultPanelTargetId,
  parseJsonBody,
  requireAdmin,
  requireMethod,
} from "./_shared/backend.ts";
import { parsePanelResourceMetrics } from "./_shared/panelMetrics.ts";
import {
  deriveMetricAvailability,
  deriveMetricSource,
  normalizeLiveMetrics,
  requireEntityCollection,
  safeIsoNow,
  upsertByField,
} from "./_shared/liveTelemetryStore.ts";

interface SourceFetchResult {
  source_id: string;
  source: "live" | "unavailable";
  available: boolean;
  status: number | null;
  error: string | null;
  duration_ms: number;
  retrieved_at: string;
  data: unknown | null;
}

const summarizeDetails = (payload: unknown): Record<string, unknown> | null => {
  const data = payload as Record<string, any>;
  if (!data || typeof data !== "object") return null;
  return {
    name: data?.attributes?.name ?? null,
    node: data?.attributes?.node ?? null,
    status: data?.attributes?.status ?? null,
    limits: data?.attributes?.limits ?? null,
    server_owner: data?.attributes?.server_owner ?? null,
  };
};

const timedSource = async (
  sourceId: string,
  task: () => Promise<unknown>,
): Promise<SourceFetchResult> => {
  const started = Date.now();
  try {
    const data = await task();
    return {
      source_id: sourceId,
      source: "live",
      available: true,
      status: 200,
      error: null,
      duration_ms: Date.now() - started,
      retrieved_at: safeIsoNow(),
      data,
    };
  } catch (error) {
    const status = error instanceof AppError ? error.status : null;
    const message = error instanceof Error ? error.message : "source_unavailable";
    return {
      source_id: sourceId,
      source: "unavailable",
      available: false,
      status,
      error: message,
      duration_ms: Date.now() - started,
      retrieved_at: safeIsoNow(),
      data: null,
    };
  }
};

const persistSourceHealth = async (
  base44: any,
  targetId: string,
  sources: SourceFetchResult[],
): Promise<void> => {
  const entity = requireEntityCollection(base44, "LiveSourceHealth");
  await Promise.all(
    sources.map((source) => entity.create({
      target_id: targetId,
      timestamp: source.retrieved_at,
      source_id: source.source_id,
      source: source.source,
      available: source.available,
      status: source.status,
      duration_ms: source.duration_ms,
      error: source.error,
    }).catch(() => null)),
  );
};

const persistCurrent = async (
  base44: any,
  targetId: string,
  resourcesSource: SourceFetchResult,
  detailsSource: SourceFetchResult,
): Promise<Record<string, unknown>> => {
  const currentEntity = requireEntityCollection(base44, "LiveTelemetryCurrent");
  const nowIso = safeIsoNow();

  let metrics: Record<string, unknown> = {};
  let metricSource: Record<string, "live" | "unavailable"> = {};
  let metricAvailable: Record<string, boolean> = {};

  if (resourcesSource.available && resourcesSource.data) {
    const parsed = parsePanelResourceMetrics(resourcesSource.data);
    metrics = normalizeLiveMetrics({
      ...parsed.metrics,
      uptime: parsed.metrics.uptimeText,
    });
    metricSource = deriveMetricSource(metrics, parsed.metric_source as Record<string, unknown>);
    metricAvailable = deriveMetricAvailability(metricSource);
  } else {
    metrics = normalizeLiveMetrics({});
    metricSource = deriveMetricSource(metrics);
    metricAvailable = deriveMetricAvailability(metricSource);
  }

  const payload: Record<string, unknown> = {
    target_id: targetId,
    retrieved_at: nowIso,
    source: resourcesSource.source,
    details_source: detailsSource.source,
    metric_source: metricSource,
    metric_available: metricAvailable,
    metrics,
    details_summary: detailsSource.data ? summarizeDetails(detailsSource.data) : null,
    resources_error: resourcesSource.error,
    details_error: detailsSource.error,
    state: metrics.state,
    online: metrics.online,
    cpu: metrics.cpu,
    ramUsedMB: metrics.ramUsedMB,
    diskMB: metrics.diskMB,
    uptimeSeconds: metrics.uptimeSeconds,
    uptime: metrics.uptime,
    networkRxKB: metrics.networkRxKB,
    networkTxKB: metrics.networkTxKB,
    playerCount: metrics.playerCount,
    serverFps: metrics.serverFps,
    responseTime: metrics.responseTime,
    processCount: metrics.processCount,
    activeConnections: metrics.activeConnections,
    age_ms: 0,
  };

  return await upsertByField(currentEntity, "target_id", targetId, payload);
};

const persistSample = async (
  base44: any,
  targetId: string,
  current: Record<string, unknown>,
): Promise<Record<string, unknown> | null> => {
  const sampleEntity = requireEntityCollection(base44, "LiveTelemetrySample");
  const timestamp = typeof current.retrieved_at === "string" ? current.retrieved_at : safeIsoNow();
  const payload: Record<string, unknown> = {
    target_id: targetId,
    timestamp,
    source: current.source ?? "live",
    cpu_percent: current.cpu ?? null,
    ram_used_mb: current.ramUsedMB ?? null,
    disk_used_mb: current.diskMB ?? null,
    uptime_seconds: current.uptimeSeconds ?? null,
    network_rx_kb: current.networkRxKB ?? null,
    network_tx_kb: current.networkTxKB ?? null,
    player_count: current.playerCount ?? null,
    server_fps: current.serverFps ?? null,
    response_time_ms: current.responseTime ?? null,
    process_count: current.processCount ?? null,
    active_connections: current.activeConnections ?? null,
    state: current.state ?? null,
    online: current.online ?? null,
  };

  const hasAnyMetric = Object.entries(payload).some(([key, value]) =>
    key.endsWith("_percent")
    || key.endsWith("_mb")
    || key.endsWith("_kb")
    || key.endsWith("_ms")
    || key.endsWith("_count")
    || key === "uptime_seconds"
      ? value !== null
      : false
  );
  if (!hasAnyMetric) {
    return null;
  }

  return await sampleEntity.create(payload);
};

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    requireAdmin(user);

    const body = await parseJsonBody<{
      target_id?: unknown;
      include_details?: unknown;
      persist_sample?: unknown;
      persist_source_health?: unknown;
    }>(req);
    const targetId = typeof body.target_id === "string" && body.target_id.trim()
      ? body.target_id.trim()
      : getDefaultPanelTargetId();
    const includeDetails = body.include_details !== false;
    const persistSampleEnabled = body.persist_sample !== false;
    const persistSourceHealthEnabled = body.persist_source_health !== false;

    const started = Date.now();
    const [resourcesSource, detailsSource] = await Promise.all([
      timedSource("panel_resources", () => fetchPanelServerResources(targetId)),
      includeDetails
        ? timedSource("panel_details", () => fetchPanelServerDetails(targetId))
        : Promise.resolve({
          source_id: "panel_details",
          source: "unavailable",
          available: false,
          status: null,
          error: "details_collection_disabled",
          duration_ms: 0,
          retrieved_at: safeIsoNow(),
          data: null,
        } as SourceFetchResult),
    ]);

    const current = await persistCurrent(base44, targetId, resourcesSource, detailsSource);
    const sample = persistSampleEnabled ? await persistSample(base44, targetId, current) : null;
    if (persistSourceHealthEnabled) {
      await persistSourceHealth(base44, targetId, [resourcesSource, detailsSource]);
    }

    console.info(JSON.stringify({
      op: "ingest_live_telemetry",
      target_id: targetId,
      duration_ms: Date.now() - started,
      resources_source: resourcesSource.source,
      details_source: detailsSource.source,
      sample_persisted: Boolean(sample?.id),
    }));

    return Response.json({
      success: true,
      target_id: targetId,
      duration_ms: Date.now() - started,
      retrieved_at: safeIsoNow(),
      sources: [resourcesSource, detailsSource].map((source) => ({
        source_id: source.source_id,
        source: source.source,
        available: source.available,
        status: source.status,
        error: source.error,
        duration_ms: source.duration_ms,
      })),
      current,
      sample_id: sample?.id ?? null,
    });
  } catch (error) {
    return errorResponse(error);
  }
});

