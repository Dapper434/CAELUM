import React from 'react';
import { getTracking } from '../../lib/api/transfers';
import { useApiData } from '../../hooks/useApiData';
import { ErrorNote, Field } from '../ui';
import LeafletMap from '../LeafletMap';
import { formatTime } from '../../lib/format';

export default function TrackingPanel({ transfer }) {
  const active = !['delivered', 'cancelled'].includes(transfer.stage);
  const { data, error } = useApiData(() => getTracking(transfer.id), [transfer.id], { pollMs: active ? 15000 : 0 });
  const loc = data?.last_location;
  const markers = [
    data?.donor && { id: 'donor', lat: data.donor.latitude, lng: data.donor.longitude, kind: 'facility', label: 'Donor' },
    data?.recipient && { id: 'recipient', lat: data.recipient.latitude, lng: data.recipient.longitude, kind: 'alert', label: 'Recipient' },
    loc && { id: 'courier', lat: loc.latitude, lng: loc.longitude, kind: 'on_job', label: `Courier · ${formatTime(loc.recorded_at)}` },
  ].filter(Boolean);
  const route = data?.eta?.route_geojson || transfer.route_geojson;

  return (
    <div className="space-y-3">
      <ErrorNote error={error} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Last ping">{loc ? formatTime(loc.recorded_at) : '—'}</Field>
        <Field label="Speed">{loc?.speed_kmh != null ? `${loc.speed_kmh} km/h` : '—'}</Field>
        <Field label="Remaining">{data?.eta ? `${data.eta.remaining_minutes} min · ${data.eta.remaining_km} km${data.eta.eta_source === 'estimate' ? ' (estimate)' : ''}` : '—'}</Field>
        <Field label="ETA">{data?.eta ? formatTime(data.eta.eta_at) : '—'}</Field>
      </div>
      <LeafletMap height={280} markers={markers} routes={route?.coordinates ? [{ id: 'r', coordinates: route.coordinates, excursion: transfer.temperature_excursion }] : []} />
    </div>
  );
}
