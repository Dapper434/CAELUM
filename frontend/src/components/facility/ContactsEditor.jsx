import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { updateFacilityContacts, validateContacts } from '../../lib/api/facilities';
import { Button, ErrorNote, inputClass } from '../ui';

const FIELDS = [
  { key: 'contact_name', label: 'Contact name', max: 120 },
  { key: 'contact_phone', label: 'Contact phone' },
  { key: 'address', label: 'Address', max: 300, multiline: true },
];

/** Edits contact_name, contact_phone and address via PATCH /facilities/{id}. */
export default function ContactsEditor({ facility, onSaved }) {
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({ contact_name: facility.contact_name || '', contact_phone: facility.contact_phone || '', address: facility.address || '' });
    setErrors({});
    setApiError(null);
    setSaved(false);
  }, [facility]);

  const submit = async (e) => {
    e.preventDefault();
    const v = validateContacts(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    setApiError(null);
    try {
      const updated = await updateFacilityContacts(facility.id, form);
      setSaved(true);
      onSaved?.(updated);
    } catch (err) {
      setApiError(err);
      if (err.details) setErrors(err.details);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2.5" aria-label="Facility contacts">
      {FIELDS.map((f) => (
        <label key={f.key} className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          {f.label}
          {f.multiline ? (
            <textarea className={`${inputClass} mt-1`} rows={2} maxLength={f.max} value={form[f.key] ?? ''}
              onChange={(e) => { setSaved(false); setForm({ ...form, [f.key]: e.target.value }); }} />
          ) : (
            <input className={`${inputClass} mt-1`} maxLength={f.max} value={form[f.key] ?? ''}
              onChange={(e) => { setSaved(false); setForm({ ...form, [f.key]: e.target.value }); }} />
          )}
          {errors[f.key] && <span className="text-red-600 text-[11px]">{String(errors[f.key])}</span>}
        </label>
      ))}
      <ErrorNote error={apiError} />
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={saving}><Save className="w-3.5 h-3.5" /> Save contacts</Button>
        {saved && <span className="text-xs text-status-emerald">Saved. The change is in the audit log.</span>}
      </div>
    </form>
  );
}
