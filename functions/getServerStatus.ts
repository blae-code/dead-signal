import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
    errorResponse,
    fetchPanelServerResources,
    getDefaultPanelTargetId,
    listPanelTargets,
    parseJsonBody,
    requireAuthenticated,
    requireMethod,
} from './_shared/backend.ts';
import { parsePanelResourceMetrics } from './_shared/panelMetrics.ts';

Deno.serve(async (req) => {
    try {
        requireMethod(req, 'POST');
        const base44 = createClientFromRequest(req);
        requireAuthenticated(await base44.auth.me());
        const body = await parseJsonBody<{ target_id?: unknown }>(req);
        const targetId = typeof body.target_id === 'string' && body.target_id.trim()
            ? body.target_id.trim()
            : getDefaultPanelTargetId();

        const data = await fetchPanelServerResources(body.target_id);
        const { metrics, metric_source, metric_available } = parsePanelResourceMetrics(data);
        const retrievedAt = new Date().toISOString();

        return Response.json({
            online: metrics.online,
            state: metrics.state,
            cpu: metrics.cpu,
            ramUsedMB: metrics.ramUsedMB,
            diskMB: metrics.diskMB,
            uptime: metrics.uptimeText,
            uptimeSeconds: metrics.uptimeSeconds,
            networkRxKB: metrics.networkRxKB,
            networkTxKB: metrics.networkTxKB,
            playerCount: metrics.playerCount,
            serverFps: metrics.serverFps,
            responseTime: metrics.responseTime,
            processCount: metrics.processCount,
            activeConnections: metrics.activeConnections,
            retrieved_at: retrievedAt,
            target_id: targetId,
            metric_source,
            metric_available,
            available_targets: listPanelTargets(),
        });

    } catch (error) {
        return errorResponse(error);
    }
});
