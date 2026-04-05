import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const logs = await base44.entities.ServerEvent.list('-created_date', 100);
    
    if (!logs || logs.length === 0) {
      return Response.json({ issues: [], severity: 'LOW' });
    }

    const logText = logs.map(l => `[${l.severity}] ${l.event_type}: ${l.message}`).join('\n');

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze these server logs and identify:
1. Critical issues that need immediate attention
2. Performance bottlenecks
3. Resource utilization patterns
4. Recurring errors or warnings
5. Recommended actions

Logs:
${logText}

Respond in JSON format:
{
  "critical_issues": [...],
  "performance_concerns": [...],
  "resource_alerts": [...],
  "patterns": [...],
  "recommendations": [...],
  "overall_severity": "LOW|MEDIUM|HIGH|CRITICAL"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          critical_issues: { type: 'array', items: { type: 'string' } },
          performance_concerns: { type: 'array', items: { type: 'string' } },
          resource_alerts: { type: 'array', items: { type: 'string' } },
          patterns: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'string' } },
          overall_severity: { type: 'string' }
        }
      }
    });

    // Store analysis results
    await base44.entities.IntelSummary.create({
      analysis_type: 'Log Analysis',
      findings: JSON.stringify(analysis),
      severity: analysis.overall_severity,
      timestamp: new Date().toISOString()
    }).catch(() => {});

    return Response.json(analysis);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});