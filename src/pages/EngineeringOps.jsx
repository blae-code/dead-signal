import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Wrench, Boxes, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  T,
  PageHeader,
  Panel,
  Field,
  FilterPill,
  ActionBtn,
  TableHeader,
  TableRow,
  EmptyState,
  selectStyle,
} from "@/components/ui/TerminalCard";
import { useRuntimeConfig } from "@/hooks/use-runtime-config";
import { useRealtimeEntityList } from "@/hooks/use-realtime-entity-list";
import { invokeFunctionOrFallback } from "@/api/function-invoke";

const ALL_FILTER = "__all__";

const pickByToken = (values, token) =>
  values.find((value) => typeof value === "string" && value.toLowerCase() === token) || "";
const pickFirst = (values) => values.find((value) => typeof value === "string" && value.trim()) || "";
const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const readNumber = (record, keys) => {
  if (!record || typeof record !== "object") return null;
  for (const key of keys) {
    if (!(key in record)) continue;
    const value = toNumber(record[key]);
    if (value !== null) return value;
  }
  return null;
};
const formatValue = (value, unit = "") => {
  if (typeof value !== "number" || Number.isNaN(value)) return "UNAVAILABLE";
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Number(value.toFixed(1));
  return `${rounded}${unit ? ` ${unit}` : ""}`;
};
const normalizeArray = (value) => (Array.isArray(value) ? value : []);
const normalizeObject = (value) => (value && typeof value === "object" ? value : {});

const applyEffect = (baseValue, effectValue) => {
  if (typeof baseValue !== "number" || Number.isNaN(baseValue)) return null;
  if (typeof effectValue === "number") return baseValue + effectValue;
  if (!effectValue || typeof effectValue !== "object") return baseValue;

  const op = typeof effectValue.op === "string" ? effectValue.op : "add";
  const value = toNumber(effectValue.value);
  if (value === null) return baseValue;

  if (op === "set") return value;
  if (op === "mul") return baseValue * value;
  if (op === "pct") return baseValue * (1 + value / 100);
  return baseValue + value;
};

const getConditionScore = (condition, conditions) => {
  const index = conditions.indexOf(condition);
  if (index < 0 || conditions.length === 0) return null;
  return Math.round(((conditions.length - index) / conditions.length) * 100);
};

const getResearchStateMap = (engineeringConfig) => {
  const raw = engineeringConfig?.research_state;
  if (Array.isArray(raw)) {
    return new Map(
      raw
        .filter((entry) => entry && typeof entry === "object" && typeof entry.id === "string")
        .map((entry) => [entry.id, typeof entry.status === "string" ? entry.status.toLowerCase() : ""]),
    );
  }
  if (raw && typeof raw === "object") {
    return new Map(
      Object.entries(raw).map(([key, value]) => [key, typeof value === "string" ? value.toLowerCase() : ""]),
    );
  }
  return new Map();
};

const sumRequirementMap = (entries) => {
  const map = new Map();
  entries.forEach((entry) => {
    const itemName = typeof entry.item === "string" ? entry.item.trim() : "";
    const quantity = toNumber(entry.quantity);
    if (!itemName || quantity === null || quantity <= 0) return;
    const normalized = itemName.toLowerCase();
    map.set(normalized, (map.get(normalized) || 0) + quantity);
  });
  return map;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance2d = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);
const normalizePercentCoord = (value) => {
  const numeric = toNumber(value);
  if (numeric === null) return null;
  if (numeric > 100 && numeric <= 14500) return clamp((numeric / 14500) * 100, 0, 100);
  return clamp(numeric, 0, 100);
};
const parseDateMs = (value) => {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};
const findCoordsInText = (text) => {
  if (typeof text !== "string") return null;
  const match = text.match(/(-?\d+(?:\.\d+)?)\s*[,xX]\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const x = normalizePercentCoord(match[1]);
  const y = normalizePercentCoord(match[2]);
  if (x === null || y === null) return null;
  return { x, y };
};
const includesKeyword = (text, keywords) => {
  if (typeof text !== "string") return false;
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
};
const toPriorityLabel = (score) => {
  if (score >= 85) return "P1";
  if (score >= 60) return "P2";
  if (score >= 35) return "P3";
  return "P4";
};
const matchesResourcePattern = (resourceName, patterns) => {
  if (typeof resourceName !== "string") return false;
  const normalized = resourceName.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern));
};

export default function EngineeringOps() {
  const runtimeConfig = useRuntimeConfig();
  const engineeringConfig = normalizeObject(runtimeConfig.config?.engineering);
  const statCatalog = normalizeArray(engineeringConfig.stat_catalog).filter(
    (entry) => entry && typeof entry === "object" && typeof entry.key === "string",
  );
  const modifiers = normalizeArray(engineeringConfig.modifiers).filter(
    (entry) => entry && typeof entry === "object" && typeof entry.id === "string",
  );
  const blueprints = normalizeArray(engineeringConfig.blueprints).filter(
    (entry) => entry && typeof entry === "object" && typeof entry.id === "string",
  );
  const techTree = normalizeArray(engineeringConfig.tech_tree).filter(
    (entry) => entry && typeof entry === "object" && typeof entry.id === "string",
  );
  const configuredAssetTypes = normalizeArray(engineeringConfig.asset_types).filter(
    (entry) => entry && typeof entry === "object" && typeof entry.id === "string",
  );

  const conditionCatalog = runtimeConfig.getArray(["taxonomy", "inventory_conditions"]);
  const mapPinTypes = runtimeConfig.getArray(["taxonomy", "map_pin_types"]);
  const vehicleType = useMemo(
    () => pickByToken(mapPinTypes, "vehicle spawn") || mapPinTypes.find((item) => item.toLowerCase().includes("vehicle")) || "",
    [mapPinTypes],
  );
  const buildingTypes = useMemo(
    () => [pickByToken(mapPinTypes, "clan base"), pickByToken(mapPinTypes, "safe house")].filter(Boolean),
    [mapPinTypes],
  );
  const defenseHeatmapConfig = normalizeObject(engineeringConfig.defense_heatmap);
  const attackKeywords = normalizeArray(defenseHeatmapConfig.attack_keywords).map((entry) => String(entry).toLowerCase());
  const sensorAlertKeywords = normalizeArray(defenseHeatmapConfig.sensor_alert_keywords).map((entry) => String(entry).toLowerCase());
  const sensorThreatTypes = normalizeArray(defenseHeatmapConfig.sensor_threat_types).map((entry) => String(entry).toLowerCase());
  const heatmapCols = clamp(Math.round(toNumber(defenseHeatmapConfig.cols) ?? 12), 6, 24);
  const heatmapRows = clamp(Math.round(toNumber(defenseHeatmapConfig.rows) ?? 8), 4, 18);
  const attackDecayHours = Math.max(1, toNumber(defenseHeatmapConfig.attack_decay_hours) ?? 48);
  const influenceRadius = Math.max(8, toNumber(defenseHeatmapConfig.influence_radius) ?? 20);
  const redThreshold = clamp(toNumber(defenseHeatmapConfig.red_threshold) ?? 65, 20, 95);
  const greenThreshold = clamp(toNumber(defenseHeatmapConfig.green_threshold) ?? 35, 5, 80);
  const severityWeights = normalizeObject(defenseHeatmapConfig.severity_weights);

  const forecastResources = normalizeArray(engineeringConfig.forecast_resources).filter(
    (entry) => entry && typeof entry === "object" && typeof entry.id === "string",
  );
  const forecastScenarios = normalizeArray(engineeringConfig.consumption_scenarios).filter(
    (entry) => entry && typeof entry === "object" && typeof entry.id === "string",
  );
  const degradationConfig = normalizeObject(engineeringConfig.degradation);

  const { data: user = null } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => base44.auth.me(),
    staleTime: 60_000,
    retry: 1,
  });
  const { data: inventoryItems = [] } = useRealtimeEntityList({
    queryKey: ["engineering", "inventory"],
    entityName: "InventoryItem",
    queryFn: () => base44.entities.InventoryItem.list("-created_date", 600),
    patchStrategy: "patch",
  });
  const { data: mapPins = [] } = useRealtimeEntityList({
    queryKey: ["engineering", "map-pins"],
    entityName: "MapPin",
    queryFn: () => base44.entities.MapPin.list("-created_date", 400),
    patchStrategy: "patch",
  });
  const { data: serverEvents = [] } = useRealtimeEntityList({
    queryKey: ["engineering", "events"],
    entityName: "ServerEvent",
    queryFn: () => base44.entities.ServerEvent.list("-created_date", 300),
    patchStrategy: "patch",
  });
  const { data: playerLocations = [] } = useRealtimeEntityList({
    queryKey: ["engineering", "player-locations"],
    entityName: "PlayerLocation",
    queryFn: () => base44.entities.PlayerLocation.list("-timestamp", 200),
    patchStrategy: "patch",
  });
  const { data: mapBroadcasts = [] } = useRealtimeEntityList({
    queryKey: ["engineering", "map-broadcasts"],
    entityName: "MapBroadcast",
    queryFn: () => base44.entities.MapBroadcast.list("-created_date", 120),
    patchStrategy: "patch",
  });
  const { data: serverStatus = null } = useQuery({
    queryKey: ["engineering", "server-status"],
    queryFn: async () => invokeFunctionOrFallback("getServerStatus", {}, () => null),
    staleTime: 5_000,
    refetchInterval: 15_000,
    retry: 1,
  });
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const resourceManifest = useMemo(() => {
    const byName = new Map();
    const rows = [];
    inventoryItems.forEach((item) => {
      const itemName = typeof item.item_name === "string" ? item.item_name.trim() : "";
      if (!itemName) return;
      const quantity = toNumber(item.quantity) ?? 1;
      const normalized = itemName.toLowerCase();
      byName.set(normalized, (byName.get(normalized) || 0) + quantity);
      rows.push({
        name: itemName,
        quantity,
        category: typeof item.category === "string" ? item.category : "UNAVAILABLE",
        location: typeof item.location === "string" ? item.location : "UNAVAILABLE",
      });
    });
    return { byName, rows };
  }, [inventoryItems]);

  const liveAssets = useMemo(() => {
    const gearAssets = inventoryItems.map((item) => {
      const quantity = toNumber(item.quantity) ?? 1;
      const weightEach = toNumber(item.weight);
      const durability = getConditionScore(item.condition, conditionCatalog);
      return {
        id: `gear-${item.id}`,
        asset_type: "gear",
        label: typeof item.item_name === "string" ? item.item_name : "UNNAMED GEAR",
        source: "InventoryItem",
        source_id: item.id,
        status: typeof item.condition === "string" ? item.condition : "UNAVAILABLE",
        x: null,
        y: null,
        updated_at: typeof item.updated_date === "string" ? item.updated_date : (typeof item.created_date === "string" ? item.created_date : null),
        stats: {
          durability,
          defense: readNumber(item, ["defense", "armor"]),
          power: readNumber(item, ["power", "power_draw"]),
          capacity: quantity,
          speed: readNumber(item, ["speed"]),
          weight: weightEach === null ? null : weightEach * quantity,
        },
      };
    });

    const vehicleAssets = vehicleType
      ? mapPins
          .filter((pin) => pin.type === vehicleType)
          .map((pin) => ({
            id: `vehicle-${pin.id}`,
            asset_type: "vehicle",
            label: typeof pin.title === "string" && pin.title.trim() ? pin.title : "UNNAMED VEHICLE",
            source: "MapPin",
            source_id: pin.id,
            status: typeof pin.status === "string" ? pin.status : "UNAVAILABLE",
            x: normalizePercentCoord(pin.x),
            y: normalizePercentCoord(pin.y),
            updated_at: typeof pin.updated_date === "string" ? pin.updated_date : (typeof pin.created_date === "string" ? pin.created_date : null),
            stats: {
              durability: readNumber(pin, ["integrity", "durability", "health"]),
              defense: readNumber(pin, ["defense", "defense_level", "armor"]),
              power: readNumber(pin, ["power", "power_draw", "fuel_usage"]),
              capacity: readNumber(pin, ["capacity", "storage", "cargo_capacity"]),
              speed: readNumber(pin, ["speed", "top_speed", "max_speed"]),
              weight: readNumber(pin, ["weight", "mass"]),
            },
          }))
      : [];

    const buildingAssets =
      buildingTypes.length > 0
        ? mapPins
            .filter((pin) => buildingTypes.includes(pin.type))
            .map((pin) => ({
              id: `building-${pin.id}`,
              asset_type: "building",
              label: typeof pin.title === "string" && pin.title.trim() ? pin.title : "UNNAMED BASE MODULE",
              source: "MapPin",
              source_id: pin.id,
              status: typeof pin.status === "string" ? pin.status : "UNAVAILABLE",
              x: normalizePercentCoord(pin.x),
              y: normalizePercentCoord(pin.y),
              updated_at: typeof pin.updated_date === "string" ? pin.updated_date : (typeof pin.created_date === "string" ? pin.created_date : null),
              stats: {
                durability: readNumber(pin, ["integrity", "durability", "health"]),
                defense: readNumber(pin, ["defense", "defense_level", "turret_count"]),
                power: readNumber(pin, ["power", "power_draw", "power_level"]),
                capacity: readNumber(pin, ["capacity", "storage", "beds"]),
                speed: null,
                weight: readNumber(pin, ["weight", "mass"]),
              },
            }))
        : [];

    return [...gearAssets, ...vehicleAssets, ...buildingAssets];
  }, [buildingTypes, conditionCatalog, inventoryItems, mapPins, vehicleType]);

  const assetTypeOptions = useMemo(() => {
    if (configuredAssetTypes.length > 0) {
      return configuredAssetTypes.map((entry) => ({
        id: entry.id,
        label: typeof entry.label === "string" ? entry.label : entry.id,
      }));
    }
    return [
      { id: "gear", label: "Gear" },
      { id: "vehicle", label: "Vehicle" },
      { id: "building", label: "Building" },
    ];
  }, [configuredAssetTypes]);

  const baseSites = useMemo(
    () =>
      liveAssets
        .filter((asset) => asset.asset_type === "building" && typeof asset.x === "number" && typeof asset.y === "number")
        .map((asset) => ({
          id: asset.id,
          label: asset.label,
          x: asset.x,
          y: asset.y,
          status: asset.status,
          defense: toNumber(asset.stats?.defense) ?? 0,
          integrity: toNumber(asset.stats?.durability) ?? 100,
          powerDraw: toNumber(asset.stats?.power) ?? 0,
          updatedAt: asset.updated_at,
        })),
    [liveAssets],
  );

  const defenseNodes = useMemo(() => {
    const primaryNodes = mapPins
      .map((pin) => {
        const x = normalizePercentCoord(pin.x);
        const y = normalizePercentCoord(pin.y);
        if (x === null || y === null) return null;
        const defense = readNumber(pin, ["defense", "defense_level", "turret_count", "armor"]);
        const integrity = readNumber(pin, ["integrity", "durability", "health"]);
        const hasBaseType = buildingTypes.includes(pin.type);
        if (defense === null && !hasBaseType) return null;
        const statusText = typeof pin.status === "string" ? pin.status.toLowerCase() : "";
        const activeFactor = statusText.includes("active") ? 1 : statusText.includes("unknown") ? 0.8 : 0.65;
        return {
          id: pin.id,
          x,
          y,
          defense: Math.max(defense ?? (hasBaseType ? 18 : 8), 4),
          integrity: clamp(integrity ?? 100, 10, 100),
          radius: Math.max(8, readNumber(pin, ["coverage_radius", "range", "radius"]) ?? influenceRadius),
          activeFactor,
        };
      })
      .filter(Boolean);

    const playerPatrolNodes = playerLocations
      .map((loc) => {
        const x = normalizePercentCoord(loc.x);
        const y = normalizePercentCoord(loc.y);
        if (x === null || y === null) return null;
        const stamp = parseDateMs(loc.timestamp);
        if (stamp !== null && nowMs - stamp > 15 * 60 * 1000) return null;
        return {
          id: `patrol-${loc.id}`,
          x,
          y,
          defense: 6,
          integrity: 100,
          radius: 10,
          activeFactor: 0.85,
        };
      })
      .filter(Boolean);

    return [...primaryNodes, ...playerPatrolNodes];
  }, [buildingTypes, influenceRadius, mapPins, nowMs, playerLocations]);

  const attackPoints = useMemo(() => {
    const getWeight = (severity) => {
      const normalized = typeof severity === "string" ? severity.toLowerCase() : "default";
      return (
        toNumber(severityWeights[normalized]) ??
        toNumber(severityWeights.default) ??
        12
      );
    };

    return serverEvents
      .map((event) => {
        const eventType = typeof event.event_type === "string" ? event.event_type.toLowerCase() : "";
        const message = typeof event.message === "string" ? event.message : "";
        const joined = `${eventType} ${message}`.trim();
        if (!includesKeyword(joined, attackKeywords)) return null;

        const explicitX = normalizePercentCoord(event.x);
        const explicitY = normalizePercentCoord(event.y);
        const messageCoords = findCoordsInText(message);
        const x = explicitX ?? messageCoords?.x ?? null;
        const y = explicitY ?? messageCoords?.y ?? null;
        if (x === null || y === null) return null;

        const timestamp = parseDateMs(event.created_date) ?? nowMs;
        const ageHours = Math.max(0, (nowMs - timestamp) / 3_600_000);
        const recencyFactor = clamp(1 - ageHours / attackDecayHours, 0.2, 1);

        return {
          id: event.id,
          x,
          y,
          threat: getWeight(event.severity) * recencyFactor,
        };
      })
      .filter(Boolean);
  }, [attackDecayHours, attackKeywords, nowMs, serverEvents, severityWeights]);

  const sensorPoints = useMemo(() => {
    const mapSignals = mapPins
      .map((pin) => {
        const x = normalizePercentCoord(pin.x);
        const y = normalizePercentCoord(pin.y);
        if (x === null || y === null) return null;
        const typeText = typeof pin.type === "string" ? pin.type.toLowerCase() : "";
        if (!sensorThreatTypes.includes(typeText)) return null;
        const threat = readNumber(pin, ["threat_level", "horde_size", "danger_level"]) ?? 14;
        return { id: `pin-${pin.id}`, x, y, threat: clamp(threat, 6, 38) };
      })
      .filter(Boolean);

    const broadcastSignals = mapBroadcasts
      .map((entry) => {
        const message = typeof entry.message === "string" ? entry.message : "";
        if (!includesKeyword(message, sensorAlertKeywords)) return null;
        const x = normalizePercentCoord(entry.x);
        const y = normalizePercentCoord(entry.y);
        if (x === null || y === null) return null;
        const createdMs = parseDateMs(entry.created_date) ?? nowMs;
        const ageHours = Math.max(0, (nowMs - createdMs) / 3_600_000);
        const threat = clamp(12 * (1 - ageHours / 4), 4, 14);
        return { id: `broadcast-${entry.id}`, x, y, threat };
      })
      .filter(Boolean);

    return [...mapSignals, ...broadcastSignals];
  }, [mapBroadcasts, mapPins, nowMs, sensorAlertKeywords, sensorThreatTypes]);

  const heatmapData = useMemo(() => {
    const cells = [];
    const cellWidth = 100 / heatmapCols;
    const cellHeight = 100 / heatmapRows;
    for (let row = 0; row < heatmapRows; row += 1) {
      for (let col = 0; col < heatmapCols; col += 1) {
        const cx = col * cellWidth + cellWidth / 2;
        const cy = row * cellHeight + cellHeight / 2;

        let threatScore = 0;
        attackPoints.forEach((point) => {
          const dist = distance2d(cx, cy, point.x, point.y);
          if (dist > influenceRadius * 1.6) return;
          threatScore += point.threat * (1 - dist / (influenceRadius * 1.6));
        });
        sensorPoints.forEach((point) => {
          const dist = distance2d(cx, cy, point.x, point.y);
          if (dist > influenceRadius) return;
          threatScore += point.threat * (1 - dist / influenceRadius);
        });

        let defenseScore = 0;
        defenseNodes.forEach((node) => {
          const dist = distance2d(cx, cy, node.x, node.y);
          if (dist > node.radius) return;
          defenseScore += node.defense * (node.integrity / 100) * node.activeFactor * (1 - dist / node.radius);
        });

        const vulnerability = clamp(threatScore - defenseScore, 0, 100);
        const effectiveness = clamp(50 + (defenseScore - threatScore) * 1.8, 0, 100);
        cells.push({
          id: `${col}-${row}`,
          col,
          row,
          x: cx,
          y: cy,
          threatScore,
          defenseScore,
          vulnerability,
          effectiveness,
        });
      }
    }

    return {
      cells,
      redZones: cells.filter((cell) => cell.vulnerability >= redThreshold).length,
      greenZones: cells.filter((cell) => cell.vulnerability <= greenThreshold).length,
      avgVulnerability:
        cells.length > 0
          ? cells.reduce((sum, cell) => sum + cell.vulnerability, 0) / cells.length
          : 0,
    };
  }, [
    attackPoints,
    defenseNodes,
    greenThreshold,
    heatmapCols,
    heatmapRows,
    influenceRadius,
    redThreshold,
    sensorPoints,
  ]);

  const baseDefenseRows = useMemo(() => {
    if (baseSites.length === 0) return [];
    return baseSites
      .map((base) => {
        const nearbyCells = heatmapData.cells.filter(
          (cell) => distance2d(cell.x, cell.y, base.x, base.y) <= Math.max(influenceRadius, 12),
        );
        const avgVulnerability =
          nearbyCells.length > 0
            ? nearbyCells.reduce((sum, cell) => sum + cell.vulnerability, 0) / nearbyCells.length
            : 0;
        const avgEffectiveness =
          nearbyCells.length > 0
            ? nearbyCells.reduce((sum, cell) => sum + cell.effectiveness, 0) / nearbyCells.length
            : 0;
        const status =
          avgVulnerability >= redThreshold
            ? "UNDER THREAT"
            : avgVulnerability <= greenThreshold
              ? "FORTIFIED"
              : "CONTESTED";
        return {
          ...base,
          avgVulnerability,
          avgEffectiveness,
          status,
        };
      })
      .sort((a, b) => b.avgVulnerability - a.avgVulnerability);
  }, [baseSites, greenThreshold, heatmapData.cells, influenceRadius, redThreshold]);

  const [assetFilter, setAssetFilter] = useState(ALL_FILTER);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedModifierId, setSelectedModifierId] = useState("");
  const [leftBlueprintId, setLeftBlueprintId] = useState("");
  const [rightBlueprintId, setRightBlueprintId] = useState("");
  const [demandQueue, setDemandQueue] = useState([]);
  const [scenarioId, setScenarioId] = useState("");
  const [selectedForecastBaseId, setSelectedForecastBaseId] = useState("");
  const [selectedHealthBaseId, setSelectedHealthBaseId] = useState("");

  const filteredAssets = useMemo(
    () => (assetFilter === ALL_FILTER ? liveAssets : liveAssets.filter((asset) => asset.asset_type === assetFilter)),
    [assetFilter, liveAssets],
  );

  useEffect(() => {
    if (filteredAssets.length === 0) {
      setSelectedAssetId("");
      return;
    }
    const exists = filteredAssets.some((asset) => asset.id === selectedAssetId);
    if (!exists) setSelectedAssetId(filteredAssets[0].id);
  }, [filteredAssets, selectedAssetId]);

  const selectedAsset = useMemo(
    () => filteredAssets.find((asset) => asset.id === selectedAssetId) || null,
    [filteredAssets, selectedAssetId],
  );

  const availableModifiers = useMemo(() => {
    if (!selectedAsset) return [];
    return modifiers.filter((modifier) => {
      const targetTypes = normalizeArray(modifier.target_types).map((entry) => String(entry).toLowerCase());
      if (targetTypes.length === 0) return true;
      return targetTypes.includes(selectedAsset.asset_type) || targetTypes.includes("all");
    });
  }, [modifiers, selectedAsset]);

  useEffect(() => {
    if (availableModifiers.length === 0) {
      setSelectedModifierId("");
      return;
    }
    const exists = availableModifiers.some((modifier) => modifier.id === selectedModifierId);
    if (!exists) setSelectedModifierId(availableModifiers[0].id);
  }, [availableModifiers, selectedModifierId]);

  const selectedModifier = useMemo(
    () => availableModifiers.find((modifier) => modifier.id === selectedModifierId) || null,
    [availableModifiers, selectedModifierId],
  );

  const allStatKeys = useMemo(() => {
    const keys = new Set();
    statCatalog.forEach((entry) => keys.add(entry.key));
    Object.keys(selectedAsset?.stats || {}).forEach((key) => keys.add(key));
    Object.keys(normalizeObject(selectedModifier?.effects)).forEach((key) => keys.add(key));
    Object.keys(normalizeObject(blueprints.find((entry) => entry.id === leftBlueprintId)?.stats)).forEach((key) => keys.add(key));
    Object.keys(normalizeObject(blueprints.find((entry) => entry.id === rightBlueprintId)?.stats)).forEach((key) => keys.add(key));
    return [...keys].filter(Boolean);
  }, [blueprints, leftBlueprintId, rightBlueprintId, selectedAsset, selectedModifier, statCatalog]);

  const statMetaByKey = useMemo(
    () => Object.fromEntries(statCatalog.map((entry) => [entry.key, entry])),
    [statCatalog],
  );

  const modifierPreviewRows = useMemo(() => {
    if (!selectedAsset || !selectedModifier) return [];
    const effects = normalizeObject(selectedModifier.effects);
    return allStatKeys.map((key) => {
      const before = toNumber(selectedAsset.stats?.[key]);
      const after = key in effects ? applyEffect(before, effects[key]) : before;
      const delta = before === null || after === null ? null : after - before;
      const meta = statMetaByKey[key] || {};
      const lowerIsBetter = meta.lower_is_better === true || key === "power" || key === "weight";
      return {
        key,
        label: typeof meta.label === "string" ? meta.label : key.toUpperCase(),
        unit: typeof meta.unit === "string" ? meta.unit : "",
        before,
        after,
        delta,
        lowerIsBetter,
      };
    });
  }, [allStatKeys, selectedAsset, selectedModifier, statMetaByKey]);

  const modifierRequirements = useMemo(
    () => normalizeArray(selectedModifier?.resource_costs).filter((entry) => entry && typeof entry === "object"),
    [selectedModifier],
  );
  const modifierTechRequirements = useMemo(
    () => normalizeArray(selectedModifier?.tech_requirements).map((entry) => String(entry)),
    [selectedModifier],
  );

  const researchState = useMemo(() => getResearchStateMap(engineeringConfig), [engineeringConfig]);

  const isTechCompleted = (techId) => {
    const status = researchState.get(techId);
    return status === "completed" || status === "unlocked" || status === "active";
  };

  const queuedDemand = useMemo(() => {
    const allRequirements = demandQueue.flatMap((entry) => normalizeArray(entry.resource_costs));
    return sumRequirementMap(allRequirements);
  }, [demandQueue]);

  const demandRows = useMemo(
    () =>
      [...queuedDemand.entries()]
        .map(([key, required]) => {
          const available = resourceManifest.byName.get(key) || 0;
          return {
            item: key,
            required,
            available,
            shortfall: Math.max(0, required - available),
          };
        })
        .sort((a, b) => b.shortfall - a.shortfall),
    [queuedDemand, resourceManifest.byName],
  );

  const addToDemandQueue = () => {
    if (!selectedAsset || !selectedModifier) return;
    setDemandQueue((prev) => [
      {
        id: `${selectedAsset.id}-${selectedModifier.id}-${Date.now()}`,
        asset_id: selectedAsset.id,
        asset_label: selectedAsset.label,
        modifier_id: selectedModifier.id,
        modifier_label: selectedModifier.label,
        resource_costs: normalizeArray(selectedModifier.resource_costs),
      },
      ...prev,
    ]);
  };

  useEffect(() => {
    if (blueprints.length === 0) {
      setLeftBlueprintId("");
      setRightBlueprintId("");
      return;
    }
    if (!blueprints.some((entry) => entry.id === leftBlueprintId)) {
      setLeftBlueprintId(blueprints[0].id);
    }
    if (!blueprints.some((entry) => entry.id === rightBlueprintId)) {
      setRightBlueprintId(blueprints[Math.min(1, blueprints.length - 1)].id);
    }
  }, [blueprints, leftBlueprintId, rightBlueprintId]);

  const leftBlueprint = useMemo(
    () => blueprints.find((entry) => entry.id === leftBlueprintId) || null,
    [blueprints, leftBlueprintId],
  );
  const rightBlueprint = useMemo(
    () => blueprints.find((entry) => entry.id === rightBlueprintId) || null,
    [blueprints, rightBlueprintId],
  );

  useEffect(() => {
    if (forecastScenarios.length === 0) {
      setScenarioId("");
      return;
    }
    if (!forecastScenarios.some((entry) => entry.id === scenarioId)) {
      setScenarioId(forecastScenarios[0].id);
    }
  }, [forecastScenarios, scenarioId]);

  useEffect(() => {
    if (baseDefenseRows.length === 0) {
      setSelectedForecastBaseId("");
      setSelectedHealthBaseId("");
      return;
    }
    if (!baseDefenseRows.some((entry) => entry.id === selectedForecastBaseId)) {
      setSelectedForecastBaseId(baseDefenseRows[0].id);
    }
    if (!baseDefenseRows.some((entry) => entry.id === selectedHealthBaseId)) {
      setSelectedHealthBaseId(baseDefenseRows[0].id);
    }
  }, [baseDefenseRows, selectedForecastBaseId, selectedHealthBaseId]);

  const selectedScenario = useMemo(
    () => forecastScenarios.find((entry) => entry.id === scenarioId) || null,
    [forecastScenarios, scenarioId],
  );
  const selectedForecastBase = useMemo(
    () => baseDefenseRows.find((entry) => entry.id === selectedForecastBaseId) || null,
    [baseDefenseRows, selectedForecastBaseId],
  );
  const selectedHealthBase = useMemo(
    () => baseDefenseRows.find((entry) => entry.id === selectedHealthBaseId) || null,
    [baseDefenseRows, selectedHealthBaseId],
  );

  const scenarioEnvironmentFactor = useMemo(() => {
    const liveLoad = toNumber(serverStatus?.playerCount) ?? 0;
    const latency = toNumber(serverStatus?.responseTime) ?? 0;
    const stressFactor = 1 + liveLoad * 0.01 + latency * 0.0004;
    return clamp(stressFactor, 0.9, 1.6);
  }, [serverStatus]);

  const baseForecastRows = useMemo(() => {
    if (!selectedForecastBase || forecastResources.length === 0 || !selectedScenario) return [];

    const nearbyPlayers = playerLocations.filter((loc) => {
      const x = normalizePercentCoord(loc.x);
      const y = normalizePercentCoord(loc.y);
      if (x === null || y === null) return false;
      const stamp = parseDateMs(loc.timestamp);
      if (stamp !== null && nowMs - stamp > 30 * 60 * 1000) return false;
      return distance2d(x, y, selectedForecastBase.x, selectedForecastBase.y) <= 18;
    }).length;

    const localModulePower = liveAssets
      .filter((asset) => (asset.asset_type === "building" || asset.asset_type === "vehicle") && typeof asset.x === "number" && typeof asset.y === "number")
      .filter((asset) => distance2d(asset.x, asset.y, selectedForecastBase.x, selectedForecastBase.y) <= 20)
      .reduce((sum, asset) => sum + (toNumber(asset.stats?.power) ?? 0), 0);

    return forecastResources.map((resource) => {
      const patterns = normalizeArray(resource.patterns).map((entry) => String(entry).toLowerCase());
      const matchingRows = resourceManifest.rows.filter((row) => matchesResourcePattern(row.name, patterns));
      const localReserve = matchingRows
        .filter((row) => typeof row.location === "string" && row.location.toLowerCase().includes(selectedForecastBase.label.toLowerCase()))
        .reduce((sum, row) => sum + row.quantity, 0);
      const globalReserve = matchingRows.reduce((sum, row) => sum + row.quantity, 0);
      const reserve = localReserve > 0 ? localReserve : globalReserve;

      const baseBurn = Math.max(0.1, toNumber(resource.base_burn_per_hour) ?? 1);
      const moduleWeight = Math.max(0, toNumber(resource.module_power_weight) ?? 0.5);
      const threatWeight = Math.max(0, toNumber(resource.threat_weight) ?? 0.6);
      const activityWeight = Math.max(0, toNumber(resource.activity_weight) ?? 0.4);

      const burnRate =
        baseBurn *
        (toNumber(selectedScenario.activity_factor) ?? 1) *
        (toNumber(selectedScenario.threat_factor) ?? 1) *
        (toNumber(selectedScenario.environment_factor) ?? 1) *
        scenarioEnvironmentFactor *
        (1 + (localModulePower * moduleWeight) / 120 + (selectedForecastBase.avgVulnerability * threatWeight) / 100 + (nearbyPlayers * activityWeight) / 8);

      const hoursLeft = burnRate > 0 ? reserve / burnRate : null;
      return {
        id: resource.id,
        label: typeof resource.label === "string" ? resource.label : resource.id,
        unit: typeof resource.unit === "string" ? resource.unit : "units",
        reserve,
        burnRate,
        hoursLeft,
        in24h: Math.max(0, reserve - burnRate * 24),
        in48h: Math.max(0, reserve - burnRate * 48),
        in72h: Math.max(0, reserve - burnRate * 72),
      };
    });
  }, [
    forecastResources,
    liveAssets,
    nowMs,
    playerLocations,
    resourceManifest.rows,
    scenarioEnvironmentFactor,
    selectedForecastBase,
    selectedScenario,
  ]);

  const moduleHealthRows = useMemo(() => {
    if (!selectedHealthBase) return [];
    const criticalThreshold = clamp(toNumber(degradationConfig.critical_threshold) ?? 35, 10, 80);
    const baselineDecay = Math.max(0.1, toNumber(degradationConfig.baseline_decay_per_day) ?? 2.4);
    const attackWeight = Math.max(0.1, toNumber(degradationConfig.attack_damage_decay_weight) ?? 0.9);
    const stalePenalty = Math.max(0.05, toNumber(degradationConfig.stale_module_penalty_per_day) ?? 0.35);
    const repairTimePerTen = Math.max(0.1, toNumber(degradationConfig.repair_time_hours_per_10_integrity) ?? 0.8);

    const sourceModules = mapPins.filter((pin) => {
      const x = normalizePercentCoord(pin.x);
      const y = normalizePercentCoord(pin.y);
      if (x === null || y === null) return false;
      return distance2d(x, y, selectedHealthBase.x, selectedHealthBase.y) <= 22;
    });

    const buildingBlueprint = blueprints.find((entry) => entry.asset_type === "building") || null;
    const baseRepairTemplate = normalizeArray(buildingBlueprint?.resource_costs);

    return sourceModules.map((module) => {
      const x = normalizePercentCoord(module.x);
      const y = normalizePercentCoord(module.y);
      const integrity = clamp(
        readNumber(module, ["integrity", "durability", "health"]) ??
          readNumber(module, ["condition_percent"]) ??
          100,
        0,
        100,
      );

      const nearbyDamage = attackPoints.reduce((sum, point) => {
        if (x === null || y === null) return sum;
        const dist = distance2d(point.x, point.y, x, y);
        if (dist > 18) return sum;
        return sum + point.threat * (1 - dist / 18);
      }, 0);

      const updatedMs =
        parseDateMs(module.updated_date) ??
        parseDateMs(module.updated_at) ??
        parseDateMs(module.created_date) ??
        nowMs;
      const staleHours = Math.max(0, (nowMs - updatedMs) / 3_600_000);

      const degradationPerDay = baselineDecay + nearbyDamage * attackWeight * 0.08 + staleHours * stalePenalty * 0.03;
      const degradationPerHour = degradationPerDay / 24;
      const hoursToCritical =
        integrity <= criticalThreshold || degradationPerHour <= 0
          ? 0
          : (integrity - criticalThreshold) / degradationPerHour;
      const priorityScore =
        (100 - integrity) * 0.7 +
        nearbyDamage * 1.5 +
        (hoursToCritical > 0 && hoursToCritical < 24 ? 25 : 0) +
        (hoursToCritical > 0 && hoursToCritical < 72 ? 12 : 0);

      const repairFactor = clamp((100 - integrity) / 100, 0.05, 1);
      const repairEstimate = baseRepairTemplate.map((entry) => {
        const item = typeof entry.item === "string" ? entry.item : "UNKNOWN";
        const baseQuantity = Math.max(1, toNumber(entry.quantity) ?? 1);
        const needed = Math.ceil(baseQuantity * repairFactor);
        const available = resourceManifest.byName.get(item.toLowerCase()) || 0;
        return { item, needed, available };
      });

      return {
        id: module.id,
        label: typeof module.title === "string" && module.title.trim() ? module.title : "UNNAMED MODULE",
        type: typeof module.type === "string" ? module.type : "UNKNOWN",
        integrity,
        degradationPerDay,
        hoursToCritical,
        priorityScore,
        priority: toPriorityLabel(priorityScore),
        repairHours: ((100 - integrity) / 10) * repairTimePerTen,
        repairEstimate,
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [
    attackPoints,
    blueprints,
    degradationConfig,
    mapPins,
    nowMs,
    resourceManifest.byName,
    selectedHealthBase,
  ]);

  const techNodes = useMemo(
    () => [...techTree].sort((a, b) => (toNumber(a.tier) ?? 99) - (toNumber(b.tier) ?? 99)),
    [techTree],
  );

  const engineeringUnavailable = statCatalog.length === 0 || modifiers.length === 0 || techTree.length === 0;

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      <PageHeader icon={Wrench} title="ENGINEERING OPS" color={T.cyan}>
        <span className="text-xs" style={{ color: T.textFaint, fontSize: "9px", letterSpacing: "0.12em" }}>
          OPERATOR: {user?.full_name || user?.email || "UNAVAILABLE"}
        </span>
      </PageHeader>

      {(runtimeConfig.error || engineeringUnavailable) && (
        <div className="border px-3 py-2 text-xs flex items-center gap-2" style={{ borderColor: T.red + "66", color: T.red }}>
          <AlertTriangle size={12} />
          ENGINEERING CATALOG UNAVAILABLE OR INCOMPLETE
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: "LIVE ASSETS", value: liveAssets.length, color: T.cyan },
          { label: "MODIFIERS", value: modifiers.length, color: T.green },
          { label: "BLUEPRINTS", value: blueprints.length, color: T.amber },
          { label: "TECH NODES", value: techTree.length, color: T.textDim },
          { label: "DEMAND QUEUE", value: demandQueue.length, color: T.orange },
        ].map((stat) => (
          <div key={stat.label} className="border p-2.5 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
            <div style={{ color: T.textFaint, fontSize: "9px" }}>{stat.label}</div>
            <div style={{ color: stat.color, fontFamily: "'Orbitron', monospace", fontSize: "18px" }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <Panel title="HEATMAP FOR BASE DEFENSE EFFECTIVENESS" titleColor={T.red}>
        <div className="p-3 space-y-3">
          {baseDefenseRows.length === 0 ? (
            <EmptyState message="NO LIVE BASE COORDINATES AVAILABLE FOR DEFENSE HEATMAP" />
          ) : (
            <>
              <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${heatmapCols}, minmax(0, 1fr))` }}>
                {heatmapData.cells.map((cell) => {
                  const hue = Math.round((cell.effectiveness / 100) * 120);
                  const bg = `hsla(${hue}, 90%, 42%, ${0.2 + cell.vulnerability / 170})`;
                  return (
                    <div
                      key={cell.id}
                      title={`Threat ${cell.threatScore.toFixed(1)} | Defense ${cell.defenseScore.toFixed(1)} | Vulnerability ${cell.vulnerability.toFixed(1)}`}
                      style={{ height: "16px", background: bg, border: `1px solid ${T.border}` }}
                    />
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="border p-2 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
                  <div style={{ color: T.textFaint, fontSize: "9px" }}>RED ZONES</div>
                  <div style={{ color: T.red, fontFamily: "'Orbitron', monospace", fontSize: "16px" }}>{heatmapData.redZones}</div>
                </div>
                <div className="border p-2 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
                  <div style={{ color: T.textFaint, fontSize: "9px" }}>GREEN ZONES</div>
                  <div style={{ color: T.green, fontFamily: "'Orbitron', monospace", fontSize: "16px" }}>{heatmapData.greenZones}</div>
                </div>
                <div className="border p-2 text-center" style={{ borderColor: T.border, background: T.bg1 }}>
                  <div style={{ color: T.textFaint, fontSize: "9px" }}>AVG VULN</div>
                  <div style={{ color: T.amber, fontFamily: "'Orbitron', monospace", fontSize: "16px" }}>{Math.round(heatmapData.avgVulnerability)}</div>
                </div>
              </div>

              <TableHeader columns={["BASE", "STATUS", "VULN", "COVERAGE"]} style={{ gridTemplateColumns: "1.5fr 1fr 0.8fr 0.8fr" }} />
              {baseDefenseRows.map((row) => (
                <TableRow key={row.id} style={{ gridTemplateColumns: "1.5fr 1fr 0.8fr 0.8fr" }}>
                  <span style={{ color: T.text, fontSize: "10px" }}>{row.label}</span>
                  <span style={{ color: row.status === "UNDER THREAT" ? T.red : row.status === "FORTIFIED" ? T.green : T.amber, fontSize: "10px" }}>
                    {row.status}
                  </span>
                  <span style={{ color: T.red, fontSize: "10px" }}>{Math.round(row.avgVulnerability)}</span>
                  <span style={{ color: T.green, fontSize: "10px" }}>{Math.round(row.avgEffectiveness)}</span>
                </TableRow>
              ))}
            </>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="RESOURCE CONSUMPTION PREDICTION MODEL" titleColor={T.amber}>
          <div className="p-3 space-y-3">
            {forecastScenarios.length === 0 || forecastResources.length === 0 ? (
              <EmptyState message="FORECAST CONFIGURATION UNAVAILABLE" />
            ) : (
              <>
                <div className="flex flex-wrap gap-1">
                  {forecastScenarios.map((scenario) => (
                    <FilterPill
                      key={scenario.id}
                      label={typeof scenario.label === "string" ? scenario.label : scenario.id}
                      active={scenario.id === scenarioId}
                      color={T.amber}
                      onClick={() => setScenarioId(scenario.id)}
                    />
                  ))}
                </div>

                <Field label="BASE FORECAST TARGET">
                  <select
                    className="w-full text-xs px-2 py-1.5 border outline-none"
                    style={selectStyle}
                    value={selectedForecastBaseId}
                    onChange={(event) => setSelectedForecastBaseId(event.target.value)}
                  >
                    {baseDefenseRows.map((base) => (
                      <option key={base.id} value={base.id}>
                        {base.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {baseForecastRows.length === 0 ? (
                  <EmptyState message="NO LIVE DATA AVAILABLE FOR FORECAST MODEL" />
                ) : (
                  <>
                    <TableHeader columns={["RESOURCE", "RESERVE", "BURN/H", "HOURS LEFT"]} style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr" }} />
                    {baseForecastRows.map((row) => (
                      <TableRow key={row.id} style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr" }}>
                        <span style={{ color: T.text, fontSize: "10px" }}>{row.label}</span>
                        <span style={{ color: T.cyan, fontSize: "10px" }}>{Math.round(row.reserve)} {row.unit}</span>
                        <span style={{ color: T.amber, fontSize: "10px" }}>{row.burnRate.toFixed(2)}</span>
                        <span style={{ color: row.hoursLeft !== null && row.hoursLeft < 24 ? T.red : T.green, fontSize: "10px" }}>
                          {row.hoursLeft === null ? "UNAVAILABLE" : `${Math.round(row.hoursLeft)}h`}
                        </span>
                      </TableRow>
                    ))}

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {baseForecastRows.map((row) => (
                        <div key={`timeline-${row.id}`} className="border p-2" style={{ borderColor: T.border, background: T.bg1 }}>
                          <div style={{ color: T.textFaint, fontSize: "9px" }}>{row.label.toUpperCase()}</div>
                          <div style={{ color: T.textDim, fontSize: "9px" }}>24H: {Math.round(row.in24h)} {row.unit}</div>
                          <div style={{ color: T.textDim, fontSize: "9px" }}>48H: {Math.round(row.in48h)} {row.unit}</div>
                          <div style={{ color: row.in72h <= 0 ? T.red : T.textDim, fontSize: "9px" }}>72H: {Math.round(row.in72h)} {row.unit}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </Panel>

        <Panel title="BASE HEALTH DEGRADATION TRACKER" titleColor={T.orange}>
          <div className="p-3 space-y-3">
            {baseDefenseRows.length === 0 ? (
              <EmptyState message="NO BASE TARGETS AVAILABLE FOR DEGRADATION TRACKING" />
            ) : (
              <>
                <Field label="BASE HEALTH TARGET">
                  <select
                    className="w-full text-xs px-2 py-1.5 border outline-none"
                    style={selectStyle}
                    value={selectedHealthBaseId}
                    onChange={(event) => setSelectedHealthBaseId(event.target.value)}
                  >
                    {baseDefenseRows.map((base) => (
                      <option key={base.id} value={base.id}>
                        {base.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {moduleHealthRows.length === 0 ? (
                  <EmptyState message="NO MODULE TELEMETRY AVAILABLE NEAR SELECTED BASE" />
                ) : (
                  <>
                    <TableHeader columns={["MODULE", "INTEGRITY", "DECAY/DAY", "ETA CRIT", "PRIORITY"]} style={{ gridTemplateColumns: "1.4fr 1fr 0.9fr 0.9fr 0.8fr" }} />
                    {moduleHealthRows.slice(0, 12).map((module) => (
                      <TableRow key={module.id} style={{ gridTemplateColumns: "1.4fr 1fr 0.9fr 0.9fr 0.8fr" }}>
                        <span style={{ color: T.text, fontSize: "10px" }}>{module.label}</span>
                        <span style={{ color: module.integrity < 40 ? T.red : module.integrity < 65 ? T.amber : T.green, fontSize: "10px" }}>
                          {Math.round(module.integrity)}%
                        </span>
                        <span style={{ color: T.textDim, fontSize: "10px" }}>{module.degradationPerDay.toFixed(2)}</span>
                        <span style={{ color: module.hoursToCritical < 24 ? T.red : T.textDim, fontSize: "10px" }}>
                          {module.hoursToCritical <= 0 ? "NOW" : `${Math.round(module.hoursToCritical)}h`}
                        </span>
                        <span style={{ color: module.priority === "P1" ? T.red : module.priority === "P2" ? T.amber : T.textDim, fontSize: "10px" }}>
                          {module.priority}
                        </span>
                      </TableRow>
                    ))}

                    {moduleHealthRows[0] && (
                      <div className="border p-2 space-y-1" style={{ borderColor: T.border }}>
                        <div style={{ color: T.textFaint, fontSize: "9px", letterSpacing: "0.1em" }}>
                          MAINTENANCE PRIORITY: {moduleHealthRows[0].label}
                        </div>
                        <div style={{ color: T.textDim, fontSize: "10px" }}>
                          EST. REPAIR WINDOW: {moduleHealthRows[0].repairHours.toFixed(1)}h
                        </div>
                        {moduleHealthRows[0].repairEstimate.length > 0 && (
                          <div className="grid grid-cols-2 gap-1">
                            {moduleHealthRows[0].repairEstimate.slice(0, 6).map((entry) => (
                              <div key={entry.item} style={{ color: entry.available >= entry.needed ? T.green : T.red, fontSize: "9px" }}>
                                {entry.item}: {entry.available}/{entry.needed}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="INTERACTIVE MODIFICATION PREVIEW" titleColor={T.cyan}>
          <div className="p-3 space-y-3">
            <div className="flex flex-wrap gap-1">
              <FilterPill label="ALL" active={assetFilter === ALL_FILTER} color={T.cyan} onClick={() => setAssetFilter(ALL_FILTER)} />
              {assetTypeOptions.map((entry) => (
                <FilterPill key={entry.id} label={entry.label} active={assetFilter === entry.id} color={T.cyan} onClick={() => setAssetFilter(entry.id)} />
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="TARGET ASSET">
                <select className="w-full text-xs px-2 py-1.5 border outline-none" style={selectStyle} value={selectedAssetId} onChange={(event) => setSelectedAssetId(event.target.value)}>
                  {filteredAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.label} [{asset.asset_type.toUpperCase()}]
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="MODIFICATION PROFILE">
                <select className="w-full text-xs px-2 py-1.5 border outline-none" style={selectStyle} value={selectedModifierId} onChange={(event) => setSelectedModifierId(event.target.value)}>
                  {availableModifiers.map((modifier) => (
                    <option key={modifier.id} value={modifier.id}>
                      {modifier.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {!selectedAsset || !selectedModifier ? (
              <EmptyState message="NO LIVE ASSET/MODIFIER MATCH FOR PREVIEW" />
            ) : (
              <>
                <TableHeader columns={["STAT", "BEFORE", "AFTER", "DELTA"]} style={{ gridTemplateColumns: "1.3fr 1fr 1fr 1fr" }} />
                {modifierPreviewRows.map((row) => {
                  let deltaColor = T.textFaint;
                  if (typeof row.delta === "number" && row.delta !== 0) {
                    const positive = row.delta > 0;
                    deltaColor = row.lowerIsBetter ? (positive ? T.red : T.green) : positive ? T.green : T.red;
                  }
                  return (
                    <TableRow key={row.key} style={{ gridTemplateColumns: "1.3fr 1fr 1fr 1fr" }}>
                      <span style={{ color: T.text, fontSize: "10px" }}>{row.label}</span>
                      <span style={{ color: T.textDim, fontSize: "10px" }}>{formatValue(row.before, row.unit)}</span>
                      <span style={{ color: T.cyan, fontSize: "10px" }}>{formatValue(row.after, row.unit)}</span>
                      <span style={{ color: deltaColor, fontSize: "10px" }}>
                        {typeof row.delta === "number"
                          ? `${row.delta > 0 ? "+" : ""}${Number(row.delta.toFixed(1))}${row.unit ? ` ${row.unit}` : ""}`
                          : "UNAVAILABLE"}
                      </span>
                    </TableRow>
                  );
                })}

                <div className="border p-2 space-y-2" style={{ borderColor: T.border }}>
                  <div style={{ color: T.textFaint, fontSize: "9px", letterSpacing: "0.12em" }}>RESOURCE TECH REQUIREMENTS</div>
                  {modifierRequirements.length === 0 ? (
                    <div style={{ color: T.textDim, fontSize: "10px" }}>NO RESOURCE COST PROFILE</div>
                  ) : (
                    modifierRequirements.map((req, index) => {
                      const item = typeof req.item === "string" ? req.item : "UNKNOWN";
                      const quantity = toNumber(req.quantity) ?? 0;
                      const available = resourceManifest.byName.get(item.toLowerCase()) || 0;
                      const enough = available >= quantity;
                      return (
                        <div key={`${item}-${index}`} className="flex items-center justify-between" style={{ fontSize: "10px" }}>
                          <span style={{ color: T.text }}>{item}</span>
                          <span style={{ color: enough ? T.green : T.red }}>
                            {available}/{quantity}
                          </span>
                        </div>
                      );
                    })
                  )}
                  {modifierTechRequirements.length > 0 && (
                    <div className="pt-1 border-t" style={{ borderColor: T.border }}>
                      {modifierTechRequirements.map((techId) => (
                        <div key={techId} className="flex items-center justify-between" style={{ fontSize: "10px" }}>
                          <span style={{ color: T.textDim }}>{techId}</span>
                          <span style={{ color: isTechCompleted(techId) ? T.green : T.red }}>
                            {isTechCompleted(techId) ? "READY" : "LOCKED"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <ActionBtn color={T.cyan} onClick={addToDemandQueue} disabled={!selectedModifier || !selectedAsset}>
                    <Boxes size={10} /> ADD TO SHARED CONSTRUCTION/UPGRADE QUEUE
                  </ActionBtn>
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel
          title="PROJECTED RESOURCE DEMAND PLANNER"
          titleColor={T.amber}
          headerRight={(
            <ActionBtn small color={T.textDim} onClick={() => setDemandQueue([])} disabled={demandQueue.length === 0}>
              CLEAR
            </ActionBtn>
          )}
        >
          <div className="p-3 space-y-3">
            {demandQueue.length === 0 ? (
              <EmptyState message="QUEUE EMPTY - ADD MODIFICATIONS TO PROJECT DEMAND" />
            ) : (
              <>
                <div className="space-y-1">
                  {demandQueue.slice(0, 8).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between text-xs border-b pb-1" style={{ borderColor: T.border + "44" }}>
                      <span style={{ color: T.text }}>{entry.asset_label}</span>
                      <span style={{ color: T.cyan, fontSize: "10px" }}>{entry.modifier_label}</span>
                    </div>
                  ))}
                </div>

                <TableHeader columns={["RESOURCE", "REQUIRED", "AVAILABLE", "SHORTFALL"]} style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr" }} />
                {demandRows.map((row) => (
                  <TableRow key={row.item} style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr" }}>
                    <span style={{ color: T.text }}>{row.item}</span>
                    <span style={{ color: T.amber }}>{Math.round(row.required)}</span>
                    <span style={{ color: T.cyan }}>{Math.round(row.available)}</span>
                    <span style={{ color: row.shortfall > 0 ? T.red : T.green }}>{Math.round(row.shortfall)}</span>
                  </TableRow>
                ))}
              </>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="COMPARATIVE BLUEPRINT VIEWER" titleColor={T.green}>
          <div className="p-3 space-y-3">
            {blueprints.length === 0 ? (
              <EmptyState message="BLUEPRINT CATALOG UNAVAILABLE" />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="BLUEPRINT A">
                    <select className="w-full text-xs px-2 py-1.5 border outline-none" style={selectStyle} value={leftBlueprintId} onChange={(event) => setLeftBlueprintId(event.target.value)}>
                      {blueprints.map((entry) => (
                        <option key={entry.id} value={entry.id}>{entry.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="BLUEPRINT B">
                    <select className="w-full text-xs px-2 py-1.5 border outline-none" style={selectStyle} value={rightBlueprintId} onChange={(event) => setRightBlueprintId(event.target.value)}>
                      {blueprints.map((entry) => (
                        <option key={entry.id} value={entry.id}>{entry.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <TableHeader columns={["STAT", "A", "B", "DELTA(B-A)"]} style={{ gridTemplateColumns: "1.3fr 1fr 1fr 1fr" }} />
                {allStatKeys.map((key) => {
                  const leftValue = toNumber(leftBlueprint?.stats?.[key]);
                  const rightValue = toNumber(rightBlueprint?.stats?.[key]);
                  const delta = leftValue === null || rightValue === null ? null : rightValue - leftValue;
                  const meta = statMetaByKey[key] || {};
                  const unit = typeof meta.unit === "string" ? meta.unit : "";
                  return (
                    <TableRow key={key} style={{ gridTemplateColumns: "1.3fr 1fr 1fr 1fr" }}>
                      <span style={{ color: T.text, fontSize: "10px" }}>{typeof meta.label === "string" ? meta.label : key.toUpperCase()}</span>
                      <span style={{ color: T.textDim, fontSize: "10px" }}>{formatValue(leftValue, unit)}</span>
                      <span style={{ color: T.cyan, fontSize: "10px" }}>{formatValue(rightValue, unit)}</span>
                      <span style={{ color: typeof delta === "number" ? (delta >= 0 ? T.green : T.red) : T.textFaint, fontSize: "10px" }}>
                        {typeof delta === "number" ? `${delta >= 0 ? "+" : ""}${Number(delta.toFixed(1))}${unit ? ` ${unit}` : ""}` : "UNAVAILABLE"}
                      </span>
                    </TableRow>
                  );
                })}
              </>
            )}
          </div>
        </Panel>

        <Panel title="DYNAMIC RESEARCH & DEVELOPMENT TREE" titleColor={T.orange}>
          <div className="p-3 space-y-2">
            {techNodes.length === 0 ? (
              <EmptyState message="R&D TREE UNAVAILABLE" />
            ) : (
              techNodes.map((node) => {
                const requires = normalizeArray(node.requires).map((entry) => String(entry));
                const explicitState = researchState.get(node.id) || "";
                const prereqsReady = requires.every((id) => isTechCompleted(id));
                const status = explicitState || (prereqsReady ? "available" : "locked");
                const nodeCosts = normalizeArray(node.resource_costs).filter((entry) => entry && typeof entry === "object");
                return (
                  <div key={node.id} className="border p-2" style={{ borderColor: T.border, background: T.bg1 }}>
                    <div className="flex items-center justify-between">
                      <div style={{ color: T.text, fontSize: "11px" }}>{node.label}</div>
                      <div style={{ color: status === "completed" || status === "unlocked" ? T.green : status === "available" ? T.amber : T.textFaint, fontSize: "9px", letterSpacing: "0.1em" }}>
                        {status.toUpperCase()}
                      </div>
                    </div>
                    <div style={{ color: T.textFaint, fontSize: "9px" }}>TIER {toNumber(node.tier) ?? "?"}</div>
                    {requires.length > 0 && <div style={{ color: T.textDim, fontSize: "9px", marginTop: 2 }}>REQUIRES: {requires.join(", ")}</div>}
                    {nodeCosts.length > 0 && (
                      <div className="grid grid-cols-2 gap-1 mt-2">
                        {nodeCosts.map((cost, index) => {
                          const item = typeof cost.item === "string" ? cost.item : "UNKNOWN";
                          const needed = toNumber(cost.quantity) ?? 0;
                          const available = resourceManifest.byName.get(item.toLowerCase()) || 0;
                          return (
                            <div key={`${node.id}-${index}`} style={{ fontSize: "9px", color: available >= needed ? T.green : T.red }}>
                              {item}: {available}/{needed}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {normalizeArray(node.unlocks).length > 0 && (
                      <div style={{ color: T.cyan, fontSize: "9px", marginTop: 2 }}>
                        UNLOCKS: {normalizeArray(node.unlocks).join(", ")}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Panel>
      </div>

      <Panel title="CENTRALIZED RESOURCE MANIFEST (LIVE)" titleColor={T.textDim}>
        <div className="p-3">
          {resourceManifest.rows.length === 0 ? (
            <EmptyState message="NO LIVE RESOURCE DATA AVAILABLE" />
          ) : (
            <>
              <TableHeader columns={["ITEM", "QTY", "CATEGORY", "LOCATION"]} style={{ gridTemplateColumns: "2fr 0.7fr 1fr 1fr" }} />
              {resourceManifest.rows.slice(0, 30).map((entry, index) => (
                <TableRow key={`${entry.name}-${index}`} style={{ gridTemplateColumns: "2fr 0.7fr 1fr 1fr" }}>
                  <span style={{ color: T.text, fontSize: "10px" }}>{entry.name}</span>
                  <span style={{ color: T.cyan, fontSize: "10px" }}>{entry.quantity}</span>
                  <span style={{ color: T.textDim, fontSize: "10px" }}>{entry.category}</span>
                  <span style={{ color: T.textFaint, fontSize: "10px" }}>{entry.location}</span>
                </TableRow>
              ))}
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
