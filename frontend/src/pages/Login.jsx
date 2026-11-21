import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../components/ui';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import api from '../api/client';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authOptions, setAuthOptions] = useState({ password_enabled: true, google_enabled: false, google_client_id: null });
  const { user, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/auth/options')
      .then(({ data }) => setAuthOptions(data.data))
      .catch(() => setError('Unable to load sign-in options. Please refresh the page.'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const authenticatedUser = await login(email, password);
      // Replace so the back button can't return to the login screen
      navigate(`/${authenticatedUser.role}/dashboard`, { replace: true });
    } catch (err) {
      setError(apiError(err, 'Failed to sign in. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(async (credential) => {
    setError('');
    setLoading(true);
    try {
      const authenticatedUser = await loginWithGoogle(credential);
      navigate(`/${authenticatedUser.role}/dashboard`, { replace: true });
    } catch (err) {
      setError(apiError(err, 'Google sign-in failed.'));
    } finally {
      setLoading(false);
    }
  }, [loginWithGoogle, navigate]);

  // Already authenticated (e.g. landing here via the browser back button):
  // send them straight back to their dashboard instead of showing a login form.
  if (user) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return (
    <div className="min-h-screen minsu-bg-overlay flex items-center justify-center overflow-x-hidden p-4 sm:p-6 font-sans antialiased text-gray-900 dark:text-gray-100">
      <div className="my-auto w-full min-w-0 max-w-md">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/50 dark:border-gray-700/60 p-8 sm:p-10 max-w-md w-full mx-auto dark:text-gray-100">
          {/* University Seal & Heading */}
          <div className="text-center mb-6">
            <Link to="/" className="inline-block group">
              <img
                src={`${import.meta.env.BASE_URL}images/minsu-logo.png`}
                alt="MinSU Seal"
                className="h-8 w-8 object-contain"
              />
            </Link>
            <h3 className="text-lg font-extrabold text-emerald-950 dark:text-emerald-300 tracking-tight leading-tight">
              Mindoro State University
            </h3>
            <p className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold mt-0.5">
              Bongabong Campus
            </p>
          </div>

          {/* Error notification */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-600 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          {authOptions.password_enabled && <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="Email"
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-teal-600 focus:ring-teal-500/20 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-sm transition-all outline-none focus:ring-2"
                />
              </div>
            </div>

            {/* Password Input with Eye Toggle */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password"
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-teal-600 focus:ring-teal-500/20 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-sm transition-all outline-none focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center text-gray-500 dark:text-gray-400 transition hover:text-teal-700 dark:hover:text-teal-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-teal-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password link */}
            <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-1">
              Forgot your password?{' '}
              <Link
                to="/forgot-password"
                className="text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200 font-semibold underline"
              >
                Recover
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#009688] hover:bg-[#00897b] active:bg-[#00796b] text-white font-bold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 cursor-pointer dark:bg-[#00796b] dark:hover:bg-[#00695c] dark:active:bg-[#004d40]"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>}

          {authOptions.password_enabled && authOptions.google_enabled && (
            <div className="my-5 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-400">
              <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              <span>OR</span>
              <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>
          )}

          {authOptions.google_enabled && authOptions.google_client_id && (
            <div className={authOptions.password_enabled ? 'mt-4' : ''}>
              <GoogleSignInButton
                clientId={authOptions.google_client_id}
                onCredential={handleGoogleCredential}
                onError={setError}
              />
            </div>
          )}

          {!authOptions.password_enabled && !authOptions.google_enabled && (
            <p className="text-sm text-rose-600 dark:text-rose-400 text-center">No sign-in method is currently available. Contact the administrator.</p>
          )}

          {/* Register Link */}
          {authOptions.password_enabled && <div className="mt-5 text-center text-xs text-gray-500 dark:text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-emerald-800 dark:text-emerald-300 hover:underline">
              Register here
            </Link>
          </div>}
        </div>
      </div>
    </div>
  );
}
