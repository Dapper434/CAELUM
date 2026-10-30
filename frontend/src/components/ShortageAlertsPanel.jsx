import React, { useState, useMemo } from 'react';
import { AlertCircle, Clock, ArrowRight, RefreshCw, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';
import FilterBar from './FilterBar';

const ALERT_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Urgency Levels' },
  { value: 'CRITICAL', label: 'Critical (< 24h Cover)' },
  { value: 'URGENT', label: 'Urgent (< 48h Cover)' },
  { value: 'RESOLVING', label: 'Resolving / Verified' },
];

export default function ShortageAlertsPanel({ alerts = [], regionName = "this region", isScanning, runScan, onResolveAlert }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodType, setSelectedBloodType] = useState('All Types');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      // Blood Type
      if (selectedBloodType !== 'All Types' && a.bloodGroup !== selectedBloodType) {
        return false;
      }
      // Status
      if (selectedStatus !== 'ALL' && a.urgency !== selectedStatus) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const facilityMatch = a.facility?.toLowerCase().includes(query);
        const groupMatch = a.bloodGroup?.toLowerCase().includes(query);
        const reasonMatch = a.clinicalReason?.toLowerCase().includes(query);
        if (!facilityMatch && !groupMatch && !reasonMatch) {
          return false;
        }
      }
      return true;
    });
  }, [alerts, searchQuery, selectedBloodType, selectedStatus]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedBloodType('All Types');
    setSelectedStatus('ALL');
  };

  return (
    <div className="space-y-4">
      
      {/* Header with Scan Trigger */}
      <div className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-status-crimson/10 dark:bg-red-950/50 text-status-crimson border border-status-crimson/20">
              <AlertCircle className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Regional Shortage Detection Queue</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Forecast for {regionName} &bull; Blood stays inside this region
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Open shortages
            </span>
            <span className="text-sm font-bold text-status-crimson">
              {alerts.filter(a => a.urgency !== "RESOLVING").length} Pending Immediate Triage
            </span>
          </div>
          
          <button
            onClick={runScan}
            disabled={isScanning}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
              isScanning
                ? "bg-slate-700 text-slate-300 cursor-not-allowed"
                : "bg-brand-cobalt hover:bg-brand-burgundy text-white active:scale-95 shadow-blue-900/20"
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin text-blue-200" : "text-white"}`} />
            <span>{isScanning ? "Checking hospitals..." : "Check this region"}</span>
          </button>
        </div>
      </div>

      {/* Task 3: Interactive FilterBar for Shortage Alerts */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedBloodType={selectedBloodType}
        onBloodTypeChange={setSelectedBloodType}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        statusOptions={ALERT_STATUS_OPTIONS}
        totalCount={alerts.length}
        filteredCount={filteredAlerts.length}
        onReset={handleResetFilters}
        placeholder="Filter by facility name or clinical reason..."
      />

      {/* Alert Feed Cards */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-2xl p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No shortage alerts match your active filter settings.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.urgency === "CRITICAL";
            const isUrgent = alert.urgency === "URGENT";
            const isResolving = alert.urgency === "RESOLVING";

            return (
              <div
                key={alert.id}
                className={`bg-bg-surface dark:bg-slate-800 border rounded-2xl p-4 transition-all shadow-card ${
                  isResolving
                    ? "border-status-emerald/30 bg-emerald-50/30 dark:bg-emerald-950/20"
                    : isCritical
                    ? "border-l-4 border-l-status-crimson border-border-warm dark:border-slate-700 hover:shadow-card-hover"
                    : isUrgent
                    ? "border-l-4 border-l-accent-yellow border-border-warm dark:border-slate-700 hover:shadow-card-hover"
                    : "border-l-4 border-l-blue-500 border-border-warm dark:border-slate-700 hover:shadow-card-hover"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left: Blood Group, Hospital & Clinical Context */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-black flex-shrink-0 shadow-sm ${
                        isResolving
                          ? "bg-status-emerald text-white"
                          : isCritical
                          ? "bg-status-crimson text-white"
                          : isUrgent
                          ? "bg-accent-yellow text-slate-900"
                          : "bg-brand-cobalt text-white"
                      }`}
                    >
                      <span className="text-lg leading-none">{alert.bloodGroup}</span>
                      <span className="text-[9px] uppercase tracking-wider opacity-90 mt-0.5">Blood</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">{alert.facility}</h2>
                        
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isResolving
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-status-emerald border border-emerald-300 dark:border-emerald-800"
                              : isCritical
                              ? "bg-red-100 dark:bg-red-950/60 text-status-crimson border border-red-300 dark:border-red-800"
                              : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                          }`}
                        >
                          {alert.urgency}
                        </span>

                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                          ID: #{alert.id}
                        </span>
                      </div>

                      {/* Clinical Situation & Projection */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">
                        {alert.clinicalReason}
                      </p>

                      <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <div className="flex items-center gap-1 text-status-crimson font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Days of Cover: {alert.daysOfCover}d</span>
                        </div>
                        <div>&bull;</div>
                        <div>Current Stock: <strong className="text-slate-800 dark:text-slate-200 font-mono">{alert.unitsRemaining} Units</strong></div>
                        <div>&bull;</div>
                        <div>Daily Burn Rate: <span className="font-mono">{alert.consumptionRate} units/day</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Right Action: Navigate to Approval Inbox */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 sm:self-center">
                    {isResolving ? (
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-status-emerald bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Transfer in Transit</span>
                      </div>
                    ) : (
                      <button
                        onClick={onResolveAlert}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-cobalt hover:bg-brand-burgundy text-white shadow-sm transition active:scale-95"
                      >
                        <span>Review Transfer Proposal</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
