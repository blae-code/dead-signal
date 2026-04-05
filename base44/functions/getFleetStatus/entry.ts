import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import {
  errorResponse,
  fetchPanelServerDetails,
  fetchPanelServerResources,
  listPanelTargets,
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
    const body = await parseJsonBody<{ include_details?: unknown }>(req);
    const includeDetails = body.include_details !== false;
    const targets = listPanelTargets();

    const fleet = await Promise.all(targets.map(async (target) => {
      try {
        const [resources, detailsRaw] = await Promise.all([
          fetchPanelServerResources(target.target_id),
          includeDetails ? fetchPanelServerDetails(target.target_id) : Promise.resolve(null),
        ]);
        const parsed = parsePanelResourceMetrics(resources);
        let detailsSummary: Record<string, unknown> | null = null;
        if (detailsRaw) {
          const details = detailsRaw as Record<string, any>;
          detailsSummary = {
            name: details?.attributes?.name ?? null,
            node: details?.attributes?.node ?? null,
            status: details?.attributes?.status ?? null,
            limits: details?.attributes?.limits ?? null,
          };
        }

        return {
          target_id: target.target_id,
          panel_url: target.panel_url,
          server_id: target.server_id,
          is_default: target.is_default,
          source: 'live',
          metrics: parsed.metrics,
          metric_source: parsed.metric_source,
          metric_available: parsed.metric_available,
          details: detailsSummary,
          error: null,
        };
      } catch (error) {
        return {
          target_id: target.target_id,
          panel_url: target.panel_url,
          server_id: target.server_id,
          is_default: target.is_default,
          source: 'unavailable',
          metrics: null,
          metric_source: null,
          metric_available: null,
          details: null,
          error: error instanceof Error ? error.message : 'target_unavailable',
        };
      }
    }));

    return Response.json({
      success: true,
      retrieved_at: new Date().toISOString(),
      fleet,
      totals: {
        targets: fleet.length,
        live: fleet.filter((item) => item.source === 'live').length,
        unavailable: fleet.filter((item) => item.source !== 'live').length,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
});
