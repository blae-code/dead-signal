import { memo, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const C = {
  text: "#eee5d6",
  textDim: "#d0bfa6",
  textFaint: "#a79b8f",
  border: "#2a1e10",
  borderHi: "#3e2c18",
  bg1: "#1c1c20",
  bg2: "#18181c",
  green: "#39ff14",
  amber: "#ffaa00",
  red: "#ff2020",
  cyan: "#00e8ff",
  orange: "#ff6a00",
  teal: "#00c8a0",
  purple: "#b060ff",
};

const DEFAULT_SEASONS = [
  {
    name: "Winter",
    start_month: 12,
    end_month: 2,
    color: C.cyan,
    impacts: [
      "Body temperature drain +24%",
      "Hydration loss -10%",
      "Night visibility +8% on clear skies",
    ],
  },
  {
    name: "Spring",
    start_month: 3,
    end_month: 5,
    color: C.green,
    impacts: [
      "Crop yield +18%",
      "Ambient infection spread +7%",
      "Road traction baseline",
    ],
  },
  {
    name: "Summer",
    start_month: 6,
    end_month: 8,
    color: C.amber,
    impacts: [
      "Hydration drain +26%",
      "Heat fatigue threshold -14%",
      "Solar array output +22%",
    ],
  },
  {
    name: "Autumn",
    start_month: 9,
    end_month: 11,
    color: C.orange,
    impacts: [
      "Foraging yield +12%",
      "Fog event probability +18%",
      "Daylight window -21 minutes/day",
    ],
  },
];

const WEATHER_PROFILES = {
  clear: {
    label: "Clear Front",
    color: C.green,
    effects: [
      "Recon visibility +12%",
      "Ballistic drift baseline",
      "Threat detection latency -0.4s",
    ],
  },
  cloudy: {
    label: "Cloud Cover",
    color: C.amber,
    effects: [
      "Solar efficiency -14%",
      "Long-range spotting -8%",
      "Ambient light variance +6%",
    ],
  },
  fog: {
    label: "Heavy Fog",
    color: C.orange,
    effects: [
      "Visual range -38%",
      "Target acquisition delay +1.9s",
      "Suppressed approach success +16%",
    ],
  },
  rain: {
    label: "Rain Cell",
    color: C.cyan,
    effects: [
      "Footstep masking +18%",
      "Weapon handling stability -11%",
      "Body temp drain +9%",
    ],
  },
  snow: {
    label: "Snowfall",
    color: C.cyan,
    effects: [
      "Movement speed -9%",
      "Thermal stress +18%",
      "Track persistence +22%",
    ],
  },
  storm: {
    label: "Electrical Storm",
    color: C.red,
    effects: [
      "Visual range -45%",
      "Audio masking +31%",
      "Projectile drift +17%",
    ],
  },
  unknown: {
    label: "Signal Unknown",
    color: C.purple,
    effects: [
      "Environmental telemetry unavailable",
      "Use manual recon protocols",
      "Apply +15% tactical safety margin",
    ],
  },
};

const asObject = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});
const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const weatherCategoryFromCode = (code) => {
  const normalized = Number(code);
  if (!Number.isFinite(normalized)) return "unknown";
  if (normalized === 0) return "clear";
  if ([1, 2, 3, 45, 48].includes(normalized)) return normalized >= 45 ? "fog" : "cloudy";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(normalized)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(normalized)) return "snow";
  if ([95, 96, 99].includes(normalized)) return "storm";
  return "unknown";
};

const parseTimeZoneParts = (date, timezone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: toNumber(map.year, 1970),
    month: toNumber(map.month, 1),
    day: toNumber(map.day, 1),
    weekday: map.weekday || "N/A",
    hour: toNumber(map.hour, 0),
    minute: toNumber(map.minute, 0),
    second: toNumber(map.second, 0),
  };
};

const inSeason = (month, season) => {
  const start = toNumber(season.start_month, 1);
  const end = toNumber(season.end_month, 12);
  if (start <= end) return month >= start && month <= end;
  return month >= start || month <= end;
};

const normalizeSeasons = (value) => {
  if (!Array.isArray(value)) return DEFAULT_SEASONS;
  const parsed = value
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      name: typeof entry.name === "string" && entry.name.trim() ? entry.name : "Unknown Season",
      start_month: toNumber(entry.start_month, 1),
      end_month: toNumber(entry.end_month, 12),
      color: typeof entry.color === "string" && entry.color ? entry.color : C.amber,
      impacts: Array.isArray(entry.impacts)
        ? entry.impacts.filter((item) => typeof item === "string" && item.trim())
        : [],
    }))
    .filter((entry) => Number.isFinite(entry.start_month) && Number.isFinite(entry.end_month));
  return parsed.length > 0 ? parsed : DEFAULT_SEASONS;
};

const resolveSeason = (month, seasons) => {
  const hit = seasons.find((season) => inSeason(month, season));
  return hit || DEFAULT_SEASONS[0];
};

const resolveTemperatureCondition = (tempF) => {
  if (!Number.isFinite(tempF)) {
    return {
      label: "Thermal Unknown",
      color: C.purple,
      effects: [
        "Temperature telemetry unavailable",
        "Assume neutral thermal profile",
        "Keep reserve hydration +10%",
      ],
    };
  }
  if (tempF <= 20) {
    return {
      label: "Severe Freeze",
      color: C.cyan,
      effects: [
        "Hypothermia risk +35%",
        "Stamina regeneration -18%",
        "Firearm jam risk +9%",
      ],
    };
  }
  if (tempF <= 40) {
    return {
      label: "Cold Front",
      color: C.cyan,
      effects: [
        "Thermal stress +16%",
        "Sprint duration -8%",
        "Food burn rate +7%",
      ],
    };
  }
  if (tempF >= 100) {
    return {
      label: "Heatwave",
      color: C.red,
      effects: [
        "Hydration drain +38%",
        "Weapon sway +11%",
        "Fatigue threshold -21%",
      ],
    };
  }
  if (tempF >= 85) {
    return {
      label: "High Heat",
      color: C.orange,
      effects: [
        "Hydration drain +24%",
        "Stamina recovery -12%",
        "Overheat risk +14%",
      ],
    };
  }
  return {
    label: "Temperate",
    color: C.teal,
    effects: [
      "Thermal profile nominal",
      "Stamina and hydration baseline",
      "No environmental thermal penalties",
    ],
  };
};

const localTimezoneLabel = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "LOCAL";
  } catch {
    return "LOCAL";
  }
};

const resolveTimezone = (candidate, fallback = "UTC") => {
  const selected = typeof candidate === "string" && candidate ? candidate : fallback;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: selected }).format(new Date());
    return selected;
  } catch {
    return fallback;
  }
};

const formatLocalDate = (date) => date.toLocaleDateString("en-US", {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "2-digit",
});

const formatClock = (date, timezone) => date.toLocaleTimeString("en-US", {
  hour12: false,
  timeZone: timezone,
});

const formatDate = (date, timezone) => date.toLocaleDateString("en-US", {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "2-digit",
  timeZone: timezone,
});

const ClockPanel = memo(function ClockPanel({ accent, label, time, subline, timezone, blink }) {
  return (
    <div
      className="border px-3 py-2 min-w-[170px]"
      style={{
        borderColor: `${accent}66`,
        background: C.bg1,
        boxShadow: `inset 0 1px 0 rgba(78, 58, 34, 0.2), 0 3px 9px rgba(0, 0, 0, 0.5)`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <motion.div
          animate={blink ? { opacity: [1, 0.25, 1] } : { opacity: 1 }}
          transition={blink ? { duration: 1.2, repeat: Infinity } : undefined}
          className="ds-circle"
          style={{ width: 5, height: 5, background: accent, boxShadow: `0 0 5px ${accent}` }}
        />
        <span style={{ color: accent, fontFamily: "'Orbitron', monospace", fontSize: "8px", letterSpacing: "0.14em" }}>
          {label}
        </span>
      </div>
      <div style={{ color: C.text, fontFamily: "'Orbitron', monospace", fontSize: "13px", letterSpacing: "0.12em" }}>
        {time}
      </div>
      <div style={{ color: C.textDim, fontSize: "8px", letterSpacing: "0.1em" }}>{subline}</div>
      <div style={{ color: C.textFaint, fontSize: "7px", letterSpacing: "0.1em", marginTop: 2 }}>{timezone}</div>
    </div>
  );
});

const ConditionPill = memo(function ConditionPill({ condition }) {
  const tooltip = `${condition.title} // ${condition.label}\n${condition.flavor}\n${condition.effects.map((entry) => `- ${entry}`).join("\n")}`;
  return (
    <div
      title={tooltip}
      className="border px-2 py-1 cursor-help"
      style={{
        borderColor: `${condition.color}66`,
        background: `${condition.color}12`,
      }}
    >
      <div style={{ color: condition.color, fontFamily: "'Orbitron', monospace", fontSize: "7px", letterSpacing: "0.14em" }}>
        {condition.title}
      </div>
      <div style={{ color: C.textDim, fontSize: "8px", letterSpacing: "0.08em" }}>
        {condition.label}
      </div>
    </div>
  );
});

export default function HeaderChronometer({ animationEnabled, runtimeConfig, appTimezone = "America/Vancouver" }) {
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState(null);

  const worldConfig = useMemo(() => asObject(runtimeConfig?.config?.world), [runtimeConfig]);
  const serverTimezone = resolveTimezone(
    typeof worldConfig.server_timezone === "string" && worldConfig.server_timezone
      ? worldConfig.server_timezone
      : appTimezone,
    resolveTimezone(appTimezone, "UTC"),
  );
  const timeScale = Math.max(0.1, toNumber(worldConfig.time_scale, 6));
  const anchorRealMs = Date.parse(typeof worldConfig.anchor_real_iso === "string" ? worldConfig.anchor_real_iso : "2026-01-01T00:00:00Z");
  const anchorGameMs = Date.parse(typeof worldConfig.anchor_game_iso === "string" ? worldConfig.anchor_game_iso : "2234-03-01T06:00:00Z");
  const dayZeroMs = Date.parse(typeof worldConfig.day_zero_game_iso === "string" ? worldConfig.day_zero_game_iso : "2234-01-01T00:00:00Z");
  const seasons = useMemo(() => normalizeSeasons(worldConfig.seasons), [worldConfig]);

  const geo = useMemo(() => {
    const coords = asObject(worldConfig.conditions_location);
    return {
      latitude: toNumber(coords.latitude, 49.2827),
      longitude: toNumber(coords.longitude, -123.1207),
    };
  }, [worldConfig]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchConditions = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,is_day,weather_code,wind_speed_10m,cloud_cover,precipitation&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;
        const response = await fetch(url);
        if (!response.ok) return;
        const payload = await response.json();
        if (cancelled) return;
        const current = asObject(payload.current);
        setWeather({
          code: toNumber(current.weather_code, NaN),
          tempF: toNumber(current.temperature_2m, NaN),
          windMph: toNumber(current.wind_speed_10m, NaN),
          cloudCover: toNumber(current.cloud_cover, NaN),
          precipitationIn: toNumber(current.precipitation, NaN),
        });
      } catch {
        // keep previous weather data when polling fails
      }
    };

    fetchConditions();
    const weatherInterval = setInterval(fetchConditions, 600_000);
    return () => {
      cancelled = true;
      clearInterval(weatherInterval);
    };
  }, [geo.latitude, geo.longitude]);

  const localTime = now.toLocaleTimeString("en-US", { hour12: false });
  const localDate = formatLocalDate(now);
  const localTz = localTimezoneLabel();

  const gameNowMs = useMemo(() => {
    const nowMs = now.getTime();
    const baseRealMs = Number.isFinite(anchorRealMs) ? anchorRealMs : nowMs;
    const baseGameMs = Number.isFinite(anchorGameMs) ? anchorGameMs : nowMs;
    return baseGameMs + (nowMs - baseRealMs) * timeScale;
  }, [now, anchorRealMs, anchorGameMs, timeScale]);

  const gameNow = useMemo(() => new Date(gameNowMs), [gameNowMs]);
  const gameParts = useMemo(() => parseTimeZoneParts(gameNow, serverTimezone), [gameNow, serverTimezone]);
  const gameSeason = useMemo(() => resolveSeason(gameParts.month, seasons), [gameParts.month, seasons]);
  const isNight = gameParts.hour >= 20 || gameParts.hour < 6;
  const gameDay = useMemo(() => {
    const baseline = Number.isFinite(dayZeroMs) ? dayZeroMs : gameNowMs;
    return Math.max(1, Math.floor((gameNowMs - baseline) / 86_400_000) + 1);
  }, [dayZeroMs, gameNowMs]);

  const weatherProfile = useMemo(() => {
    const category = weatherCategoryFromCode(weather?.code);
    return WEATHER_PROFILES[category] || WEATHER_PROFILES.unknown;
  }, [weather]);

  const thermalProfile = useMemo(() => resolveTemperatureCondition(weather?.tempF), [weather]);

  const conditions = useMemo(() => {
    const lightCondition = {
      title: "LIGHT CYCLE",
      label: isNight ? "Night Operations" : "Day Operations",
      color: isNight ? C.purple : C.teal,
      flavor: isNight
        ? "Dark-phase engagement favors stealth and close-quarters control."
        : "Day-phase engagement favors long-range recon and mobility.",
      effects: isNight
        ? [
            "Visual detection range -28%",
            "Hostile aggression index +22%",
            "Stealth noise masking +18%",
          ]
        : [
            "Visual detection range +16%",
            "Long-range targeting confidence +11%",
            "Stealth masking baseline",
          ],
    };

    const weatherCondition = {
      title: "GLOBAL WEATHER",
      label: weatherProfile.label,
      color: weatherProfile.color,
      flavor: "Macro-atmospheric pressure band currently influencing all active sectors.",
      effects: weatherProfile.effects,
    };

    const thermalCondition = {
      title: "THERMAL LOAD",
      label: thermalProfile.label,
      color: thermalProfile.color,
      flavor: "Biometric strain model calibrated against current air profile.",
      effects: thermalProfile.effects,
    };

    const seasonCondition = {
      title: "SEASONAL STATE",
      label: gameSeason.name,
      color: gameSeason.color || C.amber,
      flavor: "Seasonal baseline modifies ecology, supply output, and traversal risk.",
      effects: gameSeason.impacts && gameSeason.impacts.length > 0
        ? gameSeason.impacts
        : ["No season impact metadata configured."],
    };

    return [lightCondition, weatherCondition, thermalCondition, seasonCondition];
  }, [gameSeason, isNight, thermalProfile, weatherProfile]);

  return (
    <div className="hidden lg:flex flex-1 justify-end">
      <div
        className="flex items-stretch gap-2 max-w-[760px] w-full justify-end border p-1"
        style={{
          borderColor: `${C.borderHi}88`,
          background: "rgba(24, 24, 28, 0.72)",
          boxShadow: "inset 0 1px 0 rgba(78, 58, 34, 0.18), 0 3px 10px rgba(0, 0, 0, 0.45)",
        }}
      >
        <ClockPanel
          accent={C.amber}
          label="LOCAL REAL TIME"
          time={localTime}
          subline={localDate}
          timezone={localTz}
          blink={animationEnabled}
        />

        <div
          className="border px-3 py-2 min-w-[470px]"
          style={{
            borderColor: `${C.cyan}66`,
            background: C.bg1,
            boxShadow: "inset 0 1px 0 rgba(78, 58, 34, 0.2), 0 3px 9px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <ClockPanel
              accent={C.cyan}
              label="INGAME SERVER TIME"
              time={formatClock(gameNow, serverTimezone)}
              subline={`DAY ${gameDay} | ${formatDate(gameNow, serverTimezone)} | ${gameSeason.name.toUpperCase()}`}
              timezone={serverTimezone}
              blink={animationEnabled}
            />
            <div className="text-right" style={{ minWidth: 95 }}>
              <div style={{ color: C.textFaint, fontSize: "7px", letterSpacing: "0.14em" }}>ENV DATA LINK</div>
              <div style={{ color: weather ? C.green : C.red, fontSize: "9px", letterSpacing: "0.1em" }}>
                {weather ? "TELEMETRY LIVE" : "OFFLINE"}
              </div>
              <div style={{ color: C.textDim, fontSize: "8px", letterSpacing: "0.08em" }}>
                {Number.isFinite(weather?.tempF) ? `${Math.round(weather.tempF)}F` : "TEMP N/A"} | {Number.isFinite(weather?.windMph) ? `${Math.round(weather.windMph)}MPH` : "WIND N/A"}
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {conditions.map((condition) => (
              <ConditionPill key={condition.title} condition={condition} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
