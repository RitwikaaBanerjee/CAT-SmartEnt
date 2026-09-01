import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Health ────────────────────────────────────────────────────
export const getHealth = () => api.get('/api/health').then(r => r.data);

// ── Dashboard ─────────────────────────────────────────────────
export const getDashboard = () => api.get('/api/dashboard').then(r => r.data);

// ── Equipment ─────────────────────────────────────────────────
export const getEquipment = () => api.get('/api/equipment').then(r => r.data);

export const getEquipmentById = (id) =>
  api.get(`/api/equipment/${id}`).then(r => r.data);

export const getEquipmentHistory = (id) =>
  api.get(`/api/equipment/${id}/history`).then(r => r.data);

// ── Check-in / Check-out ──────────────────────────────────────
export const postCheckout = (payload) =>
  api.post('/api/checkout', payload).then(r => r.data);

export const postCheckin = (payload) =>
  api.post('/api/checkin', payload).then(r => r.data);

// ── Alerts ────────────────────────────────────────────────────
export const getAlerts = () => api.get('/api/alerts').then(r => r.data);

// ── Anomalies ─────────────────────────────────────────────────
export const getAnomalies = () => api.get('/api/anomalies').then(r => r.data);

// ── Forecast ──────────────────────────────────────────────────
export const getForecast = () => api.get('/api/forecast').then(r => r.data);

// ── Recommendations ───────────────────────────────────────────
export const getRecommendations = () =>
  api.get('/api/recommendations').then(r => r.data);

// ── Predict ───────────────────────────────────────────────────
export const postPredict = (payload) =>
  api.post('/api/predict', payload).then(r => r.data);

export default api;
