import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  errorResponse,
  fetchPanelServerResources,
  getDefaultPanelTargetId,
  parseJsonBody,
  requireAdmin,
  requireMethod,
} from './_shared/backend.ts';
import { parsePanelResourceMetrics } from './_shared/panelMetrics.ts';

Deno.serve(async (req) => {
  try {
    requireMethod(req, 'POST');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    requireAdmin(user);
    const body = await parseJsonBody<{ target_id?: unknown }>(req);
    const targetId = typeof body.target_id === 'string' && body.target_id.trim()
      ? body.target_id.trim()
      : getDefaultPanelTargetId();

    const data = await fetchPanelServerResources(body.target_id);
    const { metrics, metric_source, metric_available } = parsePanelResourceMetrics(data);

    const payload: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      target_id: targetId,
      panel_state: metrics.state,
    };
    if (metrics.cpu !== null) payload.cpu_percent = metrics.cpu;
    if (metrics.ramUsedMB !== null) payload.ram_used_mb = metrics.ramUsedMB;
    if (metrics.diskMB !== null) payload.disk_used_mb = metrics.diskMB;
    if (metrics.networkRxKB !== null) payload.network_rx_kb = metrics.networkRxKB;
    if (metrics.networkTxKB !== null) payload.network_tx_kb = metrics.networkTxKB;
    if (metrics.playerCount !== null) payload.player_count = metrics.playerCount;
    if (metrics.serverFps !== null) payload.server_fps = metrics.serverFps;
    if (metrics.responseTime !== null) payload.response_time_ms = metrics.responseTime;
    if (metrics.processCount !== null) payload.process_count = metrics.processCount;
    if (metrics.activeConnections !== null) payload.active_connections = metrics.activeConnections;

    const performanceLog = await base44.entities.ServerPerformanceLog.create(payload);

    return Response.json({
      success: true,
      performanceLog,
      target_id: targetId,
      metric_source,
      metric_available,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
