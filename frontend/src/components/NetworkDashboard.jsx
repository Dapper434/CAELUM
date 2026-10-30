import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Navigation, AlertTriangle, CheckCircle2, ArrowRight, ShieldCheck, MapPin, Truck } from 'lucide-react';

function projectHospitals(hospitals) {
  if (!hospitals.length) return [];
  const lats = hospitals.map((hospital) => hospital.coordinates.lat);
  const lngs = hospitals.map((hospital) => hospital.coordinates.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.04);
  const lngSpan = Math.max(maxLng - minLng, 0.04);
  const width = 700;
  const height = 320;
  const padX = 110;
  const padY = 58;
  return hospitals.map((hospital) => ({
    ...hospital,
    x: padX + ((hospital.coordinates.lng - minLng) / lngSpan) * (width - padX * 2),
    y: padY + ((maxLat - hospital.coordinates.lat) / latSpan) * (height - padY * 2),
  }));
}

function nodeTone(hospital) {
  const groups = Object.values(hospital.stock || {});
  if (groups.some((item) => item.status === "critical")) {
    return { ring: "#DC2626", core: "#DC2626" };
  }
  if (groups.some((item) => item.status === "warning")) {
    return { ring: "#F59E0B", core: "#D97706" };
  }
  return { ring: "#059669", core: "#059669" };
}

export default function NetworkDashboard({ hospitals = [], regionName = "this region", activeTransferCount = 0, onNavigateToApproval }) {
  const hospitalKey = hospitals.map((hospital) => hospital.id).join("|");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const critical = hospitals.find((hospital) =>
      Object.values(hospital.stock || {}).some((item) => item.status === "critical")
    );
    setSelectedId((critical || hospitals[0])?.id || null);
  }, [hospitalKey, hospitals]);

  const selectedHospital = hospitals.find((hospital) => hospital.id === selectedId) || hospitals[0];
  const nodes = useMemo(() => projectHospitals(hospitals), [hospitals]);
  const totalUnits = hospitals.reduce((sum, hospital) => sum + (hospital.totalUnits || 0), 0);
  const criticalHospitals = hospitals.filter((hospital) =>
    Object.values(hospital.stock || {}).some((item) => item.status === "critical")
  );
  const bloodGroups = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

  if (!selectedHospital) {
    return (
      <div className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-2xl p-8 text-center">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{regionName} has no hospitals yet</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Add a hospital in this region before a transfer can be suggested.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      
      {/* Top Banner KPI summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-2xl p-4 shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Monitored Units</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{totalUnits} <span className="text-xs font-semibold text-slate-400">Units</span></div>
          <div className="text-xs text-status-emerald dark:text-emerald-400 flex items-center gap-1 mt-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> {hospitals.length} hospitals in {regionName}
          </div>
        </div>

        <div className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-2xl p-4 shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Critical Stockouts</div>
          <div className="text-2xl font-extrabold text-status-crimson mt-1">{criticalHospitals.length} <span className="text-xs font-semibold text-status-crimson">{criticalHospitals.length === 1 ? "Facility" : "Facilities"}</span></div>
          <div className="text-xs text-status-crimson flex items-center gap-1 mt-1 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" /> {criticalHospitals[0]?.mapLabel || criticalHospitals[0]?.name || "None in this region"}
          </div>
        </div>

        <div className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-2xl p-4 shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Active Corridors</div>
          <div className="text-2xl font-extrabold text-brand-cobalt dark:text-blue-400 mt-1">{activeTransferCount} <span className="text-xs font-semibold text-slate-400">Open</span></div>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 font-medium">
            <Truck className="w-3.5 h-3.5 text-brand-cobalt dark:text-blue-400" /> Inside {regionName} only
          </div>
        </div>

        <div className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-2xl p-4 shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Bag check</div>
          <div className="text-2xl font-extrabold text-status-emerald dark:text-emerald-400 mt-1">100%</div>
          <div className="text-xs text-status-emerald dark:text-emerald-400 flex items-center gap-1 mt-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> Every offered bag is checked
          </div>
        </div>
      </div>

      {/* Main Grid: GIS Corridor Map & Facility List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left 2 Cols: Regional Network Corridor Schematic & Map */}
        <div className="lg:col-span-2 bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-border-warm dark:border-slate-700">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-brand-cobalt dark:text-blue-400" />
                Regional Hospital Topology
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{regionName} &bull; transfers stay inside this region</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-burgundy/10 dark:bg-brand-burgundy/30 text-brand-burgundy dark:text-rose-300 border border-brand-burgundy/20">
              Live Topology Feed
            </span>
          </div>

          {/* SVG Visual Network Schematic */}
          <div className="relative my-4 p-4 bg-bg-inset dark:bg-slate-900 border border-border-warm dark:border-slate-700 rounded-xl overflow-hidden min-h-[300px] flex items-center justify-center">
            <svg className="w-full h-72 select-none" viewBox="0 0 700 320" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid-net" width="35" height="35" patternUnits="userSpaceOnUse">
                  <path d="M 35 0 L 0 0 0 35" fill="none" stroke="currentColor" className="text-border-warm dark:text-slate-800" strokeWidth="1"/>
                </pattern>
                <linearGradient id="corridor-flow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0E3A8C" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#7A1A2B" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#DC2626" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              <rect width="100%" height="100%" fill="url(#grid-net)" />

              {nodes.map((from, index) =>
                nodes.slice(index + 1).map((to) => (
                  <line
                    key={`${from.id}-${to.id}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#0E3A8C"
                    strokeWidth="1.6"
                    strokeOpacity="0.35"
                  />
                ))
              )}

              {nodes.map((node) => {
                const tone = nodeTone(node);
                const active = node.id === selectedHospital.id;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(node.id)}
                  >
                    <circle r={active ? 18 : 14} fill="#FFFFFF" stroke={tone.ring} strokeWidth={active ? 3 : 2.5} />
                    <circle r="7" fill={tone.core} />
                    <text x="0" y="-24" textAnchor="middle" fontSize="11" fontWeight="700" className="fill-slate-900 dark:fill-slate-100">
                      {node.mapLabel || node.name}
                    </text>
                    <text x="0" y="32" textAnchor="middle" fontSize="9.5" className="fill-slate-500 dark:fill-slate-400">
                      {node.totalUnits} units
                    </text>
                  </g>
                );
              })}

            </svg>
          </div>

          {/* Interactive Legend & Prompt */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-border-warm dark:border-slate-700">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-status-crimson inline-block"></span> Critical Stockout</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-accent-yellow inline-block"></span> Low Stock</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-status-emerald inline-block"></span> Safe / Surplus Donor</span>
            </div>
            <button
              onClick={onNavigateToApproval}
              className="font-bold text-brand-cobalt dark:text-blue-400 hover:text-brand-burgundy dark:hover:text-rose-300 flex items-center gap-1 transition"
            >
              Inspect Active Recommendation <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Col: Selected Hospital Stock Matrix Inspector */}
        <div className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border-warm dark:border-slate-700">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Selected hospital</span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-tight">{selectedHospital.name}</h3>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{selectedHospital.tier} &bull; {selectedHospital.county} County</div>
              </div>
              <Building2 className="w-6 h-6 text-brand-cobalt dark:text-blue-400" />
            </div>

            {/* Blood Group Matrix Cards */}
            <div className="mt-4">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Inventory by ABO / Rh Group:</div>
              <div className="grid grid-cols-2 gap-2">
                {bloodGroups.map((group) => {
                  const item = selectedHospital.stock[group] || { units: 0, daysOfCover: 0, status: "safe" };
                  const isCritical = item.status === "critical" || item.daysOfCover < 1.0;
                  const isWarning = item.status === "warning" || (item.daysOfCover >= 1.0 && item.daysOfCover < 3.0);
                  
                  return (
                    <div
                      key={group}
                      className={`p-2.5 rounded-xl border text-xs transition-all ${
                        isCritical
                          ? "bg-red-50/80 dark:bg-red-950/40 border-status-crimson text-status-crimson font-bold shadow-sm"
                          : isWarning
                          ? "bg-amber-50/80 dark:bg-amber-950/40 border-accent-yellow text-amber-900 dark:text-amber-300 font-semibold"
                          : "bg-bg-inset dark:bg-slate-900/60 border-border-warm dark:border-slate-700 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black">{group}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          isCritical 
                            ? "bg-status-crimson text-white" 
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        }`}>
                          {item.units} Units
                        </span>
                      </div>
                      <div className="text-[10px] mt-1 opacity-90">
                        {item.daysOfCover.toFixed(1)} Days Cover
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Critical alert highlight for this hospital */}
            {selectedHospital.stock["O-"]?.status === "critical" && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-status-crimson/30 text-xs">
                <div className="font-bold text-status-crimson flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  Acute Shortage Action Required
                </div>
                <p className="text-[11px] text-red-900/80 dark:text-red-200/80 leading-normal">
                  Remaining O- supply cannot cover expected surgery beyond 9.5 hours. A nearby transfer is recommended.
                </p>
              </div>
            )}
          </div>

          {/* Quick Facility Switcher */}
          <div className="pt-3 border-t border-border-warm dark:border-slate-700 mt-4">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
              Switch Facility View
            </label>
            <div className="flex flex-wrap gap-1.5">
              {hospitals.map((hosp) => (
                <button
                  key={hosp.id}
                  onClick={() => setSelectedId(hosp.id)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold transition ${
                    selectedHospital.id === hosp.id
                      ? "bg-brand-cobalt text-white shadow-xs"
                      : "bg-bg-inset dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-border-warm dark:border-slate-700"
                  }`}
                >
                  {hosp.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
