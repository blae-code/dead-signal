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
    enforceRateLimit(`llm:suggestRconCommands:${actorId}`, 10, 60_000, 'llm_rate_limited');

    const body = await parseJsonBody<{ context?: unknown, serverStatus?: unknown, recentEvents?: unknown }>(req);
    const context = body.context || body.serverStatus || {};
    const recentEvents = body.recentEvents || [];
    
    const status = await base44.integrations.Core.InvokeLLM({
      prompt: `Given this server context: ${JSON.stringify(context)} and recent events: ${JSON.stringify(recentEvents)}, suggest 5 optimal RCON commands to improve performance, manage players, or address issues. Consider: CPU usage, RAM usage, player count, packet loss, recent events, and performance metrics.
Return JSON: { commands: [{command: string, reason: string}] }`,
      response_json_schema: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                command: { type: 'string' },
                reason: { type: 'string' },
                priority: { type: 'string' }
              }
            }
          }
        }
      }
    });

    return Response.json({ success: true, ...status });
  } catch (error) {
    return errorResponse(error);
  }
});