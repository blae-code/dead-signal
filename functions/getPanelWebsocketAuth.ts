import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  errorResponse,
  fetchPanelWebsocketAuth,
  getDefaultPanelTargetId,
  parseJsonBody,
  requireAdmin,
  requireMethod,
} from './_shared/backend.ts';

Deno.serve(async (req) => {
  try {
    requireMethod(req, 'POST');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    requireAdmin(user);

    const body = await parseJsonBody<{ target_id?: unknown }>(req);
    const targetId = typeof body.target_id === 'string' && body.target_id.trim()
      ? body.target_id.trim()
      : getDefaultPanelTargetId();
    const data = await fetchPanelWebsocketAuth(targetId) as Record<string, any>;
    const attributes = data?.data?.attributes || {};

    return Response.json({
      success: true,
      target_id: targetId,
      websocket: {
        token: typeof attributes.token === 'string' ? attributes.token : null,
        socket: typeof attributes.socket === 'string' ? attributes.socket : null,
      },
      retrieved_at: new Date().toISOString(),
      source: 'live',
    });
  } catch (error) {
    return errorResponse(error);
  }
});
