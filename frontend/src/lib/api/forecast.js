import { api } from './client';

export const getForecast = ({ facilityId, bloodGroup = 'O-', productType } = {}) =>
  api.get('/forecast', { query: { facility_id: facilityId, blood_group: bloodGroup, product_type: productType } });

export const getForecastHistory = ({ facilityId, bloodGroup = 'O-', productType, days = 28 } = {}) =>
  api.get('/forecast/history', {
    query: { facility_id: facilityId, blood_group: bloodGroup, product_type: productType, days },
  });

/**
 * Starts an async forecast run (contract 1.4.0). 202 = new job, 200 = the job
 * already queued/running for that scope; both return a ForecastRun. Admin: omit
 * facilityId to run every facility.
 */
export const runForecast = (facilityId) => api.post('/forecast/run', facilityId ? { facility_id: facilityId } : {});
export const getForecastRun = (jobId) => api.get(`/forecast/runs/${jobId}`);
export const isRunActive = (run) => run?.status === 'queued' || run?.status === 'running';

export const listAlerts = () => api.get('/alerts');
