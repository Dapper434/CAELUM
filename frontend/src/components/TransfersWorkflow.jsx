import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Thermometer, 
  User, 
  Package, 
  ArrowRight, 
  X, 
  Check, 
  FileText,
  Car,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  LayoutGrid,
  Table as TableIcon,
  Columns
} from 'lucide-react';
import FilterBar from './FilterBar';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Stages' },
  { value: 'APPROVED', label: '1. Approved' },
  { value: 'COURIER_ASSIGNED', label: '2. Courier Assigned' },
  { value: 'IN_TRANSIT', label: '3. In Transit' },
  { value: 'DELIVERED', label: '4. Delivered' },
];

const VIEW_OPTIONS = [
  { id: 'grid', label: 'Grid Cards', icon: LayoutGrid },
  { id: 'table', label: 'Compact Table', icon: TableIcon },
  { id: 'pipeline', label: 'Four stages', icon: Columns },
];

export default function TransfersWorkflow({ 
  transfers = [], 
  onAssignCourier, 
  onConfirmPickup, 
  onConfirmHandover 
}) {
  // View & Pagination State
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table' | 'pipeline'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodType, setSelectedBloodType] = useState('All Types');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modal State
  const [selectedTransferForModal, setSelectedTransferForModal] = useState(null);
  const [driverName, setDriverName] = useState("Mary Mwangi");
  const [vehicleReg, setVehicleReg] = useState("KCE 901M");
  const [coldBoxTag, setColdBoxTag] = useState("CB-08 (Calibrated 3.8°C)");

  // Filtered dataset
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      // Blood Type Filter
      if (selectedBloodType !== 'All Types' && t.group !== selectedBloodType) {
        return false;
      }
      // Status Filter
      if (selectedStatus !== 'ALL' && t.stage !== selectedStatus) {
        return false;
      }
      // Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const donorMatch = t.donor?.toLowerCase().includes(query);
        const recipientMatch = t.recipient?.toLowerCase().includes(query);
        const idMatch = t.id?.toLowerCase().includes(query);
        const manifestMatch = t.manifestId?.toLowerCase().includes(query);
        const driverMatch = t.courier?.driver?.toLowerCase().includes(query);
        const vehicleMatch = t.courier?.vehicle?.toLowerCase().includes(query);
        const unitsMatch = t.unitIds?.some(u => u.toLowerCase().includes(query));

        if (!donorMatch && !recipientMatch && !idMatch && !manifestMatch && !driverMatch && !vehicleMatch && !unitsMatch) {
          return false;
        }
      }
      return true;
    });
  }, [transfers, searchQuery, selectedBloodType, selectedStatus]);

  // Pagination for Grid & Table
  const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage) || 1;
  const paginatedTransfers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransfers.slice(start, start + itemsPerPage);
  }, [filteredTransfers, currentPage, itemsPerPage]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedBloodType('All Types');
    setSelectedStatus('ALL');
    setCurrentPage(1);
  };

  const handleOpenAssignModal = (transfer) => {
    setSelectedTransferForModal(transfer);
    setDriverName("Mary Mwangi");
    setVehicleReg("KCE 901M");
    setColdBoxTag(transfer.coldBox || "CB-08 (Calibrated 3.8°C)");
  };

  const handleConfirmAssignment = () => {
    if (!selectedTransferForModal) return;
    onAssignCourier(selectedTransferForModal.id, {
      driver: driverName,
      vehicle: vehicleReg,
      coldBox: coldBoxTag,
      coordinator: "C. Chemjor"
    });
    setSelectedTransferForModal(null);
  };

  // Stage Badge Helper with Burgundy and WCAG Tokens
  const renderStageBadge = (stage) => {
    switch (stage) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Approved
          </span>
        );
      case 'COURIER_ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/50 text-brand-cobalt dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Courier Assigned
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            In Transit
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-status-emerald dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-status-emerald"></span>
            Delivered
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Title & Top Telemetry Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-2 border-b border-border-warm dark:border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Truck className="w-5 h-5 text-brand-cobalt dark:text-blue-400" />
              Transfers and couriers
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Handover record &bull; Cooler temperature
          </p>
        </div>

        {/* Real-time Health Telemetry */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 shadow-xs">
            <Thermometer className="w-4 h-4 text-brand-burgundy dark:text-rose-400" />
            <span className="text-slate-600 dark:text-slate-400">Cold Chain:</span>
            <span className="font-mono font-bold text-status-emerald dark:text-emerald-400">3.9°C Safe (2°-6°C)</span>
          </div>

          <div className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-status-emerald dark:text-emerald-400" />
            <span className="text-slate-600 dark:text-slate-400">Records:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">Up to date</span>
          </div>
        </div>
      </div>

      {/* Task 3: Interactive FilterBar with Search, Blood Type, Status, View Switchers */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
        selectedBloodType={selectedBloodType}
        onBloodTypeChange={(bt) => { setSelectedBloodType(bt); setCurrentPage(1); }}
        selectedStatus={selectedStatus}
        onStatusChange={(st) => { setSelectedStatus(st); setCurrentPage(1); }}
        statusOptions={STATUS_OPTIONS}
        totalCount={transfers.length}
        filteredCount={filteredTransfers.length}
        onReset={handleResetFilters}
        placeholder="Search by hospital, transfer ID, courier, or unit #..."
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        viewOptions={VIEW_OPTIONS}
      />

      {/* Empty State */}
      {filteredTransfers.length === 0 && (
        <div className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-2xl p-10 text-center shadow-card space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-400 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No transfers match your filter criteria</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query, selecting another blood type, or resetting filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-cobalt hover:bg-brand-burgundy text-white transition"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* VIEW MODE 1: High-Density CSS Grid Layout (Keeps multiple items above the fold) */}
      {viewMode === 'grid' && filteredTransfers.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedTransfers.map((t) => (
              <div
                key={t.id}
                className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700/80 rounded-2xl p-4 shadow-sm hover:border-brand-burgundy/40 dark:hover:border-rose-400/40 hover:shadow-card-hover transition-all flex flex-col justify-between space-y-3 relative overflow-hidden group"
              >
                {/* Top Subtle Burgundy Accent Indicator */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-cobalt via-brand-burgundy to-blue-600 opacity-60 group-hover:opacity-100 transition-opacity"></div>

                <div>
                  {/* Card Header: ID + Blood Group + Stage */}
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-bg-inset dark:bg-slate-900 border border-border-warm dark:border-slate-700 text-slate-800 dark:text-slate-200">
                        #{t.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md font-black text-xs ${
                        t.group === 'O-'
                          ? 'bg-red-100 dark:bg-red-950/60 text-status-crimson border border-red-200 dark:border-red-900'
                          : 'bg-blue-100 dark:bg-blue-950/60 text-brand-cobalt dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                      }`}>
                        {t.quantity} Units {t.group}
                      </span>
                    </div>
                    {renderStageBadge(t.stage)}
                  </div>

                  {/* Corridor Route */}
                  <div className="mt-3">
                    <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="truncate">{t.donor}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{t.recipient}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{t.distance || '18.2 km'}</span>
                      <span>&bull;</span>
                      <span>ETA: {t.estDuration || '24 mins'}</span>
                      <span>&bull;</span>
                      <span className="font-mono text-slate-600 dark:text-slate-400">{t.coldBox || 'CB-08'}</span>
                    </div>
                  </div>

                  {/* Mid Section: Telemetry / Courier Manifest */}
                  <div className="mt-3 bg-bg-inset dark:bg-slate-900/60 border border-border-warm dark:border-slate-700/60 rounded-xl p-2.5 text-xs space-y-1.5">
                    {t.stage === 'APPROVED' && (
                      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                        <span>Delivery note: <em>Waiting for driver</em></span>
                        <span className="text-amber-600 dark:text-amber-400 font-bold">Ready for Pickup</span>
                      </div>
                    )}

                    {(t.stage === 'COURIER_ASSIGNED' || t.stage === 'IN_TRANSIT' || t.stage === 'DELIVERED') && (
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-semibold truncate">
                          <Car className="w-3.5 h-3.5 text-brand-cobalt dark:text-blue-400" />
                          <span>{t.courier?.driver || 'Assigned Driver'}</span>
                        </div>
                        <span className="font-mono font-bold text-brand-cobalt dark:text-blue-300">
                          {t.courier?.vehicle || 'KDA 320P'}
                        </span>
                      </div>
                    )}

                    {t.stage === 'IN_TRANSIT' && (
                      <div className="space-y-1 pt-1 border-t border-border-warm/60 dark:border-slate-800">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <Thermometer className="w-3 h-3" />
                            {t.temperature || '3.9°C'} (Safe)
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {t.progressPercent || 65}% &bull; {t.remainingTime || '14m remaining'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-status-emerald h-full rounded-full transition-all duration-500" 
                            style={{ width: `${t.progressPercent || 65}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {t.stage === 'DELIVERED' && (
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                        <span>Delivered: {t.deliveredTime || 'Today'}</span>
                        <span className="font-bold text-status-emerald dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Custody Signed
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Button (Task 1: Burgundy hover states) */}
                <div className="pt-2 border-t border-border-warm/60 dark:border-slate-700/60">
                  {t.stage === 'APPROVED' && (
                    <button
                      onClick={() => handleOpenAssignModal(t)}
                      className="w-full py-2 px-3 rounded-xl bg-brand-cobalt hover:bg-brand-burgundy text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 group-hover:shadow-burgundy"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Assign Courier</span>
                    </button>
                  )}

                  {t.stage === 'COURIER_ASSIGNED' && (
                    <button
                      onClick={() => onConfirmPickup(t.id)}
                      className="w-full py-2 px-3 rounded-xl bg-status-emerald hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Confirm Pickup</span>
                    </button>
                  )}

                  {t.stage === 'IN_TRANSIT' && (
                    <button
                      onClick={() => onConfirmHandover(t.id)}
                      className="w-full py-2 px-3 rounded-xl bg-brand-cobalt hover:bg-brand-burgundy text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Handover</span>
                    </button>
                  )}

                  {t.stage === 'DELIVERED' && (
                    <div className="text-center py-1 text-xs font-bold text-status-emerald dark:text-emerald-400 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Received and recorded</span>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-border-warm dark:border-slate-700 bg-bg-surface dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-inset dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-border-warm dark:border-slate-700 bg-bg-surface dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-inset dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: Compact Paginated Data Table (Clinical Triage Mode) */}
      {viewMode === 'table' && filteredTransfers.length > 0 && (
        <div className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-bg-inset dark:bg-slate-900 border-b border-border-warm dark:border-slate-700 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Transfer ID</th>
                  <th className="py-3 px-4">Route (Donor &rarr; Recipient)</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Cold-Chain</th>
                  <th className="py-3 px-4">Courier / Vehicle</th>
                  <th className="py-3 px-4">Stage Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-warm dark:divide-slate-700/80">
                {paginatedTransfers.map((t) => (
                  <tr 
                    key={t.id} 
                    className="hover:bg-bg-inset/60 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      #{t.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span className="text-brand-cobalt dark:text-blue-400">{t.donor}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span>{t.recipient}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {t.distance} &bull; {t.estDuration}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded font-black text-xs ${
                        t.group === 'O-'
                          ? 'bg-red-100 dark:bg-red-950/60 text-status-crimson border border-red-200 dark:border-red-900'
                          : 'bg-blue-100 dark:bg-blue-950/60 text-brand-cobalt dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                      }`}>
                        {t.quantity}u {t.group}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-[11px] font-bold text-status-emerald dark:text-emerald-400 flex items-center gap-1">
                        <Thermometer className="w-3.5 h-3.5" />
                        <span>{t.temperature || '3.9°C'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{t.coldBox || 'CB-08'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {t.courier?.driver || 'Unassigned'}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                        {t.courier?.vehicle || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {renderStageBadge(t.stage)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {t.stage === 'APPROVED' && (
                        <button
                          onClick={() => handleOpenAssignModal(t)}
                          className="px-3 py-1.5 rounded-lg bg-brand-cobalt hover:bg-brand-burgundy text-white font-bold text-xs transition"
                        >
                          Assign Courier
                        </button>
                      )}
                      {t.stage === 'COURIER_ASSIGNED' && (
                        <button
                          onClick={() => onConfirmPickup(t.id)}
                          className="px-3 py-1.5 rounded-lg bg-status-emerald hover:bg-emerald-700 text-white font-bold text-xs transition"
                        >
                          Confirm Pickup
                        </button>
                      )}
                      {t.stage === 'IN_TRANSIT' && (
                        <button
                          onClick={() => onConfirmHandover(t.id)}
                          className="px-3 py-1.5 rounded-lg bg-brand-cobalt hover:bg-brand-burgundy text-white font-bold text-xs transition"
                        >
                          Confirm Handover
                        </button>
                      )}
                      {t.stage === 'DELIVERED' && (
                        <span className="text-[11px] font-bold text-status-emerald dark:text-emerald-400">
                          Complete &bull; Signed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="flex items-center justify-between p-3 border-t border-border-warm dark:border-slate-700 text-xs bg-bg-inset/40 dark:bg-slate-900/40">
            <span className="text-slate-500 dark:text-slate-400">
              Showing {paginatedTransfers.length} of {filteredTransfers.length} entries
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 rounded-md border border-border-warm dark:border-slate-700 bg-bg-surface dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1 rounded-md border border-border-warm dark:border-slate-700 bg-bg-surface dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: 4-Stage Horizontal Pipeline (Zero Downward Scroll) */}
      {viewMode === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          
          {/* Stage 1: Approved */}
          <div className="bg-bg-inset/70 dark:bg-slate-900/50 border border-border-warm dark:border-slate-800 rounded-2xl p-3.5 space-y-3 min-h-[480px] flex flex-col">
            <div className="flex items-center justify-between border-b border-border-warm dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">1. Approved</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                {transfers.filter(t => t.stage === 'APPROVED').length} Pending
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {transfers.filter(t => t.stage === 'APPROVED').map((t) => (
                <div key={t.id} className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-xl p-3 shadow-sm space-y-2.5 hover:border-brand-burgundy/40 transition">
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-bg-inset dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-border-warm dark:border-slate-700">
                      #{t.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-status-crimson font-black text-[10px]">
                      {t.quantity} Units {t.group}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{t.donor}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>{t.recipient}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {t.distance} &bull; {t.estDuration} &bull; {t.coldBox}
                    </div>
                  </div>
                  <div className="pt-1">
                    <button
                      onClick={() => handleOpenAssignModal(t)}
                      className="w-full py-2 px-3 rounded-lg bg-brand-cobalt hover:bg-brand-burgundy text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Assign Courier</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 2: Courier Assigned */}
          <div className="bg-bg-inset/70 dark:bg-slate-900/50 border border-border-warm dark:border-slate-800 rounded-2xl p-3.5 space-y-3 min-h-[480px] flex flex-col">
            <div className="flex items-center justify-between border-b border-border-warm dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">2. Courier Assigned</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-brand-cobalt dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                {transfers.filter(t => t.stage === 'COURIER_ASSIGNED').length} Dispatched
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {transfers.filter(t => t.stage === 'COURIER_ASSIGNED').map((t) => (
                <div key={t.id} className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-xl p-3 shadow-sm space-y-2.5 hover:border-brand-burgundy/40 transition">
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-bg-inset dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-border-warm dark:border-slate-700">
                      #{t.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-brand-cobalt dark:text-blue-300 font-black text-[10px]">
                      {t.quantity} Units {t.group}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{t.donor}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>{t.recipient}</span>
                    </div>
                  </div>
                  <div className="bg-bg-inset dark:bg-slate-900/60 p-2 rounded-lg border border-border-warm dark:border-slate-700 space-y-1 text-[11px]">
                    <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                      <span>Driver: {t.courier?.driver}</span>
                      <span className="text-brand-cobalt dark:text-blue-400 font-mono">{t.courier?.vehicle}</span>
                    </div>
                    <div className="text-slate-400 text-[10px]">Note: {t.manifestId || 'MF-8921'}</div>
                  </div>
                  <div className="pt-1">
                    <button
                      onClick={() => onConfirmPickup(t.id)}
                      className="w-full py-2 px-3 rounded-lg bg-status-emerald hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Confirm Pickup</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 3: In Transit */}
          <div className="bg-bg-inset/70 dark:bg-slate-900/50 border border-border-warm dark:border-slate-800 rounded-2xl p-3.5 space-y-3 min-h-[480px] flex flex-col">
            <div className="flex items-center justify-between border-b border-border-warm dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">3. In Transit</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                {transfers.filter(t => t.stage === 'IN_TRANSIT').length} On Route
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {transfers.filter(t => t.stage === 'IN_TRANSIT').map((t) => (
                <div key={t.id} className="bg-bg-surface dark:bg-slate-800 border border-brand-cobalt/40 dark:border-blue-500/40 rounded-xl p-3 shadow-sm space-y-2.5">
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-bg-inset dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-border-warm dark:border-slate-700">
                      #{t.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-black text-[10px]">
                      {t.quantity} Units {t.group}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{t.donor}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>{t.recipient}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex justify-between">
                      <span>Driver: {t.courier?.driver}</span>
                      <span className="font-mono text-brand-cobalt dark:text-blue-400 font-bold">{t.courier?.vehicle}</span>
                    </div>
                  </div>

                  {/* Cold Chain Gauge */}
                  <div className="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 p-2.5 rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                        <Thermometer className="w-3.5 h-3.5 text-emerald-600" />
                        Cold Chain Sensor
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-mono font-bold text-[10px]">
                        {t.temperature || '4.0°C'} Safe
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                        <span>Progress: {t.progressPercent || 68}%</span>
                        <span className="text-slate-900 dark:text-slate-100 font-bold">{t.remainingTime || '14m remaining'}</span>
                      </div>
                      <div className="w-full bg-emerald-200 dark:bg-emerald-900/60 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-status-emerald h-full rounded-full transition-all duration-500" style={{ width: `${t.progressPercent || 68}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => onConfirmHandover(t.id)}
                      className="w-full py-2 px-3 rounded-lg bg-brand-cobalt hover:bg-brand-burgundy text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Handover</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 4: Delivered */}
          <div className="bg-bg-inset/70 dark:bg-slate-900/50 border border-border-warm dark:border-slate-800 rounded-2xl p-3.5 space-y-3 min-h-[480px] flex flex-col">
            <div className="flex items-center justify-between border-b border-border-warm dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-emerald"></span>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">4. Delivered</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-status-emerald dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                {transfers.filter(t => t.stage === 'DELIVERED').length} Complete
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {transfers.filter(t => t.stage === 'DELIVERED').map((t) => (
                <div key={t.id} className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-xl p-3 shadow-sm space-y-2 opacity-95">
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-bg-inset dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-border-warm dark:border-slate-700">
                      #{t.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-status-emerald dark:text-emerald-300 font-black text-[10px]">
                      {t.quantity} Units {t.group}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{t.donor}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>{t.recipient}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Delivered {t.deliveredTime || 'Today'}
                    </div>
                  </div>
                  <div className="bg-bg-inset dark:bg-slate-900/60 p-2 rounded-lg border border-border-warm dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span>Verified Sign-off</span>
                    <span className="text-status-emerald dark:text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Record complete
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Task 1 & 2: Assign Courier & Cold Box Modal */}
      {selectedTransferForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            
            <div className="flex items-center justify-between border-b border-border-warm dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-brand-cobalt dark:text-blue-400" />
                  Assign courier and delivery note
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Transfer #{selectedTransferForModal.id} &bull; {selectedTransferForModal.donor} to {selectedTransferForModal.recipient}
                </p>
              </div>
              <button
                onClick={() => setSelectedTransferForModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Certified Emergency Driver
                </label>
                <select
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border-warm dark:border-slate-700 bg-bg-inset dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-brand-cobalt"
                >
                  <option value="Mary Mwangi">Mary Mwangi &bull; Ambulance Fleet 03</option>
                  <option value="Peter Kamau">Peter Kamau &bull; Rapid Motor Carrier</option>
                  <option value="Daniel Ochieng">Daniel Ochieng &bull; Emergency Van</option>
                  <option value="Brian Mwaura">Brian Mwaura &bull; Dispatch Coordinator</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Vehicle Registration
                </label>
                <input
                  type="text"
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border-warm dark:border-slate-700 bg-bg-inset dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Calibrated Cold Box Sensor Tag
                </label>
                <input
                  type="text"
                  value={coldBoxTag}
                  onChange={(e) => setColdBoxTag(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-border-warm dark:border-slate-700 bg-bg-inset dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-mono text-xs"
                />
              </div>

              <div className="bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/20 dark:border-amber-800/40 p-3 rounded-xl text-[11px] text-amber-900 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1 text-amber-800 dark:text-amber-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  MOH Safe Custody Protocol
                </div>
                <p className="leading-relaxed">
                  The driver's sign-off records the handover. If the cooler rises above 6°C, supervisors are alerted.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-warm dark:border-slate-700">
              <button
                onClick={() => setSelectedTransferForModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-bg-inset dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAssignment}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-cobalt hover:bg-brand-burgundy text-white shadow-xs flex items-center gap-1.5 transition"
              >
                <FileText className="w-4 h-4" />
                Save delivery note and assign
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Export alias as requested in execution guidance
export { TransfersWorkflow as TransferMenu };
