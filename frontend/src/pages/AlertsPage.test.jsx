import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api, ApiError } from '../lib/api/client';
import AlertsPage from './AlertsPage';

const alert = { id: 'a1', facility_id: 'f1', blood_group: 'O-', product_type: 'packed_rbc', units_remaining: 2, days_of_cover: 0.8, urgency: 'critical' };
const job = (status, extra = {}) => ({ job_id: 'j1', status, scope: 'all', facility_id: null, progress: { facilities_done: 0, facilities_total: 12 }, result: null, error: null, ...extra });
const done = job('succeeded', { progress: { facilities_done: 12, facilities_total: 12 }, result: { facilities: 12, series: 384, shortages: 20, suggested_requests: [{}, {}], alerts: [{}] } });

let user;
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
});
afterEach(() => { vi.useRealTimers(); });

function mockGet(runs) {
  const queue = [...runs];
  return vi.spyOn(api, 'get').mockImplementation(async (path) => {
    if (path === '/alerts') return [alert];
    if (path === '/facilities') return [{ id: 'f1', name: 'Kenyatta National' }];
    if (path === '/forecast/runs/j1') {
      const next = queue.shift();
      if (next instanceof Error) throw next;
      return next;
    }
    return [];
  });
}
const tick = (ms = 3000) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const button = () => screen.getByRole('button', { name: /run forecast/i });

describe('AlertsPage forecast run', () => {
  it('starts (202), polls to succeeded, refreshes lists and shows a summary', async () => {
    const get = mockGet([job('running', { progress: { facilities_done: 5, facilities_total: 12 } }), done]);
    const post = vi.spyOn(api, 'post').mockResolvedValue(job('queued'));
    const onForecastDone = vi.fn();
    render(<AlertsPage onForecastDone={onForecastDone} />);
    expect(await screen.findByText('0.8')).toBeInTheDocument();
    await user.click(button());
    expect(post).toHaveBeenCalledWith('/forecast/run', {});
    expect(await screen.findByText('Forecast queued…')).toBeInTheDocument();
    expect(button()).toBeDisabled();
    await tick();
    expect(screen.getByText('Forecast running: 5/12 facilities')).toBeInTheDocument();
    expect(button()).toBeDisabled();
    const alertLoads = get.mock.calls.filter(([p]) => p === '/alerts').length;
    await tick();
    expect(screen.getByText(/Forecast finished: 12 facilities, 384 series, 20 shortages, 1 alerts, 2 suggested requests/)).toBeInTheDocument();
    expect(get.mock.calls.filter(([p]) => p === '/alerts').length).toBe(alertLoads + 1);
    expect(onForecastDone).toHaveBeenCalledWith(done);
    expect(button()).not.toBeDisabled();
    await tick(10000);
    expect(get.mock.calls.filter(([p]) => p === '/forecast/runs/j1')).toHaveLength(2);
  });

  it('treats 200 with an already running job as started and keeps polling it', async () => {
    mockGet([done]);
    vi.spyOn(api, 'post').mockResolvedValue(job('running', { progress: { facilities_done: 7, facilities_total: 12 } }));
    render(<AlertsPage />);
    await user.click(button());
    expect(await screen.findByText('Forecast running: 7/12 facilities')).toBeInTheDocument();
    expect(button()).toBeDisabled();
    await tick();
    expect(screen.getByText(/Forecast finished/)).toBeInTheDocument();
  });

  it('shows the error when the run fails', async () => {
    mockGet([job('failed', { error: 'Store timed out' })]);
    vi.spyOn(api, 'post').mockResolvedValue(job('queued'));
    render(<AlertsPage />);
    await user.click(button());
    await tick();
    expect(screen.getByText('Store timed out')).toBeInTheDocument();
    expect(button()).not.toBeDisabled();
  });

  it('stops with a clear message on 404 while polling', async () => {
    const get = mockGet([new ApiError(404, 'not_found', 'nope')]);
    vi.spyOn(api, 'post').mockResolvedValue(job('queued'));
    render(<AlertsPage />);
    await user.click(button());
    await tick();
    expect(screen.getByText(/could not be found any more/)).toBeInTheDocument();
    await tick(10000);
    expect(get.mock.calls.filter(([p]) => p === '/forecast/runs/j1')).toHaveLength(1);
    expect(button()).not.toBeDisabled();
  });

  it('clears polling on unmount', async () => {
    const get = mockGet([job('running')]);
    vi.spyOn(api, 'post').mockResolvedValue(job('queued'));
    const { unmount } = render(<AlertsPage />);
    await user.click(button());
    await screen.findByText('Forecast queued…');
    unmount();
    await tick(15000);
    expect(get.mock.calls.filter(([p]) => p === '/forecast/runs/j1')).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows error.message for a 400 validation_error', async () => {
    mockGet([]);
    vi.spyOn(api, 'post').mockRejectedValue(new ApiError(400, 'validation_error', 'facility_id must be a uuid'));
    render(<AlertsPage />);
    await user.click(button());
    expect(await screen.findByText('facility_id must be a uuid')).toBeInTheDocument();
  });

  it('still runs the timeout sweep', async () => {
    mockGet([]);
    vi.spyOn(api, 'post').mockResolvedValue({ offers_expired: 1, transfers_lapsed: 0, courier_assignments_timed_out: 2 });
    render(<AlertsPage />);
    await user.click(screen.getByRole('button', { name: /timeout sweep/i }));
    expect(await screen.findByText(/2 courier assignments timed out/)).toBeInTheDocument();
  });

  it('warns about facilities that failed in a succeeded run', async () => {
    mockGet([{ ...done, result: { ...done.result, errors: [{ facility_id: 'f1', error: 'no stock rows' }, { facility_id: 'f9-unknown', error: 'timeout' }] } }]);
    vi.spyOn(api, 'post').mockResolvedValue(job('queued'));
    render(<AlertsPage />);
    await screen.findByText('0.8');
    await user.click(button());
    await tick();
    expect(screen.getByText(/Forecast finished/)).toBeInTheDocument();
    expect(screen.getByText(/Some facilities failed/)).toBeInTheDocument();
    expect(screen.getByText('Kenyatta National', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText(/no stock rows/)).toBeInTheDocument();
    expect(screen.getByText('f9-unknown')).toBeInTheDocument();
  });

  it.each([undefined, null, []])('shows no warning when errors is %s', async (errors) => {
    const result = { ...done.result };
    if (errors !== undefined) result.errors = errors;
    mockGet([{ ...done, result }]);
    vi.spyOn(api, 'post').mockResolvedValue(job('queued'));
    render(<AlertsPage />);
    await user.click(button());
    await tick();
    expect(screen.getByText(/Forecast finished/)).toBeInTheDocument();
    expect(screen.queryByText(/Some facilities failed/)).not.toBeInTheDocument();
  });
});
