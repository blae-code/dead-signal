import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const PANEL_URL = "https://games.bisecthosting.com";
const SERVER_ID = "299b51cf";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const apiKey = Deno.env.get("BISECT_API");
        if (!apiKey) {
            return Response.json({ error: 'BISECT_API secret not set' }, { status: 500 });
        }

        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'Application/vnd.pterodactyl.v1+json',
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        let resourcesData, detailsData;
        try {
            const [resourcesRes, detailsRes] = await Promise.all([
                fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}/resources`, { headers, signal: controller.signal }),
                fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}`, { headers, signal: controller.signal }),
            ]);
            clearTimeout(timeout);

            const [rt, dt] = await Promise.all([resourcesRes.text(), detailsRes.text()]);

            // Debug: return raw responses if they're not JSON
            if (!rt.trim().startsWith('{')) {
                return Response.json({ error: `Resources endpoint returned non-JSON`, preview: rt.substring(0, 300), status: resourcesRes.status });
            }
            if (!dt.trim().startsWith('{')) {
                return Response.json({ error: `Details endpoint returned non-JSON`, preview: dt.substring(0, 300), status: detailsRes.status });
            }

            resourcesData = JSON.parse(rt);
            detailsData = JSON.parse(dt);
        } catch (fetchErr) {
            clearTimeout(timeout);
            return Response.json({ error: `Fetch failed: ${fetchErr.message}` }, { status: 502 });
        }

        const state = resourcesData?.attributes?.current_state;
        const stats = resourcesData?.attributes?.resources || {};
        const details = detailsData?.attributes || {};

        const ramUsed = stats.memory_bytes || 0;
        const ramLimit = (details.limits?.memory || 0) * 1024 * 1024;
        const ramPct = ramLimit > 0 ? Math.round((ramUsed / ramLimit) * 100) : 0;
        const cpuPct = Math.round(stats.cpu_absolute || 0);

        const uptimeMs = stats.uptime || 0;
        const uptimeSec = Math.floor(uptimeMs / 1000);
        const hh = String(Math.floor(uptimeSec / 3600)).padStart(2, '0');
        const mm = String(Math.floor((uptimeSec % 3600) / 60)).padStart(2, '0');
        const ss = String(uptimeSec % 60).padStart(2, '0');

        return Response.json({
            online: state === 'running',
            state,
            name: details.name || 'HumanitZ Server',
            cpu: cpuPct,
            ram: ramPct,
            ramUsedMB: Math.round(ramUsed / 1024 / 1024),
            ramLimitMB: Math.round(ramLimit / 1024 / 1024),
            uptime: `${hh}:${mm}:${ss}`,
            disk: Math.round((stats.disk_bytes || 0) / 1024 / 1024),
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});