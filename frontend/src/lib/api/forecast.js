import { api } from './client';

export const getForecast = ({ facilityId, bloodGroup = 'O-', productType } = {}) =>
  api.get('/forecast', { query: { facility_id: facilityId, blood_group: bloodGroup, product_type: productType } });

export const getForecastHistory = ({ facilityId, bloodGroup = 'O-', productType, days = 28 } = {}) =>
  api.get('/forecast/history', {
    query: { facility_id: facilityId, blood_group: bloodGroup, product_type: productType, days },
  });

/** Admin: omit facilityId to run every facility. */
export const runForecast = (facilityId) => api.post('/forecast/run', facilityId ? { facility_id: facilityId } : {});

export const listAlerts = () => api.get('/alerts');
