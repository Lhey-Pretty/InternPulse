import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // Removed withCredentials - we're using tokens, not sessions
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track if we're already refreshing to prevent loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 403 && error.response.data?.password_change_required) {
      window.dispatchEvent(new CustomEvent('password-change-required'));
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Skip refresh for auth endpoints (login, register, etc.)
      if (originalRequest.url?.includes('/auth/login') || 
          originalRequest.url?.includes('/auth/register') ||
          originalRequest.url?.includes('/auth/refresh') ||
          originalRequest.url?.includes('/auth/logout')) {
        return Promise.reject(error);
      }

      // Check if request was cancelled (e.g., during navigation)
      if (axios.isCancel(error)) {
        console.log('Request cancelled during navigation');
        return Promise.reject(error);
      }

      // If already retried, don't try again
      if (originalRequest._retry) {
        console.warn('Token refresh already attempted, logging out');
        handleLogout();
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const token = localStorage.getItem('token');

      // If no token exists, logout immediately
      if (!token) {
        handleLogout();
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token
        console.log('Attempting token refresh...');
        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          }
        );

        const newToken = response.data.data.token;
        console.log('Token refreshed successfully');
        localStorage.setItem('token', newToken);

        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Process queued requests
        processQueue(null, newToken);

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout
        processQueue(refreshError, null);
        handleLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    return Promise.reject(error);
  },
);

function handleLogout() {
  // Prevent multiple simultaneous logouts
  if (window.__loggingOut) {
    return;
  }
  window.__loggingOut = true;

  localStorage.removeItem('token');
  localStorage.removeItem('user');

  // Only redirect if not already on login page
  if (!window.location.pathname.includes('/login')) {
    // Store current path for redirect after login
    const currentPath = window.location.pathname;
    if (currentPath !== '/' && currentPath !== '/login') {
      localStorage.setItem('redirectAfterLogin', currentPath);
    }

    // Small delay to prevent race conditions
    setTimeout(() => {
      window.__loggingOut = false;
      window.location.href = '/login';
    }, 100);
  } else {
    window.__loggingOut = false;
  }
}

// Fetch a file through the authenticated axios instance and save it.
// `window.open()` can't be used for protected endpoints: a new tab sends no
// Authorization header, so the API answers 401 instead of the file.
export async function downloadFile(path, { params, filename = 'export.csv' } = {}) {
  const response = await api.get(path, { params, responseType: 'blob' });

  const disposition = response.headers?.['content-disposition'] || '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const name = match ? decodeURIComponent(match[1].trim()) : filename;

  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default api;
