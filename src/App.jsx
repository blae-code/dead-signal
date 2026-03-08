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
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const RouteLoadError = ({ error, onRetry }) => (
  <div className="fixed inset-0 flex items-center justify-center p-6 bg-slate-950 text-slate-100">
    <div className="w-full max-w-xl rounded border border-slate-700 bg-slate-900 p-6 space-y-4">
      <h1 className="text-lg font-semibold">Page Module Failed To Load</h1>
      <p className="text-sm text-slate-300">
        The selected page failed to load in preview. Try again or open another route.
      </p>
      {error?.message && (
        <pre className="text-xs whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-3 text-slate-300">
          {error.message}
        </pre>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center rounded border border-slate-500 px-3 py-2 text-sm hover:bg-slate-800 transition-colors"
        >
          Retry
        </button>
        <a
          href="/Dashboard"
          className="inline-flex items-center rounded border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800 transition-colors"
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
  <div className="fixed inset-0 flex items-center justify-center p-6 bg-slate-950 text-slate-100">
    <div className="w-full max-w-md rounded border border-slate-700 bg-slate-900 p-6 space-y-4">
      <h1 className="text-lg font-semibold">Authentication Required</h1>
      <p className="text-sm text-slate-300">
        This preview is embedded. Use login to continue, then reopen preview if needed.
      </p>
      <button
        type="button"
        onClick={onLogin}
        className="inline-flex items-center rounded border border-slate-500 px-3 py-2 text-sm hover:bg-slate-800 transition-colors"
      >
        Sign In
      </button>
    </div>
  </div>
);

const PreviewModeBanner = () => (
  <div className="border-b px-3 py-2 text-xs" style={{ borderColor: "#4a5568", color: "#f6ad55", background: "rgba(0,0,0,0.45)" }}>
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
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
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
