import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  AppError,
  errorResponse,
  fetchExternalLiveSources,
  fetchPanelServerAllocations,
  fetchPanelServerActivity,
  fetchPanelServerBackups,
  fetchPanelServerDatabases,
  fetchPanelServerDetails,
  fetchPanelServerFilesList,
  fetchPanelServerResources,
  fetchPanelServerSchedules,
  fetchPanelServerStartup,
  fetchPanelWebsocketAuth,
  getDefaultPanelTargetId,
  listPanelTargets,
  parseJsonBody,
  requireAdmin,
  requireMethod,
} from './_shared/backend.ts';
import { parsePanelResourceMetrics } from './_shared/panelMetrics.ts';

type SourceResult = {
  source: 'live' | 'unavailable';
  available: boolean;
  error: string | null;
  data: unknown | null;
};

const sourceResult = async (fn: () => Promise<unknown>): Promise<SourceResult> => {
  try {
    const data = await fn();
    return {
      source: 'live',
      available: true,
      error: null,
      data,
    };
  } catch (error) {
    return {
      source: 'unavailable',
      available: false,
      error: error instanceof Error ? error.message : 'source_unavailable',
      data: null,
    };
  }
};

const redactWebsocketAuth = (payload: unknown): unknown => {
  const data = payload as Record<string, any>;
  const token = data?.data?.attributes?.token;
  if (typeof token !== 'string') {
    return payload;
  }
  return {
    ...data,
    data: {
      ...data.data,
      attributes: {
        ...data.data.attributes,
        token: '[redacted]',
      },
    },
  };
};

const sanitizeForStorage = (value: unknown): unknown => {
  try {
    const asText = JSON.stringify(value);
    if (!asText) {
      return null;
    }
    if (asText.length <= 25_000) {
      return JSON.parse(asText);
    }
    return {
      truncated: true,
      size: asText.length,
      preview: asText.slice(0, 25_000),
    };
  } catch {
    return {
      truncated: true,
      error: 'snapshot_serialization_failed',
    };
  }
};

const safeEntityCreate = async (
  base44: any,
  entityName: string,
  payload: Record<string, unknown>,
): Promise<{ persisted: boolean; error?: string }> => {
  try {
    const entity = base44?.asServiceRole?.entities?.[entityName];
    if (!entity) {
      return { persisted: false, error: `entity_${entityName}_not_found` };
    }
    await entity.create(payload);
    return { persisted: true };
  } catch (error) {
    return {
      persisted: false,
      error: error instanceof Error ? error.message : `entity_${entityName}_create_failed`,
    };
  }
};

Deno.serve(async (req) => {
  try {
    requireMethod(req, 'POST');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    requireAdmin(user);

    const body = await parseJsonBody<{
      target_id?: unknown;
      include_files?: unknown;
      files_directory?: unknown;
      include_external?: unknown;
      persist?: unknown;
    }>(req);

    const targetId = typeof body.target_id === 'string' && body.target_id.trim()
      ? body.target_id.trim()
      : getDefaultPanelTargetId();
    const includeFiles = body.include_files === true;
    const includeExternal = body.include_external !== false;
    const persist = body.persist !== false;
    const filesDirectory = typeof body.files_directory === 'string' && body.files_directory.trim()
      ? body.files_directory.trim()
      : '/';
    if (!filesDirectory.startsWith('/')) {
      throw new AppError(400, 'invalid_files_directory', 'files_directory must be an absolute panel path.');
    }

    const started = Date.now();
    const [
      details,
      resources,
      startup,
      databases,
      schedules,
      activity,
      backups,
      allocations,
      websocket,
      files,
      external,
    ] = await Promise.all([
      sourceResult(() => fetchPanelServerDetails(targetId)),
      sourceResult(() => fetchPanelServerResources(targetId)),
      sourceResult(() => fetchPanelServerStartup(targetId)),
      sourceResult(() => fetchPanelServerDatabases(targetId)),
      sourceResult(() => fetchPanelServerSchedules(targetId)),
      sourceResult(() => fetchPanelServerActivity(targetId)),
      sourceResult(() => fetchPanelServerBackups(targetId)),
      sourceResult(() => fetchPanelServerAllocations(targetId)),
      sourceResult(() => fetchPanelWebsocketAuth(targetId)),
      includeFiles
        ? sourceResult(() => fetchPanelServerFilesList(targetId, filesDirectory))
        : Promise.resolve({
          source: 'unavailable',
          available: false,
          error: 'files_collection_disabled',
          data: null,
        } as SourceResult),
      includeExternal
        ? fetchExternalLiveSources()
        : Promise.resolve([]),
    ]);

    let parsedMetrics: ReturnType<typeof parsePanelResourceMetrics> | null = null;
    if (resources.available && resources.data) {
      parsedMetrics = parsePanelResourceMetrics(resources.data);
    }

    const perSource = {
      details,
      resources: {
        ...resources,
        data: resources.data,
        metric_source: parsedMetrics?.metric_source || null,
        metric_available: parsedMetrics?.metric_available || null,
      },
      startup,
      databases,
      schedules,
      activity,
      allocations,
      backups,
      websocket: {
        ...websocket,
        data: websocket.data ? redactWebsocketAuth(websocket.data) : null,
      },
      files,
      external: external.map((item) => ({
        source: item.source,
        available: item.ok,
        error: item.error,
        data: item.ok ? item.data : null,
        source_id: item.source_id,
        url: item.url,
        status: item.status,
        retrieved_at: item.retrieved_at,
        duration_ms: item.duration_ms,
      })),
    };

    const liveSourceCount = [
      details.available,
      resources.available,
      startup.available,
      databases.available,
      schedules.available,
      activity.available,
      allocations.available,
      backups.available,
      websocket.available,
      includeFiles ? files.available : false,
      ...external.map((item) => item.ok),
    ].filter(Boolean).length;

    const unavailableSourceCount = [
      !details.available,
      !resources.available,
      !startup.available,
      !databases.available,
      !schedules.available,
      !activity.available,
      !allocations.available,
      !backups.available,
      !websocket.available,
      includeFiles ? !files.available : false,
      ...external.map((item) => !item.ok),
    ].filter(Boolean).length;

    const persistence: Record<string, unknown> = {};
    if (persist) {
      const timestamp = new Date().toISOString();
      if (parsedMetrics) {
        const perfPayload: Record<string, unknown> = {
          timestamp,
          target_id: targetId,
        };
        const { metrics } = parsedMetrics;
        if (metrics.cpu !== null) perfPayload.cpu_percent = metrics.cpu;
        if (metrics.ramUsedMB !== null) perfPayload.ram_used_mb = metrics.ramUsedMB;
        if (metrics.diskMB !== null) perfPayload.disk_used_mb = metrics.diskMB;
        if (metrics.networkRxKB !== null) perfPayload.network_rx_kb = metrics.networkRxKB;
        if (metrics.networkTxKB !== null) perfPayload.network_tx_kb = metrics.networkTxKB;
        if (metrics.playerCount !== null) perfPayload.player_count = metrics.playerCount;
        if (metrics.serverFps !== null) perfPayload.server_fps = metrics.serverFps;
        if (metrics.responseTime !== null) perfPayload.response_time_ms = metrics.responseTime;
        if (metrics.processCount !== null) perfPayload.process_count = metrics.processCount;
        if (metrics.activeConnections !== null) perfPayload.active_connections = metrics.activeConnections;

        try {
          const perfLog = await base44.entities.ServerPerformanceLog.create(perfPayload);
          persistence.server_performance_log_id = perfLog?.id || null;
        } catch (error) {
          persistence.server_performance_log_error = error instanceof Error ? error.message : 'persist_failed';
        }
      }

      const snapshotPersist = await safeEntityCreate(base44, 'PanelSnapshot', {
        target_id: targetId,
        timestamp,
        live_source_count: liveSourceCount,
        unavailable_source_count: unavailableSourceCount,
        snapshot: sanitizeForStorage({
          details: details.data,
          resources: resources.data,
          startup: startup.data,
          databases: databases.data,
          schedules: schedules.data,
          activity: activity.data,
          allocations: allocations.data,
          backups: backups.data,
          websocket: websocket.data ? redactWebsocketAuth(websocket.data) : null,
          files: files.data,
          external,
        }),
      });
      persistence.panel_snapshot = snapshotPersist;

      const eventPersist = await safeEntityCreate(base44, 'ServerEvent', {
        event_type: 'Live Sync',
        severity: unavailableSourceCount > 0 ? 'WARN' : 'INFO',
        message: `Live sync completed for target ${targetId} (live sources: ${liveSourceCount}, unavailable: ${unavailableSourceCount}).`,
        target_id: targetId,
        created_at: timestamp,
      });
      persistence.server_event = eventPersist;
    }

    return Response.json({
      success: true,
      target_id: targetId,
      retrieved_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
      source_summary: {
        live: liveSourceCount,
        unavailable: unavailableSourceCount,
      },
      data_source: {
        panel: 'live',
        external: includeExternal ? 'best_effort_live' : 'disabled',
        files: includeFiles ? 'best_effort_live' : 'disabled',
      },
      metrics: parsedMetrics
        ? {
          values: parsedMetrics.metrics,
          metric_source: parsedMetrics.metric_source,
          metric_available: parsedMetrics.metric_available,
        }
        : {
          values: null,
          metric_source: null,
          metric_available: null,
        },
      sources: perSource,
      available_targets: listPanelTargets(),
      persistence,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
