import React from 'react';
import { getTemperatureReadings } from '../../lib/api/transfers';
import { getColdChainBands } from '../../lib/api/admin';
import { useApiData } from '../../hooks/useApiData';
import { ErrorNote, Pill, Table } from '../ui';
import { formatTemp, formatTime, humanize } from '../../lib/format';

/** Band that applies to a reading: product band for cooler, cabin band for vehicle. */
export function bandFor(bands, productType, source) {
  if (!bands) return null;
  if (source === 'vehicle') return bands.vehicle_cabin || null;
  return (bands.products || []).find((p) => p.product_type === productType) || null;
}

export default function ColdChainPanel({ transfer }) {
  const readings = useApiData(() => getTemperatureReadings(transfer.id), [transfer.id, transfer.updated_at]);
  const bands = useApiData(getColdChainBands, []);
  const cooler = bandFor(bands.data, transfer.product_type, 'cooler');
  const cabin = bandFor(bands.data, transfer.product_type, 'vehicle');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        {cooler && <Pill tone="blue">Cooler band {cooler.min_c}–{cooler.max_c} °C ({humanize(transfer.product_type)})</Pill>}
        {cabin && <Pill tone="slate">Cabin band {cabin.min_c}–{cabin.max_c} °C (advisory)</Pill>}
        {transfer.temperature_excursion
          ? <Pill tone="red">Product excursion recorded</Pill>
          : <Pill tone="green">No product excursion</Pill>}
      </div>
      <ErrorNote error={readings.error || bands.error} />
      <Table
        rows={readings.data || []}
        empty="No temperature readings yet."
        columns={[
          { key: 'recorded_at', label: 'Recorded', render: (r) => formatTime(r.recorded_at) },
          { key: 'source', label: 'Source' },
          { key: 'sensor_id', label: 'Sensor' },
          { key: 'temp_c', label: 'Temp', render: (r) => <span className={r.excursion ? 'text-status-crimson font-bold' : ''}>{formatTemp(r.temp_c)}</span> },
          { key: 'band', label: 'Band', render: (r) => `${r.min_c}–${r.max_c} °C` },
          {
            key: 'excursion', label: 'Status', render: (r) => (r.excursion
              ? <Pill tone={r.source === 'vehicle' ? 'amber' : 'red'}>{r.source === 'vehicle' ? 'Cabin warning' : 'Excursion'}</Pill>
              : <Pill tone="green">In band</Pill>),
          },
        ]}
      />
    </div>
  );
}
