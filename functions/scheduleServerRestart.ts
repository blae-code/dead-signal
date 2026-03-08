import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { restartType = 'scheduled', cpuThreshold = 85, memThreshold = 90, gracefulWait = 300 } = await req.json();

    // Fetch current metrics
    const statusRes = await base44.functions.invoke('getServerStatus', {});
    const status = statusRes.data;

    if (!status || status.error) {
      return Response.json({ error: 'Could not fetch server status' }, { status: 500 });
    }

    const shouldRestart = 
      (restartType === 'performance' && (status.cpu > cpuThreshold || status.ramUsedMB / 1024 > memThreshold)) ||
      (restartType === 'scheduled' && isScheduledTime());

    if (!shouldRestart) {
      return Response.json({
        restart_needed: false,
        cpu: status.cpu,
        memory_gb: (status.ramUsedMB / 1024).toFixed(1),
        reason: 'Metrics within acceptable thresholds'
      });
    }

    // Announce restart
    await base44.functions.invoke('sendRconCommand', {
      command: `say Server restarting in ${gracefulWait}s for maintenance. Save your progress!`
    }).catch(() => {});

    // Wait graceful period
    await new Promise(resolve => setTimeout(resolve, gracefulWait * 1000));

    // Kill and restart
    const restartRes = await base44.functions.invoke('sendRconCommand', {
      command: 'restart'
    }).catch(() => ({ data: { success: false } }));

    // Log restart event
    await base44.entities.ScheduledCommand.create({
      command_type: 'SERVER_RESTART',
      trigger: restartType,
      status: restartRes.data?.success ? 'SUCCESS' : 'PENDING',
      cpu_before: status.cpu,
      memory_before: status.ramUsedMB / 1024,
      timestamp: new Date().toISOString()
    }).catch(() => {});

    await base44.entities.ServerEvent.create({
      event_type: 'Server Restart',
      message: `Automated ${restartType} restart executed (CPU: ${status.cpu.toFixed(0)}%, RAM: ${(status.ramUsedMB / 1024).toFixed(1)}GB)`,
      severity: 'WARN'
    }).catch(() => {});

    return Response.json({
      restart_initiated: true,
      restart_type: restartType,
      graceful_wait_seconds: gracefulWait,
      metrics_before: {
        cpu: status.cpu,
        memory_gb: (status.ramUsedMB / 1024).toFixed(1)
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function isScheduledTime() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  // Restart Tuesday and Saturday at 3 AM UTC
  return (day === 2 || day === 6) && hour === 3;
}