import { AppError } from "./backend.ts";

export const LIVE_METRIC_KEYS = [
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
] as const;

export type LiveMetricKey = typeof LIVE_METRIC_KEYS[number];

const getEntityCollection = (base44: any, entityName: string): any => (
  base44?.asServiceRole?.entities?.[entityName]
    || base44?.entities?.[entityName]
    || null
);

export const requireEntityCollection = (base44: any, entityName: string): any => {
  const entity = getEntityCollection(base44, entityName);
  if (!entity) {
    throw new AppError(500, "entity_unavailable", `Entity ${entityName} is not available.`);
  }
  return entity;
};

export const tryGetEntityCollection = (base44: any, entityName: string): any =>
  getEntityCollection(base44, entityName);

export const safeIsoNow = (): string => new Date().toISOString();

export const parseIsoAgeMs = (iso: unknown): number | null => {
  if (typeof iso !== "string" || !iso.trim()) {
    return null;
  }
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return null;
  }
  return Math.max(0, Date.now() - ms);
};

export const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

export const toFiniteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeLiveMetrics = (source: Record<string, unknown>): Record<string, unknown> => ({
  state: typeof source.state === "string" ? source.state : null,
  online: typeof source.online === "boolean" ? source.online : null,
  cpu: toFiniteNumber(source.cpu),
  ramUsedMB: toFiniteNumber(source.ramUsedMB),
  diskMB: toFiniteNumber(source.diskMB),
  uptimeSeconds: toFiniteNumber(source.uptimeSeconds),
  uptime: typeof source.uptime === "string" ? source.uptime : null,
  networkRxKB: toFiniteNumber(source.networkRxKB),
  networkTxKB: toFiniteNumber(source.networkTxKB),
  playerCount: toFiniteNumber(source.playerCount),
  serverFps: toFiniteNumber(source.serverFps),
  responseTime: toFiniteNumber(source.responseTime),
  processCount: toFiniteNumber(source.processCount),
  activeConnections: toFiniteNumber(source.activeConnections),
});

export const deriveMetricSource = (
  metrics: Record<string, unknown>,
  existing: Record<string, unknown> | null = null,
): Record<string, "live" | "unavailable"> => {
  const current = existing && typeof existing === "object" ? existing : {};
  const out: Record<string, "live" | "unavailable"> = {};
  for (const key of LIVE_METRIC_KEYS) {
    const raw = metrics[key];
    const existingSource = typeof current[key] === "string" ? current[key] : null;
    if (existingSource === "live" || existingSource === "unavailable") {
      out[key] = existingSource;
      continue;
    }
    out[key] = raw === null || raw === undefined ? "unavailable" : "live";
  }
  return out;
};

export const deriveMetricAvailability = (
  metricSource: Record<string, "live" | "unavailable">,
): Record<string, boolean> => {
  const out: Record<string, boolean> = {};
  for (const key of LIVE_METRIC_KEYS) {
    out[key] = metricSource[key] === "live";
  }
  return out;
};

export const upsertByField = async (
  entity: any,
  field: string,
  value: unknown,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const existing = await entity.filter({ [field]: value }, "-created_date", 1).catch(() => []);
  if (Array.isArray(existing) && existing.length > 0 && existing[0]?.id) {
    return await entity.update(existing[0].id, payload);
  }
  return await entity.create(payload);
};

