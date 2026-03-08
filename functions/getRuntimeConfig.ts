import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import { errorResponse, requireAuthenticated, requireMethod } from "./_shared/backend.ts";
import { DEFAULT_RUNTIME_CONFIG, RUNTIME_CONFIG_KEY } from "./_shared/runtimeConfig.ts";
import { requireEntityCollection } from "./_shared/liveTelemetryStore.ts";

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

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    requireAuthenticated(await base44.auth.me());

    const runtimeConfigEntity = requireEntityCollection(base44, "RuntimeConfig");
    const existing = await runtimeConfigEntity.filter({ key: RUNTIME_CONFIG_KEY }, "-updated_date", 1).catch(() => []);

    if (!Array.isArray(existing) || existing.length === 0) {
      const createdAt = new Date().toISOString();
      const created = await runtimeConfigEntity.create({
        key: RUNTIME_CONFIG_KEY,
        version: "runtime-config-v1",
        source: "live",
        updated_at: createdAt,
        config: DEFAULT_RUNTIME_CONFIG,
      });
      return Response.json({
        version: "runtime-config-v1",
        source: "live",
        key: RUNTIME_CONFIG_KEY,
        retrieved_at: createdAt,
        updated_at: createdAt,
        config: created?.config || DEFAULT_RUNTIME_CONFIG,
      });
    }

    const latest = existing[0] as Record<string, unknown>;
    const updatedAt = typeof latest.updated_at === "string"
      ? latest.updated_at
      : (typeof latest.updated_date === "string" ? latest.updated_date : new Date().toISOString());
    const config = latest.config && typeof latest.config === "object"
      ? latest.config as Record<string, unknown>
      : DEFAULT_RUNTIME_CONFIG;
    const enrichedConfig = mergeMissingKeys(config, DEFAULT_RUNTIME_CONFIG) as Record<string, unknown>;
    const configChanged = JSON.stringify(config) !== JSON.stringify(enrichedConfig);
    if (configChanged) {
      await runtimeConfigEntity.update(latest.id as string, {
        config: enrichedConfig,
        updated_at: new Date().toISOString(),
      }).catch(() => null);
    }

    return Response.json({
      version: parseVersion(latest.version),
      source: "live",
      key: RUNTIME_CONFIG_KEY,
      retrieved_at: new Date().toISOString(),
      updated_at: configChanged ? new Date().toISOString() : updatedAt,
      config: enrichedConfig,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
