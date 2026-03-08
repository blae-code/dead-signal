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
import AIAgent from './pages/AIAgent';
import ClanRoster from './pages/ClanRoster';
import Intel from './pages/Intel';
import Inventory from './pages/Inventory';
import Missions from './pages/Missions';
import ServerMonitor from './pages/ServerMonitor';
import TacticalMap from './pages/TacticalMap';
import Dashboard from './pages/Dashboard';
import PlayerProfile from './pages/PlayerProfile';
import MyStats from './pages/MyStats';
import LootTracker from './pages/LootTracker';
import DeathMap from './pages/DeathMap';
import Challenges from './pages/Challenges';
import LoadoutPlanner from './pages/LoadoutPlanner';
import ClanBoard from './pages/ClanBoard';
import LootSharing from './pages/LootSharing';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIAgent": AIAgent,
    "ClanRoster": ClanRoster,
    "Intel": Intel,
    "Inventory": Inventory,
    "Missions": Missions,
    "ServerMonitor": ServerMonitor,
    "TacticalMap": TacticalMap,
    "Dashboard": Dashboard,
    "PlayerProfile": PlayerProfile,
    "MyStats": MyStats,
    "LootTracker": LootTracker,
    "DeathMap": DeathMap,
    "Challenges": Challenges,
    "LoadoutPlanner": LoadoutPlanner,
    "ClanBoard": ClanBoard,
    "LootSharing": LootSharing,
}

export const pagesConfig = {
    mainPage: "ServerMonitor",
    Pages: PAGES,
    Layout: __Layout,
};