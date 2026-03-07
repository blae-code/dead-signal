import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const PANEL_URL = "https://panel.bisecthosting.com";
const SERVER_ID = "299b51cf";

// Helper to safely parse JSON from a fetch response, with better error context
async function safeJson(res) {
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        throw new Error(`Panel returned non-JSON (status ${res.status}): ${text.substring(0, 200)}`);
    }
}

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

        // Fetch server resources (cpu, ram, uptime, state)
        const resourcesRes = await fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}/resources`, { headers });
        const resourcesData = await safeJson(resourcesRes);

        // Fetch server details (name, description)
        const detailsRes = await fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}`, { headers });
        const detailsData = await safeJson(detailsRes);

        const state = resourcesData?.attributes?.current_state;
        const stats = resourcesData?.attributes?.resources || {};
        const details = detailsData?.attributes || {};

        // Convert bytes to percentage using limits
        const ramUsed = stats.memory_bytes || 0;
        const ramLimit = (details.limits?.memory || 0) * 1024 * 1024; // MB -> bytes
        const ramPct = ramLimit > 0 ? Math.round((ramUsed / ramLimit) * 100) : 0;

        const cpuPct = Math.round(stats.cpu_absolute || 0);

        // Uptime from milliseconds
        const uptimeMs = stats.uptime || 0;
        const uptimeSec = Math.floor(uptimeMs / 1000);
        const hh = String(Math.floor(uptimeSec / 3600)).padStart(2, '0');
        const mm = String(Math.floor((uptimeSec % 3600) / 60)).padStart(2, '0');
        const ss = String(uptimeSec % 60).padStart(2, '0');
        const uptimeStr = `${hh}:${mm}:${ss}`;

        return Response.json({
            online: state === 'running',
            state,
            name: details.name || 'HumanitZ Server',
            cpu: cpuPct,
            ram: ramPct,
            ramUsedMB: Math.round(ramUsed / 1024 / 1024),
            ramLimitMB: Math.round(ramLimit / 1024 / 1024),
            uptime: uptimeStr,
            disk: Math.round((stats.disk_bytes || 0) / 1024 / 1024),
            network_rx: Math.round((stats.network_rx_bytes || 0) / 1024),
            network_tx: Math.round((stats.network_tx_bytes || 0) / 1024),
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});