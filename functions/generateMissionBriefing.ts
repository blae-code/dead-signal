import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { missionTitle, objectiveCoords } = await req.json();
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

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});