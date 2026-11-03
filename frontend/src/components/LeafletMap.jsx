import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const COLORS = { facility: '#0E3A8C', alert: '#DC2626', available: '#059669', on_job: '#F59E0B', offline: '#64748B', route: '#7A1A2B' };

/**
 * Leaflet + OpenStreetMap tiles (no token on the client).
 * markers: [{id, lat, lng, kind, label}], routes: [{id, coordinates:[[lng,lat],…], excursion}]
 */
export default function LeafletMap({ markers = [], routes = [], height = 420 }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);

  useEffect(() => {
    if (!el.current || map.current) return undefined;
    map.current = L.map(el.current, { center: [-1.2921, 36.8219], zoom: 10 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!layer.current) return;
    layer.current.clearLayers();
    const bounds = [];
    for (const r of routes) {
      if (!r.coordinates?.length) continue;
      const latlngs = r.coordinates.map(([lng, lat]) => [lat, lng]);
      L.polyline(latlngs, { color: r.excursion ? COLORS.alert : COLORS.route, weight: 3, opacity: 0.8 }).bindTooltip(r.label || '').addTo(layer.current);
    }
    for (const m of markers) {
      if (m.lat == null || m.lng == null) continue;
      bounds.push([m.lat, m.lng]);
      L.circleMarker([m.lat, m.lng], {
        radius: m.kind === 'facility' || m.kind === 'alert' ? 8 : 6,
        color: COLORS[m.kind] || COLORS.facility,
        fillColor: COLORS[m.kind] || COLORS.facility,
        fillOpacity: 0.85,
        weight: 2,
      }).bindTooltip(m.label || '').addTo(layer.current);
    }
    if (bounds.length) map.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
  }, [markers, routes]);

  return <div ref={el} style={{ height }} className="w-full rounded-xl overflow-hidden border border-border-warm dark:border-slate-700 z-0" />;
}
