import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import {
  errorResponse,
  requireAdmin,
  requireMethod,
} from "./_shared/backend.ts";

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    requireAdmin(await base44.auth.me());

    const logs = await base44.entities.ServerEvent.list("-created_date", 100);
    if (!Array.isArray(logs) || logs.length === 0) {
      return Response.json({
        critical_issues: [],
        performance_concerns: [],
        resource_alerts: [],
        patterns: [],
        recommendations: ["No recent logs available for analysis."],
        overall_severity: "LOW",
      });
    }

    const logText = logs
      .map((entry) => `[${entry.severity || "INFO"}] ${entry.event_type || "Event"}: ${entry.message || ""}`)
      .join("\n");

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
        type: "object",
        properties: {
          critical_issues: { type: "array", items: { type: "string" } },
          performance_concerns: { type: "array", items: { type: "string" } },
          resource_alerts: { type: "array", items: { type: "string" } },
          patterns: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          overall_severity: { type: "string" },
        },
      },
    });

    await base44.entities.IntelSummary.create({
      analysis_type: "Log Analysis",
      findings: JSON.stringify(analysis),
      severity: analysis?.overall_severity || "LOW",
      timestamp: new Date().toISOString(),
    }).catch(() => null);

    return Response.json({
      ...analysis,
      analyzed_at: new Date().toISOString(),
      analyzed_entries: logs.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
