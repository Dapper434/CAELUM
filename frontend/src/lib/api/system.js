import { api } from './client';

/** GET /health (root) and GET /api/v1/health — both public. */
export const getRootHealth = () => api.rootHealth();
export const getHealth = () => api.request('GET', '/health', { auth: false });
/** GET /me — who the token belongs to. */
export const getMe = () => api.get('/me');
