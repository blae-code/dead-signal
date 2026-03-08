import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
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
    const body = await parseJsonBody<{ sample_size?: unknown }>(req);
    const actorId = user?.id || user?.email || 'unknown-admin';
    enforceRateLimit(`llm:anomalyDetection:${actorId}`, 10, 60_000, 'llm_rate_limited');

    const sampleSizeRaw = Number(body.sample_size);
    const sampleSize = Number.isFinite(sampleSizeRaw) && sampleSizeRaw > 0
      ? Math.min(100, Math.floor(sampleSizeRaw))
      : 50;

    // Fetch recent performance logs
    const logs = await base44.entities.ServerPerformanceLog.list('-timestamp', 100);
    if (logs.length < 10) {
      return Response.json({
        success: true,
        anomalies: [],
        message: 'Insufficient data for anomaly analysis.',
      });
    }

    // Prepare data for AI analysis
    const analysisPrompt = `Analyze these server performance logs for anomalies. Look for unusual patterns like:
- Sudden CPU/RAM spikes
- Unusual network traffic patterns
- Suspicious resource patterns indicating attacks
- Performance degradation trends

Logs (last 100 entries): ${JSON.stringify(logs.slice(0, sampleSize).map(l => ({
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

    return Response.json({
      success: true,
      ...result,
      analyzed_entries: Math.min(logs.length, sampleSize),
    });
  } catch (error) {
    return errorResponse(error);
  }
});
