import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  AppError,
  errorResponse,
  parseJsonBody,
  requireAuthenticated,
  requireMethod,
} from './_shared/backend.ts';

Deno.serve(async (req) => {
  try {
    requireMethod(req, 'POST');
    const base44 = createClientFromRequest(req);
    const user = requireAuthenticated(await base44.auth.me()) as {
      role?: string;
      full_name?: string;
      email?: string;
      id?: string;
    };

    const body = await parseJsonBody<{
      x?: unknown;
      y?: unknown;
      callsign?: unknown;
      in_vehicle?: unknown;
      world_x?: unknown;
      world_y?: unknown;
      map_id?: unknown;
      telemetry_source?: unknown;
    }>(req);

    if (typeof body.x !== 'number' || !Number.isFinite(body.x) || typeof body.y !== 'number' || !Number.isFinite(body.y)) {
      throw new AppError(400, 'invalid_coordinates', 'x and y are required finite numbers.');
    }

    // Clamp to valid map range 0–100
    const cx = Math.max(0, Math.min(100, body.x));
    const cy = Math.max(0, Math.min(100, body.y));
    const defaultCallsign = user.full_name?.trim() || user.email?.trim() || user.id || 'Unknown';
    const requestedCallsign = typeof body.callsign === 'string' ? body.callsign.trim() : '';
    const isAdmin = user.role === 'admin';
    const resolvedCallsign = isAdmin && requestedCallsign ? requestedCallsign : defaultCallsign;

    // Upsert strictly by resolved identity to prevent spoofing by non-admin users.
    const existing = await base44.asServiceRole.entities.PlayerLocation.filter({ player_callsign: resolvedCallsign });

    const payload = {
      player_callsign: resolvedCallsign,
      x: cx,
      y: cy,
      normalized_x: cx,
      normalized_y: cy,
      world_x: typeof body.world_x === 'number' && Number.isFinite(body.world_x) ? body.world_x : null,
      world_y: typeof body.world_y === 'number' && Number.isFinite(body.world_y) ? body.world_y : null,
      map_id: typeof body.map_id === 'string' && body.map_id.trim() ? body.map_id.trim() : 'global-map',
      telemetry_source: typeof body.telemetry_source === 'string' && body.telemetry_source.trim()
        ? body.telemetry_source.trim()
        : 'client_heartbeat',
      in_vehicle: !!body.in_vehicle,
      timestamp: new Date().toISOString(),
    };

    let record;
    if (existing && existing.length > 0) {
      record = await base44.asServiceRole.entities.PlayerLocation.update(existing[0].id, payload);
    } else {
      record = await base44.asServiceRole.entities.PlayerLocation.create(payload);
    }

    return Response.json({
      success: true,
      location: record,
      player_callsign: resolvedCallsign,
      identity_source: isAdmin && requestedCallsign ? 'admin_override' : 'authenticated_user',
    });
  } catch (error) {
    return errorResponse(error);
  }
});
