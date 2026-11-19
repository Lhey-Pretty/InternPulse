import React, { useEffect, useState } from 'react';

/**
 * Pulls a human-readable message out of an Axios error.
 *
 * The Laravel API answers every failure with
 * `{ errors: [{ status, message, source }] }`, so reading only `data.message`
 * left every 401/403/422/500 rendered as the generic fallback.
 */
export function apiError(error, fallback = 'Request failed.') {
  // No response at all: the server is down, blocked, or unreachable.
  if (!error?.response) {
    if (error?.code === 'ERR_CANCELED') return fallback;
    return 'Unable to reach the server. Please check your connection and that the API is running.';
  }

  const data = error.response.data;

  // Laravel API shape: { errors: [{ status, message, source }] }
  if (Array.isArray(data?.errors)) {
    const first = data.errors.find((item) => item?.message);
    if (first) return first.message;
  }

  // Plain Laravel validation shape: { errors: { field: ['message'] } }
  if (data?.errors && typeof data.errors === 'object') {
    const firstField = Object.values(data.errors)[0];
    const message = Array.isArray(firstField) ? firstField[0] : firstField;
    if (typeof message === 'string' && message) return message;
  }

  if (typeof data?.message === 'string' && data.message) return data.message;

  // Last resort: name the status so the failure is at least identifiable.
  return error.response.status
    ? `${fallback} (Status: ${error.response.status})`
    : fallback;
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-green-50 text-green-800',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
  };
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}>{children}</span>;
}

export function Field({ label, htmlFor, children }) {
  return (
    <div>
      {label && <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>}
      {children}
    </div>
  );
}

export const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20';
export const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-900 disabled:opacity-50';
export const btnGhost = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-green-600 hover:text-green-800';

export function EmptyState({ text }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{text}</div>;
}

/**
 * Reads a list payload that may be either a plain array or a Laravel paginator.
 */
/**
 * Live search helper: returns the value after the user stops typing so list
 * filters run as they type instead of waiting for a Search button.
 */
export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function pageMeta(payload, fallback = []) {
  if (Array.isArray(payload)) return { items: payload, page: 1, lastPage: 1, total: payload.length };
  const items = payload?.data || fallback;
  return {
    items,
    page: payload?.current_page || 1,
    lastPage: payload?.last_page || 1,
    total: payload?.total ?? items.length,
  };
}

export function Pager({ page, lastPage, total, onChange, noun = 'items', className = '' }) {
  if (!lastPage || lastPage <= 1) {
    return total ? <p className={`text-right text-xs text-slate-400 dark:text-slate-500 ${className}`}>{total} {noun}</p> : null;
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <p className="text-xs text-slate-400 dark:text-slate-500">{total} {noun}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed"
        >
          ← Prev
        </button>
        <span className="px-2 text-sm text-gray-500 dark:text-gray-400">Page {page} of {lastPage}</span>
        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => onChange(page + 1)}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export function Notice({ message, error }) {
  if (error) return <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  if (message) return <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</div>;
  return null;
}
