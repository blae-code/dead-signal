import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch recent performance logs
    const logs = await base44.entities.ServerPerformanceLog.list('-timestamp', 100);
    if (logs.length < 10) return Response.json({ anomalies: [], message: 'Insufficient data' });

    // Prepare data for AI analysis
    const analysisPrompt = `Analyze these server performance logs for anomalies. Look for unusual patterns like:
- Sudden CPU/RAM spikes
- Unusual network traffic patterns
- Suspicious resource patterns indicating attacks
- Performance degradation trends

Logs (last 100 entries): ${JSON.stringify(logs.slice(0, 50).map(l => ({
      timestamp: l.timestamp,
      cpu: l.cpu_percent,
      ram_mb: l.ram_used_mb,
      disk_mb: l.disk_used_mb,
      players: l.player_count,
      fps: l.server_fps
    })))}

Return a JSON object with: { anomalies: [{type, severity, description, timestamp}], risk_level: "NORMAL"|"ELEVATED"|"CRITICAL" }`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          anomalies: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                severity: { type: 'string' },
                description: { type: 'string' },
                timestamp: { type: 'string' }
              }
            }
          },
          risk_level: { type: 'string' }
        }
      }
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});