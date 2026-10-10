import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/appStore';
import { useSSE } from './hooks/useSSE';
import { api } from './lib/api';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';

// Lazy-load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LiveMap = lazy(() => import('./pages/LiveMap'));
const TestLaboratory = lazy(() => import('./pages/TestLaboratory'));
const ChemicalIntelligence = lazy(() => import('./pages/ChemicalIntelligence'));
const PollutionForecast = lazy(() => import('./pages/PollutionForecast'));
const ReportsHistory = lazy(() => import('./pages/ReportsHistory'));
const ResearchBlog = lazy(() => import('./pages/ResearchBlog'));
const AlertsDevices = lazy(() => import('./pages/AlertsDevices'));

function AppInner() {
  const { darkMode, setStations, setAlerts, isOnline, setIsOnline } = useAppStore();

  // Apply dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Online/offline detection
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [setIsOnline]);

  // Boot: load stations and alerts (skip if running in demo mode without backend)
  useEffect(() => {
    const { dataMode, token } = useAppStore.getState();
    if (token === 'demo-offline-token') return; // demo mode — data already loaded
    api.get(`/stations?mode=${dataMode}`).then((r) => setStations(r.data)).catch(() => {});
    api.get('/alerts?status=open').then((r) => setAlerts(r.data)).catch(() => {});
  }, [setStations, setAlerts]);

  // Start SSE connection (skip in demo mode)
  const token = useAppStore((s) => s.token);
  useSSE(token !== 'demo-offline-token');

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-center text-sm font-semibold py-2 px-4 flex items-center justify-center gap-2">
        <span>⚠️ You are offline. Data may be stale.</span>
      </div>
    );
  }

  return null;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAppStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-10 h-10 border-4 border-ocean border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="map"
            element={
              <Suspense fallback={<PageLoader />}>
                <LiveMap />
              </Suspense>
            }
          />
          <Route
            path="laboratory"
            element={
              <Suspense fallback={<PageLoader />}>
                <TestLaboratory />
              </Suspense>
            }
          />
          <Route
            path="chemicals"
            element={
              <Suspense fallback={<PageLoader />}>
                <ChemicalIntelligence />
              </Suspense>
            }
          />
          <Route
            path="forecast"
            element={
              <Suspense fallback={<PageLoader />}>
                <PollutionForecast />
              </Suspense>
            }
          />
          <Route
            path="reports"
            element={
              <Suspense fallback={<PageLoader />}>
                <ReportsHistory />
              </Suspense>
            }
          />
          <Route
            path="blog"
            element={
              <Suspense fallback={<PageLoader />}>
                <ResearchBlog />
              </Suspense>
            }
          />
          <Route
            path="alerts"
            element={
              <Suspense fallback={<PageLoader />}>
                <AlertsDevices />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
