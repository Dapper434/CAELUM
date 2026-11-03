import React, { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { listFacilities, getFacility, getFacilityAudit } from '../lib/api/facilities';
import { useApiData } from '../hooks/useApiData';
import { Button, Card, ErrorNote, Field, Loading, PageHeader, Pill, Table } from '../components/ui';
import ContactsEditor from '../components/facility/ContactsEditor';
import InventoryPanel from '../components/facility/InventoryPanel';
import ForecastPanel from '../components/facility/ForecastPanel';
import AuditList from '../components/AuditList';

const TABS = [
  { id: 'contacts', label: 'Details & contacts' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'audit', label: 'Audit' },
];

function FacilityAudit({ facilityId }) {
  const [pages, setPages] = useState([]);
  const [cursor, setCursor] = useState(undefined);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (beforeSeq) => {
    setLoading(true);
    setError(null);
    try {
      const { data, meta } = await getFacilityAudit(facilityId, { limit: 50, beforeSeq });
      setPages((prev) => (beforeSeq ? [...prev, ...data] : data));
      setCursor(meta?.next_before_seq ?? null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPages([]); load(undefined); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [facilityId]);

  return (
    <div className="space-y-2">
      <ErrorNote error={error} />
      <AuditList entries={pages} />
      {loading && <Loading />}
      {cursor != null && !loading && <Button variant="ghost" onClick={() => load(cursor)}>Load older entries</Button>}
    </div>
  );
}

function FacilityDetail({ id, onUpdated }) {
  const [tab, setTab] = useState('contacts');
  const { data: f, error, loading, setData, reload } = useApiData(() => getFacility(id), [id]);
  if (loading && !f) return <Loading />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!f) return null;
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{f.name}</h2>
          <div className="text-xs text-slate-500">{f.county} · {f.level_label} · MFL {f.mfl_code}</div>
        </div>
        <Pill status={f.is_active ? 'active' : 'offline'}>{f.is_active ? 'Active' : 'Inactive'}</Pill>
      </div>
      <div role="tablist" className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${tab === t.id ? 'bg-brand-cobalt text-white border-brand-cobalt' : 'bg-bg-inset dark:bg-slate-800/60 border-border-warm dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'contacts' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-3 content-start">
            <Field label="Region">{f.region_code}</Field>
            <Field label="KEPH level">{f.keph_level}</Field>
            <Field label="Latitude">{f.latitude}</Field>
            <Field label="Longitude">{f.longitude}</Field>
            <Field label="Contact">{f.contact_name}</Field>
            <Field label="Phone">{f.contact_phone}</Field>
            <div className="col-span-2"><Field label="Address">{f.address}</Field></div>
          </div>
          <ContactsEditor facility={f} onSaved={(updated) => { setData(updated); onUpdated?.(); }} />
        </div>
      )}
      {tab === 'inventory' && <InventoryPanel facilityId={f.id} />}
      {tab === 'forecast' && <ForecastPanel facilityId={f.id} />}
      {tab === 'audit' && <FacilityAudit facilityId={f.id} />}
    </Card>
  );
}

export default function FacilitiesPage({ regionCode = '' }) {
  const list = useApiData(() => listFacilities(regionCode || undefined), [regionCode]);
  const [selected, setSelected] = useState(null);

  return (
    <div className="space-y-4">
      <PageHeader title="Facilities" subtitle="Every hospital in CAELUM. Select one for contacts, inventory, forecast and audit." onRefresh={list.reload} loading={list.loading} />
      <ErrorNote error={list.error} onRetry={list.reload} />
      <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
        <Card>
          {list.loading && !list.data ? <Loading /> : (
            <Table
              rows={list.data || []}
              empty="No facilities."
              onRowClick={(f) => setSelected(f.id)}
              columns={[
                { key: 'name', label: 'Facility', render: (f) => <span className={`font-semibold ${selected === f.id ? 'text-brand-cobalt' : ''}`}><Building2 className="w-3 h-3 inline mr-1" />{f.name}</span> },
                { key: 'county', label: 'County' },
                { key: 'level_label', label: 'Level' },
                { key: 'contact_phone', label: 'Phone' },
              ]}
            />
          )}
        </Card>
        <div>{selected ? <FacilityDetail id={selected} onUpdated={list.reload} /> : <Card className="p-6 text-xs text-slate-500 text-center">Select a facility.</Card>}</div>
      </div>
    </div>
  );
}
