import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  AppError,
  errorResponse,
  getDefaultPanelTargetId,
  parseJsonBody,
  requireAdmin,
  requireMethod,
  sendPanelPowerSignal,
} from './_shared/backend.ts';

const safeCreateAutomationRun = async (base44: any, payload: Record<string, unknown>): Promise<void> => {
  try {
    const entity = base44?.asServiceRole?.entities?.AutomationRun;
    if (!entity) {
      return;
    }
    await entity.create(payload);
  } catch {
    // Ignore unavailable entity to keep automation execution resilient.
  }
};

Deno.serve(async (req) => {
  try {
    requireMethod(req, 'POST');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    requireAdmin(user);

    const body = await parseJsonBody<{
      target_id?: unknown;
      dry_run?: unknown;
      include_external?: unknown;
      auto_recover_if_offline?: unknown;
    }>(req);
    const targetId = typeof body.target_id === 'string' && body.target_id.trim()
      ? body.target_id.trim()
      : getDefaultPanelTargetId();
    const dryRun = body.dry_run === true;
    const includeExternal = body.include_external !== false;
    const autoRecoverIfOffline = body.auto_recover_if_offline === true;
    const started = Date.now();

    const syncResponse = await base44.functions.invoke('syncLiveData', {
      target_id: targetId,
      include_external: includeExternal,
      include_files: false,
      persist: !dryRun,
    });
    if (!syncResponse?.data?.success) {
      throw new AppError(502, 'sync_live_data_failed', 'syncLiveData failed during automation cycle.');
    }

    const alertResponse = await base44.functions.invoke('checkAlerts', {
      target_id: targetId,
      dry_run: dryRun,
      run_remediation: true,
    });
    if (!alertResponse?.data) {
      throw new AppError(502, 'check_alerts_failed', 'checkAlerts failed during automation cycle.');
    }

    const metrics = syncResponse.data?.metrics?.values || {};
    const recoveryActions: Array<Record<string, unknown>> = [];
    const recoveryEnabled = (Deno.env.get('AUTOMATION_ENABLE_HEALTH_POWER_RECOVERY') || 'false').toLowerCase() === 'true';
    if (!dryRun && recoveryEnabled && autoRecoverIfOffline && metrics.online === false) {
      await sendPanelPowerSignal('restart', targetId);
      recoveryActions.push({
        action: 'restart',
        reason: 'server_offline',
        target_id: targetId,
      });
    }

    const summary = {
      success: true,
      target_id: targetId,
      dry_run: dryRun,
      duration_ms: Date.now() - started,
      sync: {
        duration_ms: syncResponse.data?.duration_ms ?? null,
        source_summary: syncResponse.data?.source_summary ?? null,
      },
      alerts: {
        checked: alertResponse.data?.checked ?? 0,
        triggered_count: Array.isArray(alertResponse.data?.triggered) ? alertResponse.data.triggered.length : 0,
        triggered: alertResponse.data?.triggered ?? [],
        skipped: alertResponse.data?.skipped ?? [],
      },
      recovery_actions: recoveryActions,
      executed_at: new Date().toISOString(),
    };

    if (!dryRun) {
      await safeCreateAutomationRun(base44, summary);
    }

    return Response.json(summary);
  } catch (error) {
    return errorResponse(error);
  }
});
