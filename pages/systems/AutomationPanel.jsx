import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AdminToolsPanel from "@/components/server/AdminToolsPanel";
import AutomationDashboard from "@/components/server/AutomationDashboard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import { invokeFunctionOrFallback } from "@/api/function-invoke";

export default function AutomationPanel() {
  const { data: status = null } = useQuery({
    queryKey: ["systems", "automation", "status"],
    queryFn: () => invokeFunctionOrFallback("getServerStatus", {}, () => null),
    refetchInterval: 12_000,
    staleTime: 5_000,
  });

  const { data: events = [] } = useRealtimeEntityList({
    queryKey: ["systems", "automation", "events"],
    entityName: "ServerEvent",
    queryFn: () => base44.entities.ServerEvent.list("-created_date", 50).catch(() => []),
    refetchInterval: 10_000,
    patchStrategy: "patch",
  });

  return (
    <div className="p-3 space-y-3">
      <AdminToolsPanel status={status} events={events} />
      <AutomationDashboard />
    </div>
  );
}
