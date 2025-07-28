import axios from 'axios';

// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }

    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - clear auth token
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          break;
        case 403:
          console.error('❌ Forbidden: Access denied');
          break;
        case 404:
          console.error('❌ Not Found: Resource not found');
          break;
        case 500:
          console.error('❌ Server Error: Internal server error');
          break;
        default:
          console.error(`❌ API Error (${status}):`, data?.error || error.message);
      }
    } else if (error.request) {
      console.error('❌ Network Error: No response received');
    } else {
      console.error('❌ Request Setup Error:', error.message);
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // User endpoints
  users: {
    login: '/api/users/login',
    getById: (id) => `/api/users/${id}`,
    getByUsername: (username) => `/api/users/username/${username}`,
    updateProfile: (id) => `/api/users/${id}`,
    getOnline: '/api/users/online',
    setOnline: (id) => `/api/users/${id}/online`,
    setOffline: (id) => `/api/users/${id}/offline`,
    updateCursor: (id) => `/api/users/${id}/cursor`,
    getStats: '/api/users/stats',
    health: '/api/users/health',
  },

  // System endpoints
  health: '/health',
};

// API methods
export const apiMethods = {
  // User API methods
  user: {
    login: (userData) => api.post(endpoints.users.login, userData),
    getById: (id) => api.get(endpoints.users.getById(id)),
    getByUsername: (username) => api.get(endpoints.users.getByUsername(username)),
    updateProfile: (id, data) => api.put(endpoints.users.updateProfile(id), data),
    getOnlineUsers: () => api.get(endpoints.users.getOnline),
    setOnline: (id, sessionId) => api.post(endpoints.users.setOnline(id), { sessionId }),
    setOffline: (id) => api.post(endpoints.users.setOffline(id)),
    updateCursor: (id, cursorState) => api.put(endpoints.users.updateCursor(id), cursorState),
    getStats: () => api.get(endpoints.users.getStats),
    healthCheck: () => api.get(endpoints.users.health),
  },

  // System API methods
  system: {
    healthCheck: () => api.get(endpoints.health),
  },
};

// WebSocket URL
export const getWebSocketUrl = (username, roomId) => {
  const params = new URLSearchParams({ username, roomId });
  return `${WS_BASE_URL}?${params.toString()}`;
};

// Error handling utilities
export const handleApiError = (error) => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred';
};

// Success response utilities
export const extractApiData = (response) => {
  return response.data;
};

// Fetch all cursors for a room from backend
export async function fetchAllCursors(roomId) {
  const res = await api.get(`/api/cursors/${roomId}`);
  return res.data.cursors;
}

export default api;
