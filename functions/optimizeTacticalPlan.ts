import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const playerLocations = await base44.entities.PlayerLocation.list('-timestamp', 30);
    const missions = await base44.entities.Mission.filter({ status: 'Active' });

    const optimizationPrompt = `Analyze current tactical situation and suggest optimized strategy:
Current Player Positions: ${JSON.stringify(playerLocations.slice(0, 15).map(p => ({ callsign: p.player_callsign, x: p.x, y: p.y, in_vehicle: p.in_vehicle })))}
Active Missions: ${JSON.stringify(missions.map(m => ({ title: m.title, coords: m.objective_coords })))}

Suggest: optimal positioning, regrouping strategies, resource node access, threat avoidance.
Return JSON: { strategy: string, positioning: {callsign: string, recommendation: string}[], resource_nodes: [string], threat_zones: [string] }`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: optimizationPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          strategy: { type: 'string' },
          positioning: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                callsign: { type: 'string' },
                recommendation: { type: 'string' }
              }
            }
          },
          resource_nodes: { type: 'array', items: { type: 'string' } },
          threat_zones: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});