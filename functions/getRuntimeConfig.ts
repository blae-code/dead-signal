import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import { errorResponse, requireAuthenticated, requireMethod } from "./_shared/backend.ts";
import { DEFAULT_RUNTIME_CONFIG, RUNTIME_CONFIG_KEY } from "./_shared/runtimeConfig.ts";
import { tryGetEntityCollection } from "./_shared/liveTelemetryStore.ts";

const parseVersion = (value: unknown): string => (
  typeof value === "string" && value.trim()
    ? value.trim()
    : "runtime-config-v1"
);

const isPlainObject = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const mergeMissingKeys = (
  currentValue: unknown,
  defaultValue: unknown,
): unknown => {
  if (!isPlainObject(defaultValue)) {
    return currentValue === undefined ? defaultValue : currentValue;
  }

  const currentObject = isPlainObject(currentValue) ? currentValue : {};
  const merged: Record<string, unknown> = { ...currentObject };
  for (const [key, fallback] of Object.entries(defaultValue)) {
    if (!(key in currentObject)) {
      merged[key] = fallback;
      continue;
    }
    merged[key] = mergeMissingKeys(currentObject[key], fallback);
  }
  return merged;
};

const nowIso = (): string => new Date().toISOString();

const buildConfigResponse = ({
  version = "runtime-config-v1",
  source,
  updatedAt,
  config,
}: {
  version?: string;
  source: "live" | "fallback";
  updatedAt?: string;
  config: Record<string, unknown>;
}) => {
  const retrievedAt = nowIso();
  return Response.json({
    version,
    source,
    key: RUNTIME_CONFIG_KEY,
    retrieved_at: retrievedAt,
    updated_at: updatedAt || retrievedAt,
    config,
  });
};

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    requireAuthenticated(await base44.auth.me());

    const runtimeConfigEntity = tryGetEntityCollection(base44, "RuntimeConfig");
    if (!runtimeConfigEntity) {
      return buildConfigResponse({
        source: "fallback",
        config: DEFAULT_RUNTIME_CONFIG,
      });
    }

    const existing = await runtimeConfigEntity.filter({ key: RUNTIME_CONFIG_KEY }, "-updated_date", 1).catch(() => []);

    if (!Array.isArray(existing) || existing.length === 0) {
      const createdAt = nowIso();
      const created = await runtimeConfigEntity.create({
        key: RUNTIME_CONFIG_KEY,
        version: "runtime-config-v1",
        source: "live",
        updated_at: createdAt,
        config: DEFAULT_RUNTIME_CONFIG,
      }).catch(() => null);

      if (!created) {
        return buildConfigResponse({
          source: "fallback",
          updatedAt: createdAt,
          config: DEFAULT_RUNTIME_CONFIG,
        });
      }

      return buildConfigResponse({
        source: "live",
        updatedAt: createdAt,
        config: (created?.config as Record<string, unknown>) || DEFAULT_RUNTIME_CONFIG,
      });
    }

    const latest = existing[0] as Record<string, unknown>;
    const updatedAt = typeof latest.updated_at === "string"
      ? latest.updated_at
      : (typeof latest.updated_date === "string" ? latest.updated_date : nowIso());
    const config = latest.config && typeof latest.config === "object"
      ? latest.config as Record<string, unknown>
      : DEFAULT_RUNTIME_CONFIG;
    const enrichedConfig = mergeMissingKeys(config, DEFAULT_RUNTIME_CONFIG) as Record<string, unknown>;
    const configChanged = JSON.stringify(config) !== JSON.stringify(enrichedConfig);
    if (configChanged) {
      const id = typeof latest.id === "string" ? latest.id : null;
      if (id) {
        await runtimeConfigEntity.update(id, {
          config: enrichedConfig,
          updated_at: nowIso(),
        }).catch(() => null);
      }
    }

    return buildConfigResponse({
      version: parseVersion(latest.version),
      source: "live",
      updatedAt: configChanged ? nowIso() : updatedAt,
      config: enrichedConfig,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
