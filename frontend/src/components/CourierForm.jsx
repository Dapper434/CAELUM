import React, { useState } from 'react';
import { VEHICLE_TYPES, LICENCE_CLASSES, validateLicence } from '../lib/api/couriers';
import { Button, ErrorNote, inputClass } from './ui';
import { REGIONS } from '../lib/regions';

const TEXT_FIELDS = [
  ['full_name', 'Full name'], ['phone', 'Phone'], ['vehicle_plate', 'Vehicle plate'], ['cold_box_id', 'Cold box'],
  ['licence_number', 'Licence number'], ['emergency_contact', 'Emergency contact'],
];

function initial(courier) {
  return {
    full_name: courier?.full_name || '', phone: courier?.phone || '', vehicle_type: courier?.vehicle_type || 'boda',
    vehicle_plate: courier?.vehicle_plate || '', cold_box_id: courier?.cold_box_id || '', region_code: courier?.region_code || '',
    licence_number: courier?.licence_number || '', licence_class: courier?.licence_class || '', licence_expiry: courier?.licence_expiry || '',
    emergency_contact: courier?.emergency_contact || '', training_certified: Boolean(courier?.training_certified),
    is_active: courier ? Boolean(courier.is_active) : true,
  };
}

/** Create or edit a courier profile, licence fields included. Sends only changed fields on edit. */
export default function CourierForm({ courier, onSubmit, submitLabel = 'Save' }) {
  const [form, setForm] = useState(() => initial(courier));
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const v = validateLicence(form);
    if (!form.full_name.trim()) v.full_name = 'Required.';
    setErrors(v);
    if (Object.keys(v).length) return;
    const base = initial(courier);
    const body = {};
    for (const [k, value] of Object.entries(form)) {
      if (courier && value === base[k]) continue;
      body[k] = typeof value === 'string' ? (value.trim() || null) : value;
    }
    if (courier && !Object.keys(body).length) return;
    if (!courier) body.full_name = form.full_name.trim();
    setBusy(true);
    setApiError(null);
    try { await onSubmit(body); } catch (err) { setApiError(err); if (err.details) setErrors(err.details); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} aria-label={courier ? 'Edit courier' : 'New courier'} className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
      {TEXT_FIELDS.map(([k, label]) => (
        <label key={k}>{label}<input className={inputClass} value={form[k]} onChange={(e) => set(k, e.target.value)} />
          {errors[k] && <span className="text-red-600">{String(errors[k])}</span>}</label>
      ))}
      <label>Vehicle<select className={inputClass} value={form.vehicle_type} onChange={(e) => set('vehicle_type', e.target.value)}>
        {VEHICLE_TYPES.map((v) => <option key={v}>{v}</option>)}</select></label>
      <label>Region<select className={inputClass} value={form.region_code} onChange={(e) => set('region_code', e.target.value)}>
        <option value="">—</option>{REGIONS.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}</select></label>
      <label>Licence class<select className={inputClass} value={form.licence_class} onChange={(e) => set('licence_class', e.target.value)}>
        <option value="">—</option>{LICENCE_CLASSES.map((c) => <option key={c}>{c}</option>)}</select>
        {errors.licence_class && <span className="text-red-600">{String(errors.licence_class)}</span>}</label>
      <label>Licence expiry<input className={inputClass} type="date" value={form.licence_expiry} onChange={(e) => set('licence_expiry', e.target.value)} />
        {errors.licence_expiry && <span className="text-red-600">{String(errors.licence_expiry)}</span>}</label>
      <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.training_certified} onChange={(e) => set('training_certified', e.target.checked)} /> Training certified</label>
      <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Active</label>
      <div className="col-span-2 md:col-span-3"><ErrorNote error={apiError} /></div>
      <div className="col-span-2 md:col-span-3"><Button type="submit" disabled={busy}>{submitLabel}</Button></div>
    </form>
  );
}
