import { api } from './client';

/** Demo endpoints exist only when the API runs with STORE_BACKEND=memory. */
export const listDemoUsers = () => api.request('GET', '/auth/demo-users', { auth: false });
export const demoLogin = (login) =>
  api.request('POST', '/auth/demo-login', {
    auth: false,
    body: login.includes('@') ? { email: login } : { login },
  });
