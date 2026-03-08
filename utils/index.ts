const LEGACY_PAGE_ROUTE_MAP: Record<string, string> = {
    Dashboard: "/ops",
    Missions: "/ops/missions",
    TacticalMap: "/ops",
    ClanRoster: "/roster",
    PlayerProfile: "/roster",
    Inventory: "/logistics/inventory",
    EngineeringOps: "/logistics/engineering",
    ServerMonitor: "/systems/server",
    Intel: "/community/intel",
    ClanBoard: "/community/announcements",
    ClanWiki: "/community/intel",
    ClanVoting: "/community",
    ClanMap: "/ops",
    ClanCalendar: "/community",
    ClanTreasury: "/logistics",
    AIAgent: "/community",
    Challenges: "/ops",
    DeathMap: "/ops",
    LoadoutPlanner: "/logistics/engineering",
    LootSharing: "/logistics/inventory",
    LootTracker: "/logistics/inventory",
    MyStats: "/roster",
    PostMissionAnalysis: "/ops/missions",
    ResourceTradingHub: "/logistics",
    SquadVitalsMonitor: "/systems/server",
    SupplyChainManager: "/logistics/engineering",
    SurvivalPlanner: "/ops",
};

export const LEGACY_ROUTE_REDIRECTS = Object.entries(LEGACY_PAGE_ROUTE_MAP).map(([legacyPage, route]) => ({
    from: `/${legacyPage}`,
    to: route,
}));

const ensureLeadingSlash = (value: string) => (value.startsWith("/") ? value : `/${value}`);

export function createPageUrl(pageName: string) {
    if (!pageName) return "/ops";

    const input = pageName.trim();
    if (!input) return "/ops";

    if (input.startsWith("/")) {
        return input;
    }

    const [rawPath, queryString = ""] = input.split("?");
    const mapped = LEGACY_PAGE_ROUTE_MAP[rawPath] || ensureLeadingSlash(rawPath.replace(/ /g, "-"));

    // Legacy support: PlayerProfile?id=<memberId> now routes to /roster/player/<memberId>
    if (rawPath === "PlayerProfile" && queryString) {
        const query = new URLSearchParams(queryString);
        const id = query.get("id");
        if (id) {
            return `/roster/player/${encodeURIComponent(id)}`;
        }
    }

    return queryString ? `${mapped}?${queryString}` : mapped;
}
