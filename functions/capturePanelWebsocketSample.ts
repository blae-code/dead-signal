import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  AppError,
  errorResponse,
  fetchPanelWebsocketAuth,
  getDefaultPanelTargetId,
  parseJsonBody,
  requireAdmin,
  requireMethod,
} from './_shared/backend.ts';

const MAX_DURATION_SECONDS = 20;
const DEFAULT_DURATION_SECONDS = 10;
const MAX_EVENTS = 500;

const safeParseMessage = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
};

const safePersistSample = async (base44: any, payload: Record<string, unknown>): Promise<void> => {
  try {
    const entity = base44?.asServiceRole?.entities?.PanelStreamSample;
    if (!entity) return;
    await entity.create(payload);
  } catch {
    // Persistence is best-effort only.
  }
};

Deno.serve(async (req) => {
  try {
    requireMethod(req, 'POST');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    requireAdmin(user);

    const body = await parseJsonBody<{
      target_id?: unknown;
      duration_seconds?: unknown;
      persist?: unknown;
    }>(req);
    const targetId = typeof body.target_id === 'string' && body.target_id.trim()
      ? body.target_id.trim()
      : getDefaultPanelTargetId();
    const durationRaw = Number(body.duration_seconds);
    const durationSeconds = Number.isFinite(durationRaw) && durationRaw > 0
      ? Math.min(MAX_DURATION_SECONDS, Math.floor(durationRaw))
      : DEFAULT_DURATION_SECONDS;
    const persist = body.persist !== false;

    const wsAuth = await fetchPanelWebsocketAuth(targetId) as Record<string, any>;
    const attributes = wsAuth?.data?.attributes || {};
    const socket = typeof attributes.socket === 'string' ? attributes.socket : null;
    const token = typeof attributes.token === 'string' ? attributes.token : null;
    if (!socket || !token) {
      throw new AppError(502, 'panel_websocket_auth_invalid', 'Panel websocket auth payload is missing token or socket URL.');
    }

    const started = Date.now();
    const events: Array<Record<string, unknown>> = [];
    const ws = new WebSocket(socket);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        try {
          ws.close();
        } catch {
          // Ignore close race.
        }
        resolve();
      }, durationSeconds * 1000);

      ws.onopen = () => {
        ws.send(JSON.stringify({ event: 'auth', args: [token] }));
      };
      ws.onmessage = (event) => {
        const payload = typeof event.data === 'string'
          ? safeParseMessage(event.data)
          : { raw: 'non_text_message' };
        if (events.length < MAX_EVENTS) {
          events.push({
            received_at: new Date().toISOString(),
            payload,
          });
        }
      };
      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new AppError(502, 'panel_websocket_stream_failed', 'Failed while streaming websocket events.'));
      };
      ws.onclose = () => {
        clearTimeout(timeout);
        resolve();
      };
    });

    const summary = {
      success: true,
      target_id: targetId,
      duration_seconds: durationSeconds,
      duration_ms: Date.now() - started,
      event_count: events.length,
      source: 'live',
      retrieved_at: new Date().toISOString(),
      events,
    };

    if (persist) {
      await safePersistSample(base44, {
        target_id: targetId,
        timestamp: summary.retrieved_at,
        duration_seconds: durationSeconds,
        event_count: events.length,
        events,
      });
    }

    return Response.json(summary);
  } catch (error) {
    return errorResponse(error);
  }
});
