import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Truck, 
  FileText, 
  AlertTriangle, 
  Sparkles, 
  Inbox, 
  Check, 
  X,
  ArrowRight
} from 'lucide-react';

export default function ApprovalInbox({ proposals = [], onApprove, onReject }) {
  const [activeProposalId, setActiveProposalId] = useState(proposals[0]?.id || null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const proposal = proposals.find(p => p.id === activeProposalId) || proposals[0];

  if (!proposals || proposals.length === 0) {
    return (
      <div className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-2xl p-12 text-center shadow-card max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-status-emerald/20 flex items-center justify-center mx-auto mb-4 text-status-emerald dark:text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">All Transfer Proposals Reviewed</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
          This region is being watched. New transfer suggestions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border-warm dark:border-slate-800 gap-2">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-brand-cobalt dark:text-blue-400" />
            Approval Inbox
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Read the reason, check the bags, then approve or reject.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-status-emerald/10 dark:bg-emerald-950/50 text-status-emerald dark:text-emerald-300 border border-status-emerald/20 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            {proposals.length} Action Pending Clinical Sign-off
          </span>
        </div>
      </div>

      {/* Main Inspection Card */}
      <div className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-card space-y-6">
        
        {/* Card Header: Route & Verification Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-warm dark:border-slate-700/80 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-cobalt/10 dark:bg-blue-950/60 border border-brand-cobalt/20 text-brand-cobalt dark:text-blue-400 flex items-center justify-center font-bold">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                  PROPOSAL #{proposal.id}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-burgundy/10 dark:bg-brand-burgundy/30 text-brand-burgundy dark:text-rose-200 border border-brand-burgundy/20 font-bold">
                  Needs your approval
                </span>
              </div>
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5">
                <span>{proposal.donor.name}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <span>{proposal.recipient.name}</span>
              </h2>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-status-emerald/10 dark:bg-emerald-950/50 border border-status-emerald/30 text-status-emerald dark:text-emerald-300 text-xs font-bold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-status-emerald dark:text-emerald-400" />
            <span>Bags checked</span>
          </div>
        </div>

        {/* Route Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-bg-inset dark:bg-slate-900/60 border border-border-warm dark:border-slate-700/60 p-3 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Est. Transit Duration</span>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-brand-cobalt dark:text-blue-400" />
              <span>{proposal.donor.transitTime}</span>
            </div>
          </div>

          <div className="bg-bg-inset dark:bg-slate-900/60 border border-border-warm dark:border-slate-700/60 p-3 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Corridor Distance</span>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-status-crimson" />
              <span>{proposal.donor.distance}</span>
            </div>
          </div>

          <div className="bg-bg-inset dark:bg-slate-900/60 border border-border-warm dark:border-slate-700/60 p-3 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Donor Safety Post-Op</span>
            <div className="text-sm font-extrabold text-status-emerald dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{proposal.donor.postTransferCoverDays}d Cover</span>
            </div>
          </div>

          <div className="bg-bg-inset dark:bg-slate-900/60 border border-border-warm dark:border-slate-700/60 p-3 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Recipient Post-Op</span>
            <div className="text-sm font-extrabold text-brand-cobalt dark:text-blue-400 flex items-center gap-1.5 mt-0.5">
              <span>+2.8d Cover Lift</span>
            </div>
          </div>
        </div>

        {/* Specific Allocated Units */}
        <div>
          <label className="text-xs font-extrabold text-slate-900 dark:text-slate-200 uppercase tracking-wider block mb-2">
            Bags for this transfer:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {proposal.allocatedUnits.map((unit) => (
              <div
                key={unit.id}
                className="flex items-center justify-between p-3 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-status-crimson/30 dark:border-red-900/50 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-status-crimson text-white font-black flex items-center justify-center text-sm shadow-sm">
                    {unit.group}
                  </div>
                  <div>
                    <div className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      Bag ID: #{unit.id}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {unit.bloodType} &bull; Temp: {unit.coldChain}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {unit.expiresAt}
                  </span>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Still usable</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Clinical Rationale Block */}
        <div className="p-4 rounded-xl bg-amber-500/5 dark:bg-amber-950/20 border-l-4 border-l-accent-yellow border-t border-r border-b border-border-warm dark:border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 dark:text-amber-300">
              <Sparkles className="w-4 h-4 text-accent-yellow fill-accent-yellow" />
              <span>Why this transfer</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-border-warm dark:border-slate-700 text-slate-500 dark:text-slate-400">
              Figures already checked
            </span>
          </div>

          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic">
            "{proposal.aiRationale}"
          </p>

          <div className="pt-2 border-t border-amber-200/40 dark:border-slate-700/60 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            <FileText className="w-3.5 h-3.5 text-brand-cobalt dark:text-blue-400" />
            <span>Hospital rule: <strong>{proposal.policyCitation}</strong></span>
          </div>
        </div>

        {/* Action Buttons: Massive Green Approve & Red Reject (with Burgundy hover) */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => onApprove(proposal.id)}
            className="w-full sm:flex-1 py-4 px-6 rounded-xl bg-status-emerald hover:bg-emerald-700 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-emerald-900/20 active:scale-[0.99] transition flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Approve Transfer &amp; Dispatch Courier</span>
          </button>

          <button
            onClick={() => setShowRejectModal(true)}
            className="w-full sm:w-auto py-4 px-6 rounded-xl bg-red-50 dark:bg-rose-950/30 hover:bg-brand-burgundy/10 dark:hover:bg-brand-burgundy/30 text-status-crimson hover:text-brand-burgundy dark:hover:text-rose-300 font-bold text-sm border border-status-crimson/20 hover:border-brand-burgundy/40 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
            <span>Reject Transfer</span>
          </button>
        </div>

      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-surface dark:bg-slate-800 border border-border-warm dark:border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-in">
            <h3 className="text-base font-bold text-status-crimson flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Clinical Officer Transfer Override
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Please state the clinical reason for rejecting proposal <strong>#{proposal.id}</strong>. The reason is kept with the transfer record.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Local recipient emergency surgery cancelled, or recipient secured alternate local donor."
              className="w-full h-24 p-3 text-xs rounded-xl border border-border-warm dark:border-slate-700 bg-bg-inset dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-cobalt"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onReject(proposal.id);
                  setShowRejectModal(false);
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-burgundy hover:bg-brand-burgundy-hover text-white shadow-sm transition"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
