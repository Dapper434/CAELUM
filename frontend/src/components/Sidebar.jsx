import React from 'react';
import { LayoutDashboard, AlertCircle, Inbox, Truck, Shield, HeartHandshake } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, alertCount, proposalCount, activeTransfersCount }) {
  const navItems = [
    {
      id: "dashboard",
      label: "Network Dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "alerts",
      label: "Shortage Alerts",
      icon: AlertCircle,
      badge: alertCount > 0 ? alertCount : null,
      badgeColor: "bg-status-crimson text-white",
    },
    {
      id: "approval",
      label: "Approval Inbox",
      icon: Inbox,
      badge: proposalCount > 0 ? `${proposalCount} Action` : null,
      badgeColor: "bg-status-emerald text-white font-bold",
    },
    {
      id: "transfers",
      label: "Transfers",
      icon: Truck,
      badge: activeTransfersCount > 0 ? `${activeTransfersCount} Active` : null,
      badgeColor: "bg-brand-burgundy text-white font-bold shadow-xs",
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-bg-surface dark:bg-slate-900 border-b md:border-b-0 md:border-r border-border-warm dark:border-slate-800 flex flex-col justify-between p-3 sm:p-4 md:min-h-[calc(100vh-4rem)] transition-colors flex-shrink-0">
      <div className="space-y-3 md:space-y-6">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1 md:px-3 mb-1.5 md:mb-2 flex items-center justify-between">
            <span>Clinical Operations</span>
            <span className="w-1.5 h-1.5 rounded-full bg-brand-burgundy"></span>
          </div>
          <nav className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-1 gap-1.5 md:space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all relative overflow-hidden ${
                    isActive
                      ? "bg-brand-cobalt text-white border border-brand-cobalt shadow-sm shadow-blue-900/20"
                      : "bg-bg-inset dark:bg-slate-800/60 border border-border-warm dark:border-slate-700/60 text-slate-800 dark:text-slate-200 hover:border-brand-burgundy/40 hover:bg-bg-surface dark:hover:bg-slate-800"
                  }`}
                >
                  {/* Task 1: Burgundy Accent Underline/Edge Indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-brand-burgundy"></span>
                  )}
                  
                  <div className="flex items-center gap-2 sm:gap-3 truncate">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-accent-yellow" : "text-slate-400 dark:text-slate-500"}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-1 flex-shrink-0 ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Safety Notice (Desktop persistent, hidden on phone to maximize stage) */}
        <div className="hidden md:block bg-bg-inset dark:bg-slate-800/80 border border-border-warm dark:border-slate-700/80 rounded-2xl p-3.5 text-xs">
          <div className="flex items-center gap-1.5 text-status-emerald dark:text-emerald-400 font-bold mb-1">
            <Shield className="w-4 h-4" />
            <span>Safety check</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Distance, stock, and expiry are checked before a bag is offered. Nothing moves until you approve it.
          </p>
        </div>
      </div>

      {/* Philosophy Card Borrowed from Moringa Rubric */}
      <div className="hidden md:block p-3 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 dark:border-amber-800/40 rounded-2xl text-xs">
        <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 mb-1">
          <HeartHandshake className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Your approval comes first</span>
        </div>
        <p className="text-[10.5px] text-amber-900/80 dark:text-amber-300/80 leading-normal">
          The written reason is a suggestion. You approve every transfer.
        </p>
      </div>
    </aside>
  );
}
