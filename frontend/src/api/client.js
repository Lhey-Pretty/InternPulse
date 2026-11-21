
import axios from 'axios';

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: false,
});

// Attach token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Token refresh management
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

// Logout handler
function handleLogout() {
  if (window.__loggingOut) return;

  window.__loggingOut = true;

  localStorage.removeItem('token');
  localStorage.removeItem('user');

  const loginPath = '/InternPulse/login';
  const currentPath = window.location.pathname;

  if (!currentPath.includes('/login')) {
    if (
      currentPath !== '/InternPulse/' &&
      currentPath !== loginPath
    ) {
      localStorage.setItem(
        'redirectAfterLogin',
        currentPath
      );
    }

    window.location.href = loginPath;
  } else {
    window.__loggingOut = false;
  }
}

// Response interceptor
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Password change required
    if (
      error.response?.status === 403 &&
      error.response.data?.password_change_required
    ) {
      window.dispatchEvent(
        new CustomEvent('password-change-required')
      );
    }

    // Handle unauthorized response
    if (error.response?.status === 401) {
      const requestUrl = originalRequest.url || '';

      // Do not refresh authentication endpoints
      const isAuthEndpoint = [
        '/auth/login',
        '/auth/register',
        '/auth/refresh',
        '/auth/logout',
      ].some((endpoint) => requestUrl.includes(endpoint));

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      // Ignore cancelled requests
      if (axios.isCancel(error)) {
        return Promise.reject(error);
      }

      // Prevent infinite retry
      if (originalRequest._retry) {
        handleLogout();
        return Promise.reject(error);
      }

      // Queue requests while refreshing
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers =
              originalRequest.headers || {};

            originalRequest.headers.Authorization =
              `Bearer ${newToken}`;

            return api(originalRequest);
          })
          .catch((queueError) => {
            return Promise.reject(queueError);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const token = localStorage.getItem('token');

      if (!token) {
        processQueue(error, null);
        isRefreshing = false;
        handleLogout();

        return Promise.reject(error);
      }

      try {
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

        const newToken = response.data?.data?.token;

        if (!newToken) {
          throw new Error(
            'Refresh response did not contain a token.'
          );
        }

        localStorage.setItem('token', newToken);

        originalRequest.headers =
          originalRequest.headers || {};

        originalRequest.headers.Authorization =
          `Bearer ${newToken}`;

        processQueue(null, newToken);

        console.log('Token refreshed successfully');

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        handleLogout();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Download protected files
export async function downloadFile(
  path,
  { params, filename = 'export.csv' } = {}
) {
  const response = await api.get(path, {
    params,
    responseType: 'blob',
  });

  const disposition =
    response.headers?.['content-disposition'] || '';

  const match = disposition.match(
    /filename\*?=(?:UTF-8'')?["']?([^;"']+)["']?/i
  );

  const downloadedFilename = match
    ? decodeURIComponent(match[1].trim())
    : filename;

  const url = URL.createObjectURL(response.data);

  const link = document.createElement('a');
  link.href = url;
  link.download = downloadedFilename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export default api;
