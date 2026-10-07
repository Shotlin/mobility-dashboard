import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { Toaster } from 'sonner';
import { sessionStore, restore, logout } from './services/session';
import { LoginPage } from './components/auth/LoginPage';
import { CommandCenterPage } from './components/dashboard/CommandCenterPage';
import { RidesPage } from './components/dashboard/RidesPage';
import { DriversPage } from './components/dashboard/DriversPage';
import { SafetyCenterPage } from './components/dashboard/SafetyCenterPage';
import { SystemHealthPage, PlatformPage } from './components/dashboard/PlatformPages';
import { FleetMapPage } from './components/dashboard/FleetMapPage';
import { DispatchMonitorPage } from './components/dashboard/DispatchMonitorPage';

function useSession() {
  const snapshot = React.useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot);
  useEffect(() => {
    void restore();
  }, []);
  return snapshot;
}

const NAV = [
  { path: '/', label: 'Command Center' },
  { path: '/rides', label: 'Rides' },
  { path: '/map', label: 'Fleet Map' },
  { path: '/dispatch', label: 'Dispatch Monitor' },
  { path: '/drivers', label: 'Drivers' },
  { path: '/safety', label: 'Safety Center' },
  { path: '/platform', label: 'Platform' },
  { path: '/health', label: 'System Health' },
];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <nav className="w-56 border-r bg-muted/30 p-4" aria-label="Primary">
        <div className="mb-6 text-sm font-semibold">Raahi Operations</div>
        <ul className="space-y-1">
          {NAV.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `block rounded-md px-2 py-1 text-sm ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            logout();
            window.location.assign('/login');
          }}
          className="mt-6 w-full rounded-md border px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          Sign out
        </button>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

export default function App() {
  const session = useSession();

  if (session.status === 'checking') {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Checking session…</div>;
  }

  if (session.status === 'unauthenticated') {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<CommandCenterPage />} />
          <Route path="/rides" element={<RidesPage />} />
          <Route path="/map" element={<FleetMapPage />} />
          <Route path="/dispatch" element={<DispatchMonitorPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/safety" element={<SafetyCenterPage />} />
          <Route path="/platform" element={<PlatformPage />} />
          <Route path="/health" element={<SystemHealthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
      <Toaster />
    </BrowserRouter>
  );
}
