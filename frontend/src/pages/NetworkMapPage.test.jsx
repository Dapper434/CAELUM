import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as admin from '../lib/api/admin';

vi.mock('../components/LeafletMap', () => ({
  default: ({ markers, routes }) => <div data-testid="map">{markers.length} markers / {routes.length} routes</div>,
}));

const { default: NetworkMapPage } = await import('./NetworkMapPage');

describe('NetworkMapPage', () => {
  it('plots facilities, couriers and transfer routes', async () => {
    vi.spyOn(admin, 'getNetworkMap').mockResolvedValue({
      facilities: [{ id: 'f1', name: 'Hub', latitude: -1.29, longitude: 36.82, stock: { 'O-': 6 }, open_alerts: 0 }],
      transfers: [{ id: 't1', transfer_code: 'TRF-1', stage: 'in_transit', route_geojson: { coordinates: [[36.8, -1.2]] }, temperature_c: 4.2 }],
      couriers: [{ id: 'c1', full_name: 'J. Otieno', status: 'on_job', latitude: -1.285, longitude: 36.85, last_seen_at: '2026-11-03T06:00:00Z' }],
    });
    render(<NetworkMapPage />);
    expect(await screen.findByText('2 markers / 1 routes')).toBeInTheDocument();
    expect(screen.getByText('J. Otieno')).toBeInTheDocument();
    expect(screen.getByText('-1.2850, 36.8500')).toBeInTheDocument();
    expect(screen.getByText('TRF-1')).toBeInTheDocument();
  });
});
