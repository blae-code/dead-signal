import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const PANEL_URL = "https://panel.bisecthosting.com";
const SERVER_ID = "299b51cf";

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { command } = await req.json();
        if (!command) {
            return Response.json({ error: 'command is required' }, { status: 400 });
        }

        const apiKey = Deno.env.get("BISECT_API");
        if (!apiKey) {
            return Response.json({ error: 'BISECT_API secret not set' }, { status: 500 });
        }

        const response = await fetch(`${PANEL_URL}/api/client/servers/${SERVER_ID}/command`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'Application/vnd.pterodactyl.v1+json',
            },
            body: JSON.stringify({ command }),
        });

        // Pterodactyl returns 204 No Content on success
        if (response.status === 204) {
            return Response.json({ success: true, output: `Command sent: ${command}` });
        }

        const errorText = await response.text();
        return Response.json({ error: `Panel error (${response.status}): ${errorText}` }, { status: response.status });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});