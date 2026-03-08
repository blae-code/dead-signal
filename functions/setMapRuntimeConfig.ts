import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import {
  AppError,
  errorResponse,
  parseJsonBody,
  requireAdmin,
  requireMethod,
} from "./_shared/backend.ts";
import {
  MAP_RUNTIME_CONFIG_KEY,
  sanitizeMapRuntimeConfig,
} from "./_shared/mapRuntime.ts";
import { requireEntityCollection } from "./_shared/liveTelemetryStore.ts";

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    requireAdmin(await base44.auth.me());

    const body = await parseJsonBody<{ config?: unknown }>(req);
    if (!body.config) {
      throw new AppError(400, "missing_map_config", "config payload is required.");
    }
    const config = sanitizeMapRuntimeConfig(body.config);
    const entity = requireEntityCollection(base44, "MapRuntimeConfig");
    const existing = await entity.filter({ key: MAP_RUNTIME_CONFIG_KEY }, "-updated_date", 1).catch(() => []);
    const previous = Array.isArray(existing) && existing.length > 0
      ? existing[0] as Record<string, unknown>
      : null;
    const previousVersion = Number(previous?.config_version);
    const nextVersion = Number.isFinite(previousVersion) && previousVersion > 0
      ? Math.floor(previousVersion) + 1
      : 1;

    const payload = {
      key: MAP_RUNTIME_CONFIG_KEY,
      updated_at: new Date().toISOString(),
      config_version: nextVersion,
      config,
    };

    const saved = previous
      ? await entity.update(previous.id as string, payload)
      : await entity.create(payload);

    return Response.json({
      success: true,
      source: "live",
      config: saved?.config || config,
      updated_at: payload.updated_at,
      version: nextVersion,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
