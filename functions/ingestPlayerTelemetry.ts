import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import {
  AppError,
  errorResponse,
  parseJsonBody,
  requireAdmin,
  requireMethod,
} from "./_shared/backend.ts";

const toFinite = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    requireAdmin(await base44.auth.me());

    const body = await parseJsonBody<{
      source?: unknown;
      players?: unknown;
      timestamp?: unknown;
      map_id?: unknown;
    }>(req);
    if (!Array.isArray(body.players)) {
      throw new AppError(400, "invalid_players_payload", "players must be an array.");
    }
    const source = typeof body.source === "string" && body.source.trim()
      ? body.source.trim()
      : "telemetry_ingest";
    const mapId = typeof body.map_id === "string" && body.map_id.trim() ? body.map_id.trim() : "global-map";
    const timestamp = typeof body.timestamp === "string" && body.timestamp.trim()
      ? body.timestamp.trim()
      : new Date().toISOString();

    const locationEntity = base44.asServiceRole.entities.PlayerLocation;
    const results: Array<Record<string, unknown>> = [];

    for (const candidate of body.players) {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
      const row = candidate as Record<string, unknown>;
      const callsign = typeof row.player_callsign === "string" && row.player_callsign.trim()
        ? row.player_callsign.trim()
        : null;
      if (!callsign) continue;

      const nx = toFinite(row.normalized_x ?? row.x);
      const ny = toFinite(row.normalized_y ?? row.y);
      const wx = toFinite(row.world_x);
      const wy = toFinite(row.world_y);
      if (nx === null || ny === null) continue;
      const clampedX = Math.max(0, Math.min(100, nx));
      const clampedY = Math.max(0, Math.min(100, ny));

      const payload: Record<string, unknown> = {
        player_callsign: callsign,
        x: clampedX,
        y: clampedY,
        normalized_x: clampedX,
        normalized_y: clampedY,
        timestamp,
        in_vehicle: row.in_vehicle === true,
        telemetry_source: source,
        map_id: mapId,
      };
      if (wx !== null) payload.world_x = wx;
      if (wy !== null) payload.world_y = wy;
      if (typeof row.player_id === "string" && row.player_id.trim()) payload.player_id = row.player_id.trim();

      const existing = await locationEntity.filter({ player_callsign: callsign }).catch(() => []);
      const saved = Array.isArray(existing) && existing.length > 0
        ? await locationEntity.update(existing[0].id, payload)
        : await locationEntity.create(payload);
      results.push({
        id: saved?.id || null,
        player_callsign: callsign,
        normalized_x: clampedX,
        normalized_y: clampedY,
        world_x: wx,
        world_y: wy,
      });
    }

    return Response.json({
      success: true,
      source,
      map_id: mapId,
      ingested_count: results.length,
      players: results,
      ingested_at: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
});
