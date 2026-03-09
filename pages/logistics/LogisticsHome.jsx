import { Link, useOutletContext } from "react-router-dom";
import { Package } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { EmptyState, Panel, StatGrid, StatusBadge, T, rowAccent } from "@/components/ui/TerminalCard";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";

const CATEGORY_COLORS = {
  weapons:     T.red,
  medical:     T.green,
  food:        T.amber,
  ammo:        T.orange,
  tools:       T.cyan,
  vehicles:    T.teal,
  electronics: T.cyan,
  materials:   T.textDim,
};

const categoryAccent = (cat) =>
  CATEGORY_COLORS[String(cat || "").toLowerCase()] || T.teal;

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
          <div className="flex items-center gap-2">
            <Link
              to="/logistics/inventory"
              style={{
                color: T.teal, fontSize: "9px", textDecoration: "none", letterSpacing: "0.1em",
                border: `1px solid ${T.teal}44`, background: `${T.teal}0e`,
                padding: "2px 8px", fontFamily: "'Orbitron', monospace",
              }}
            >
              INVENTORY →
            </Link>
            <Link
              to="/logistics/engineering"
              style={{
                color: T.cyan, fontSize: "9px", textDecoration: "none", letterSpacing: "0.1em",
                border: `1px solid ${T.cyan}44`, background: `${T.cyan}0e`,
                padding: "2px 8px", fontFamily: "'Orbitron', monospace",
              }}
            >
              ENGINEERING →
            </Link>
          </div>
        )}
      >
        <div className="p-3 text-xs" style={{ color: T.textDim, lineHeight: 1.6 }}>
          Inspect live stock levels, degrade forecasts, and upgrade planning overlays.
          Map-side resource markers remain interactive while these panels are open.
        </div>
      </Panel>

      <Panel title="TOP STOCKED ITEMS" titleColor={T.cyan}>
        {topItems.length === 0 ? (
          <EmptyState icon={Package} message="NO INVENTORY TELEMETRY" sub="No items in database" />
        ) : (
          <div>
            {topItems.map((item) => {
              const accent = categoryAccent(item.category);
              return (
                <div
                  key={item.id}
                  className="relative px-3 py-2 border-b flex items-center justify-between gap-2"
                  style={{ borderColor: `${T.border}66` }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${accent}08`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={rowAccent(accent)} />
                  <div className="pl-2 min-w-0">
                    <div style={{ color: T.text, fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.item_name || "Unknown Item"}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge label={item.category || "Misc"} color={accent} />
                      {item.location && (
                        <span style={{ color: T.textFaint, fontSize: "9px" }}>{item.location}</span>
                      )}
                    </div>
                  </div>
                  <span style={{
                    color: accent,
                    fontFamily: "'Orbitron', monospace",
                    fontSize: "13px",
                    fontWeight: "bold",
                    flexShrink: 0,
                    textShadow: `0 0 10px ${accent}66`,
                  }}>
                    ×{item.quantity || 1}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
