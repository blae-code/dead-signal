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

        // Single call — resources endpoint has everything we need
        const res = await fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}/resources`, { headers });
        const text = await res.text();

        if (!text.trim().startsWith('{')) {
            return Response.json({ error: `Panel returned unexpected response (${res.status})`, preview: text.substring(0, 300) }, { status: 502 });
        }

        const data = JSON.parse(text);

        if (data.errors) {
            return Response.json({ error: data.errors?.[0]?.detail || 'Panel API error' }, { status: 400 });
        }

        const state = data?.attributes?.current_state;
        const stats = data?.attributes?.resources || {};

        const cpuPct = Math.round(stats.cpu_absolute || 0);
        const ramUsedMB = Math.round((stats.memory_bytes || 0) / 1024 / 1024);
        const diskMB = Math.round((stats.disk_bytes || 0) / 1024 / 1024);

        const uptimeMs = stats.uptime || 0;
        const uptimeSec = Math.floor(uptimeMs / 1000);
        const hh = String(Math.floor(uptimeSec / 3600)).padStart(2, '0');
        const mm = String(Math.floor((uptimeSec % 3600) / 60)).padStart(2, '0');
        const ss = String(uptimeSec % 60).padStart(2, '0');

        return Response.json({
            online: state === 'running',
            state,
            cpu: cpuPct,
            ramUsedMB,
            diskMB,
            uptime: `${hh}:${mm}:${ss}`,
            networkRxKB: Math.round((stats.network_rx_bytes || 0) / 1024),
            networkTxKB: Math.round((stats.network_tx_bytes || 0) / 1024),
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});