import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ColdChainPanel, { bandFor } from './ColdChainPanel';
import { api } from '../../lib/api/client';

const bands = { products: [{ product_type: 'packed_rbc', min_c: 2, max_c: 6 }], vehicle_cabin: { min_c: 2, max_c: 30 } };

describe('ColdChainPanel', () => {
  it('picks the product band for coolers and the cabin band for vehicles', () => {
    expect(bandFor(bands, 'packed_rbc', 'cooler')).toMatchObject({ max_c: 6 });
    expect(bandFor(bands, 'packed_rbc', 'vehicle')).toMatchObject({ max_c: 30 });
    expect(bandFor(null, 'packed_rbc', 'cooler')).toBeNull();
  });

  it('marks excursions and cabin warnings', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path) => (path === '/cold-chain/bands' ? bands : [
      { id: 'a', source: 'cooler', temp_c: 7.5, min_c: 2, max_c: 6, excursion: true, recorded_at: '2026-11-03T06:00:00Z' },
      { id: 'b', source: 'vehicle', temp_c: 33, min_c: 2, max_c: 30, excursion: true, recorded_at: '2026-11-03T06:01:00Z' },
      { id: 'c', source: 'cooler', temp_c: 4, min_c: 2, max_c: 6, excursion: false, recorded_at: '2026-11-03T06:02:00Z' },
    ]));
    render(<ColdChainPanel transfer={{ id: 't1', product_type: 'packed_rbc', temperature_excursion: true }} />);
    expect(await screen.findByText('Excursion')).toBeInTheDocument();
    expect(screen.getByText('Cabin warning')).toBeInTheDocument();
    expect(screen.getByText('In band')).toBeInTheDocument();
    expect(await screen.findByText(/Cooler band 2–6/)).toBeInTheDocument();
    expect(screen.getByText('Product excursion recorded')).toBeInTheDocument();
  });
});
