import { Component, Suspense, useEffect, useMemo, useRef } from "react";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import * as pagesModule from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const pagesConfig = pagesModule.pagesConfig || { Pages: {}, mainPage: "" };
const preloadPage = typeof pagesModule.preloadPage === "function"
  ? pagesModule.preloadPage
  : () => Promise.resolve(null);

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
const pageKeys = Object.keys(Pages);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const RouteSkeleton = () => (
  <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#27272a" }}>
    <div className="w-8 h-8 border-4 border-solid rounded-full animate-spin" style={{ borderColor: "#3e2c18", borderTopColor: "#39ff14" }}></div>
  </div>
);

const RouteLoadError = ({ error, onRetry }) => (
  <div className="fixed inset-0 flex items-center justify-center p-6" style={{ background: "#27272a", color: "#e8dcc8" }}>
    <div className="w-full max-w-xl border p-6 space-y-4 terminal-card" style={{ borderColor: "#2a1e10", background: "#1c1c20" }}>
      <h1 className="text-lg font-semibold" style={{ fontFamily: "'Orbitron', monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffaa00" }}>Page Module Failed To Load</h1>
      <p className="text-sm" style={{ color: "#c0aa88" }}>
        The selected page failed to load in preview. Try again or open another route.
      </p>
      {error?.message && (
        <pre className="text-xs whitespace-pre-wrap border p-3" style={{ borderColor: "#2a1e10", background: "#18181c", color: "#c0aa88" }}>
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
          href="/Dashboard"
          className="inline-flex items-center border px-3 py-2 text-sm transition-colors"
          style={{ borderColor: "#3e2c18", color: "#00e8ff", background: "transparent" }}
        >
          Open Dashboard
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
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const AuthRequiredFallback = ({ onLogin }) => (
  <div className="fixed inset-0 flex items-center justify-center p-6" style={{ background: "#27272a", color: "#e8dcc8" }}>
    <div className="w-full max-w-md border p-6 space-y-4 terminal-card" style={{ borderColor: "#2a1e10", background: "#1c1c20" }}>
      <h1 className="text-lg font-semibold" style={{ fontFamily: "'Orbitron', monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "#ffaa00" }}>Authentication Required</h1>
      <p className="text-sm" style={{ color: "#c0aa88" }}>
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

const RoutePreloader = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname === "/"
      ? mainPageKey
      : location.pathname.replace(/^\/+/, "");
    const currentIndex = pageKeys.indexOf(path);
    const candidates = [
      path,
      mainPageKey,
      currentIndex > 0 ? pageKeys[currentIndex - 1] : null,
      currentIndex >= 0 && currentIndex < pageKeys.length - 1 ? pageKeys[currentIndex + 1] : null,
    ].filter(Boolean);

    candidates.forEach((key) => {
      Promise.resolve(preloadPage(key)).catch(() => {});
    });
  }, [location.pathname]);

  return null;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
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

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#27272a" }}>
        <div className="w-8 h-8 border-4 border-solid rounded-full animate-spin" style={{ borderColor: "#3e2c18", borderTopColor: "#39ff14" }}></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      if (isEmbeddedPreview) {
        return (
          <>
            <PreviewModeBanner />
            <Suspense fallback={<RouteSkeleton />}>
              <RoutePreloader />
              <Routes>
                <Route path="/" element={
                  <LayoutWrapper currentPageName={mainPageKey}>
                    <RouteErrorBoundary resetKey={`${mainPageKey}:${location.pathname}`}>
                      <MainPage />
                    </RouteErrorBoundary>
                  </LayoutWrapper>
                } />
                {Object.entries(Pages).map(([path, Page]) => (
                  <Route
                    key={path}
                    path={`/${path}`}
                    element={
                      <LayoutWrapper currentPageName={path}>
                        <RouteErrorBoundary resetKey={`${path}:${location.pathname}`}>
                          <Page />
                        </RouteErrorBoundary>
                      </LayoutWrapper>
                    }
                  />
                ))}
                <Route path="*" element={<PageNotFound />} />
              </Routes>
            </Suspense>
          </>
        );
      }
      return <AuthRequiredFallback onLogin={navigateToLogin} />;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<RouteSkeleton />}>
      <RoutePreloader />
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <RouteErrorBoundary resetKey={`${mainPageKey}:${location.pathname}`}>
              <MainPage />
            </RouteErrorBoundary>
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <RouteErrorBoundary resetKey={`${path}:${location.pathname}`}>
                  <Page />
                </RouteErrorBoundary>
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
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
  )
}

export default App
