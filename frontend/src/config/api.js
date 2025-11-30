// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5000' : '/api');

// Create axios instance with default config
import axios from 'axios';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', {
        message: error.message,
        code: error.code,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method
        }
      });
      
      if (error.code === 'ECONNABORTED') {
        console.error('Request timeout - Backend may not be running or slow');
      } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        console.error('Cannot connect to backend server. Please check:');
        console.error('1. Backend server is running');
        console.error('2. Backend URL is correct:', error.config?.baseURL);
        console.error('3. CORS is configured correctly');
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

