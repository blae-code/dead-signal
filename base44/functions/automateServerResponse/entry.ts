import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { alertType, severity, metric, value } = await req.json();
    const actions = [];

    // High memory usage
    if (alertType === 'HIGH_MEMORY' || (metric === 'ram' && value > 80)) {
      actions.push({
        action: 'CLEAR_TEMP_FILES',
        command: 'say Clearing temporary files to free memory...',
        rcon: true
      });
      actions.push({
        action: 'RESTART_SERVICE',
        service: 'game_service',
        notify: true
      });
    }

    // High CPU usage
    if (alertType === 'HIGH_CPU' || (metric === 'cpu' && value > 90)) {
      actions.push({
        action: 'REDUCE_SIMULATION',
        command: 'performance_mode high',
        rcon: true
      });
      actions.push({
        action: 'MONITOR_CLOSELY',
        escalate_if_sustained: 120000 // 2 minutes
      });
    }

    // High disk usage
    if (alertType === 'HIGH_DISK' || (metric === 'disk' && value > 85)) {
      actions.push({
        action: 'CLEANUP_LOGS',
        command: 'cleanup_old_logs 7d',
        rcon: true
      });
      actions.push({
        action: 'ARCHIVE_BACKUPS',
        notify: true
      });
    }

    // Network packet loss
    if (alertType === 'PACKET_LOSS' && value > 5) {
      actions.push({
        action: 'DIAGNOSE_NETWORK',
        command: 'netstat',
        escalate: true
      });
    }

    // Execute auto-responses
    for (const action of actions) {
      if (action.rcon && action.command) {
        await base44.functions.invoke('sendRconCommand', { command: action.command }).catch(() => {});
      }
      
      // Log the automatic response
      await base44.entities.ServerEvent.create({
        event_type: 'Auto Response',
        message: `Automated action: ${action.action} triggered by ${alertType}`,
        severity: 'INFO',
        related_alert: alertType
      }).catch(() => {});
    }

    return Response.json({ 
      alert_type: alertType,
      actions_taken: actions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});