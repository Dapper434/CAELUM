import React, { useState } from 'react';
import { getForecast, getForecastHistory } from '../../lib/api/forecast';
import { useApiData } from '../../hooks/useApiData';
import { ErrorNote, Field, Loading, inputClass } from '../ui';
import { humanize } from '../../lib/format';

const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const PRODUCTS = ['packed_rbc', 'platelets', 'plasma', 'whole_blood'];

function Bars({ points, valueKey, color, label }) {
  const max = Math.max(1, ...points.map((p) => p[valueKey] || 0));
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      <div className="flex items-end gap-[2px] h-24" role="img" aria-label={label}>
        {points.map((p) => (
          <div key={p.date} title={`${p.date}: ${p[valueKey]}`} className="flex-1 rounded-t" style={{ height: `${((p[valueKey] || 0) / max) * 100}%`, minHeight: 1, background: color }} />
        ))}
      </div>
      {points.length > 0 && (
        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5"><span>{points[0].date}</span><span>{points[points.length - 1].date}</span></div>
      )}
    </div>
  );
}

/** Demand forecast plus the history behind it (GET /forecast, GET /forecast/history). */
export default function ForecastPanel({ facilityId }) {
  const [group, setGroup] = useState('O-');
  const [product, setProduct] = useState('packed_rbc');
  const [days, setDays] = useState(28);
  const forecast = useApiData(() => getForecast({ facilityId, bloodGroup: group, productType: product }), [facilityId, group, product]);
  const history = useApiData(() => getForecastHistory({ facilityId, bloodGroup: group, productType: product, days }), [facilityId, group, product, days]);
  const f = forecast.data;
  const h = history.data;
  const insufficient = forecast.error?.code === 'insufficient_history';

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <select aria-label="Forecast blood group" className={`${inputClass} w-24`} value={group} onChange={(e) => setGroup(e.target.value)}>
          {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select aria-label="Forecast product" className={`${inputClass} w-36`} value={product} onChange={(e) => setProduct(e.target.value)}>
          {PRODUCTS.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
        </select>
        <select aria-label="History days" className={`${inputClass} w-28`} value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[14, 28, 90, 180, 365].map((d) => <option key={d} value={d}>{d} days</option>)}
        </select>
      </div>

      {insufficient ? (
        <div className="text-xs text-amber-700">Not enough demand history for a forecast yet (needs 14 days).</div>
      ) : <ErrorNote error={forecast.error} />}
      {forecast.loading && !f && <Loading />}
      {f && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Field label="On hand">{f.units_on_hand}</Field>
          <Field label="Days of cover"><span className={f.days_of_cover < 1 ? 'text-status-crimson font-bold' : f.days_of_cover < 3 ? 'text-amber-600 font-bold' : ''}>{f.days_of_cover}</span></Field>
          <Field label="Avg daily demand">{f.average_daily_demand}</Field>
          <Field label="Next 7 days">{f.total_seven_day}</Field>
          <Field label="Method">{humanize(f.method)} · {f.history_points} pts</Field>
        </div>
      )}
      {f?.daily_demand?.length > 0 && <Bars points={f.daily_demand} valueKey="units" color="#0E3A8C" label="Forecast demand (next days)" />}

      <ErrorNote error={history.error} />
      {h && (
        <>
          <Bars points={h.history || []} valueKey="units_issued" color="#7A1A2B" label={`Units issued ${h.from} → ${h.to}`} />
          <div className="text-xs text-slate-500">Total {h.total_issued} · average {h.average_daily}/day · {h.days_with_data} days with data</div>
        </>
      )}
    </div>
  );
}
