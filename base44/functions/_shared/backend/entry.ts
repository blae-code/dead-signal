export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type JsonBody = Record<string, unknown>;
type JsonObject = Record<string, unknown>;

interface PanelTargetConfig {
  targetId: string;
  apiKey: string;
  panelUrl: string;
  serverId: string;
}

interface PanelTargetSummary {
  target_id: string;
  panel_url: string;
  server_id: string;
  is_default: boolean;
}

interface ExternalSourceConfig {
  source_id: string;
  url: string;
  timeout_ms?: number;
  method?: string;
  headers?: Record<string, string>;
  bearer_token_env?: string;
}

interface ExternalSourceFetchResult {
  source_id: string;
  url: string;
  ok: boolean;
  status: number | null;
  retrieved_at: string;
  duration_ms: number;
  source: "live" | "unavailable";
  data: unknown | null;
  error: string | null;
}

interface PanelFetchOptions {
  targetId?: unknown;
  timeoutMs?: number;
  retries?: number;
}

interface PanelJsonResult<T> {
  data: T;
  target: PanelTargetConfig;
  provider_status: number;
  attempts: number;
}

interface CircuitState {
  failures: number;
  openUntil: number;
}

export const errorResponse = (error: unknown): Response => {
  if (error instanceof AppError) {
    return Response.json(
      {
        error: error.message,
        code: error.code,
        message: error.message,
        status: error.status,
        details: error.details ?? null,
      },
      { status: error.status },
    );
  }

  const fallback = "Internal server error";
  return Response.json(
    {
      error: fallback,
      code: "internal_error",
      message: fallback,
      status: 500,
      details: null,
    },
    { status: 500 },
  );
};

export const requireMethod = (req: Request, method: string): void => {
  if (req.method !== method) {
    throw new AppError(405, "method_not_allowed", `Use ${method} for this endpoint.`);
  }
};

export const requireAuthenticated = <T>(user: T | null | undefined): T => {
  if (!user) {
    throw new AppError(401, "unauthorized", "Authentication required.");
  }
  return user;
};

export const requireAdmin = (user: { role?: string } | null | undefined): void => {
  requireAuthenticated(user);
  if (user?.role !== "admin") {
    throw new AppError(403, "forbidden", "Admin access required.");
  }
};

export const parseJsonBody = async <T extends JsonBody>(req: Request): Promise<T> => {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new AppError(400, "invalid_json_body", "Request body must be a JSON object.");
    }
    return body as T;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(400, "invalid_json_body", "Request body must be valid JSON.");
  }
};

const PANEL_ACCEPT = "Application/vnd.pterodactyl.v1+json";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_BACKOFF_MS = 250;
const MAX_BACKOFF_MS = 2_000;
const DEFAULT_CIRCUIT_FAILURES = 3;
const DEFAULT_CIRCUIT_OPEN_MS = 15_000;
const MIN_RATE_WINDOW_MS = 1_000;
const MAX_IDEMPOTENCY_TTL_MS = 5 * 60_000;
const TRANSIENT_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const SENSITIVE_RCON_DEFAULT = [
  /^stop\b/i,
  /^restart\b/i,
  /^kill\b/i,
  /^wipe\b/i,
  /^reset\b/i,
  /^restore\b/i,
  /^delete\b/i,
  /^drop\b/i,
  /^shutdown\b/i,
];

const circuitByTarget = new Map<string, CircuitState>();
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const idempotencyStore = new Map<string, { status: number; payload: unknown; expiresAt: number }>();

const getRequiredEnv = (key: string): string => {
  const value = Deno.env.get(key)?.trim();
  if (!value) {
    throw new AppError(500, "missing_panel_config", `Missing required environment variable: ${key}`);
  }
  return value;
};

const parseEnvInt = (key: string, fallback: number, min = 1): number => {
  const raw = Deno.env.get(key)?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min) {
    throw new AppError(500, "invalid_runtime_config", `Environment variable ${key} must be a number >= ${min}.`);
  }
  return Math.floor(parsed);
};

const normalizePanelTarget = (
  raw: Record<string, unknown>,
  indexLabel: string,
): PanelTargetConfig => {
  const targetId = typeof raw.target_id === "string" && raw.target_id.trim()
    ? raw.target_id.trim()
    : `target_${indexLabel}`;
  const panelUrl = typeof raw.panel_url === "string" && raw.panel_url.trim()
    ? raw.panel_url.trim().replace(/\/+$/, "")
    : null;
  const serverId = typeof raw.server_id === "string" && raw.server_id.trim()
    ? raw.server_id.trim()
    : null;

  if (!panelUrl || !serverId) {
    throw new AppError(
      500,
      "invalid_panel_targets_config",
      "Each configured panel target requires non-empty panel_url and server_id.",
      { index: indexLabel, target_id: targetId },
    );
  }

  let apiKey: string | null = null;
  if (typeof raw.api_key === "string" && raw.api_key.trim()) {
    apiKey = raw.api_key.trim();
  } else if (typeof raw.api_key_env === "string" && raw.api_key_env.trim()) {
    apiKey = getRequiredEnv(raw.api_key_env.trim());
  }

  if (!apiKey) {
    throw new AppError(
      500,
      "invalid_panel_targets_config",
      "Each configured panel target requires api_key or api_key_env.",
      { index: indexLabel, target_id: targetId },
    );
  }

  return { targetId, apiKey, panelUrl, serverId };
};

const getDefaultPanelTarget = (): PanelTargetConfig => {
  const apiKey = getRequiredEnv("BISECT_API");
  const panelUrl = getRequiredEnv("BISECT_PANEL_URL").replace(/\/+$/, "");
  const serverId = getRequiredEnv("BISECT_SERVER_ID");
  const targetId = Deno.env.get("BISECT_DEFAULT_TARGET_ID")?.trim() || "default";

  return { targetId, apiKey, panelUrl, serverId };
};

const parseAdditionalTargets = (): PanelTargetConfig[] => {
  const raw = Deno.env.get("BISECT_TARGETS_JSON")?.trim();
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError(500, "invalid_panel_targets_config", "BISECT_TARGETS_JSON must contain valid JSON.");
  }

  if (!Array.isArray(parsed)) {
    throw new AppError(500, "invalid_panel_targets_config", "BISECT_TARGETS_JSON must be a JSON array.");
  }

  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new AppError(
        500,
        "invalid_panel_targets_config",
        "Each panel target must be a JSON object.",
        { index },
      );
    }
    return normalizePanelTarget(entry as Record<string, unknown>, String(index));
  });
};

const getPanelTargets = (): PanelTargetConfig[] => {
  const defaultTarget = getDefaultPanelTarget();
  const configured = parseAdditionalTargets();
  const map = new Map<string, PanelTargetConfig>();

  map.set(defaultTarget.targetId, defaultTarget);
  for (const target of configured) {
    map.set(target.targetId, target);
  }

  return Array.from(map.values());
};

export const listPanelTargets = (): PanelTargetSummary[] => {
  const defaultTarget = getDefaultPanelTarget();
  return getPanelTargets().map((target) => ({
    target_id: target.targetId,
    panel_url: target.panelUrl,
    server_id: target.serverId,
    is_default: target.targetId === defaultTarget.targetId,
  }));
};

export const getDefaultPanelTargetId = (): string => getDefaultPanelTarget().targetId;

const resolvePanelTarget = (targetId: unknown): PanelTargetConfig => {
  const allTargets = getPanelTargets();
  const resolvedId = typeof targetId === "string" && targetId.trim()
    ? targetId.trim()
    : getDefaultPanelTarget().targetId;
  const target = allTargets.find((candidate) => candidate.targetId === resolvedId);
  if (!target) {
    throw new AppError(
      400,
      "unknown_panel_target",
      "Requested panel target is not configured.",
      { target_id: resolvedId, available_targets: allTargets.map((candidate) => candidate.targetId) },
    );
  }
  return target;
};

const extractPanelErrorMessage = (rawBody: string): string => {
  if (!rawBody) {
    return "Panel request failed.";
  }

  try {
    const parsed = JSON.parse(rawBody);
    const first = parsed?.errors?.[0];
    const detail = first?.detail || first?.message || first?.title;
    if (detail && typeof detail === "string") {
      return detail;
    }
  } catch {
    // Fall back to generic message below.
  }

  return "Panel request failed.";
};

const readJson = (rawBody: string, contextCode: string): unknown => {
  if (!rawBody) {
    return {};
  }
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new AppError(502, contextCode, "Panel returned invalid JSON.");
  }
};

const getCircuitSettings = () => ({
  maxFailures: parseEnvInt("PANEL_CIRCUIT_MAX_FAILURES", DEFAULT_CIRCUIT_FAILURES, 1),
  openMs: parseEnvInt("PANEL_CIRCUIT_OPEN_MS", DEFAULT_CIRCUIT_OPEN_MS, 1_000),
});

const isCircuitOpen = (targetId: string): boolean => {
  const state = circuitByTarget.get(targetId);
  if (!state) {
    return false;
  }
  return state.openUntil > Date.now();
};

const markCircuitSuccess = (targetId: string): void => {
  circuitByTarget.delete(targetId);
};

const markCircuitFailure = (targetId: string): void => {
  const settings = getCircuitSettings();
  const now = Date.now();
  const state = circuitByTarget.get(targetId) ?? { failures: 0, openUntil: 0 };
  state.failures += 1;
  if (state.failures >= settings.maxFailures) {
    state.openUntil = now + settings.openMs;
  }
  circuitByTarget.set(targetId, state);
};

const escapeRegex = (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePatternList = (envKey: string): RegExp[] => {
  const raw = Deno.env.get(envKey)?.trim();
  if (!raw) {
    return [];
  }

  const values = raw.split(",").map((value) => value.trim()).filter(Boolean);
  return values.map((token) => {
    try {
      if (token.startsWith("/") && token.lastIndexOf("/") > 0) {
        const last = token.lastIndexOf("/");
        const body = token.slice(1, last);
        const flags = token.slice(last + 1) || "i";
        return new RegExp(body, flags);
      }
      return new RegExp(escapeRegex(token), "i");
    } catch {
      throw new AppError(500, "invalid_command_policy", `Invalid pattern in ${envKey}: ${token}`);
    }
  });
};

const backoffMsFor = (attempt: number): number => {
  const base = parseEnvInt("PANEL_RETRY_BACKOFF_MS", DEFAULT_BACKOFF_MS, 1);
  const jitter = Math.floor(Math.random() * 150);
  return Math.min(MAX_BACKOFF_MS, base * (2 ** attempt) + jitter);
};

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  if (items.length === 0) {
    return [];
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<R>(items.length);
  let cursor = 0;

  await Promise.all(
    Array.from({ length: workerCount }).map(async () => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) {
          break;
        }
        results[index] = await mapper(items[index], index);
      }
    }),
  );

  return results;
};

const parsePanelJson = (rawBody: string, contextCode: string): JsonObject => {
  const parsed = readJson(rawBody, contextCode);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AppError(502, contextCode, "Panel returned an unexpected JSON payload.");
  }
  return parsed as JsonObject;
};

const panelFetch = async (
  path: string,
  init: RequestInit = {},
  options: PanelFetchOptions = {},
): Promise<{ response: Response; rawBody: string; target: PanelTargetConfig; attempts: number }> => {
  const target = resolvePanelTarget(options.targetId);
  const retries = options.retries ?? parseEnvInt("PANEL_RETRIES", DEFAULT_RETRIES, 0);
  const timeoutMs = options.timeoutMs ?? parseEnvInt("PANEL_TIMEOUT_MS", DEFAULT_TIMEOUT_MS, 1_000);
  const maxAttempts = retries + 1;

  if (isCircuitOpen(target.targetId)) {
    throw new AppError(
      503,
      "panel_circuit_open",
      "Panel target is temporarily unavailable due to repeated failures.",
      { target_id: target.targetId },
    );
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${target.panelUrl}${path}`, {
        ...init,
        headers: {
          Accept: PANEL_ACCEPT,
          Authorization: `Bearer ${target.apiKey}`,
          ...(init.headers || {}),
        },
        signal: controller.signal,
      });
      const rawBody = await response.text();

      if (TRANSIENT_STATUS.has(response.status) && attempt + 1 < maxAttempts) {
        await sleep(backoffMsFor(attempt));
        continue;
      }

      if (response.ok) {
        markCircuitSuccess(target.targetId);
      } else {
        markCircuitFailure(target.targetId);
      }

      return {
        response,
        rawBody,
        target,
        attempts: attempt + 1,
      };
    } catch (error) {
      const isTimeout = error instanceof DOMException && error.name === "AbortError";
      const canRetry = attempt + 1 < maxAttempts;
      if (canRetry) {
        await sleep(backoffMsFor(attempt));
        continue;
      }

      markCircuitFailure(target.targetId);
      if (isTimeout) {
        throw new AppError(504, "panel_timeout", "Panel request timed out.", {
          target_id: target.targetId,
          attempts: attempt + 1,
        });
      }
      throw new AppError(502, "panel_unreachable", "Unable to reach the panel API.", {
        target_id: target.targetId,
        attempts: attempt + 1,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  throw new AppError(502, "panel_unreachable", "Panel request failed.");
};

const requestPanelJson = async <T = unknown>(
  path: string,
  init: RequestInit = {},
  options: PanelFetchOptions & {
    contextCode?: string;
    failureCode?: string;
    successStatuses?: number[];
  } = {},
): Promise<PanelJsonResult<T>> => {
  const contextCode = options.contextCode ?? "panel_invalid_json";
  const failureCode = options.failureCode ?? "panel_request_failed";
  const successStatuses = options.successStatuses ?? [200];
  const { response, rawBody, target, attempts } = await panelFetch(path, init, options);

  if (!successStatuses.includes(response.status)) {
    throw new AppError(
      response.status,
      failureCode,
      extractPanelErrorMessage(rawBody),
      {
        provider_status: response.status,
        target_id: target.targetId,
        attempts,
        path,
      },
    );
  }

  const parsed = parsePanelJson(rawBody, contextCode);
  if (parsed?.errors) {
    throw new AppError(
      502,
      failureCode,
      extractPanelErrorMessage(rawBody),
      {
        provider_status: response.status,
        target_id: target.targetId,
        attempts,
        path,
      },
    );
  }

  return {
    data: parsed as T,
    target,
    provider_status: response.status,
    attempts,
  };
};

export const fetchPanelServerResources = async (targetId?: unknown): Promise<unknown> => {
  const target = resolvePanelTarget(targetId);
  const result = await requestPanelJson(
    `/api/client/servers/${target.serverId}/resources`,
    {},
    {
      targetId: target.targetId,
      contextCode: "panel_invalid_json",
      failureCode: "panel_request_failed",
      successStatuses: [200],
    },
  );
  return result.data;
};

export const fetchPanelServerDetails = async (targetId?: unknown): Promise<unknown> => {
  const target = resolvePanelTarget(targetId);
  const result = await requestPanelJson(
    `/api/client/servers/${target.serverId}`,
    {},
    {
      targetId: target.targetId,
      contextCode: "panel_invalid_json",
      failureCode: "panel_request_failed",
      successStatuses: [200],
    },
  );
  return result.data;
};

export const fetchPanelWebsocketAuth = async (targetId?: unknown): Promise<unknown> => {
  const target = resolvePanelTarget(targetId);
  const result = await requestPanelJson(
    `/api/client/servers/${target.serverId}/websocket`,
    {},
    {
      targetId: target.targetId,
      contextCode: "panel_invalid_json",
      failureCode: "panel_websocket_auth_failed",
      successStatuses: [200],
    },
  );
  return result.data;
};

export const fetchPanelServerStartup = async (targetId?: unknown): Promise<unknown> => {
  const target = resolvePanelTarget(targetId);
  const result = await requestPanelJson(
    `/api/client/servers/${target.serverId}/startup`,
    {},
    {
      targetId: target.targetId,
      contextCode: "panel_invalid_json",
      failureCode: "panel_request_failed",
      successStatuses: [200],
    },
  );
  return result.data;
};

export const fetchPanelServerDatabases = async (targetId?: unknown): Promise<unknown> => {
  const target = resolvePanelTarget(targetId);
  const result = await requestPanelJson(
    `/api/client/servers/${target.serverId}/databases`,
    {},
    {
      targetId: target.targetId,
      contextCode: "panel_invalid_json",
      failureCode: "panel_request_failed",
      successStatuses: [200],
    },
  );
  return result.data;
};

export const fetchPanelServerSchedules = async (targetId?: unknown): Promise<unknown> => {
  const target = resolvePanelTarget(targetId);
  const result = await requestPanelJson(
    `/api/client/servers/${target.serverId}/schedules`,
    {},
    {
      targetId: target.targetId,
      contextCode: "panel_invalid_json",
      failureCode: "panel_request_failed",
      successStatuses: [200],
    },
  );
  return result.data;
};

export const fetchPanelServerActivity = async (targetId?: unknown): Promise<unknown> => {
  const target = resolvePanelTarget(targetId);
  const result = await requestPanelJson(
    `/api/client/servers/${target.serverId}/activity`,
    {},
    {
      targetId: target.targetId,
      contextCode: "panel_invalid_json",
      failureCode: "panel_request_failed",
      successStatuses: [200],
    },
  );
  return result.data;
};

export const fetchPanelServerBackups = async (targetId?: unknown): Promise<unknown> => {
  const target = resolvePanelTarget(targetId);
  const result = await requestPanelJson(
    `/api/client/servers/${target.serverId}/backups`,
    {},
    {
      targetId: target.targetId,
      contextCode: "panel_invalid_json",
      failureCode: "panel_request_failed",
      successStatuses: [200],
    },
  );
  return result.data;
};

export const fetchPanelServerAllocations = async (targetId?: unknown): Promise<unknown> => {
  const target = resolvePanelTarget(targetId);
  const result = await requestPanelJson(
    `/api/client/servers/${target.serverId}/network/allocations`,
    {},
    {
      targetId: target.targetId,
      contextCode: "panel_invalid_json",
      failureCode: "panel_request_failed",
      successStatuses: [200],
    },
  );
  return result.data;
};

export const fetchPanelServerFilesList = async (
  targetId: unknown,
  directory = "/",
): Promise<unknown> => {
  const target = resolvePanelTarget(targetId);
  const encoded = encodeURIComponent(directory);
  const result = await requestPanelJson(
    `/api/client/servers/${target.serverId}/files/list?directory=${encoded}`,
    {},
    {
      targetId: target.targetId,
      contextCode: "panel_invalid_json",
      failureCode: "panel_request_failed",
      successStatuses: [200],
    },
  );
  return result.data;
};

export const sendPanelCommand = async (command: string, targetId?: unknown): Promise<void> => {
  const target = resolvePanelTarget(targetId);
  const { response, rawBody, attempts } = await panelFetch(
    `/api/client/servers/${target.serverId}/command`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command }),
    },
    { targetId: target.targetId },
  );

  if (response.status === 204) {
    markCircuitSuccess(target.targetId);
    return;
  }

  throw new AppError(
    response.status || 502,
    "panel_command_failed",
    extractPanelErrorMessage(rawBody),
    {
      provider_status: response.status,
      target_id: target.targetId,
      attempts,
    },
  );
};

export const sendPanelPowerSignal = async (
  signal: "start" | "stop" | "restart" | "kill",
  targetId?: unknown,
): Promise<void> => {
  const target = resolvePanelTarget(targetId);
  const { response, rawBody, attempts } = await panelFetch(
    `/api/client/servers/${target.serverId}/power`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ signal }),
    },
    { targetId: target.targetId },
  );

  if (response.status === 204) {
    markCircuitSuccess(target.targetId);
    return;
  }

  throw new AppError(
    response.status || 502,
    "panel_power_failed",
    extractPanelErrorMessage(rawBody),
    {
      provider_status: response.status,
      target_id: target.targetId,
      signal,
      attempts,
    },
  );
};

export const evaluateRconCommandPolicy = (
  command: string,
): {
  blocked: boolean;
  sensitive: boolean;
  reason: string | null;
} => {
  const allowPatterns = parsePatternList("RCON_ALLOW_PATTERNS");
  const blockPatterns = parsePatternList("RCON_BLOCK_PATTERNS");
  const sensitivePatterns = [
    ...SENSITIVE_RCON_DEFAULT,
    ...parsePatternList("RCON_SENSITIVE_PATTERNS"),
  ];

  if (allowPatterns.length > 0) {
    const allowed = allowPatterns.some((pattern) => pattern.test(command));
    if (!allowed) {
      return {
        blocked: true,
        sensitive: false,
        reason: "Command is outside the configured allow-list.",
      };
    }
  }

  if (blockPatterns.some((pattern) => pattern.test(command))) {
    return {
      blocked: true,
      sensitive: false,
      reason: "Command matches a blocked policy pattern.",
    };
  }

  return {
    blocked: false,
    sensitive: sensitivePatterns.some((pattern) => pattern.test(command)),
    reason: null,
  };
};

export const enforceRateLimit = (
  key: string,
  limit: number,
  windowMs: number,
  code = "rate_limited",
  message = "Too many requests. Please try again later.",
): void => {
  if (!key.trim()) {
    throw new AppError(500, "invalid_rate_limit_key", "Rate-limit key must be non-empty.");
  }
  if (limit < 1) {
    throw new AppError(500, "invalid_rate_limit_config", "Rate-limit limit must be >= 1.");
  }
  if (windowMs < MIN_RATE_WINDOW_MS) {
    throw new AppError(500, "invalid_rate_limit_config", "Rate-limit window must be >= 1000ms.");
  }

  const now = Date.now();
  const bucket = rateLimitStore.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (bucket.count >= limit) {
    throw new AppError(429, code, message, {
      retry_after_ms: bucket.resetAt - now,
      limit,
      window_ms: windowMs,
    });
  }

  bucket.count += 1;
  rateLimitStore.set(key, bucket);
};

export const readRequestIdempotencyKey = (
  req: Request,
  bodyCandidate?: unknown,
): string | null => {
  const fromHeader = req.headers.get("idempotency-key") || req.headers.get("x-idempotency-key");
  if (fromHeader && fromHeader.trim()) {
    return fromHeader.trim();
  }
  if (typeof bodyCandidate === "string" && bodyCandidate.trim()) {
    return bodyCandidate.trim();
  }
  return null;
};

const idempotencyStoreKey = (scope: string, key: string): string => `${scope}::${key}`;

export const getIdempotentReplay = (
  scope: string,
  key: string,
): { status: number; payload: unknown } | null => {
  const fullKey = idempotencyStoreKey(scope, key);
  const record = idempotencyStore.get(fullKey);
  if (!record) {
    return null;
  }

  if (record.expiresAt <= Date.now()) {
    idempotencyStore.delete(fullKey);
    return null;
  }

  return {
    status: record.status,
    payload: record.payload,
  };
};

export const storeIdempotentReplay = (
  scope: string,
  key: string,
  payload: unknown,
  status = 200,
  ttlMs = 60_000,
): void => {
  const ttl = Math.max(1_000, Math.min(ttlMs, MAX_IDEMPOTENCY_TTL_MS));
  idempotencyStore.set(idempotencyStoreKey(scope, key), {
    status,
    payload,
    expiresAt: Date.now() + ttl,
  });
};

const parseExternalSourceConfig = (): ExternalSourceConfig[] => {
  const raw = Deno.env.get("LIVE_SOURCE_URLS_JSON")?.trim();
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError(500, "invalid_external_sources_config", "LIVE_SOURCE_URLS_JSON must contain valid JSON.");
  }

  if (!Array.isArray(parsed)) {
    throw new AppError(500, "invalid_external_sources_config", "LIVE_SOURCE_URLS_JSON must be a JSON array.");
  }

  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new AppError(
        500,
        "invalid_external_sources_config",
        "Each external source must be a JSON object.",
        { index },
      );
    }

    const source = entry as Record<string, unknown>;
    const source_id = typeof source.source_id === "string" && source.source_id.trim()
      ? source.source_id.trim()
      : `external_${index}`;
    const url = typeof source.url === "string" && source.url.trim() ? source.url.trim() : null;
    if (!url) {
      throw new AppError(
        500,
        "invalid_external_sources_config",
        "Each external source requires a non-empty url.",
        { index, source_id },
      );
    }

    const method = typeof source.method === "string" && source.method.trim()
      ? source.method.trim().toUpperCase()
      : "GET";
    const timeout_ms = source.timeout_ms === undefined ? undefined : Number(source.timeout_ms);
    const bearer_token_env = typeof source.bearer_token_env === "string" && source.bearer_token_env.trim()
      ? source.bearer_token_env.trim()
      : undefined;

    let headers: Record<string, string> | undefined;
    if (source.headers !== undefined) {
      if (!source.headers || typeof source.headers !== "object" || Array.isArray(source.headers)) {
        throw new AppError(
          500,
          "invalid_external_sources_config",
          "headers must be a JSON object when provided.",
          { index, source_id },
        );
      }
      headers = {};
      for (const [headerKey, headerValue] of Object.entries(source.headers as Record<string, unknown>)) {
        if (typeof headerValue === "string") {
          headers[headerKey] = headerValue;
        }
      }
    }

    return { source_id, url, method, timeout_ms, headers, bearer_token_env };
  });
};

const parseExternalResponseBody = (contentType: string, body: string): unknown => {
  if (!body) {
    return null;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(body);
    } catch {
      return {
        raw: body.slice(0, 8_000),
        parse_error: "invalid_json",
      };
    }
  }

  return {
    raw: body.slice(0, 8_000),
  };
};

export const fetchExternalLiveSources = async (): Promise<ExternalSourceFetchResult[]> => {
  const sources = parseExternalSourceConfig();
  if (sources.length === 0) {
    return [];
  }

  const defaultTimeout = parseEnvInt("LIVE_SOURCE_TIMEOUT_MS", 8_000, 1_000);
  const retries = parseEnvInt("LIVE_SOURCE_RETRIES", 1, 0);
  const concurrency = parseEnvInt("LIVE_SOURCE_CONCURRENCY", 3, 1);
  const maxAttempts = retries + 1;

  return mapWithConcurrency(sources, concurrency, async (source) => {
    let lastError: string | null = null;
    let finalStatus: number | null = null;
    let finalData: unknown | null = null;
    let ok = false;
    const started = Date.now();

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = source.timeout_ms ?? defaultTimeout;
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const headers: Record<string, string> = {
          Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
          ...(source.headers || {}),
        };
        if (source.bearer_token_env) {
          headers.Authorization = `Bearer ${getRequiredEnv(source.bearer_token_env)}`;
        }

        const response = await fetch(source.url, {
          method: source.method || "GET",
          headers,
          signal: controller.signal,
        });
        const body = await response.text();
        finalStatus = response.status;
        finalData = parseExternalResponseBody(response.headers.get("content-type") || "", body);
        ok = response.ok;

        if (response.ok) {
          break;
        }

        if (TRANSIENT_STATUS.has(response.status) && attempt + 1 < maxAttempts) {
          await sleep(backoffMsFor(attempt));
          continue;
        }

        lastError = `HTTP ${response.status}`;
        break;
      } catch (error) {
        if (attempt + 1 < maxAttempts) {
          await sleep(backoffMsFor(attempt));
          continue;
        }
        lastError = error instanceof Error ? error.message : "external_source_fetch_failed";
      } finally {
        clearTimeout(timer);
      }
    }

    return {
      source_id: source.source_id,
      url: source.url,
      ok,
      status: finalStatus,
      retrieved_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
      source: ok ? "live" : "unavailable",
      data: ok ? finalData : null,
      error: ok ? null : (lastError || "External source unavailable."),
    };
  });
};
