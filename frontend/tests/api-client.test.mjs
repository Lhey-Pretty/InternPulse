import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const unauthorized = (config) => new axios.AxiosError('Unauthenticated.', 'ERR_BAD_REQUEST', config, null, {
  status: 401, statusText: 'Unauthorized', data: { message: 'Unauthenticated.' }, headers: {}, config,
});
const ok = (config, data = { data: { skills: ['PHP'] } }) => ({
  status: 200, statusText: 'OK', headers: {}, config, data,
});

let fixtureId = 0;
async function fixture(adapter, token = 'expired-token') {
  const values = new Map([['token', token], ['user', JSON.stringify({ id: 1, role: 'student' })]]);
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  globalThis.window = { location: { pathname: '/InternPulse/student/dashboard', href: '' }, __loggingOut: false };
  const originalAdapter = axios.defaults.adapter;
  axios.defaults.adapter = adapter;
  const { default: api } = await import('../src/api/client.js?fixture=' + (++fixtureId));
  api.defaults.adapter = adapter;
  return { api, values, cleanup: () => { axios.defaults.adapter = originalAdapter; } };
}

test('late skills 401 after another request refreshed retries with the current token', async () => {
  const late = deferred();
  let refreshCount = 0;
  const f = await fixture(async (config) => {
    if (config.url.endsWith('/auth/refresh')) {
      refreshCount++;
      return ok(config, { data: { token: 'fresh-token' } });
    }
    if (config.headers.Authorization === 'Bearer fresh-token') return ok(config);
    if (config.url === '/student/skill-recommendations') {
      await late.promise;
    }
    throw unauthorized(config);
  });
  try {
    const skills = f.api.get('/student/skill-recommendations');
    const outcome = skills.then((value) => ({ value }), (error) => ({ error }));
    await f.api.get('/auth/me');
    late.resolve();
    const result = await outcome;
    assert.equal(result.error, undefined, 'The late old-token response must not become a Skills error.');
    assert.equal(result.value.status, 200);
    assert.equal(refreshCount, 1);
    assert.equal(f.values.get('token'), 'fresh-token');
    assert.equal(window.location.href, '');
  } finally { f.cleanup(); }
});

test('concurrent expired requests share one refresh', async () => {
  const refresh = deferred();
  let refreshCount = 0;
  const f = await fixture(async (config) => {
    if (config.url.endsWith('/auth/refresh')) {
      refreshCount++;
      await refresh.promise;
      return ok(config, { data: { token: 'fresh-token' } });
    }
    if (config.headers.Authorization === 'Bearer fresh-token') return ok(config);
    throw unauthorized(config);
  });
  try {
    const first = f.api.get('/student/skill-recommendations');
    const second = f.api.get('/student/overview');
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(refreshCount, 1);
    refresh.resolve();
    const results = await Promise.all([first, second]);
    assert.deepEqual(results.map((response) => response.status), [200, 200]);
  } finally { f.cleanup(); }
});

test('old request cannot refresh or sign out a new login', async () => {
  const late = deferred();
  let refreshCount = 0;
  const f = await fixture(async (config) => {
    if (config.url.endsWith('/auth/refresh')) refreshCount++;
    await late.promise;
    throw unauthorized(config);
  });
  try {
    const request = f.api.get('/student/skill-recommendations');
    const outcome = request.catch((error) => error);
    await new Promise((resolve) => setImmediate(resolve));
    f.values.set('token', 'new-login-token');
    f.values.set('user', JSON.stringify({ id: 2 }));
    late.resolve();
    assert.equal((await outcome).response.status, 401);
    assert.equal(refreshCount, 0);
    assert.equal(f.values.get('token'), 'new-login-token');
    assert.equal(window.location.href, '');
  } finally { f.cleanup(); }
});

test('old refresh success cannot overwrite a new login', async () => {
  const refresh = deferred();
  const f = await fixture(async (config) => {
    if (config.url.endsWith('/auth/refresh')) {
      await refresh.promise;
      return ok(config, { data: { token: 'old-session-refreshed' } });
    }
    throw unauthorized(config);
  });
  try {
    const outcome = f.api.get('/student/skill-recommendations').catch((error) => error);
    await new Promise((resolve) => setImmediate(resolve));
    f.values.set('token', 'new-login-token');
    refresh.resolve();
    await outcome;
    assert.equal(f.values.get('token'), 'new-login-token');
    assert.equal(window.location.href, '');
  } finally { f.cleanup(); }
});

test('old refresh failure cannot sign out a new login', async () => {
  const refresh = deferred();
  const f = await fixture(async (config) => {
    if (config.url.endsWith('/auth/refresh')) await refresh.promise;
    throw unauthorized(config);
  });
  try {
    const outcome = f.api.get('/student/skill-recommendations').catch((error) => error);
    await new Promise((resolve) => setImmediate(resolve));
    f.values.set('token', 'new-login-token');
    refresh.resolve();
    await outcome;
    assert.equal(f.values.get('token'), 'new-login-token');
    assert.equal(window.location.href, '');
  } finally { f.cleanup(); }
});

test('invalid current session refresh clears the session and redirects to login', async () => {
  let refreshCount = 0;
  const f = await fixture(async (config) => {
    if (config.url.endsWith('/auth/refresh')) refreshCount++;
    throw unauthorized(config);
  });
  try {
    await assert.rejects(f.api.get('/student/skill-recommendations'));
    assert.equal(refreshCount, 1);
    assert.equal(f.values.has('token'), false);
    assert.equal(f.values.has('user'), false);
    assert.equal(window.location.href, '/InternPulse/login');
  } finally { f.cleanup(); }
});

test('failed login does not trigger a refresh or clear the current session', async () => {
  let refreshCount = 0;
  const f = await fixture(async (config) => {
    if (config.url.endsWith('/auth/refresh')) refreshCount++;
    throw unauthorized(config);
  });
  try {
    await assert.rejects(f.api.post('/auth/login', { email: 'wrong@example.org', password: 'wrong' }));
    assert.equal(refreshCount, 0);
    assert.equal(f.values.get('token'), 'expired-token');
    assert.equal(window.location.href, '');
  } finally { f.cleanup(); }
});

test('retried concurrent request cannot trigger a second refresh', async () => {
  const refresh = deferred();
  let refreshCount = 0;
  const f = await fixture(async (config) => {
    if (config.url.endsWith('/auth/refresh')) {
      refreshCount++;
      await refresh.promise;
      return ok(config, { data: { token: 'fresh-token' } });
    }
    if (config.url === '/student/overview' && config.headers.Authorization === 'Bearer fresh-token') return ok(config);
    throw unauthorized(config);
  });
  try {
    const first = f.api.get('/student/overview').catch((error) => error);
    const second = f.api.get('/student/skill-recommendations').catch((error) => error);
    await new Promise((resolve) => setImmediate(resolve));
    refresh.resolve();
    await Promise.all([first, second]);
    assert.equal(refreshCount, 1, 'Each failed request is retried at most once.');
    assert.equal(window.location.href, '/InternPulse/login');
  } finally { f.cleanup(); }
});


test('new login can refresh independently while an old login refresh is still pending', async () => {
  const oldRefresh = deferred();
  let refreshCount = 0;
  const f = await fixture(async (config) => {
    if (config.url.endsWith('/auth/refresh')) {
      refreshCount++;
      if (config.headers.Authorization === 'Bearer expired-token') {
        await oldRefresh.promise;
        return ok(config, { data: { token: 'old-session-refreshed' } });
      }
      return ok(config, { data: { token: 'new-session-refreshed' } });
    }
    if (config.headers.Authorization === 'Bearer new-session-refreshed') return ok(config);
    throw unauthorized(config);
  });
  try {
    const oldOutcome = f.api.get('/student/overview').catch((error) => error);
    await new Promise((resolve) => setImmediate(resolve));
    f.values.set('token', 'new-login-token');
    await f.api.get('/student/skill-recommendations');
    assert.equal(f.values.get('token'), 'new-session-refreshed');
    oldRefresh.resolve();
    await oldOutcome;
    assert.equal(refreshCount, 2);
    assert.equal(f.values.get('token'), 'new-session-refreshed');
    assert.equal(window.location.href, '');
  } finally { f.cleanup(); }
});

test('late request follows known consecutive renewals without refreshing again', async () => {
  const late = deferred();
  let refreshCount = 0;
  let validToken = 'fresh-one';
  const f = await fixture(async (config) => {
    if (config.url.endsWith('/auth/refresh')) {
      refreshCount++;
      return ok(config, { data: { token: validToken } });
    }
    if (config.headers.Authorization === 'Bearer ' + validToken) return ok(config);
    if (config.url === '/student/skill-recommendations' && config.headers.Authorization === 'Bearer expired-token') await late.promise;
    throw unauthorized(config);
  });
  try {
    const skills = f.api.get('/student/skill-recommendations');
    const outcome = skills.catch((error) => error);
    await f.api.get('/auth/me');
    validToken = 'fresh-two';
    await f.api.get('/student/overview');
    late.resolve();
    assert.equal((await outcome).status, 200);
    assert.equal(refreshCount, 2);
    assert.equal(f.values.get('token'), 'fresh-two');
    assert.equal(window.location.href, '');
  } finally { f.cleanup(); }
});

test('cancelled Skills request does not refresh or clear a valid session', async () => {
  const late = deferred();
  let refreshCount = 0;
  const f = await fixture(async (config) => {
    if (config.url.endsWith('/auth/refresh')) refreshCount++;
    await late.promise;
    throw unauthorized(config);
  });
  try {
    const controller = new AbortController();
    const outcome = f.api.get('/student/skill-recommendations', { signal: controller.signal }).catch((error) => error);
    await new Promise((resolve) => setImmediate(resolve));
    controller.abort();
    late.resolve();
    assert.equal(axios.isCancel(await outcome), true);
    assert.equal(refreshCount, 0);
    assert.equal(f.values.get('token'), 'expired-token');
    assert.equal(window.location.href, '');
  } finally { f.cleanup(); }
});
