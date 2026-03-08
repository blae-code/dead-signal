import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import {
  AppError,
  errorResponse,
  getIdempotentReplay,
  parseJsonBody,
  readRequestIdempotencyKey,
  requireAdmin,
  requireMethod,
  requireTacticalWriter,
  storeIdempotentReplay,
} from "./_shared/backend.ts";
import { requireEntityCollection, tryGetEntityCollection } from "./_shared/liveTelemetryStore.ts";

type JsonRecord = Record<string, unknown>;
type MapAction =
  | "create_pin"
  | "update_pin"
  | "delete_pin"
  | "create_route"
  | "create_broadcast"
  | "upsert_overlay"
  | "delete_overlay"
  | "reset_domain";

const ALLOWED_ACTIONS = new Set<MapAction>([
  "create_pin",
  "update_pin",
  "delete_pin",
  "create_route",
  "create_broadcast",
  "upsert_overlay",
  "delete_overlay",
  "reset_domain",
]);

const toNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toOptionalString = (value: unknown): string | null => (
  typeof value === "string" && value.trim() ? value.trim() : null
);

const requireAction = (value: unknown): MapAction => {
  const action = toOptionalString(value) as MapAction | null;
  if (!action || !ALLOWED_ACTIONS.has(action)) {
    throw new AppError(400, "invalid_action", "action is required and must be a supported map mutation.");
  }
  return action;
};

const normalizeMapId = (value: unknown): string => (
  toOptionalString(value) || "global-map"
);

const normalizePoint = (value: unknown): { normalized_x: number; normalized_y: number; world_x: number | null; world_y: number | null } => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(400, "invalid_point", "point must be a JSON object.");
  }
  const row = value as JsonRecord;
  const x = toNumber(row.normalized_x ?? row.x);
  const y = toNumber(row.normalized_y ?? row.y);
  if (x === null || y === null) {
    throw new AppError(400, "invalid_point", "point normalized_x/normalized_y (or x/y) must be numeric.");
  }
  const worldX = toNumber(row.world_x);
  const worldY = toNumber(row.world_y);
  return {
    normalized_x: Math.min(100, Math.max(0, x)),
    normalized_y: Math.min(100, Math.max(0, y)),
    world_x: worldX,
    world_y: worldY,
  };
};

const mapPinPayload = (payload: JsonRecord, actorCallsign: string): JsonRecord => {
  const point = normalizePoint(payload);
  const title = toOptionalString(payload.title);
  const type = toOptionalString(payload.type);
  if (!title || !type) {
    throw new AppError(400, "invalid_pin_payload", "title and type are required for create_pin.");
  }
  return {
    title,
    type,
    note: toOptionalString(payload.note) || "",
    status: toOptionalString(payload.status) || "Active",
    horde_size: toNumber(payload.horde_size) ?? 0,
    horde_direction: toOptionalString(payload.horde_direction),
    expires_at: toOptionalString(payload.expires_at),
    rally_expires_at: toOptionalString(payload.rally_expires_at),
    map_id: normalizeMapId(payload.map_id),
    placed_by: toOptionalString(payload.placed_by) || actorCallsign,
    x: point.normalized_x,
    y: point.normalized_y,
    normalized_x: point.normalized_x,
    normalized_y: point.normalized_y,
    world_x: point.world_x,
    world_y: point.world_y,
  };
};

const mapBroadcastPayload = (payload: JsonRecord, actorCallsign: string): JsonRecord => {
  const point = normalizePoint(payload);
  const message = toOptionalString(payload.message);
  if (!message) {
    throw new AppError(400, "invalid_broadcast_payload", "message is required for create_broadcast.");
  }
  return {
    message,
    map_id: normalizeMapId(payload.map_id),
    sent_by: toOptionalString(payload.sent_by) || actorCallsign,
    expires_at: toOptionalString(payload.expires_at) || new Date(Date.now() + 30_000).toISOString(),
    x: point.normalized_x,
    y: point.normalized_y,
    normalized_x: point.normalized_x,
    normalized_y: point.normalized_y,
    world_x: point.world_x,
    world_y: point.world_y,
  };
};

const routePointsPayload = (value: unknown): Array<JsonRecord> => {
  if (!Array.isArray(value) || value.length < 2) {
    throw new AppError(400, "invalid_route_payload", "points array with at least 2 points is required.");
  }
  return value.map((point, index) => {
    const normalized = normalizePoint(point);
    return {
      order: index,
      x: normalized.normalized_x,
      y: normalized.normalized_y,
      normalized_x: normalized.normalized_x,
      normalized_y: normalized.normalized_y,
      world_x: normalized.world_x,
      world_y: normalized.world_y,
    };
  });
};

const purgeCollection = async (
  entity: any,
  dryRun: boolean,
): Promise<{ found: number; deleted: number }> => {
  const rows = await entity.list("-created_date", 10_000).catch(() => []);
  const safeRows = Array.isArray(rows) ? rows : [];
  if (dryRun) {
    return { found: safeRows.length, deleted: 0 };
  }
  let deleted = 0;
  for (const row of safeRows) {
    if (!row?.id) continue;
    await entity.delete(row.id).then(() => {
      deleted += 1;
    }).catch(() => null);
  }
  return { found: safeRows.length, deleted };
};

const getEntityById = async (entity: any, id: string): Promise<JsonRecord | null> => {
  if (!entity || !id) return null;
  if (typeof entity.get === "function") {
    const row = await entity.get(id).catch(() => null);
    if (row && typeof row === "object") return row as JsonRecord;
  }
  if (typeof entity.filter === "function") {
    const rows = await entity.filter({ id }, "-updated_date", 1).catch(() => []);
    if (Array.isArray(rows) && rows.length > 0 && rows[0] && typeof rows[0] === "object") {
      return rows[0] as JsonRecord;
    }
  }
  return null;
};

const rowUpdatedAt = (row: JsonRecord | null): string | null => {
  if (!row) return null;
  return toOptionalString(row.updated_at)
    || toOptionalString(row.updated_date)
    || toOptionalString(row.created_date)
    || null;
};

const enforceExpectedRevision = (
  expectedUpdatedAt: string | null,
  currentUpdatedAt: string | null,
  resourceLabel: string,
): void => {
  if (!expectedUpdatedAt || !currentUpdatedAt) return;
  if (expectedUpdatedAt !== currentUpdatedAt) {
    throw new AppError(
      409,
      "conflict",
      `${resourceLabel} changed since the client snapshot. Refresh and retry.`,
      {
        expected_updated_at: expectedUpdatedAt,
        current_updated_at: currentUpdatedAt,
      },
    );
  }
};

const toShortError = (error: unknown): string => {
  if (error instanceof AppError) return `${error.code}:${error.message}`.slice(0, 400);
  if (error instanceof Error) return error.message.slice(0, 400);
  return String(error).slice(0, 400);
};

const auditMapMutation = async (
  base44: any,
  payload: {
    actor_role: string;
    action: string;
    dry_run: boolean;
    request_payload: JsonRecord;
    result: JsonRecord | null;
    error: string | null;
  },
): Promise<void> => {
  const auditEntity = tryGetEntityCollection(base44, "FunctionExecutionAudit");
  if (!auditEntity?.create) return;
  await auditEntity.create({
    function_id: "mutateMapDomain",
    status: payload.error ? "failed" : "success",
    actor_role: payload.actor_role,
    payload: {
      action: payload.action,
      dry_run: payload.dry_run,
      payload: payload.request_payload,
    },
    response: payload.result,
    error: payload.error,
    executed_at: new Date().toISOString(),
  }).catch(() => null);
};

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const body = await parseJsonBody<{
      action?: unknown;
      payload?: unknown;
      dry_run?: unknown;
      confirm_token?: unknown;
      idempotency_key?: unknown;
    }>(req);
    const action = requireAction(body.action);
    const dryRun = body.dry_run === true;

    const actorId = toOptionalString(user?.id) || toOptionalString(user?.email) || "unknown-user";
    const actorCallsign = toOptionalString(user?.full_name) || toOptionalString(user?.email) || "Unknown";
    const scope = `mutateMapDomain:${actorId}:${action}`;
    const idempotencyKey = readRequestIdempotencyKey(req, body.idempotency_key);
    if (idempotencyKey) {
      const replay = getIdempotentReplay(scope, idempotencyKey);
      if (replay) {
        return Response.json(
          {
            ...(replay.payload as JsonRecord),
            idempotent_replay: true,
          },
          { status: replay.status },
        );
      }
    }

    const payload = body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
      ? body.payload as JsonRecord
      : {};

    let result: JsonRecord = {};

    if (action === "reset_domain") {
      requireAdmin(user);
      if (!dryRun) {
        const confirmToken = toOptionalString(body.confirm_token);
        if (confirmToken !== "RESET") {
          throw new AppError(412, "confirmation_required", "confirm_token=RESET is required for reset_domain writes.");
        }
      }

      const mapPinEntity = tryGetEntityCollection(base44, "MapPin");
      const mapRouteEntity = tryGetEntityCollection(base44, "MapRoute");
      const mapOverlayEntity = tryGetEntityCollection(base44, "MapOverlay");
      const mapBroadcastEntity = tryGetEntityCollection(base44, "MapBroadcast");
      const playerLocationEntity = tryGetEntityCollection(base44, "PlayerLocation");
      const clanPositionEntity = tryGetEntityCollection(base44, "ClanPosition");
      const tacticalOverlayEntity = tryGetEntityCollection(base44, "TacticalOverlay");
      const clanBroadcastEntity = tryGetEntityCollection(base44, "ClanBroadcast");

      const summary: JsonRecord = {};
      if (mapPinEntity) summary.MapPin = await purgeCollection(mapPinEntity, dryRun);
      if (mapRouteEntity) summary.MapRoute = await purgeCollection(mapRouteEntity, dryRun);
      if (mapOverlayEntity) summary.MapOverlay = await purgeCollection(mapOverlayEntity, dryRun);
      if (mapBroadcastEntity) summary.MapBroadcast = await purgeCollection(mapBroadcastEntity, dryRun);
      if (playerLocationEntity) summary.PlayerLocation = await purgeCollection(playerLocationEntity, dryRun);
      if (clanPositionEntity) summary.ClanPosition = await purgeCollection(clanPositionEntity, dryRun);
      if (tacticalOverlayEntity) summary.TacticalOverlay = await purgeCollection(tacticalOverlayEntity, dryRun);
      if (clanBroadcastEntity) summary.ClanBroadcast = await purgeCollection(clanBroadcastEntity, dryRun);

      result = {
        dry_run: dryRun,
        reset_summary: summary,
      };
    } else {
      await requireTacticalWriter(base44, user);

      if (action === "create_pin") {
        const entity = requireEntityCollection(base44, "MapPin");
        const pin = mapPinPayload(payload, actorCallsign);
        const created = dryRun ? pin : await entity.create(pin);
        result = {
          pin: created,
          revision: rowUpdatedAt(created as JsonRecord) || null,
          dry_run: dryRun,
        };
      } else if (action === "update_pin") {
        const entity = requireEntityCollection(base44, "MapPin");
        const pinId = toOptionalString(payload.pin_id);
        if (!pinId) throw new AppError(400, "invalid_pin_payload", "pin_id is required for update_pin.");
        const current = await getEntityById(entity, pinId);
        if (!current) throw new AppError(404, "pin_not_found", "Pin not found.");
        const expectedUpdatedAt = toOptionalString(payload.expected_updated_at);
        enforceExpectedRevision(expectedUpdatedAt, rowUpdatedAt(current), "Pin");
        const patch = payload.patch && typeof payload.patch === "object" && !Array.isArray(payload.patch)
          ? payload.patch as JsonRecord
          : {};
        const safePatch: JsonRecord = {};
        if ("title" in patch) safePatch.title = toOptionalString(patch.title) || "";
        if ("note" in patch) safePatch.note = toOptionalString(patch.note) || "";
        if ("status" in patch) safePatch.status = toOptionalString(patch.status);
        if ("horde_size" in patch) safePatch.horde_size = toNumber(patch.horde_size) ?? 0;
        if ("horde_direction" in patch) safePatch.horde_direction = toOptionalString(patch.horde_direction);
        if ("expires_at" in patch) safePatch.expires_at = toOptionalString(patch.expires_at);
        if ("rally_expires_at" in patch) safePatch.rally_expires_at = toOptionalString(patch.rally_expires_at);
        if ("map_id" in patch) safePatch.map_id = normalizeMapId(patch.map_id);
        if ("point" in patch) {
          const point = normalizePoint(patch.point);
          safePatch.x = point.normalized_x;
          safePatch.y = point.normalized_y;
          safePatch.normalized_x = point.normalized_x;
          safePatch.normalized_y = point.normalized_y;
          safePatch.world_x = point.world_x;
          safePatch.world_y = point.world_y;
        }
        const updated = dryRun ? null : await entity.update(pinId, safePatch);
        result = {
          pin_id: pinId,
          patch: safePatch,
          pin: updated,
          revision: rowUpdatedAt(updated as JsonRecord) || rowUpdatedAt(current),
          dry_run: dryRun,
        };
      } else if (action === "delete_pin") {
        const entity = requireEntityCollection(base44, "MapPin");
        const pinId = toOptionalString(payload.pin_id);
        if (!pinId) throw new AppError(400, "invalid_pin_payload", "pin_id is required for delete_pin.");
        const current = await getEntityById(entity, pinId);
        if (!current) throw new AppError(404, "pin_not_found", "Pin not found.");
        const expectedUpdatedAt = toOptionalString(payload.expected_updated_at);
        enforceExpectedRevision(expectedUpdatedAt, rowUpdatedAt(current), "Pin");
        if (!dryRun) {
          await entity.delete(pinId);
        }
        result = {
          pin_id: pinId,
          deleted: !dryRun,
          revision: rowUpdatedAt(current),
          dry_run: dryRun,
        };
      } else if (action === "create_broadcast") {
        const entity = requireEntityCollection(base44, "MapBroadcast");
        const broadcast = mapBroadcastPayload(payload, actorCallsign);
        const created = dryRun ? broadcast : await entity.create(broadcast);
        result = {
          broadcast: created,
          revision: rowUpdatedAt(created as JsonRecord) || null,
          dry_run: dryRun,
        };
      } else if (action === "create_route") {
        const routeEntity = requireEntityCollection(base44, "MapRoute");
        const pinEntity = tryGetEntityCollection(base44, "MapPin");
        const mapId = normalizeMapId(payload.map_id);
        const routeName = toOptionalString(payload.title) || `Route ${new Date().toISOString()}`;
        const points = routePointsPayload(payload.points);
        const persistWaypoints = payload.persist_waypoints !== false;
        const routePayload = {
          map_id: mapId,
          title: routeName,
          created_by: actorCallsign,
          points,
          point_count: points.length,
          updated_at: new Date().toISOString(),
        };
        let waypoints: JsonRecord[] = [];
        if (persistWaypoints && pinEntity) {
          waypoints = points.map((point, index) => ({
            title: `WPT ${index + 1}`,
            type: "Route Waypoint",
            map_id: mapId,
            status: "Active",
            placed_by: actorCallsign,
            route_order: index,
            route_id: null,
            x: point.normalized_x,
            y: point.normalized_y,
            normalized_x: point.normalized_x,
            normalized_y: point.normalized_y,
            world_x: point.world_x,
            world_y: point.world_y,
          }));
        }
        if (!dryRun) {
          const route = await routeEntity.create(routePayload);
          if (persistWaypoints && pinEntity && waypoints.length > 0) {
            waypoints = await Promise.all(waypoints.map((waypoint) => pinEntity.create({
              ...waypoint,
              route_id: route.id,
            }).catch(() => null))).then((rows) => rows.filter(Boolean));
          }
          result = {
            route,
            waypoints,
            revision: rowUpdatedAt(route as JsonRecord) || null,
            dry_run: dryRun,
          };
        } else {
          result = {
            route: routePayload,
            waypoints,
            revision: null,
            dry_run: dryRun,
          };
        }
      } else if (action === "upsert_overlay") {
        const entity = requireEntityCollection(base44, "MapOverlay");
        const overlayId = toOptionalString(payload.overlay_id);
        let currentOverlay: JsonRecord | null = null;
        if (overlayId) {
          currentOverlay = await getEntityById(entity, overlayId);
          if (!currentOverlay) throw new AppError(404, "overlay_not_found", "Overlay not found.");
          const expectedUpdatedAt = toOptionalString(payload.expected_updated_at);
          enforceExpectedRevision(expectedUpdatedAt, rowUpdatedAt(currentOverlay), "Overlay");
        }
        const geometry = toOptionalString(payload.geometry) || "circle";
        const overlayPayload: JsonRecord = {
          map_id: normalizeMapId(payload.map_id),
          title: toOptionalString(payload.title) || "Overlay",
          geometry,
          color: toOptionalString(payload.color) || "#ff2020",
          opacity: toNumber(payload.opacity) ?? 0.3,
          updated_by: actorCallsign,
          updated_at: new Date().toISOString(),
        };
        if (geometry === "circle") {
          const center = normalizePoint(payload.center || payload.point || payload);
          const radius = toNumber(payload.radius) ?? 10;
          overlayPayload.center_x = center.normalized_x;
          overlayPayload.center_y = center.normalized_y;
          overlayPayload.radius = Math.max(1, radius);
        } else {
          const points = routePointsPayload(payload.points);
          overlayPayload.points = points.map((point) => ({
            x: point.normalized_x,
            y: point.normalized_y,
          }));
        }
        const overlay = dryRun
          ? overlayPayload
          : (overlayId ? await entity.update(overlayId, overlayPayload) : await entity.create(overlayPayload));
        result = {
          overlay,
          overlay_id: overlayId,
          revision: rowUpdatedAt(overlay as JsonRecord) || rowUpdatedAt(currentOverlay),
          dry_run: dryRun,
        };
      } else if (action === "delete_overlay") {
        const entity = requireEntityCollection(base44, "MapOverlay");
        const overlayId = toOptionalString(payload.overlay_id);
        if (!overlayId) throw new AppError(400, "invalid_overlay_payload", "overlay_id is required for delete_overlay.");
        const currentOverlay = await getEntityById(entity, overlayId);
        if (!currentOverlay) throw new AppError(404, "overlay_not_found", "Overlay not found.");
        const expectedUpdatedAt = toOptionalString(payload.expected_updated_at);
        enforceExpectedRevision(expectedUpdatedAt, rowUpdatedAt(currentOverlay), "Overlay");
        if (!dryRun) {
          await entity.delete(overlayId);
        }
        result = {
          overlay_id: overlayId,
          deleted: !dryRun,
          revision: rowUpdatedAt(currentOverlay),
          dry_run: dryRun,
        };
      }
    }

    const responsePayload = {
      success: true,
      action,
      dry_run: dryRun,
      result,
      executed_at: new Date().toISOString(),
    };

    let clanRole: string | null = null;
    const userEmail = toOptionalString(user?.email);
    const clanMemberEntity = tryGetEntityCollection(base44, "ClanMember");
    if (clanMemberEntity?.filter && userEmail) {
      const clanRows = await clanMemberEntity.filter({ user_email: userEmail }, "-updated_date", 1).catch(() => []);
      if (Array.isArray(clanRows) && clanRows.length > 0) {
        clanRole = toOptionalString((clanRows[0] as JsonRecord).role);
      }
    }
    const actorRole = toOptionalString(user?.role)
      || clanRole
      || "authenticated";
    await auditMapMutation(base44, {
      actor_role: actorRole,
      action,
      dry_run: dryRun,
      request_payload: payload,
      result,
      error: null,
    });

    if (idempotencyKey) {
      storeIdempotentReplay(scope, idempotencyKey, responsePayload, 200, 120_000);
    }

    return Response.json(responsePayload);
  } catch (error) {
    try {
      const base44 = createClientFromRequest(req);
      const body = await parseJsonBody<{ action?: unknown; payload?: unknown; dry_run?: unknown }>(req).catch(() => null);
      const action = body?.action && typeof body.action === "string" ? body.action : "unknown";
      const payload = body?.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
        ? body.payload as JsonRecord
        : {};
      await auditMapMutation(base44, {
        actor_role: "unknown",
        action,
        dry_run: body?.dry_run === true,
        request_payload: payload,
        result: null,
        error: toShortError(error),
      });
    } catch {
      // Best-effort audit only.
    }
    return errorResponse(error);
  }
});
