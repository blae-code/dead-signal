import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  AppError,
  enforceRateLimit,
  errorResponse,
  parseJsonBody,
  requireAuthenticated,
  requireMethod,
} from './_shared/backend.ts';

Deno.serve(async (req) => {
  try {
    requireMethod(req, 'POST');
    const base44 = createClientFromRequest(req);
    const user = requireAuthenticated(await base44.auth.me()) as { id?: string; email?: string };
    const actorId = user.id || user.email || 'unknown-user';
    enforceRateLimit(`llm:generateMissionBriefing:${actorId}`, 12, 60_000, 'llm_rate_limited');

    const body = await parseJsonBody<{ missionTitle?: unknown; objectiveCoords?: unknown }>(req);
    if (typeof body.missionTitle !== 'string' || !body.missionTitle.trim()) {
      throw new AppError(400, 'invalid_mission_title', 'missionTitle must be a non-empty string.');
    }
    const missionTitle = body.missionTitle.trim().slice(0, 200);
    const objectiveCoords = typeof body.objectiveCoords === 'string' && body.objectiveCoords.trim()
      ? body.objectiveCoords.trim().slice(0, 120)
      : 'Unknown';

    const players = await base44.entities.PlayerLocation.list('-timestamp', 50);
    const storage = await base44.entities.ClanStorage.list('', 10);

    const briefingPrompt = `Create an immersive, detailed mission briefing for: "${missionTitle}"
Target Coordinates: ${objectiveCoords}
Current Player Positions: ${JSON.stringify(players.slice(0, 10).map(p => ({ callsign: p.player_callsign, x: p.x, y: p.y })))}
Available Resources: ${JSON.stringify(storage.map(s => ({ location: s.location_name, items: s.items?.length || 0 })))}

Generate a tactical briefing that includes: objective summary, tactical approach, resource recommendations, threat assessment. Make it immersive and engaging for a tactical game.
Return JSON: { briefing: string, tactical_plan: string, resource_recommendations: [string] }`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: briefingPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          briefing: { type: 'string' },
          tactical_plan: { type: 'string' },
          resource_recommendations: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({ success: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
});
