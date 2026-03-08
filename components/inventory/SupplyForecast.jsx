import { useState, useMemo } from "react";
import { T, Panel, SectionDivider, GlowDot } from "@/components/ui/TerminalCard";
import { AlertTriangle, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CONSUMABLE_CATEGORIES = ["Food", "Water", "Ammo", "Medical"];
const CRITICAL_THRESHOLD = 0.15; // 15% of current quantity
const WARNING_THRESHOLD = 0.35;  // 35% of current quantity
const FORECAST_DAYS = 30;

export default function SupplyForecast({ items }) {
  const [expandedItem, setExpandedItem] = useState(null);

  // Simulate historical consumption data based on item category and condition patterns
  const generateHistoricalTrend = (item) => {
    const baseConsumption = {
      Food: 2,
      Water: 3,
      Ammo: 1.5,
      Medical: 0.5,
    }[item.category] || 0;

    // Adjust by condition (deteriorated items consume faster)
    const conditionMult = {
      Pristine: 1,
      Good: 1.1,
      Worn: 1.3,
      Damaged: 1.5,
      Ruined: 2,
    }[item.condition] || 1.1;

    const dailyRate = baseConsumption * conditionMult;
    const history = [];

    for (let day = 0; day <= FORECAST_DAYS; day++) {
      const consumed = Math.max(0, item.quantity - dailyRate * day);
      const daysLeft = dailyRate > 0 ? Math.ceil(consumed / dailyRate) : Infinity;
      const status =
        consumed <= item.quantity * CRITICAL_THRESHOLD
          ? "critical"
          : consumed <= item.quantity * WARNING_THRESHOLD
            ? "warning"
            : "normal";

      history.push({
        day,
        date: new Date(Date.now() + day * 86400000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        quantity: consumed,
        daysLeft: Math.max(0, daysLeft),
        status,
      });

      if (consumed <= 0) break;
    }

    return history;
  };

  const forecasts = useMemo(() => {
    const byItem = {};
    items
      .filter((i) => CONSUMABLE_CATEGORIES.includes(i.category))
      .forEach((item) => {
        const history = generateHistoricalTrend(item);
        const criticalPoint = history.find((h) => h.status === "critical");
        byItem[item.id] = {
          item,
          history,
          criticalAt: criticalPoint ? criticalPoint.day : null,
          isCritical: criticalPoint && criticalPoint.day <= 7,
        };
      });
    return byItem;
  }, [items]);

  const criticalItems = Object.values(forecasts).filter((f) => f.isCritical);
  const warningItems = Object.values(forecasts).filter((f) => !f.isCritical && f.criticalAt !== null);

  return (
    <div className="space-y-4">
      {/* Summary alerts */}
      {criticalItems.length > 0 && (
        <div
          className="border p-3 flex items-start gap-2"
          style={{ borderColor: T.red + "66", background: T.red + "0f" }}
        >
          <AlertTriangle size={14} style={{ color: T.red, flexShrink: 0, marginTop: "2px" }} />
          <div>
            <div style={{ color: T.red, fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em" }}>
              CRITICAL SUPPLY ALERT
            </div>
            <div style={{ color: T.textFaint, fontSize: "8px", marginTop: "2px" }}>
              {criticalItems.length} item(s) will reach critical threshold within 7 days
            </div>
          </div>
        </div>
      )}

      {warningItems.length > 0 && (
        <div
          className="border p-3 flex items-start gap-2"
          style={{ borderColor: T.amber + "66", background: T.amber + "0f" }}
        >
          <TrendingDown size={14} style={{ color: T.amber, flexShrink: 0, marginTop: "2px" }} />
          <div>
            <div style={{ color: T.amber, fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em" }}>
              CONSUMPTION WARNING
            </div>
            <div style={{ color: T.textFaint, fontSize: "8px", marginTop: "2px" }}>
              {warningItems.length} item(s) projected to deplete within 30 days
            </div>
          </div>
        </div>
      )}

      {/* Forecast grid */}
      <Panel title="CONSUMPTION FORECAST" titleColor={T.cyan}>
        <div className="space-y-2 p-3">
          {Object.values(forecasts).length === 0 ? (
            <div style={{ color: T.textFaint, fontSize: "9px" }}>// NO CONSUMABLE ITEMS TO FORECAST</div>
          ) : (
            Object.entries(forecasts).map(([itemId, forecast]) => {
              const isExpanded = expandedItem === itemId;
              const statusColor =
                forecast.history[forecast.history.length - 1].status === "critical"
                  ? T.red
                  : forecast.history[forecast.history.length - 1].status === "warning"
                    ? T.amber
                    : T.green;

              return (
                <div
                  key={itemId}
                  className="border cursor-pointer transition-all"
                  style={{
                    borderColor: statusColor + "44",
                    background: isExpanded ? statusColor + "0f" : "transparent",
                  }}
                >
                  {/* Header */}
                  <div
                    className="flex items-center justify-between px-3 py-2"
                    onClick={() => setExpandedItem(isExpanded ? null : itemId)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <GlowDot color={statusColor} size={5} />
                      <div className="min-w-0 flex-1">
                        <div style={{ color: T.text, fontSize: "10px", fontWeight: 600, truncate: true }}>
                          {forecast.item.item_name}
                        </div>
                        <div style={{ color: T.textFaint, fontSize: "7px", marginTop: "2px" }}>
                          {forecast.item.category} • ×{forecast.item.quantity} units •{" "}
                          {forecast.item.condition}
                        </div>
                      </div>
                    </div>

                    {/* Forecast indicator */}
                    <div style={{ textAlign: "right", marginLeft: "12px", flexShrink: 0 }}>
                      {forecast.criticalAt !== null ? (
                        <>
                          <div style={{ color: statusColor, fontSize: "10px", fontWeight: 600 }}>
                            {forecast.criticalAt}d
                          </div>
                          <div style={{ color: T.textFaint, fontSize: "7px", marginTop: "1px" }}>TO CRITICAL</div>
                        </>
                      ) : (
                        <>
                          <div style={{ color: T.green, fontSize: "10px", fontWeight: 600 }}>STABLE</div>
                          <div style={{ color: T.textFaint, fontSize: "7px", marginTop: "1px" }}>
                            {FORECAST_DAYS}d+
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded chart */}
                  {isExpanded && (
                    <>
                      <div style={{ height: "1px", background: statusColor + "22" }} />
                      <div className="px-3 py-3">
                        <ResponsiveContainer width="100%" height={180}>
                          <LineChart
                            data={forecast.history}
                            margin={{ top: 10, right: 20, left: -20, bottom: 30 }}
                          >
                            <CartesianGrid strokeDasharray="2 2" stroke={T.border} />
                            <XAxis
                              dataKey="date"
                              stroke={T.textFaint}
                              tick={{ fontSize: 8 }}
                              angle={-45}
                              textAnchor="end"
                              height={50}
                            />
                            <YAxis stroke={T.textFaint} tick={{ fontSize: 8 }} />
                            <Tooltip
                              contentStyle={{
                                background: "rgba(10, 7, 4, 0.9)",
                                border: `1px solid ${statusColor}66`,
                                borderRadius: 0,
                              }}
                              labelStyle={{ color: statusColor }}
                              formatter={(val) => [val.toFixed(1), "Units"]}
                            />
                            <Line
                              type="monotone"
                              dataKey="quantity"
                              stroke={statusColor}
                              strokeWidth={2}
                              dot={false}
                              isAnimationActive={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>

                        {/* Forecast details */}
                        <SectionDivider label="PROJECTION" color={T.textFaint} />
                        <div className="space-y-1.5 mt-2">
                          <div className="flex justify-between items-center">
                            <span style={{ color: T.textFaint, fontSize: "8px" }}>CURRENT</span>
                            <span style={{ color: T.text, fontSize: "10px", fontWeight: 600 }}>
                              {forecast.item.quantity} units
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span style={{ color: T.textFaint, fontSize: "8px" }}>CRITICAL (15%)</span>
                            <span style={{ color: T.red, fontSize: "10px", fontWeight: 600 }}>
                              {(forecast.item.quantity * CRITICAL_THRESHOLD).toFixed(0)} units
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span style={{ color: T.textFaint, fontSize: "8px" }}>DEPLETION</span>
                            <span style={{ color: statusColor, fontSize: "10px", fontWeight: 600 }}>
                              {forecast.criticalAt !== null
                                ? `Day ${forecast.criticalAt}`
                                : `> Day ${FORECAST_DAYS}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Panel>
    </div>
  );
}