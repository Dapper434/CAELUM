import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ForecastPanel from './ForecastPanel';
import * as forecast from '../../lib/api/forecast';

describe('ForecastPanel', () => {
  it('shows the forecast and its history', async () => {
    vi.spyOn(forecast, 'getForecast').mockResolvedValue({ units_on_hand: 1, days_of_cover: 0.43, average_daily_demand: 2.31, total_seven_day: 16.2, method: 'holt_winters', history_points: 28, daily_demand: [{ date: '2026-11-04', units: 2.9 }] });
    vi.spyOn(forecast, 'getForecastHistory').mockResolvedValue({ from: '2026-10-07', to: '2026-11-03', history: [{ date: '2026-10-07', units_issued: 2 }], total_issued: 62, average_daily: 2.214, days_with_data: 28 });
    render(<ForecastPanel facilityId="f1" />);
    expect(await screen.findByText('0.43')).toBeInTheDocument();
    expect(await screen.findByText(/Total 62/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Units issued 2026-10-07/ })).toBeInTheDocument();
  });

  it('explains insufficient history', async () => {
    vi.spyOn(forecast, 'getForecast').mockRejectedValue(Object.assign(new Error('x'), { code: 'insufficient_history' }));
    vi.spyOn(forecast, 'getForecastHistory').mockResolvedValue({ history: [] });
    render(<ForecastPanel facilityId="f1" />);
    expect(await screen.findByText(/Not enough demand history/)).toBeInTheDocument();
  });
});
