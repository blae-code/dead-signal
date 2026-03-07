import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const playerActivities = await base44.entities.ActivityLog.filter(
      { clan_member_id: user.email },
      '-timestamp',
      100
    );
    const playerStats = await base44.entities.ClanMember.filter(
      { user_email: user.email }
    );

    const summaryPrompt = `Create a personalized weekly activity summary for this clan member:
Activities: ${JSON.stringify(playerActivities.slice(0, 30).map(a => ({ type: a.activity_type, timestamp: a.timestamp })))}
Stats: ${JSON.stringify(playerStats[0] || {})}

Include: achievements unlocked, contribution highlights, performance metrics, and personalized encouragement.
Return JSON: { summary: string, highlights: [string], performance_score: number, recommendations: [string] }`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: summaryPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          highlights: { type: 'array', items: { type: 'string' } },
          performance_score: { type: 'number' },
          recommendations: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});