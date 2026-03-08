import { AppError } from "./backend.ts";

export type LiveSource = "live" | "unavailable";

export interface ResourceMetrics {
  state: string | null;
  online: boolean | null;
  cpu: number | null;
  ramUsedMB: number | null;
  diskMB: number | null;
  uptimeSeconds: number | null;
  uptimeText: string | null;
  networkRxKB: number | null;
  networkTxKB: number | null;
  playerCount: number | null;
  serverFps: number | null;
  responseTime: number | null;
  processCount: number | null;
  activeConnections: number | null;
}

const toNumberOrNull = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const firstNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    const parsed = toNumberOrNull(value);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
};

const sourceFor = (value: unknown): LiveSource => value === null ? "unavailable" : "live";

const toHhMmSs = (seconds: number | null): string | null => {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) {
    return null;
  }
  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
};

export const parsePanelResourceMetrics = (
  payload: unknown,
): {
  metrics: ResourceMetrics;
  metric_source: Record<string, LiveSource>;
  metric_available: Record<string, boolean>;
} => {
  const data = payload as Record<string, any>;
  const state = typeof data?.attributes?.current_state === "string"
    ? data.attributes.current_state
    : null;

  const resources = data?.attributes?.resources;
  if (!resources || typeof resources !== "object") {
    throw new AppError(502, "panel_schema_invalid", "Panel response missing resources payload.");
  }

  const cpuRaw = firstNumber(resources.cpu_absolute);
  const ramBytes = firstNumber(resources.memory_bytes);
  const diskBytes = firstNumber(resources.disk_bytes);
  const uptimeMs = firstNumber(resources.uptime);
  const rxBytes = firstNumber(resources.network_rx_bytes);
  const txBytes = firstNumber(resources.network_tx_bytes);

  const uptimeSeconds = uptimeMs === null ? null : Math.max(0, Math.floor(uptimeMs / 1000));
  const metrics: ResourceMetrics = {
    state,
    online: state === null ? null : state === "running",
    cpu: cpuRaw === null ? null : Math.round(cpuRaw),
    ramUsedMB: ramBytes === null ? null : Math.round(ramBytes / 1024 / 1024),
    diskMB: diskBytes === null ? null : Math.round(diskBytes / 1024 / 1024),
    uptimeSeconds,
    uptimeText: toHhMmSs(uptimeSeconds),
    networkRxKB: rxBytes === null ? null : Math.round(rxBytes / 1024),
    networkTxKB: txBytes === null ? null : Math.round(txBytes / 1024),
    playerCount: firstNumber(
      resources.players ??
        resources.player_count ??
        data?.attributes?.players ??
        data?.attributes?.player_count,
    ),
    serverFps: firstNumber(
      resources.fps ??
        resources.server_fps ??
        data?.attributes?.fps ??
        data?.attributes?.server_fps,
    ),
    responseTime: firstNumber(
      resources.latency_ms ??
        resources.response_time_ms ??
        resources.ping_ms ??
        data?.attributes?.latency_ms ??
        data?.attributes?.response_time_ms ??
        data?.attributes?.ping_ms,
    ),
    processCount: firstNumber(
      resources.process_count ??
        data?.attributes?.process_count,
    ),
    activeConnections: firstNumber(
      resources.active_connections ??
        data?.attributes?.active_connections,
    ),
  };

  const metric_source: Record<string, LiveSource> = {
    state: sourceFor(metrics.state),
    online: sourceFor(metrics.online),
    cpu: sourceFor(metrics.cpu),
    ramUsedMB: sourceFor(metrics.ramUsedMB),
    diskMB: sourceFor(metrics.diskMB),
    uptimeSeconds: sourceFor(metrics.uptimeSeconds),
    uptime: sourceFor(metrics.uptimeText),
    networkRxKB: sourceFor(metrics.networkRxKB),
    networkTxKB: sourceFor(metrics.networkTxKB),
    playerCount: sourceFor(metrics.playerCount),
    serverFps: sourceFor(metrics.serverFps),
    responseTime: sourceFor(metrics.responseTime),
    processCount: sourceFor(metrics.processCount),
    activeConnections: sourceFor(metrics.activeConnections),
  };

  const metric_available: Record<string, boolean> = Object.fromEntries(
    Object.entries(metric_source).map(([key, value]) => [key, value === "live"]),
  );

  return { metrics, metric_source, metric_available };
};
