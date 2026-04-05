import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  enforceRateLimit,
  errorResponse,
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
    enforceRateLimit(`llm:playerBehaviorAnalysis:${actorId}`, 8, 60_000, 'llm_rate_limited');

    // Fetch activity logs
    const activities = await base44.entities.ActivityLog.list('-timestamp', 200);
    
    const analysisPrompt = `Analyze these player activity logs for potential toxic behavior, griefing, or cheating patterns:
${JSON.stringify(activities.slice(0, 50).map(a => ({
      player: a.clan_member_id,
      type: a.activity_type,
      timestamp: a.timestamp
    })))}

Return JSON: { flagged_players: [{player_id: string, concern: string, severity: "LOW"|"MEDIUM"|"HIGH", evidence: string}], patterns: [string] }`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          flagged_players: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                player_id: { type: 'string' },
                concern: { type: 'string' },
                severity: { type: 'string' },
                evidence: { type: 'string' }
              }
            }
          },
          patterns: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({ success: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
});
