import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { T, Panel, PageHeader, ActionBtn, StatusBadge } from "@/components/ui/TerminalCard";
import { Map, Package, TrendingDown, AlertTriangle, MapPin } from "lucide-react";

function SupplyCache({ cache, onSelect }) {
  const usedSlots = cache.contents.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onSelect}
      className="border cursor-pointer p-3 space-y-2"
      style={{
        borderColor: T.border,
        background: T.bg1,
        opacity: cache.verified ? 1 : 0.6,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin size={11} style={{ color: T.teal }} />
          <span style={{ color: T.text, fontSize: "10px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>
            {cache.cache_name}
          </span>
        </div>
        {!cache.verified && (
          <StatusBadge label="UNVERIFIED" color={T.amber} />
        )}
      </div>

      <div style={{ fontSize: "8px", color: T.textFaint }}>
        {cache.contents.length} items · {usedSlots}/{cache.capacity} slots
      </div>

      <div className="flex gap-1 flex-wrap">
        {cache.contents.slice(0, 4).map((item, i) => (
          <div
            key={i}
            style={{
              background: T.border,
              border: `1px solid ${T.borderBt}`,
              padding: "2px 6px",
              fontSize: "7px",
              color: T.textFaint,
            }}
          >
            {item.item_name} ×{item.quantity}
          </div>
        ))}
        {cache.contents.length > 4 && (
          <div style={{ fontSize: "7px", color: T.textFaint, padding: "2px 6px" }}>
            +{cache.contents.length - 4} more
          </div>
        )}
      </div>

      <div style={{ fontSize: "7px", color: T.textFaint }}>
        Coords: ({cache.x.toFixed(0)}, {cache.y.toFixed(0)})
      </div>
    </motion.div>
  );
}

function ConsumptionForecastCard({ forecast }) {
  const barColor = forecast.deficit_alert ? T.red : forecast.days_until_depletion < 7 ? T.amber : T.green;

  return (
    <motion.div
      className="border p-3 space-y-2"
      style={{
        borderColor: barColor + "55",
        background: `${barColor}0a`,
      }}
    >
      <div className="flex items-center justify-between">
        <span style={{ color: T.text, fontSize: "10px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>
          {forecast.resource_type.toUpperCase()}
        </span>
        <StatusBadge
          label={forecast.recommended_action.toUpperCase().replace(/_/g, " ")}
          color={barColor}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div style={{ color: T.textFaint, fontSize: "7px" }}>ON HAND</div>
          <div style={{ color: barColor, fontSize: "11px", fontWeight: "bold" }}>
            {forecast.current_inventory}
          </div>
        </div>
        <div>
          <div style={{ color: T.textFaint, fontSize: "7px" }}>WEEKLY BURN</div>
          <div style={{ color: T.amber, fontSize: "11px", fontWeight: "bold" }}>
            {forecast.weekly_consumption_rate}
          </div>
        </div>
        <div>
          <div style={{ color: T.textFaint, fontSize: "7px" }}>DAYS LEFT</div>
          <div style={{ color: barColor, fontSize: "11px", fontWeight: "bold" }}>
            {forecast.days_until_depletion}
          </div>
        </div>
      </div>

      <div style={{ fontSize: "8px", color: T.textFaint }}>
        Production: {forecast.production_per_week}/wk · {forecast.active_members} members · {forecast.raids_per_week} raids/wk
      </div>

      {forecast.deficit_alert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            padding: "6px",
            background: `${T.red}15`,
            border: `1px solid ${T.red}55`,
            color: T.red,
            fontSize: "7.5px",
            fontFamily: "'Orbitron', monospace",
          }}
        >
          ⚠ PRODUCTION DEFICIT — Consumption exceeds gathering rate
        </motion.div>
      )}
    </motion.div>
  );
}

export default function SupplyChainManager() {
  const [selectedCache, setSelectedCache] = useState(null);

  const { data: caches } = useQuery({
    queryKey: ["supplyCaches"],
    queryFn: () => base44.entities.SupplyCacheLocation.list(),
    initialData: [],
  });

  const { data: forecasts } = useQuery({
    queryKey: ["consumptionForecasts"],
    queryFn: () => base44.entities.ConsumptionForecast.list(),
    initialData: [],
  });

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto" style={{ minHeight: "calc(100vh - 48px)" }}>
      <PageHeader icon={Package} title="SUPPLY CHAIN" color={T.gold}>
        <span style={{ color: T.textFaint, fontSize: "8px" }}>
          {caches.length} CACHES · {forecasts.length} RESOURCES TRACKED
        </span>
      </PageHeader>

      {/* Consumption forecasts */}
      <Panel title="RESOURCE FORECAST" titleColor={T.amber}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3">
          {forecasts.length === 0 ? (
            <div style={{ color: T.textGhost, fontSize: "8px", gridColumn: "1/-1" }}>
              // NO FORECAST DATA
            </div>
          ) : (
            forecasts.map(f => (
              <ConsumptionForecastCard key={f.id} forecast={f} />
            ))
          )}
        </div>
      </Panel>

      {/* Supply caches */}
      <Panel title="DISTRIBUTED STASH NETWORK" titleColor={T.teal}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 p-3">
          {caches.length === 0 ? (
            <div style={{ color: T.textGhost, fontSize: "8px", gridColumn: "1/-1" }}>
              // NO CACHES ESTABLISHED
            </div>
          ) : (
            caches.map(cache => (
              <SupplyCache
                key={cache.id}
                cache={cache}
                onSelect={() => setSelectedCache(cache.id)}
              />
            ))
          )}
        </div>
      </Panel>

      {/* Selected cache details */}
      {selectedCache && (
        <Panel title="CACHE DETAILS" titleColor={T.steel}>
          <div style={{ padding: "12px", fontSize: "8px", color: T.textFaint }}>
            [Detailed cache view would show full inventory, access levels, and update interface]
          </div>
        </Panel>
      )}
    </div>
  );
}