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
