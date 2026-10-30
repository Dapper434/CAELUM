import React from 'react';
import { Activity, ShieldCheck, RefreshCw, Radio, Droplet, User, Moon, Sun, MapPin } from 'lucide-react';

export default function Navbar({ 
  isScanning, 
  runScan, 
  lastScanTime, 
  isLowLight, 
  onToggleLowLight,
  isDarkMode,
  onToggleDarkMode,
  regionCode,
  regions = [],
  onRegionChange,
  regionName,
  nodeCount = 0,
}) {
  const activeLowLight = isLowLight ?? isDarkMode ?? false;
  const handleToggle = onToggleLowLight ?? onToggleDarkMode;

  return (
    <header className="bg-gradient-to-r from-brand-navy via-brand-cobalt to-[#4A101C] text-white shadow-md border-b border-rose-950/40 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Operational Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner relative group">
              <Droplet className="w-6 h-6 text-red-400 fill-red-400" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-brand-burgundy border-2 border-brand-navy"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5">
                  CAELUM
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-accent-yellow/20 text-accent-yellow border border-accent-yellow/30">
                  MAS Active
                </span>
                <span className="hidden md:inline text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30">
                  Clinical v2.4
                </span>
              </div>
              <p className="hidden md:block text-xs text-blue-200/80 font-medium truncate max-w-xs lg:max-w-none">
                Blood transfers for urgent care in your region
              </p>
            </div>
          </div>

          {/* Center Network Telemetry Status */}
          <div className="hidden md:flex items-center gap-6 text-xs text-blue-100">
            <div className="flex items-center gap-2 bg-black/25 px-3 py-1.5 rounded-xl border border-white/10">
              <span className="inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              <span className="font-medium text-emerald-300">{nodeCount} hospitals in {regionName}</span>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Records up to date</span>
            </div>

            <div className="text-slate-300 font-mono text-[11px]">
              Last Scan: <span className="text-white font-semibold">{lastScanTime}</span>
            </div>
          </div>

          {/* Right Actions: Clinical Low-Light Toggle, Manual Scan & User Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            
            {/* Revised Task 4: Anti-AI Aesthetic Clinical Low-Light Mode */}
            <button
              onClick={handleToggle}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer active:scale-95 flex-shrink-0 ${
                activeLowLight 
                  ? "bg-amber-500/20 text-amber-200 border-amber-400/30 hover:bg-amber-500/30 shadow-xs" 
                  : "bg-white/10 text-blue-100 border-white/15 hover:bg-white/20"
              }`}
              title="Toggle Clinical Low-Light Mode (Anti-AI Ergonomic Eye Care)"
            >
              {activeLowLight ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-accent-yellow flex-shrink-0" />
                  <span className="hidden sm:inline text-[11px] font-semibold">Daylight</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-blue-200 flex-shrink-0" />
                  <span className="hidden sm:inline text-[11px] font-semibold">Clinical</span>
                </>
              )}
            </button>

            <label className="flex items-center gap-1.5 bg-black/25 border border-white/15 rounded-xl px-2 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-200 flex-shrink-0" />
              <select
                aria-label="Operating region"
                value={regionCode}
                onChange={(event) => onRegionChange?.(event.target.value)}
                className="bg-transparent text-white text-[11px] font-semibold focus:outline-none max-w-[8.5rem] sm:max-w-[11rem] cursor-pointer"
              >
                {regions.map((region) => (
                  <option key={region.code} value={region.code} className="text-slate-900">
                    {region.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Run Scan Button */}
            <button
              onClick={runScan}
              disabled={isScanning}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0 ${
                isScanning
                  ? "bg-slate-700 text-slate-300 cursor-not-allowed"
                  : "bg-accent-yellow hover:bg-amber-400 text-slate-950 active:scale-95 shadow-amber-900/20"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 flex-shrink-0 ${isScanning ? "animate-spin text-slate-400" : "text-slate-950"}`} />
              <span className="hidden sm:inline">{isScanning ? "Scanning..." : "Run Scan"}</span>
            </button>

            {/* User Profile Pill */}
            <div className="hidden sm:flex items-center gap-2 pl-2 sm:pl-2.5 border-l border-white/15">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="text-left text-xs hidden md:block">
                <div className="font-semibold text-white leading-tight">Caren Chemjor</div>
                <div className="text-[10px] text-blue-200">Lead Transfusion SE</div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
