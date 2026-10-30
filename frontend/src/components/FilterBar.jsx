import React from 'react';
import { Search, X, Filter, RotateCcw, LayoutGrid, Table as TableIcon, Columns } from 'lucide-react';

const BLOOD_TYPES = ['All Types', 'O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

export default function FilterBar({
  searchQuery,
  onSearchChange,
  selectedBloodType,
  onBloodTypeChange,
  selectedStatus,
  onStatusChange,
  statusOptions = [],
  totalCount = 0,
  filteredCount = 0,
  onReset,
  placeholder = "Search by hospital, bag number, or delivery note...",
  viewMode = null,
  onViewModeChange = null,
  viewOptions = []
}) {
  const hasActiveFilters = 
    Boolean(searchQuery) || 
    (selectedBloodType && selectedBloodType !== 'All Types') || 
    (selectedStatus && selectedStatus !== 'ALL');

  return (
    <div className="bg-bg-surface dark:bg-slate-800/90 border border-border-warm dark:border-slate-700/80 rounded-2xl p-3 sm:p-4 shadow-sm transition-colors duration-200 space-y-3">
      
      {/* Top Row: Search input + View switchers */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Search Input Box */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-9 py-2 rounded-xl text-xs font-medium bg-bg-inset dark:bg-slate-900 border border-border-warm dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-cobalt dark:focus:ring-blue-500 focus:border-transparent transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* View Mode Switcher (if enabled) */}
        {viewOptions.length > 0 && onViewModeChange && (
          <div className="flex items-center gap-1 bg-bg-inset dark:bg-slate-900 p-1 rounded-xl border border-border-warm dark:border-slate-700 self-start sm:self-auto">
            {viewOptions.map((opt) => {
              const isActive = viewMode === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => onViewModeChange(opt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
                    isActive
                      ? "bg-brand-cobalt text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800"
                  }`}
                  title={opt.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{opt.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-burgundy dark:bg-rose-400 rounded-full"></span>
                  )}
                </button>
              );
            })}
          </div>
        )}

      </div>

      {/* Bottom Row: Quick Select Filters + Match Counter + Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-border-warm/60 dark:border-slate-700/60 text-xs">
        
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Blood Type Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Blood:
            </span>
            <select
              value={selectedBloodType}
              onChange={(e) => onBloodTypeChange(e.target.value)}
              className="py-1 px-2.5 rounded-lg text-xs font-semibold bg-bg-inset dark:bg-slate-900 border border-border-warm dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-cobalt transition cursor-pointer"
            >
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </select>
          </div>

          {/* Status / Urgency Dropdown */}
          {statusOptions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Status:
              </span>
              <select
                value={selectedStatus}
                onChange={(e) => onStatusChange(e.target.value)}
                className="py-1 px-2.5 rounded-lg text-xs font-semibold bg-bg-inset dark:bg-slate-900 border border-border-warm dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-cobalt transition cursor-pointer"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Filters Pill */}
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-brand-burgundy dark:text-rose-300 bg-brand-burgundy/10 dark:bg-brand-burgundy/20 hover:bg-brand-burgundy/20 dark:hover:bg-brand-burgundy/30 border border-brand-burgundy/30 transition"
              title="Reset all active filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

        </div>

        {/* Counter Badge with subtle Burgundy pulse */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Showing <strong className="text-slate-900 dark:text-slate-100">{filteredCount}</strong> of {totalCount} records
          </span>
          {filteredCount < totalCount && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-burgundy/10 dark:bg-brand-burgundy/30 text-brand-burgundy dark:text-rose-200 border border-brand-burgundy/20">
              Filtered
            </span>
          )}
        </div>

      </div>

    </div>
  );
}
