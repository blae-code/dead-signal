import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  AppError,
  enforceRateLimit,
  errorResponse,
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
    const actorId = user?.id || user?.email || 'unknown-admin';
    enforceRateLimit(`llm:generateAnnouncement:${actorId}`, 12, 60_000, 'llm_rate_limited');

    const body = await parseJsonBody<{ topic?: unknown; context?: unknown }>(req);
    if (typeof body.topic !== 'string' || !body.topic.trim()) {
      throw new AppError(400, 'invalid_topic', 'topic must be a non-empty string.');
    }
    const topic = body.topic.trim().slice(0, 250);
    const context = typeof body.context === 'string' ? body.context.trim().slice(0, 2_500) : '';

    const announcementPrompt = `Draft an engaging and professional clan announcement for: "${topic}"
Context: ${context}

Create something that captures attention, communicates clearly, and maintains the Dead Signal tactical atmosphere. Be concise but impactful.
Return JSON: { title: string, body: string, tone: "Emergency"|"Intel"|"Ops"|"General"|"Maintenance", suggested_actions: [string] }`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: announcementPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
          tone: { type: 'string' },
          suggested_actions: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({ success: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
});
