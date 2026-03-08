import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================
// Support Endpoints
// ============================================================

export const submitQuery = async (query) => {
  const { data } = await api.post('/api/support/query', { query });
  return data;
};

export const getJobStatus = async (jobId) => {
  const { data } = await api.get(`/api/jobs/${jobId}`);
  return data;
};

export const getQueryResult = async (jobId) => {
  const { data } = await api.get(`/api/support/result/${jobId}`);
  return data;
};

export const getQueryHistory = async (page = 1, limit = 20) => {
  const { data } = await api.get(`/api/support/history?page=${page}&limit=${limit}`);
  return data;
};

export const submitFeedback = async (jobId, rating, comment = '') => {
  const { data } = await api.post('/api/support/feedback', { jobId, rating, comment });
  return data;
};

// ============================================================
// Analytics Endpoints
// ============================================================

export const getAnalyticsSummary = async () => {
  const { data } = await api.get('/api/analytics/summary');
  return data;
};

// ============================================================
// Jobs Endpoints
// ============================================================

export const getAllJobs = async (page = 1, limit = 50) => {
  const { data } = await api.get(`/api/jobs?page=${page}&limit=${limit}`);
  return data;
};

// ============================================================
// Escalation Endpoints
// ============================================================

export const getEscalations = async (page = 1, limit = 20) => {
  const { data } = await api.get(`/api/escalation?page=${page}&limit=${limit}`);
  return data;
};

export const resolveEscalation = async (jobId, resolvedResponse, resolvedBy = 'admin') => {
  const { data } = await api.post(`/api/escalation/${jobId}/resolve`, {
    resolvedResponse,
    resolvedBy,
  });
  return data;
};

// ============================================================
// Logs Endpoints
// ============================================================

export const getSystemLogs = async (page = 1, limit = 50, filters = {}) => {
  const params = new URLSearchParams({ page, limit, ...filters });
  const { data } = await api.get(`/api/logs?${params}`);
  return data;
};

export default api;
