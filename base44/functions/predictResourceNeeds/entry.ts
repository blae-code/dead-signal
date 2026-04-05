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
    enforceRateLimit(`llm:predictResourceNeeds:${actorId}`, 10, 60_000, 'llm_rate_limited');

    const storage = await base44.entities.ClanStorage.list('', 50);
    const analytics = await base44.entities.ClanAnalytics.list('-date', 30);

    const forecastPrompt = `Predict future clan resource needs based on current inventory and activity trends:
Current Storage: ${JSON.stringify(storage.map(s => ({ location: s.location_name, items: s.items?.length || 0 })))}
Recent Activity Trends: ${JSON.stringify(analytics.slice(0, 14).map(a => ({ date: a.date, playtime: a.total_playtime_hours, missions: a.missions_completed })))}

Forecast: critical shortages, surplus items, seasonal needs, and supply chain recommendations.
Return JSON: { shortages: [{item: string, urgency: "LOW"|"MEDIUM"|"HIGH", days_until_shortage: number}], surplus: [string], recommendations: [string], forecast_days: number }`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: forecastPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          shortages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                item: { type: 'string' },
                urgency: { type: 'string' },
                days_until_shortage: { type: 'number' }
              }
            }
          },
          surplus: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'string' } },
          forecast_days: { type: 'number' }
        }
      }
    });

    return Response.json({ success: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
});
