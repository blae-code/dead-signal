/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from "react";
import __Layout from './Layout.jsx';

const lazyPage = (loader) => {
    const Page = lazy(loader);
    Page.preload = loader;
    return Page;
};

const AIAgent = lazyPage(() => import("./pages/AIAgent"));
const Challenges = lazyPage(() => import("./pages/Challenges"));
const ClanBoard = lazyPage(() => import("./pages/ClanBoard"));
const ClanCalendar = lazyPage(() => import("./pages/ClanCalendar"));
const ClanRoster = lazyPage(() => import("./pages/ClanRoster"));
const ClanTreasury = lazyPage(() => import("./pages/ClanTreasury"));
const ClanVoting = lazyPage(() => import("./pages/ClanVoting"));
const ClanWiki = lazyPage(() => import("./pages/ClanWiki"));
const Dashboard = lazyPage(() => import("./pages/Dashboard"));
const DeathMap = lazyPage(() => import("./pages/DeathMap"));
const EngineeringOps = lazyPage(() => import("./pages/EngineeringOps"));
const Intel = lazyPage(() => import("./pages/Intel"));
const Inventory = lazyPage(() => import("./pages/Inventory"));
const LoadoutPlanner = lazyPage(() => import("./pages/LoadoutPlanner"));
const LootSharing = lazyPage(() => import("./pages/LootSharing"));
const LootTracker = lazyPage(() => import("./pages/LootTracker"));
const Missions = lazyPage(() => import("./pages/Missions"));
const MyStats = lazyPage(() => import("./pages/MyStats"));
const PlayerProfile = lazyPage(() => import("./pages/PlayerProfile"));
const ServerMonitor = lazyPage(() => import("./pages/ServerMonitor"));
const TacticalMap = lazyPage(() => import("./pages/TacticalMap"));


export const PAGES = {
    "AIAgent": AIAgent,
    "Challenges": Challenges,
    "ClanBoard": ClanBoard,
    "ClanCalendar": ClanCalendar,
    "ClanRoster": ClanRoster,
    "ClanTreasury": ClanTreasury,
    "ClanVoting": ClanVoting,
    "ClanWiki": ClanWiki,
    "Dashboard": Dashboard,
    "DeathMap": DeathMap,
    "EngineeringOps": EngineeringOps,
    "Intel": Intel,
    "Inventory": Inventory,
    "LoadoutPlanner": LoadoutPlanner,
    "LootSharing": LootSharing,
    "LootTracker": LootTracker,
    "Missions": Missions,
    "MyStats": MyStats,
    "PlayerProfile": PlayerProfile,
    "ServerMonitor": ServerMonitor,
    "TacticalMap": TacticalMap,
}

export const pagesConfig = {
    mainPage: "ServerMonitor",
    Pages: PAGES,
    Layout: __Layout,
};

export const preloadPage = (pageKey) => {
    const Page = PAGES[pageKey];
    if (Page?.preload) {
        Page.preload();
    }
};
