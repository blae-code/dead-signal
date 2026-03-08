import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  enforceRateLimit,
  errorResponse,
  requireAuthenticated,
  requireMethod,
} from './_shared/backend.ts';

Deno.serve(async (req) => {
  try {
    requireMethod(req, 'POST');
    const base44 = createClientFromRequest(req);
    const user = requireAuthenticated(await base44.auth.me()) as { id?: string; email?: string };
    const actorId = user.id || user.email || 'unknown-user';
    enforceRateLimit(`llm:synthesizeIntel:${actorId}`, 10, 60_000, 'llm_rate_limited');

    const events = await base44.entities.ServerEvent.list('-created_date', 50);
    const activities = await base44.entities.ActivityLog.list('-timestamp', 30);

    const intelPrompt = `Synthesize critical intelligence from these recent server events and clan activities:
Events: ${JSON.stringify(events.slice(0, 20).map(e => ({ type: e.event_type, message: e.message, severity: e.severity })))}
Activities: ${JSON.stringify(activities.slice(0, 15).map(a => ({ type: a.activity_type, player: a.clan_member_id })))}

Identify: critical threats, major achievements, patterns, and actionable intelligence.
Return JSON: { critical_alerts: [string], achievements: [string], patterns: [string], actionable_items: [string] }`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: intelPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          critical_alerts: { type: 'array', items: { type: 'string' } },
          achievements: { type: 'array', items: { type: 'string' } },
          patterns: { type: 'array', items: { type: 'string' } },
          actionable_items: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({ success: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
});
