import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { x, y, callsign, in_vehicle } = await req.json();

    if (typeof x !== 'number' || typeof y !== 'number') {
      return Response.json({ error: 'x and y are required numbers' }, { status: 400 });
    }
    // Clamp to valid map range 0–100
    const cx = Math.max(0, Math.min(100, x));
    const cy = Math.max(0, Math.min(100, y));

    // Find existing location record for this user
    const existing = await base44.asServiceRole.entities.PlayerLocation.filter({ player_callsign: callsign || user.full_name || user.email });

    const payload = {
      player_callsign: callsign || user.full_name || user.email,
      x: cx,
      y: cy,
      in_vehicle: !!in_vehicle,
      timestamp: new Date().toISOString(),
    };

    let record;
    if (existing && existing.length > 0) {
      record = await base44.asServiceRole.entities.PlayerLocation.update(existing[0].id, payload);
    } else {
      record = await base44.asServiceRole.entities.PlayerLocation.create(payload);
    }

    return Response.json({ success: true, location: record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});