import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { scheduled_command_id } = body;

    const command = await base44.entities.ScheduledCommand.get(scheduled_command_id);
    if (!command) {
      return Response.json({ error: 'Command not found' }, { status: 404 });
    }

    const rconResponse = await base44.functions.invoke('sendRconCommand', {
      command: command.command
    });

    const updated = await base44.entities.ScheduledCommand.update(scheduled_command_id, {
      last_executed: new Date().toISOString(),
      next_execution: calculateNextExecution(command.schedule, command.execute_time)
    });

    return Response.json({ success: true, command: updated, rconResponse: rconResponse.data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateNextExecution(schedule, executeTime) {
  const now = new Date();
  const [hours, minutes] = executeTime.split(':').map(Number);
  let next = new Date();
  next.setHours(hours, minutes, 0, 0);

  if (schedule === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (schedule === 'weekly') {
    if (next <= now) next.setDate(next.getDate() + 7);
  } else if (schedule === 'monthly') {
    if (next <= now) next.setMonth(next.getMonth() + 1);
  }

  return next.toISOString();
}