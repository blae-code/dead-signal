import { useState } from "react";
import AlertHistoryPanel from "@/components/server/AlertHistoryPanel";
import AlertRulesPanel from "@/components/server/AlertRulesPanel";

export default function AlertsPanel() {
  const [refreshTick, setRefreshTick] = useState(0);

  return (
    <div className="p-3">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <AlertRulesPanel onTriggered={() => setRefreshTick((value) => value + 1)} />
        <AlertHistoryPanel refreshTick={refreshTick} />
      </div>
    </div>
  );
}
