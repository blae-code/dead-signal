import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { T, Panel, PageHeader, ActionBtn, Field } from "@/components/ui/TerminalCard";
import { Map, AlertTriangle, Package, Zap, Users, Cpu } from "lucide-react";
import LootRoutePlanner from "@/components/survival/LootRoutePlanner.jsx";
import HazardForecast from "@/components/survival/HazardForecast.jsx";
import LoadoutOptimizer from "@/components/survival/LoadoutOptimizer.jsx";

export default function SurvivalPlanner() {
  const [activeTab, setActiveTab] = useState("route");
  const [selectedMission, setSelectedMission] = useState(null);

  const { data: missions } = useQuery({
    queryKey: ["missions"],
    queryFn: () => base44.entities.Mission.list(),
    initialData: [],
  });

  const { data: hotspots } = useQuery({
    queryKey: ["lootHotspots"],
    queryFn: () => base44.entities.LootHotspot.list(),
    initialData: [],
  });

  const { data: hazards } = useQuery({
    queryKey: ["hazardZones"],
    queryFn: () => base44.entities.HazardZone.list(),
    initialData: [],
  });

  const { data: loadoutProfiles } = useQuery({
    queryKey: ["loadoutProfiles"],
    queryFn: () => base44.entities.LoadoutProfile.list(),
    initialData: [],
  });

  const tabs = [
    { id: "route", label: "LOOT ROUTES", icon: Map, color: T.teal },
    { id: "hazard", label: "HAZARD FORECAST", icon: AlertTriangle, color: T.red },
    { id: "loadout", label: "SQUAD LOADOUT", icon: Package, color: T.gold },
  ];

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto" style={{ minHeight: "calc(100vh - 48px)" }}>
      <PageHeader icon={Cpu} title="SURVIVAL PLANNER" color={T.teal}>
        <span style={{ color: T.textFaint, fontSize: "8px" }}>
          {missions.length} MISSIONS · {hotspots.length} HOTSPOTS · {hazards.length} HAZARDS
        </span>
      </PageHeader>

      {/* Tab navigation */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 px-3 py-1.5 border transition-all"
            style={{
              borderColor: activeTab === tab.id ? tab.color : T.border,
              color: activeTab === tab.id ? tab.color : T.textFaint,
              background: activeTab === tab.id ? `${tab.color}15` : "transparent",
              fontSize: "9px",
              fontFamily: "'Orbitron', monospace",
              letterSpacing: "0.1em",
            }}
          >
            <tab.icon size={10} />
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "route" && (
          <motion.div
            key="route"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <LootRoutePlanner hotspots={hotspots} hazards={hazards} missions={missions} />
          </motion.div>
        )}

        {activeTab === "hazard" && (
          <motion.div
            key="hazard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <HazardForecast hazards={hazards} hotspots={hotspots} />
          </motion.div>
        )}

        {activeTab === "loadout" && (
          <motion.div
            key="loadout"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <LoadoutOptimizer loadoutProfiles={loadoutProfiles} missions={missions} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}