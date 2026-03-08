import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import {
  AppError,
  errorResponse,
  parseJsonBody,
  requireAdmin,
  requireMethod,
} from "./_shared/backend.ts";

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    requireAdmin(await base44.auth.me());

    const body = await parseJsonBody<{
      alertType?: unknown;
      severity?: unknown;
      metric?: unknown;
      value?: unknown;
      dry_run?: unknown;
    }>(req);
    const alertType = typeof body.alertType === "string" ? body.alertType.trim() : "";
    if (!alertType) {
      throw new AppError(400, "invalid_alert_type", "alertType is required.");
    }
    const metric = typeof body.metric === "string" ? body.metric.trim().toLowerCase() : "";
    const value = Number(body.value);
    const numericValue = Number.isFinite(value) ? value : 0;
    const dryRun = body.dry_run === true;
    const actions: Array<Record<string, unknown>> = [];
    const executed: Array<Record<string, unknown>> = [];

    if (alertType === "HIGH_MEMORY" || (metric === "ram" && numericValue > 80)) {
      actions.push({ action: "CLEAR_TEMP_FILES", command: "say Clearing temporary files to free memory...", rcon: true });
      actions.push({ action: "RESTART_SERVICE", service: "game_service", notify: true });
    }
    if (alertType === "HIGH_CPU" || (metric === "cpu" && numericValue > 90)) {
      actions.push({ action: "REDUCE_SIMULATION", command: "performance_mode high", rcon: true });
      actions.push({ action: "MONITOR_CLOSELY", escalate_if_sustained_ms: 120_000 });
    }
    if (alertType === "HIGH_DISK" || (metric === "disk" && numericValue > 85)) {
      actions.push({ action: "CLEANUP_LOGS", command: "cleanup_old_logs 7d", rcon: true });
      actions.push({ action: "ARCHIVE_BACKUPS", notify: true });
    }
    if (alertType === "PACKET_LOSS" && numericValue > 5) {
      actions.push({ action: "DIAGNOSE_NETWORK", command: "netstat", escalate: true });
    }

    if (!dryRun) {
      for (const action of actions) {
        let rconResult: Record<string, unknown> | null = null;
        if (action.rcon === true && typeof action.command === "string") {
          const response = await base44.functions.invoke("sendRconCommand", { command: action.command }).catch(() => null);
          rconResult = response?.data ?? null;
        }
        await base44.entities.ServerEvent.create({
          event_type: "Auto Response",
          message: `Automated action: ${String(action.action)} triggered by ${alertType}`,
          severity: "INFO",
          related_alert: alertType,
        }).catch(() => null);
        executed.push({
          ...action,
          executed: true,
          rcon_result: rconResult,
        });
      }
    }

    return Response.json({
      success: true,
      dry_run: dryRun,
      alert_type: alertType,
      severity: typeof body.severity === "string" ? body.severity : null,
      metric,
      value: numericValue,
      actions_planned: actions,
      actions_executed: executed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
});
