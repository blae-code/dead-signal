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
import Dashboard from './pages/Dashboard';
import ServerMonitor from './pages/ServerMonitor';
import AIAgent from './pages/AIAgent';
import Challenges from './pages/Challenges';
import ClanBoard from './pages/ClanBoard';
import ClanCalendar from './pages/ClanCalendar';
import ClanMap from './pages/ClanMap';
import ClanRoster from './pages/ClanRoster';
import ClanTreasury from './pages/ClanTreasury';
import ClanVoting from './pages/ClanVoting';
import ClanWiki from './pages/ClanWiki';
import DeathMap from './pages/DeathMap';
import EngineeringOps from './pages/EngineeringOps';
import Intel from './pages/Intel';
import Inventory from './pages/Inventory';
import LoadoutPlanner from './pages/LoadoutPlanner';
import LootSharing from './pages/LootSharing';
import LootTracker from './pages/LootTracker';
import MyStats from './pages/MyStats';
import PlayerProfile from './pages/PlayerProfile';
import PostMissionAnalysis from './pages/PostMissionAnalysis';
import ResourceTradingHub from './pages/ResourceTradingHub';
import SquadVitalsMonitor from './pages/SquadVitalsMonitor';
import SupplyChainManager from './pages/SupplyChainManager';
import SurvivalPlanner from './pages/SurvivalPlanner';
import TacticalMap from './pages/TacticalMap';
import Missions from './pages/Missions';
import AnnouncementsPanel from './pages/AnnouncementsPanel';
import IntelPanel from './pages/IntelPanel';
import VouchesPanel from './pages/VouchesPanel';
import CommunityHome from './pages/CommunityHome';
import EngineeringPanel from './pages/EngineeringPanel';
import InventoryPanel from './pages/InventoryPanel';
import LogisticsHome from './pages/LogisticsHome';
import MissionDetailPanel from './pages/MissionDetailPanel';
import MissionsPanel from './pages/MissionsPanel';
import OperationsHome from './pages/OperationsHome';
import PlayerDrawer from './pages/PlayerDrawer';
import RosterHome from './pages/RosterHome';
import AlertsPanel from './pages/AlertsPanel';
import AutomationPanel from './pages/AutomationPanel';
import ServerPanel from './pages/ServerPanel';
import SystemsHome from './pages/SystemsHome';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "ServerMonitor": ServerMonitor,
    "AIAgent": AIAgent,
    "Challenges": Challenges,
    "ClanBoard": ClanBoard,
    "ClanCalendar": ClanCalendar,
    "ClanMap": ClanMap,
    "ClanRoster": ClanRoster,
    "ClanTreasury": ClanTreasury,
    "ClanVoting": ClanVoting,
    "ClanWiki": ClanWiki,
    "DeathMap": DeathMap,
    "EngineeringOps": EngineeringOps,
    "Intel": Intel,
    "Inventory": Inventory,
    "LoadoutPlanner": LoadoutPlanner,
    "LootSharing": LootSharing,
    "LootTracker": LootTracker,
    "MyStats": MyStats,
    "PlayerProfile": PlayerProfile,
    "PostMissionAnalysis": PostMissionAnalysis,
    "ResourceTradingHub": ResourceTradingHub,
    "SquadVitalsMonitor": SquadVitalsMonitor,
    "SupplyChainManager": SupplyChainManager,
    "SurvivalPlanner": SurvivalPlanner,
    "TacticalMap": TacticalMap,
    "Missions": Missions,
    "AnnouncementsPanel": AnnouncementsPanel,
    "IntelPanel": IntelPanel,
    "VouchesPanel": VouchesPanel,
    "CommunityHome": CommunityHome,
    "EngineeringPanel": EngineeringPanel,
    "InventoryPanel": InventoryPanel,
    "LogisticsHome": LogisticsHome,
    "MissionDetailPanel": MissionDetailPanel,
    "MissionsPanel": MissionsPanel,
    "OperationsHome": OperationsHome,
    "PlayerDrawer": PlayerDrawer,
    "RosterHome": RosterHome,
    "AlertsPanel": AlertsPanel,
    "AutomationPanel": AutomationPanel,
    "ServerPanel": ServerPanel,
    "SystemsHome": SystemsHome,
}

export const pagesConfig = {
    mainPage: "ServerMonitor",
    Pages: PAGES,
    Layout: __Layout,
};