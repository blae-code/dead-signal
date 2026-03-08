import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  AppError,
  enforceRateLimit,
  errorResponse,
  getDefaultPanelTargetId,
  getIdempotentReplay,
  parseJsonBody,
  readRequestIdempotencyKey,
  requireAdmin,
  requireMethod,
  sendPanelPowerSignal,
  storeIdempotentReplay,
} from './_shared/backend.ts';

const ALLOWED_SIGNALS = new Set(['start', 'stop', 'restart', 'kill']);

Deno.serve(async (req) => {
  try {
    requireMethod(req, 'POST');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    requireAdmin(user);

    const body = await parseJsonBody<{
      signal?: unknown;
      target_id?: unknown;
      idempotency_key?: unknown;
    }>(req);
    if (typeof body.signal !== 'string' || !body.signal.trim()) {
      throw new AppError(400, 'invalid_power_signal', 'signal must be one of: start, stop, restart, kill.');
    }
    const signal = body.signal.trim().toLowerCase();
    if (!ALLOWED_SIGNALS.has(signal)) {
      throw new AppError(400, 'invalid_power_signal', 'signal must be one of: start, stop, restart, kill.');
    }

    const targetId = typeof body.target_id === 'string' && body.target_id.trim()
      ? body.target_id.trim()
      : getDefaultPanelTargetId();
    const actorId = user?.id || user?.email || 'unknown-admin';
    enforceRateLimit(`power:${actorId}:${targetId}`, 6, 60_000, 'power_rate_limited');
    const idempotencyKey = readRequestIdempotencyKey(req, body.idempotency_key);
    if (idempotencyKey) {
      const replay = getIdempotentReplay(`power:${actorId}:${targetId}`, idempotencyKey);
      if (replay) {
        return Response.json(
          {
            ...(replay.payload as Record<string, unknown>),
            idempotent_replay: true,
          },
          { status: replay.status },
        );
      }
    }

    await sendPanelPowerSignal(signal as 'start' | 'stop' | 'restart' | 'kill', targetId);

    const payload = {
      success: true,
      target_id: targetId,
      signal,
      message: `Power signal '${signal}' sent successfully.`,
    };
    if (idempotencyKey) {
      storeIdempotentReplay(`power:${actorId}:${targetId}`, idempotencyKey, payload, 200, 120_000);
    }

    return Response.json(payload);
  } catch (error) {
    return errorResponse(error);
  }
});
