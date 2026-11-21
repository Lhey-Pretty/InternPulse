import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../api/client';
import { apiError } from '../components/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setMessage('If an account exists for that email, a password reset link has been sent.');
    } catch (err) {
      setError(apiError(err, 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen minsu-bg-overlay flex items-center justify-center overflow-x-hidden p-4 sm:p-6 font-sans antialiased text-gray-900 dark:text-gray-100">
      <div className="my-auto w-full min-w-0 max-w-md">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/60 p-6 sm:p-8 max-w-md w-full mx-auto dark:bg-gray-900/95 dark:text-gray-100">
          {/* MinSU Logo & Header */}
          <div className="text-center mb-7">
            <Link to="/" className="inline-block group">
             <img
              src={`${import.meta.env.BASE_URL}images/minsu-logo.png`}
              alt="MinSU Seal"
              className="h-8 w-8 object-contain"
            />
            </Link>
            <h2 className="text-2xl font-extrabold text-emerald-950 tracking-tight dark:text-emerald-300">Recover your password</h2>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed dark:text-gray-400">
              Enter your registered email and we’ll send you a secure password reset link.
            </p>
          </div>

          {/* Success Status */}
          {message && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300" role="status">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{message}</span>
            </div>
          )}

          {/* Error Status */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-600 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-400" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 dark:text-gray-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8.25 10.385 13a3 3 0 0 0 3.23 0L21 8.25M5.25 19.5h13.5A2.25 2.25 0 0 0 21 17.25v-9A2.25 2.25 0 0 0 18.75 6H5.25A2.25 2.25 0 0 0 3 8.25v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full rounded-xl border border-gray-200 focus:border-teal-600 focus:ring-teal-500/20 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-900 shadow-sm outline-none transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400"
                  placeholder="student@minsu.edu.ph"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#009688] px-4 py-3 text-sm font-bold text-white shadow-md shadow-teal-700/20 transition hover:bg-[#00897b] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60 cursor-pointer dark:bg-[#00796b] dark:hover:bg-[#00695c]"
            >
              {loading ? 'Sending link...' : 'Send reset link'}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-5 text-center dark:border-gray-800">
            <Link to="/login" className="text-sm font-semibold text-teal-700 transition hover:text-teal-800 hover:underline dark:text-teal-300 dark:hover:text-teal-300">
              <span aria-hidden="true">←</span> Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
