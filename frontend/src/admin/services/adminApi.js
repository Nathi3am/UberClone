import axios from 'axios';

import API_BASE_URL from '../../config/api';

const BASE = API_BASE_URL.replace(/\/api$/, '');

const api = axios.create({ baseURL: BASE, withCredentials: true });

api.interceptors.request.use((cfg) => {
  // Prefer admin token, fall back to legacy keys
  const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('token');
  if (token) cfg.headers = { ...cfg.headers, Authorization: `Bearer ${token}` };
  return cfg;
});

// Admin-specific endpoints
export const getStats = () => api.get('/admin/stats');
export const getRides = () => api.get('/admin/rides');
export const getDrivers = () => api.get('/admin/drivers');
export const getUsers = () => api.get('/admin/users');
export const getDriverBalances = () => api.get('/admin/driver-balances');
export const postPayDriver = (id) => api.post(`/admin/pay-driver/${id}`);
export const postSettleDriverDebt = (id) => api.post(`/admin/settle-driver-debt/${id}`);
export const postSuspendDriver = (id) => api.post(`/admin/drivers/suspend/${id}`);
export const postCancelRide = (id) => api.post(`/admin/rides/cancel/${id}`);

export const getSpecialRequests = () => api.get('/admin/special-requests');
export const postSpecialRequest = (payload) => api.post('/admin/special-requests', payload);
export const patchSpecialRequest = (id, payload) => api.patch(`/admin/special-requests/${id}`, payload);
export const deleteSpecialRequest = (id) => api.delete(`/admin/special-requests/${id}`);
export const uploadSpecialRequestImage = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return api.post('/admin/special-requests/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getSpecialTripsDrivers = () => api.get('/admin/special-trips-drivers');
export const postSpecialTripsDriver = (payload) => api.post('/admin/special-trips-drivers', payload);
export const patchSpecialTripsDriver = (id, payload) => api.patch(`/admin/special-trips-drivers/${id}`, payload);
export const deleteSpecialTripsDriver = (id) => api.delete(`/admin/special-trips-drivers/${id}`);

export default api;
