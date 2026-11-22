import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import api from '../api/client';
import { apiError } from '../components/ui';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const initialEmail = params.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const passwordRules = [
    ['At least 8 characters', [...password].length >= 8],
    ['Uppercase and lowercase letters', /\p{Lu}/u.test(password) && /\p{Ll}/u.test(password)],
    ['At least one number', /\p{N}/u.test(password)],
    ['Special character (e.g. @, #, !)', /[\p{Z}\p{S}\p{P}]/u.test(password)],
  ];
  const passwordIsValid = passwordRules.every(([, passed]) => passed);
  const passwordsMatch = confirm.length > 0 && password === confirm;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!passwordIsValid) {
      setError('Your new password must meet all the requirements below.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        password,
        password_confirmation: confirm,
      });
      setMessage('Password reset successfully! Redirecting to sign in...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(apiError(err, 'Reset link is invalid or has expired.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen minsu-bg-overlay flex items-center justify-center overflow-x-hidden p-4 sm:p-6 font-sans antialiased text-gray-900 dark:text-gray-100">
      <div className="my-auto w-full min-w-0 max-w-md">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/60 p-6 sm:p-8 max-w-md w-full mx-auto dark:bg-gray-900/95 dark:text-gray-100">
          {/* Header & Logo */}
          <div className="text-center mb-6">
            <Link to="/" className="inline-block group">
              <img
                src={`${import.meta.env.BASE_URL}images/minsu-logo.png`}
                alt="MinSU Seal"
                className="h-8 w-8 object-contain"
              />
            </Link>
            <h2 className="text-xl font-bold text-emerald-950 tracking-tight dark:text-emerald-300">Create new password</h2>
            <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
              Please enter your email and set a new password for your account.
            </p>
          </div>

          {/* Success */}
          {message && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{message}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1.5 dark:text-gray-300">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
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
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400"
                  placeholder="student@minsu.edu.ph"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1.5 dark:text-gray-300">
                New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  minLength={8}
                  autoComplete="new-password"
                  aria-describedby="password-rules"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-teal-700 focus:outline-none dark:text-gray-400 dark:hover:text-teal-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div id="password-rules" className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">Password requirements</p>
              <ul className="space-y-1 text-xs">
                {passwordRules.map(([label, passed]) => (
                  <li key={label} className={passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}>
                    <span aria-hidden="true" className="mr-1.5">{passed ? '\u2713' : '\u2022'}</span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-xs font-semibold text-gray-700 mb-1.5 dark:text-gray-300">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  name="confirm"
                  minLength={8}
                  autoComplete="new-password"
                  aria-describedby="password-confirmation-status"
                  aria-invalid={confirm.length > 0 && !passwordsMatch}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-teal-700 focus:outline-none dark:text-gray-400 dark:hover:text-teal-300"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p id="password-confirmation-status" className={`mt-1.5 text-xs ${confirm.length === 0 ? 'text-gray-500 dark:text-gray-400' : passwordsMatch ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                {confirm.length === 0 ? 'Re-enter your new password.' : passwordsMatch ? 'Passwords match.' : 'Passwords do not match.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !passwordIsValid || !passwordsMatch}
              className="w-full py-3 bg-[#009688] hover:bg-[#00897b] active:bg-[#00796b] text-white text-sm font-bold rounded-xl shadow-md transition-all duration-200 disabled:opacity-60 cursor-pointer dark:bg-[#00796b] dark:hover:bg-[#00695c] dark:active:bg-[#004d40]"
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-5 border-t border-gray-100 pt-4 text-center dark:border-gray-800">
            <Link to="/login" className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline dark:text-teal-300 dark:hover:text-teal-300">
              ← Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
