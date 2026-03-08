import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import {
  errorResponse,
  requireAuthenticated,
  requireMethod,
} from "./_shared/backend.ts";
import { MAP_RUNTIME_CONFIG_KEY } from "./_shared/mapRuntime.ts";
import { tryGetEntityCollection } from "./_shared/liveTelemetryStore.ts";

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    requireAuthenticated(await base44.auth.me());

    const entity = tryGetEntityCollection(base44, "MapRuntimeConfig");
    if (!entity) {
      return Response.json({
        success: false,
        source: "unavailable",
        error: "entity_MapRuntimeConfig_not_found",
        config: null,
        retrieved_at: new Date().toISOString(),
      });
    }

    const existing = await entity.filter({ key: MAP_RUNTIME_CONFIG_KEY }, "-updated_date", 1).catch(() => []);
    if (!Array.isArray(existing) || existing.length === 0) {
      return Response.json({
        success: false,
        source: "unavailable",
        error: "map_runtime_config_missing",
        config: null,
        retrieved_at: new Date().toISOString(),
      });
    }

    const record = existing[0] as Record<string, unknown>;
    return Response.json({
      success: true,
      source: "live",
      config: record.config || null,
      version: Number.isFinite(Number(record.config_version)) ? Number(record.config_version) : 1,
      updated_at: typeof record.updated_at === "string" ? record.updated_at : record.updated_date || null,
      retrieved_at: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
});
