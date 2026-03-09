import { Component, Suspense, useEffect, useMemo, useRef } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { queryClientInstance } from "@/lib/query-client";
import PageNotFound from "@/lib/PageNotFound";
import MapLayout from "@/layouts/MapLayout";
import { LEGACY_ROUTE_REDIRECTS } from "@/utils";
import OperationsHome from "@/pages/operations/OperationsHome";
import MissionsPanel from "@/pages/operations/MissionsPanel";
import MissionDetailPanel from "@/pages/operations/MissionDetailPanel";
import RosterHome from "@/pages/roster/RosterHome";
import PlayerDrawer from "@/pages/roster/PlayerDrawer";
import LogisticsHome from "@/pages/logistics/LogisticsHome";
import InventoryPanel from "@/pages/logistics/InventoryPanel";
import EngineeringPanel from "@/pages/logistics/EngineeringPanel";
import SystemsHome from "@/pages/systems/SystemsHome";
import ServerPanel from "@/pages/systems/ServerPanel";
import AlertsPanel from "@/pages/systems/AlertsPanel";
import AutomationPanel from "@/pages/systems/AutomationPanel";
import CommunityHome from "@/pages/community/CommunityHome";
import AnnouncementsPanel from "@/pages/community/AnnouncementsPanel";
import IntelPanel from "@/pages/community/IntelPanel";
import VouchesPanel from "@/pages/community/VouchesPanel";

const RouteSkeleton = () => (
  <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#27272a" }}>
    <div className="w-8 h-8 border-4 border-solid rounded-full animate-spin" style={{ borderColor: "#3e2c18", borderTopColor: "#39ff14" }}></div>
  </div>
);

const RouteLoadError = ({ error, onRetry }) => (
  <div className="fixed inset-0 flex items-center justify-center p-6" style={{ background: "#27272a", color: "#eee5d6" }}>
    <div className="w-full max-w-xl border p-6 space-y-4 terminal-card" style={{ borderColor: "#2a1e10", background: "#1c1c20" }}>
      <h1 className="text-lg font-semibold" style={{ fontFamily: "'Orbitron', monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffaa00" }}>
        Route Module Failed To Load
      </h1>
      <p className="text-sm" style={{ color: "#d0bfa6" }}>
        The selected route failed to load in preview. Retry or return to operations.
      </p>
      {error?.message && (
        <pre className="text-xs whitespace-pre-wrap border p-3" style={{ borderColor: "#2a1e10", background: "#18181c", color: "#d0bfa6" }}>
          {error.message}
        </pre>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center border px-3 py-2 text-sm transition-colors"
          style={{ borderColor: "#3e2c18", color: "#ffaa00", background: "transparent" }}
        >
          Retry
        </button>
        <a
          href="/ops"
          className="inline-flex items-center border px-3 py-2 text-sm transition-colors"
          style={{ borderColor: "#3e2c18", color: "#00e8ff", background: "transparent" }}
        >
          Open Ops Workspace
        </a>
      </div>
    </div>
  </div>
);

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return <RouteLoadError error={this.state.error} onRetry={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}

const isEmbeddedContext = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const AuthRequiredFallback = ({ onLogin }) => (
  <div className="fixed inset-0 flex items-center justify-center p-6" style={{ background: "#27272a", color: "#eee5d6" }}>
    <div className="w-full max-w-md border p-6 space-y-4 terminal-card" style={{ borderColor: "#2a1e10", background: "#1c1c20" }}>
      <h1 className="text-lg font-semibold" style={{ fontFamily: "'Orbitron', monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffaa00" }}>
        Authentication Required
      </h1>
      <p className="text-sm" style={{ color: "#d0bfa6" }}>
        This preview is embedded. Use login to continue, then reopen preview if needed.
      </p>
      <button
        type="button"
        onClick={onLogin}
        className="inline-flex items-center border px-3 py-2 text-sm transition-colors"
        style={{ borderColor: "#3e2c18", color: "#39ff14", background: "transparent" }}
      >
        Sign In
      </button>
    </div>
  </div>
);

const PreviewModeBanner = () => (
  <div className="border-b px-3 py-2 text-xs" style={{ borderColor: "#2a1e10", color: "#ffaa00", background: "rgba(24,24,28,0.9)" }}>
    PREVIEW MODE: running in embedded Base44 context without auth token. Live data may be limited until sign-in.
  </div>
);

const LegacyPlayerProfileRedirect = () => {
  const location = useLocation();
  const id = new URLSearchParams(location.search).get("id");
  return <Navigate to={id ? `/roster/player/${encodeURIComponent(id)}` : "/roster"} replace />;
};

const AppRoutes = () => {
  const location = useLocation();

  return (
    <RouteErrorBoundary resetKey={`${location.pathname}:${location.search}`}>
      <Suspense fallback={<RouteSkeleton />}>
        <Routes>
          <Route path="/" element={<Navigate to="/ops" replace />} />

          <Route element={<MapLayout />}>
            <Route path="/ops" element={<OperationsHome />} />
            <Route path="/ops/missions" element={<MissionsPanel />} />
            <Route path="/ops/missions/:id" element={<MissionDetailPanel />} />

            <Route path="/roster" element={<RosterHome />} />
            <Route path="/roster/player/:id" element={<PlayerDrawer />} />

            <Route path="/logistics" element={<LogisticsHome />} />
            <Route path="/logistics/inventory" element={<InventoryPanel />} />
            <Route path="/logistics/engineering" element={<EngineeringPanel />} />

            <Route path="/systems" element={<SystemsHome />} />
            <Route path="/systems/server" element={<ServerPanel />} />
            <Route path="/systems/alerts" element={<AlertsPanel />} />
            <Route path="/systems/automation" element={<AutomationPanel />} />

            <Route path="/community" element={<CommunityHome />} />
            <Route path="/community/announcements" element={<AnnouncementsPanel />} />
            <Route path="/community/intel" element={<IntelPanel />} />
            <Route path="/community/vouches" element={<VouchesPanel />} />
          </Route>

          <Route path="/PlayerProfile" element={<LegacyPlayerProfileRedirect />} />

          {LEGACY_ROUTE_REDIRECTS.filter((entry) => entry.from !== "/PlayerProfile").map((entry) => (
            <Route key={entry.from} path={entry.from} element={<Navigate to={entry.to} replace />} />
          ))}

          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const isEmbeddedPreview = useMemo(() => isEmbeddedContext(), []);
  const loginRedirectTriggeredRef = useRef(false);

  useEffect(() => {
    if (authError?.type !== "auth_required") {
      loginRedirectTriggeredRef.current = false;
      return;
    }
    if (isEmbeddedPreview || loginRedirectTriggeredRef.current) {
      return;
    }
    loginRedirectTriggeredRef.current = true;
    navigateToLogin();
  }, [authError, isEmbeddedPreview, navigateToLogin]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <RouteSkeleton />;
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    }
    if (authError.type === "auth_required") {
      if (isEmbeddedPreview) {
        return (
          <>
            <PreviewModeBanner />
            <AppRoutes />
          </>
        );
      }
      return <AuthRequiredFallback onLogin={navigateToLogin} />;
    }
  }

  return <AppRoutes />;
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
