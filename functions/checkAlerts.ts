import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const PANEL_URL = "https://games.bisecthosting.com";
const SERVER_ID = "299b51cf";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const apiKey = Deno.env.get("BISECT_API");
        if (!apiKey) return Response.json({ error: 'BISECT_API secret not set' }, { status: 500 });

        // Fetch current server stats
        const res = await fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}/resources`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'Application/vnd.pterodactyl.v1+json',
            }
        });
        const data = await res.json();
        const stats = data?.attributes?.resources || {};

        const currentValues = {
            cpu: Math.round(stats.cpu_absolute || 0),
            ramUsedMB: Math.round((stats.memory_bytes || 0) / 1024 / 1024),
            diskMB: Math.round((stats.disk_bytes || 0) / 1024 / 1024),
            networkRxKB: Math.round((stats.network_rx_bytes || 0) / 1024),
            networkTxKB: Math.round((stats.network_tx_bytes || 0) / 1024),
        };

        // Load all enabled alert rules
        const rules = await base44.asServiceRole.entities.AlertRule.filter({ enabled: true });
        const now = new Date();
        const triggered = [];

        for (const rule of rules) {
            const actual = currentValues[rule.metric];
            if (actual === undefined) continue;

            const breached = rule.operator === 'gt' ? actual > rule.threshold : actual < rule.threshold;
            if (!breached) continue;

            // Cooldown check
            if (rule.last_triggered_at) {
                const lastTriggered = new Date(rule.last_triggered_at);
                const minutesSince = (now - lastTriggered) / 60000;
                if (minutesSince < (rule.cooldown_minutes || 15)) continue;
            }

            // Log to alert history
            const historyEntry = await base44.asServiceRole.entities.AlertHistory.create({
                rule_id: rule.id,
                rule_name: rule.name,
                metric: rule.metric,
                threshold: rule.threshold,
                actual_value: actual,
                operator: rule.operator,
                notified_inapp: rule.notify_inapp ?? true,
                notified_email: rule.notify_email ?? false,
                email_address: rule.email_address || "",
            });

            // Send email if configured
            if (rule.notify_email && rule.email_address) {
                const opLabel = rule.operator === 'gt' ? 'exceeded' : 'dropped below';
                await base44.asServiceRole.integrations.Core.SendEmail({
                    to: rule.email_address,
                    subject: `[DEAD SIGNAL] Alert: ${rule.name}`,
                    body: `Server alert triggered!\n\nRule: ${rule.name}\nMetric: ${rule.metric}\nThreshold: ${rule.threshold}\nActual: ${actual}\n\nThe metric has ${opLabel} your threshold of ${rule.threshold}.\n\nTime: ${now.toISOString()}`,
                });
            }

            // Update last_triggered_at on the rule
            await base44.asServiceRole.entities.AlertRule.update(rule.id, {
                last_triggered_at: now.toISOString(),
            });

            triggered.push({ rule: rule.name, metric: rule.metric, actual, threshold: rule.threshold });
        }

        return Response.json({ checked: rules.length, triggered, currentValues });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});