import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
    evaluateRconCommandPolicy,
    errorResponse,
    fetchPanelServerResources,
    getDefaultPanelTargetId,
    parseJsonBody,
    requireAdmin,
    requireMethod,
    sendPanelCommand,
} from './_shared/backend.ts';
import { parsePanelResourceMetrics } from './_shared/panelMetrics.ts';

const isBreached = (operator: string, actual: number, threshold: number): boolean => {
    if (operator === 'gt') return actual > threshold;
    if (operator === 'lt') return actual < threshold;
    if (operator === 'gte') return actual >= threshold;
    if (operator === 'lte') return actual <= threshold;
    if (operator === 'eq') return actual === threshold;
    if (operator === 'neq') return actual !== threshold;
    return false;
};

const mapWithConcurrency = async <T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
    if (items.length === 0) return [];
    const workerCount = Math.max(1, Math.min(concurrency, items.length));
    const results = new Array<R>(items.length);
    let cursor = 0;

    await Promise.all(Array.from({ length: workerCount }).map(async () => {
        while (true) {
            const index = cursor;
            cursor += 1;
            if (index >= items.length) break;
            results[index] = await mapper(items[index], index);
        }
    }));

    return results;
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
            run_remediation?: unknown;
        }>(req);
        const targetId = typeof body.target_id === 'string' && body.target_id.trim()
            ? body.target_id.trim()
            : getDefaultPanelTargetId();
        const dryRun = body.dry_run === true;
        const runRemediation = body.run_remediation !== false;

        const data = await fetchPanelServerResources(body.target_id);
        const { metrics, metric_source, metric_available } = parsePanelResourceMetrics(data);
        const currentValues: Record<string, number | null> = {
            cpu: metrics.cpu,
            ramUsedMB: metrics.ramUsedMB,
            diskMB: metrics.diskMB,
            networkRxKB: metrics.networkRxKB,
            networkTxKB: metrics.networkTxKB,
            playerCount: metrics.playerCount,
            serverFps: metrics.serverFps,
            responseTime: metrics.responseTime,
            processCount: metrics.processCount,
            activeConnections: metrics.activeConnections,
        };

        // Load all enabled alert rules
        const rules = await base44.asServiceRole.entities.AlertRule.filter({ enabled: true });
        const now = new Date();
        const candidates = [] as Array<{ rule: Record<string, any>; actual: number; threshold: number }>;
        const skipped = [] as any[];

        for (const rule of rules) {
            const actual = currentValues[rule.metric];
            if (typeof actual !== 'number' || !Number.isFinite(actual)) {
                skipped.push({
                    rule: rule.name,
                    metric: rule.metric,
                    reason: 'metric_unavailable',
                });
                continue;
            }

            const threshold = Number(rule.threshold);
            if (!Number.isFinite(threshold)) {
                skipped.push({
                    rule: rule.name,
                    metric: rule.metric,
                    reason: 'invalid_threshold',
                });
                continue;
            }

            const breached = isBreached(rule.operator, actual, threshold);
            if (!breached) continue;

            // Cooldown check
            if (rule.last_triggered_at) {
                const lastTriggered = new Date(rule.last_triggered_at);
                const minutesSince = (now.getTime() - lastTriggered.getTime()) / 60000;
                if (minutesSince < (rule.cooldown_minutes || 15)) continue;
            }

            candidates.push({ rule, actual, threshold });
        }

        const alertConcurrencyRaw = Number(Deno.env.get('ALERT_EXECUTION_CONCURRENCY') || '4');
        const alertConcurrency = Number.isFinite(alertConcurrencyRaw) && alertConcurrencyRaw > 0
            ? Math.floor(alertConcurrencyRaw)
            : 4;
        const triggered = await mapWithConcurrency(candidates, alertConcurrency, async ({ rule, actual, threshold }) => {
            const item: Record<string, unknown> = {
                rule: rule.name,
                metric: rule.metric,
                actual,
                threshold,
                operator: rule.operator,
                target_id: targetId,
            };

            if (!dryRun) {
                const sideEffects: Promise<unknown>[] = [
                    base44.asServiceRole.entities.AlertHistory.create({
                        rule_id: rule.id,
                        rule_name: rule.name,
                        metric: rule.metric,
                        threshold,
                        actual_value: actual,
                        operator: rule.operator,
                        notified_inapp: rule.notify_inapp ?? true,
                        notified_email: rule.notify_email ?? false,
                        email_address: rule.email_address || "",
                        target_id: targetId,
                        source: 'live',
                    }),
                    base44.asServiceRole.entities.AlertRule.update(rule.id, {
                        last_triggered_at: now.toISOString(),
                    }),
                ];

                if (rule.notify_email && rule.email_address) {
                    const opLabel = rule.operator === 'gt' ? 'exceeded' : 'dropped below';
                    sideEffects.push(
                        base44.asServiceRole.integrations.Core.SendEmail({
                            to: rule.email_address,
                            subject: `[DEAD SIGNAL] Alert: ${rule.name}`,
                            body: `Server alert triggered!\n\nRule: ${rule.name}\nMetric: ${rule.metric}\nThreshold: ${threshold}\nActual: ${actual}\n\nThe metric has ${opLabel} your threshold of ${threshold}.\n\nTime: ${now.toISOString()}`,
                        }),
                    );
                }

                await Promise.allSettled(sideEffects);
            }

            const remediationCommand = typeof rule.remediation_command === 'string'
                ? rule.remediation_command.trim()
                : '';
            if (!dryRun && runRemediation && rule.auto_remediate === true && remediationCommand) {
                const policy = evaluateRconCommandPolicy(remediationCommand);
                const allowSensitiveAutoRemediation = (Deno.env.get('AUTOMATION_ALLOW_SENSITIVE_REMEDIATION') || 'false')
                    .toLowerCase() === 'true';
                if (policy.blocked || (policy.sensitive && !allowSensitiveAutoRemediation)) {
                    item.remediation = {
                        attempted: false,
                        success: false,
                        command: remediationCommand,
                        error: policy.blocked
                            ? policy.reason || 'remediation_blocked_by_policy'
                            : 'sensitive_remediation_disallowed',
                    };
                    return item;
                }
                try {
                    await sendPanelCommand(remediationCommand, targetId);
                    item.remediation = {
                        attempted: true,
                        success: true,
                        command: remediationCommand,
                    };
                } catch (error) {
                    item.remediation = {
                        attempted: true,
                        success: false,
                        command: remediationCommand,
                        error: error instanceof Error ? error.message : 'remediation_failed',
                    };
                }
            }

            return item;
        });

        return Response.json({
            checked: rules.length,
            triggered,
            skipped,
            currentValues,
            metric_source,
            metric_available,
            target_id: targetId,
            run_mode: dryRun ? 'dry_run' : 'live',
            retrieved_at: now.toISOString(),
        });
    } catch (error) {
        return errorResponse(error);
    }
});
