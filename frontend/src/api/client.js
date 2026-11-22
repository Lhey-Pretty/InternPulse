
import axios from 'axios';

const api = axios.create({
  baseURL:
    import.meta.env?.VITE_API_URL ||
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

    if (token && !config.headers?.Authorization) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Refresh requests share a promise only within the captured login session.
let activeRefresh = null;
const renewedTokens = new Map();

const isKnownRenewal = (previousToken, currentToken) => {
  let token = previousToken;
  for (let index = 0; index < renewedTokens.size; index++) {
    token = renewedTokens.get(token);
    if (!token) return false;
    if (token === currentToken) return true;
  }
  return false;
};

// Logout handler
function handleLogout() {
  if (window.__loggingOut) return;
  window.__loggingOut = true;
  renewedTokens.clear();
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  const loginPath = '/InternPulse/login';
  const currentPath = window.location.pathname;
  if (!currentPath.includes('/login')) {
    if (currentPath !== '/InternPulse/' && currentPath !== loginPath) {
      localStorage.setItem('redirectAfterLogin', currentPath);
    }
    window.location.href = loginPath;
  } else {
    window.__loggingOut = false;
  }
}

function refreshSession(token) {
  if (activeRefresh?.token === token) return activeRefresh.promise;

  const refresh = { token, promise: null };
  activeRefresh = refresh;
  refresh.promise = axios.post(
    api.defaults.baseURL + '/auth/refresh',
    {},
    {
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  ).then((response) => {
    if (localStorage.getItem('token') !== token) {
      throw new axios.CanceledError('Authentication session changed.');
    }
    const newToken = response.data?.data?.token;
    if (!newToken) throw new Error('Refresh response did not contain a token.');

    renewedTokens.set(token, newToken);
    // Keep only recent renewals; unrelated login tokens are never treated as refreshes.
    if (renewedTokens.size > 32) renewedTokens.delete(renewedTokens.keys().next().value);
    localStorage.setItem('token', newToken);
    return newToken;
  }).finally(() => {
    if (activeRefresh === refresh) activeRefresh = null;
  });
  return refresh.promise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest || error.response?.status !== 401 || axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || '';
    const isAuthEndpoint = ['/auth/login', '/auth/register', '/auth/google', '/auth/refresh', '/auth/logout']
      .some((endpoint) => requestUrl.includes(endpoint));
    if (isAuthEndpoint) return Promise.reject(error);

    const currentToken = localStorage.getItem('token');
    const authorization = originalRequest.headers?.Authorization;
    const requestToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

    if (requestToken !== currentToken) {
      // A late 401 from a token that this session refreshed should use the current
      // token once. Requests from another login cannot refresh or sign out this one.
      if (!originalRequest._retry && currentToken && isKnownRenewal(requestToken, currentToken)) {
        originalRequest._retry = true;
        originalRequest.headers.Authorization = 'Bearer ' + currentToken;
        return api(originalRequest);
      }
      return Promise.reject(error);
    }
    if (originalRequest._retry || !currentToken) {
      handleLogout();
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      const newToken = await refreshSession(currentToken);
      if (localStorage.getItem('token') !== newToken || originalRequest.signal?.aborted) {
        throw new axios.CanceledError('Authentication request is no longer current.');
      }
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = 'Bearer ' + newToken;
      return api(originalRequest);
    } catch (refreshError) {
      if (localStorage.getItem('token') === currentToken && !axios.isCancel(refreshError)) {
        handleLogout();
      }
      return Promise.reject(refreshError);
    }
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
