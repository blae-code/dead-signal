import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { summary_type = 'server_events' } = body;

    let sourceData = [];
    if (summary_type === 'server_events') {
      sourceData = await base44.entities.ServerEvent.list('-created_date', 20);
    } else if (summary_type === 'clan_activity') {
      sourceData = await base44.entities.ActivityLog.list('-timestamp', 20);
    }

    const prompt = `Summarize the following ${summary_type} data concisely and professionally. Focus on key insights and actionable intelligence:\n\n${JSON.stringify(sourceData, null, 2)}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });

    const summary = await base44.entities.IntelSummary.create({
      summary_type,
      title: `${summary_type.toUpperCase()} Summary - ${new Date().toLocaleDateString()}`,
      content: response,
      source_entity: summary_type === 'server_events' ? 'ServerEvent' : 'ActivityLog',
      generated_at: new Date().toISOString()
    });

    return Response.json({ summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});