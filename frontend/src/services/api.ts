/**
 * API Client Service
 * Axios instance with authentication and error handling
 */

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { msalInstance } from '../config/authConfig';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const accounts = msalInstance.getAllAccounts();

      if (accounts.length > 0) {
        // Request token for our backend API (use CLIENT_ID as the scope)
        const clientId = import.meta.env.VITE_CLIENT_ID;
        const response = await msalInstance.acquireTokenSilent({
          scopes: [`api://${clientId}/access_as_user`],
          account: accounts[0],
        });

        config.headers.Authorization = `Bearer ${response.accessToken}`;
      }
    } catch (error) {
      console.error('Error acquiring token:', error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only retry once to prevent infinite loops
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Token expired or invalid - try to refresh
      try {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          const clientId = import.meta.env.VITE_CLIENT_ID;
          await msalInstance.acquireTokenSilent({
            scopes: [`api://${clientId}/access_as_user`],
            account: accounts[0],
            forceRefresh: true,
          });
          // Retry the original request
          return apiClient.request(originalRequest);
        }
      } catch (refreshError) {
        // Don't automatically logout - let the user stay signed in
        // They can manually sign out if needed
        console.error('Token refresh failed:', refreshError);
        // Just return the error without logging out
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
