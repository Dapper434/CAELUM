import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { useAuth } from './auth/AuthContext';
import { useApiData } from './hooks/useApiData';
import { getHealth } from './lib/api/system';
import { getOverview } from './lib/api/admin';
import { config } from './lib/config';
import { REGIONS } from './lib/regions';
import { Loading } from './components/ui';
import SignInPage from './pages/SignInPage';
import OverviewPage from './pages/OverviewPage';
import NetworkMapPage from './pages/NetworkMapPage';
import FacilitiesPage from './pages/FacilitiesPage';
import AlertsPage from './pages/AlertsPage';
import RequestsPage from './pages/RequestsPage';
import OffersPage from './pages/OffersPage';
import TransfersPage from './pages/TransfersPage';
import CouriersPage from './pages/CouriersPage';
import AuditPage from './pages/AuditPage';
import SystemPage from './pages/SystemPage';

function useLowLight() {
  const [isLowLight, setIsLowLight] = useState(() => localStorage.getItem('caelum_clinical_lowlight') === 'true');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isLowLight);
    document.body.classList.toggle('dark', isLowLight);
    localStorage.setItem('caelum_clinical_lowlight', String(isLowLight));
  }, [isLowLight]);
  return [isLowLight, () => setIsLowLight((v) => !v)];
}

function Shell() {
  const { me, signOut } = useAuth();
  const [isLowLight, toggleLowLight] = useLowLight();
  const [activeTab, setActiveTab] = useState('overview');
  const [regionCode, setRegionCode] = useState(() => {
    const saved = localStorage.getItem('caelum_region') || '';
    return REGIONS.some((r) => r.code === saved) ? saved : '';
  });
  useEffect(() => { localStorage.setItem('caelum_region', regionCode); }, [regionCode]);

  const health = useApiData(getHealth, [], { pollMs: 60000 });
  const overview = useApiData(getOverview, [], { pollMs: 60000 });
  const o = overview.data;
  const badges = {
    alerts: o?.open_alerts || 0,
    requests: (o?.requests?.open || 0) + (o?.requests?.suggested || 0),
    transfers: o?.active_transfers || 0,
  };

  return (
    <div className={`min-h-screen ${isLowLight ? 'dark bg-[#1E2433] text-[#E2E8F0]' : 'bg-[#F6F3ED] text-slate-800'} flex flex-col font-sans transition-colors duration-200`}>
      <Navbar
        isLowLight={isLowLight}
        onToggleLowLight={toggleLowLight}
        regionCode={regionCode}
        regions={REGIONS}
        onRegionChange={setRegionCode}
        apiStatus={health.error ? 'error' : health.data?.status}
        apiVersion={health.data?.version}
        demoMode={config.demoMode}
        user={me}
        onSignOut={signOut}
      />
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto min-w-0">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} badges={badges} />
        <main className="flex-1 p-3 sm:p-5 md:p-6 overflow-y-auto w-full min-w-0">
          {activeTab === 'overview' && <OverviewPage />}
          {activeTab === 'map' && <NetworkMapPage />}
          {activeTab === 'facilities' && <FacilitiesPage regionCode={regionCode} />}
          {activeTab === 'alerts' && <AlertsPage />}
          {activeTab === 'requests' && <RequestsPage />}
          {activeTab === 'offers' && <OffersPage />}
          {activeTab === 'transfers' && <TransfersPage />}
          {activeTab === 'couriers' && <CouriersPage />}
          {activeTab === 'audit' && <AuditPage />}
          {activeTab === 'system' && <SystemPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { status } = useAuth();
  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center"><Loading label="Checking session…" /></div>;
  if (status !== 'signedIn') return <SignInPage />;
  return <Shell />;
}
