import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import NetworkDashboard from './components/NetworkDashboard';
import ShortageAlertsPanel from './components/ShortageAlertsPanel';
import ApprovalInbox from './components/ApprovalInbox';
import TransfersWorkflow from './components/TransfersWorkflow';
import { useCaelum } from './hooks/useCaelum';
import { DEFAULT_REGION, REGIONS, regionByCode } from './lib/regions';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Revised Task 4: Clinical Low-Light Mode (Anti-AI Aesthetic)
  // Deep muted warm-navy (#1E2433) reduces eye strain without looking like an AI terminal or cyber IDE
  const [isLowLight, setIsLowLight] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('caelum_clinical_lowlight');
      if (saved !== null) return saved === 'true';
    }
    return false;
  });

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    if (isLowLight) {
      html.classList.add('dark');
      body.classList.add('dark');
    } else {
      html.classList.remove('dark');
      body.classList.remove('dark');
    }
    localStorage.setItem('caelum_clinical_lowlight', String(isLowLight));
  }, [isLowLight]);

  const toggleLowLight = () => setIsLowLight(prev => !prev);

  const [regionCode, setRegionCode] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_REGION;
    const saved = localStorage.getItem('caelum_region');
    return REGIONS.some((region) => region.code === saved) ? saved : DEFAULT_REGION;
  });

  useEffect(() => {
    localStorage.setItem('caelum_region', regionCode);
  }, [regionCode]);

  const region = regionByCode(regionCode);
  
  const {
    hospitals,
    alerts,
    proposals,
    transfers,
    isScanning,
    lastScanTime,
    toastMessage,
    runScan,
    approveTransfer,
    rejectTransfer,
    assignCourier,
    confirmPickup,
    confirmHandover
  } = useCaelum(regionCode);

  const activeTransfersCount = transfers.filter(t => t.stage !== 'DELIVERED').length;

  return (
    <div className={`min-h-screen ${isLowLight ? 'dark bg-[#1E2433] text-[#E2E8F0]' : 'bg-[#F6F3ED] text-slate-800'} flex flex-col font-sans transition-colors duration-200`}>
      
      {/* Emergency Command Hub Navbar with Clinical Low-Light Toggle */}
      <Navbar
        isScanning={isScanning}
        runScan={runScan}
        lastScanTime={lastScanTime}
        isLowLight={isLowLight}
        onToggleLowLight={toggleLowLight}
        regionCode={regionCode}
        regions={REGIONS}
        onRegionChange={setRegionCode}
        regionName={region.name}
        nodeCount={hospitals.length}
      />

      {/* Main Layout Area: Responsive Top Bar on Mobile / Persistent Sidebar on Desktop */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto min-w-0">
        
        {/* Persistent Responsive Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          alertCount={alerts.filter(a => a.urgency !== "RESOLVING").length}
          proposalCount={proposals.length}
          activeTransfersCount={activeTransfersCount}
        />

        {/* Content Canvas (Fluid width across all devices) */}
        <main className="flex-1 p-3 sm:p-5 md:p-6 overflow-y-auto w-full min-w-0">
          {activeTab === 'dashboard' && (
            <NetworkDashboard
              hospitals={hospitals}
              regionName={region.name}
              activeTransferCount={activeTransfersCount}
              onNavigateToApproval={() => setActiveTab('approval')}
            />
          )}

          {activeTab === 'alerts' && (
            <ShortageAlertsPanel
              alerts={alerts}
              regionName={region.name}
              isScanning={isScanning}
              runScan={runScan}
              onResolveAlert={() => setActiveTab('approval')}
            />
          )}

          {activeTab === 'approval' && (
            <ApprovalInbox
              proposals={proposals}
              onApprove={(id) => {
                approveTransfer(id);
                // Smooth transition to transfers view so officer can assign courier
                setTimeout(() => setActiveTab('transfers'), 600);
              }}
              onReject={rejectTransfer}
            />
          )}

          {activeTab === 'transfers' && (
            <TransfersWorkflow
              transfers={transfers}
              onAssignCourier={assignCourier}
              onConfirmPickup={confirmPickup}
              onConfirmHandover={confirmHandover}
            />
          )}
        </main>

      </div>

      {/* Real-time Toast Notifications */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-950 dark:bg-slate-800 text-white text-xs font-semibold shadow-2xl border border-slate-800 dark:border-slate-700 animate-slide-up">
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toastMessage.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
          {toastMessage.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

    </div>
  );
}
