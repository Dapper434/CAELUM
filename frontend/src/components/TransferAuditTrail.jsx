import React from 'react';
import { History, ShieldCheck, Truck, CheckCircle2, Clock } from 'lucide-react';

export default function TransferAuditTrail({ history }) {
  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-warm">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-brand-cobalt" />
            Transfer record
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Signed dispatches &bull; Who held the blood
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-status-emerald font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Record kept</span>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-bg-surface border border-border-warm rounded-2xl overflow-hidden shadow-card">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-bg-inset border-b border-border-warm text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Transfer ID</th>
              <th className="py-3 px-4">Donor Hospital</th>
              <th className="py-3 px-4">Recipient Hospital</th>
              <th className="py-3 px-4">Blood Group &amp; Qty</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Courier note</th>
              <th className="py-3 px-4">Clinical Sign-Off</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-warm">
            {history.map((item) => {
              const isDelivered = item.status === "DELIVERED";
              const isDispatched = item.status === "DISPATCHED";
              
              return (
                <tr key={item.id} className="hover:bg-bg-inset/50 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    #{item.id}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-brand-cobalt">
                    {item.donor}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {item.recipient}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-extrabold text-status-crimson mr-1.5">{item.group}</span>
                    <span className="text-slate-500 font-medium">({item.quantity} Units)</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isDelivered
                          ? "bg-emerald-100 text-status-emerald"
                          : isDispatched
                          ? "bg-blue-100 text-brand-cobalt animate-pulse"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {isDelivered && <CheckCircle2 className="w-3 h-3" />}
                      {isDispatched && <Truck className="w-3 h-3" />}
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                    {item.courier}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                    <div>{item.verifiedBy}</div>
                    <div className="text-[10px] text-slate-400">{item.completedAt}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
