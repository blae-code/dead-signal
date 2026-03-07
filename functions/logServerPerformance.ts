import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { cpu_percent, ram_used_mb, disk_used_mb, network_rx_kb, network_tx_kb, player_count, server_fps } = body;

    const performanceLog = await base44.entities.ServerPerformanceLog.create({
      timestamp: new Date().toISOString(),
      cpu_percent,
      ram_used_mb,
      disk_used_mb,
      network_rx_kb: network_rx_kb || 0,
      network_tx_kb: network_tx_kb || 0,
      player_count: player_count || 0,
      server_fps: server_fps || 0
    });

    return Response.json({ success: true, performanceLog });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});