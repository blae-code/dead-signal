import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { T } from "@/components/ui/TerminalCard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import { normalizeXYPoint } from "@/hooks/map/coords";

const severityColor = (severity) => {
  const key = String(severity || "").toUpperCase();
  if (key === "CRITICAL") return T.red;
  if (key === "ALERT" || key === "WARN") return T.orange;
  return T.amber;
};

export const useMapSystemsLayer = () => {
  const alertsQuery = useRealtimeEntityList({
    queryKey: ["map", "alerts"],
    entityName: "AlertHistory",
    queryFn: () => base44.entities.AlertHistory.list("-created_date", 200).catch(() => []),
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
    patchStrategy: "patch",
  });

  const eventsQuery = useRealtimeEntityList({
    queryKey: ["map", "server-events"],
    entityName: "ServerEvent",
    queryFn: () => base44.entities.ServerEvent.list("-created_date", 200).catch(() => []),
    refetchInterval: 12_000,
    refetchIntervalInBackground: true,
    patchStrategy: "patch",
  });

  const alerts = Array.isArray(alertsQuery.data) ? alertsQuery.data : [];
  const events = Array.isArray(eventsQuery.data) ? eventsQuery.data : [];

  return useMemo(() => {
    const markers = [];
    let unplacedAlertCount = 0;

    for (const alert of alerts) {
      const point = normalizeXYPoint(alert);
      if (!point) {
        unplacedAlertCount += 1;
        continue;
      }
      markers.push({
        id: `system-alert-${alert.id}`,
        entityId: alert.id,
        entityType: "AlertHistory",
        kind: "system",
        label: alert.rule_name || alert.metric || "SYSTEM ALERT",
        status: alert.severity || "WARN",
        color: severityColor(alert.severity),
        x: point.x,
        y: point.y,
        routePath: `/systems/alerts?alert=${encodeURIComponent(alert.id)}`,
        raw: alert,
      });
    }

    if (unplacedAlertCount > 0) {
      markers.push({
        id: "system-hq-alert-node",
        entityId: "hq-alerts",
        entityType: "AlertHistory",
        kind: "system",
        label: `HQ ALERT NODE (${unplacedAlertCount})`,
        status: "WARN",
        color: T.red,
        x: 50,
        y: 8,
        routePath: "/systems/alerts",
        raw: { count: unplacedAlertCount },
      });
    }

    const criticalEvent = events.find((event) => String(event.severity || "").toUpperCase() === "CRITICAL");
    if (criticalEvent) {
      markers.push({
        id: `system-event-${criticalEvent.id}`,
        entityId: criticalEvent.id,
        entityType: "ServerEvent",
        kind: "system",
        label: criticalEvent.message || "CRITICAL SYSTEM EVENT",
        status: "CRITICAL",
        color: T.red,
        x: 50,
        y: 14,
        routePath: `/systems/server?event=${encodeURIComponent(criticalEvent.id)}`,
        raw: criticalEvent,
      });
    }

    return {
      markers,
      loading: alertsQuery.isLoading || eventsQuery.isLoading,
    };
  }, [alerts, alertsQuery.isLoading, events, eventsQuery.isLoading]);
};
