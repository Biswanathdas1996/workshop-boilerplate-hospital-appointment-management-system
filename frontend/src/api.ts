import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
};

// Patients
export const patientsAPI = {
  create: (data: any) => api.post('/patients', data),
  get: (id: string) => api.get(`/patients/${id}`),
  update: (id: string, data: any) => api.put(`/patients/${id}`, data),
  list: (params?: any) => api.get('/patients', { params }),
};

// Doctors
export const doctorsAPI = {
  create: (data: any) => api.post('/doctors', data),
  get: (id: string) => api.get(`/doctors/${id}`),
  list: (params?: any) => api.get('/doctors', { params }),
  addSchedule: (id: string, data: any) => api.post(`/doctors/${id}/schedule`, data),
  addLeave: (id: string, data: any) => api.post(`/doctors/${id}/leave`, data),
  blockSlot: (id: string, slot: string) => api.post(`/doctors/${id}/block-slot`, { slot_date: slot }),
};

// Appointments
export const appointmentsAPI = {
  create: (data: any) => api.post('/appointments', data),
  get: (id: string) => api.get(`/appointments/${id}`),
  update: (id: string, data: any) => api.put(`/appointments/${id}`, data),
  list: (params?: any) => api.get('/appointments', { params }),
};

// Queue
export const queueAPI = {
  add: (data: any) => api.post('/queue', data),
  list: (params?: any) => api.get('/queue', { params }),
  update: (id: string, data: any) => api.put(`/queue/${id}`, data),
};

// Prescriptions
export const prescriptionsAPI = {
  create: (data: any) => api.post('/prescriptions', data),
  get: (id: string) => api.get(`/prescriptions/${id}`),
  list: (params?: any) => api.get('/prescriptions', { params }),
};

// Visits
export const visitsAPI = {
  create: (data: any) => api.post('/visits', data),
  get: (id: string) => api.get(`/visits/${id}`),
  list: (params?: any) => api.get('/visits', { params }),
};

// Search
export const searchAPI = {
  search: (query: string, type?: string) => api.get('/search', { params: { query, type } }),
};

export default api;
