import { Link, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { EmptyState, Panel, StatGrid, T } from "@/components/ui/TerminalCard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";

export default function LogisticsHome() {
  const { mapLayers } = useOutletContext();
  const { data: inventory = [] } = useRealtimeEntityList({
    queryKey: ["logistics", "inventory", "overview"],
    entityName: "InventoryItem",
    queryFn: () => base44.entities.InventoryItem.list("-created_date", 300).catch(() => []),
    refetchInterval: 20_000,
    patchStrategy: "patch",
  });

  const topItems = [...inventory]
    .sort((left, right) => (right.quantity || 1) - (left.quantity || 1))
    .slice(0, 10);
  const totalUnits = inventory.reduce((sum, entry) => sum + (entry.quantity || 1), 0);

  return (
    <div className="p-3 space-y-3">
      <StatGrid
        stats={[
          { label: "INVENTORY ROWS", value: inventory.length, color: T.teal },
          { label: "TOTAL UNITS", value: totalUnits, color: T.green },
          { label: "RESOURCE MARKERS", value: mapLayers?.resources?.markers?.length || 0, color: T.cyan },
        ]}
      />

      <Panel
        title="LOGISTICS MODULES"
        titleColor={T.teal}
        headerRight={(
          <div className="flex items-center gap-1">
            <Link to="/logistics/inventory" style={{ color: T.textFaint, fontSize: "9px", textDecoration: "none" }}>
              INVENTORY →
            </Link>
            <Link to="/logistics/engineering" style={{ color: T.textFaint, fontSize: "9px", textDecoration: "none" }}>
              ENGINEERING →
            </Link>
          </div>
        )}
      >
        <div className="p-3 text-xs" style={{ color: T.textDim, lineHeight: 1.5 }}>
          Select inventory or engineering tabs to inspect live stock, degrade forecasts, and upgrade planning overlays.
          Map-side resource markers remain interactive while these panels are open.
        </div>
      </Panel>

      <Panel title="TOP STOCKED ITEMS" titleColor={T.cyan}>
        {topItems.length === 0 ? (
          <EmptyState message="NO INVENTORY TELEMETRY" />
        ) : (
          <div>
            {topItems.map((item) => (
              <div key={item.id} className="px-3 py-2 border-b flex items-center justify-between gap-2" style={{ borderColor: `${T.border}66` }}>
                <div>
                  <div style={{ color: T.text, fontSize: "10px" }}>{item.item_name || "Unknown Item"}</div>
                  <div style={{ color: T.textFaint, fontSize: "9px" }}>
                    {item.category || "Uncategorized"} • {item.location || "Unlocated"}
                  </div>
                </div>
                <span style={{ color: T.green, fontSize: "11px" }}>×{item.quantity || 1}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
