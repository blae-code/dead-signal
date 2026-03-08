import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";
import {
  AppError,
  errorResponse,
  parseJsonBody,
  requireAdmin,
  requireMethod,
} from "./_shared/backend.ts";

const isScheduledTime = (): boolean => {
  const now = new Date();
  const hour = now.getUTCHours();
  const day = now.getUTCDay();
  return (day === 2 || day === 6) && hour === 3;
};

Deno.serve(async (req) => {
  try {
    requireMethod(req, "POST");
    const base44 = createClientFromRequest(req);
    requireAdmin(await base44.auth.me());

    const body = await parseJsonBody<{
      restartType?: unknown;
      cpuThreshold?: unknown;
      memThreshold?: unknown;
      gracefulWait?: unknown;
      dry_run?: unknown;
    }>(req);
    const restartType = body.restartType === "performance" || body.restartType === "scheduled"
      ? body.restartType
      : "scheduled";
    const cpuThreshold = Number.isFinite(Number(body.cpuThreshold)) ? Number(body.cpuThreshold) : 85;
    const memThreshold = Number.isFinite(Number(body.memThreshold)) ? Number(body.memThreshold) : 90;
    const gracefulWait = Math.max(5, Math.min(900, Number(body.gracefulWait) || 300));
    const dryRun = body.dry_run === true;

    const statusRes = await base44.functions.invoke("getServerStatus", {});
    const status = statusRes?.data || null;
    if (!status || status.error) {
      throw new AppError(502, "status_unavailable", "Could not fetch server status.");
    }

    const cpu = Number(status.cpu);
    const ramUsedMB = Number(status.ramUsedMB);
    const memoryPercent = Number.isFinite(ramUsedMB) ? ramUsedMB / 1024 : 0;
    const shouldRestart = (
      restartType === "performance" && (
        (Number.isFinite(cpu) && cpu > cpuThreshold) ||
        (Number.isFinite(memoryPercent) && memoryPercent > memThreshold)
      )
    ) || (restartType === "scheduled" && isScheduledTime());

    if (!shouldRestart) {
      return Response.json({
        restart_needed: false,
        dry_run: dryRun,
        cpu: Number.isFinite(cpu) ? cpu : null,
        memory_gb: Number.isFinite(ramUsedMB) ? (ramUsedMB / 1024).toFixed(1) : null,
        reason: "Restart conditions not met.",
      });
    }

    let restartResult: unknown = null;
    if (!dryRun) {
      await base44.functions.invoke("sendRconCommand", {
        command: `say Server restarting in ${gracefulWait}s for maintenance. Save your progress!`,
      }).catch(() => null);
      await new Promise((resolve) => setTimeout(resolve, gracefulWait * 1000));
      restartResult = await base44.functions.invoke("sendRconCommand", { command: "restart" }).catch(() => null);
    }

    await base44.entities.ScheduledCommand.create({
      command_type: "SERVER_RESTART",
      trigger: restartType,
      status: dryRun ? "DRY_RUN" : (restartResult as any)?.data?.success ? "SUCCESS" : "PENDING",
      cpu_before: Number.isFinite(cpu) ? cpu : null,
      memory_before: Number.isFinite(ramUsedMB) ? ramUsedMB / 1024 : null,
      timestamp: new Date().toISOString(),
    }).catch(() => null);

    await base44.entities.ServerEvent.create({
      event_type: "Server Restart",
      message: `${dryRun ? "Dry-run " : ""}${restartType} restart processed (CPU: ${
        Number.isFinite(cpu) ? cpu.toFixed(0) : "n/a"
      }%, RAM: ${Number.isFinite(ramUsedMB) ? (ramUsedMB / 1024).toFixed(1) : "n/a"}GB)`,
      severity: "WARN",
    }).catch(() => null);

    return Response.json({
      success: true,
      restart_initiated: !dryRun,
      dry_run: dryRun,
      restart_type: restartType,
      graceful_wait_seconds: gracefulWait,
      metrics_before: {
        cpu: Number.isFinite(cpu) ? cpu : null,
        memory_gb: Number.isFinite(ramUsedMB) ? (ramUsedMB / 1024).toFixed(1) : null,
      },
      scheduled_time_window_utc: "Tue/Sat 03:00 UTC",
      executed_at: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(error);
  }
});
