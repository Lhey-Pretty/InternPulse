import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../components/ui';
import { AlertCircle, Eye, EyeOff, GraduationCap, Building2, CheckCircle2 } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    account_type: 'student',
    program: '',
    company_name: '',
    address: '',
    contact_person: '',
    contact_phone: '',
    industry: '',
    website: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const passwordRules = [
    ['At least 8 characters', formData.password.length >= 8],
    ['Uppercase & lowercase', /[A-Z]/.test(formData.password) && /[a-z]/.test(formData.password)],
    ['At least 1 number (0-9)', /[0-9]/.test(formData.password)],
    ['Special character (@#$%!)', /[^A-Za-z0-9]/.test(formData.password)],
  ];
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.password_confirmation) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const registration = await register(
        formData.account_type === 'company'
          ? { ...formData, name: formData.contact_person }
          : formData
      );
      if (registration?.pending_approval) {
        setSubmitted(true);
      } else {
        const destination = registration?.role === 'student'
          ? '/student/dashboard?tab=profile&onboarding=1'
          : `/${registration?.role || 'student'}/dashboard`;
        navigate(destination, { replace: true });
      }
    } catch (err) {
      setError(apiError(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen minsu-bg-overlay flex items-center justify-center overflow-x-hidden p-4 sm:p-6 font-sans text-gray-900">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/60 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-extrabold text-emerald-950 tracking-tight">{formData.account_type === 'student' ? 'Student Registration Submitted' : 'Company Registration Submitted'}</h2>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            {formData.account_type === 'student' ? 'Your account is awaiting approval from your program coordinator. You can log in after it is approved.' : 'Your company account request has been submitted to the Coordinator for verification. You will be notified once your account is approved.'}
          </p>
          <div className="mt-6">
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-[#009688] hover:bg-[#00897b] text-white font-bold text-sm rounded-lg shadow-md transition-all"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen minsu-bg-overlay flex items-center justify-center overflow-x-hidden p-4 font-sans antialiased text-gray-900 sm:p-6">
      <div className="my-auto w-full min-w-0 max-w-lg">
        <div className="mx-auto w-full min-w-0 max-w-lg rounded-2xl border border-white/60 bg-white/95 p-5 shadow-2xl backdrop-blur-md transition-all sm:p-9">
          {/* University Seal & Branding */}
          <div className="text-center mb-6">
            <Link to="/" className="inline-block group">
              <img
                src={`${import.meta.env.BASE_URL}images/minsu-logo.png`}
                alt="MinSU Seal"
                className="h-8 w-8 object-contain"
              />
            </Link>
            <h3 className="text-lg font-extrabold text-emerald-950 tracking-tight leading-tight">
              Mindoro State University
            </h3>
            <p className="text-xs text-emerald-800 font-semibold tracking-wide">
              Bongabong Campus &bull; InternPulse Portal
            </p>

            {/* Account Type Selector */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                aria-pressed={formData.account_type === 'student'}
                onClick={() => setFormData({ ...formData, account_type: 'student' })}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  formData.account_type === 'student'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Student Intern</span>
              </button>
              <button
                type="button"
                aria-pressed={formData.account_type === 'company'}
                onClick={() => setFormData({ ...formData, account_type: 'company' })}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  formData.account_type === 'company'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-teal-50 text-teal-800 border border-teal-200/80 hover:bg-teal-100'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Company</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {formData.account_type === 'student' ? (
              <>
                {/* Student Full Name */}
                <div>
                  <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      autoFocus
                      placeholder="Juan Dela Cruz"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 focus:border-teal-600 focus:ring-teal-500/20 rounded-lg text-sm shadow-sm transition-all outline-none focus:ring-2"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="program" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Program</label>
                  <select id="program" name="program" value={formData.program} onChange={handleChange} required className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm">
                    <option value="">Select your program</option>
                    {['BSIT','BSCPE','BSHM','BSTM','BSCRIM','FISHERIES','POLSCI','BEED','BSED_MATH','BSED_SCIENCE','BSED_ENGLISH'].map((program) => <option key={program} value={program}>{program.replaceAll('_', ' ')}</option>)}
                  </select>
                </div>
                {/* Email Address */}
                <div>
                  <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="student@minsu.edu.ph"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 focus:border-teal-600 focus:ring-teal-500/20 rounded-lg text-sm shadow-sm transition-all outline-none focus:ring-2"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Company Registration Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      required
                      placeholder="Acme Tech Solutions"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 focus:border-teal-600 focus:ring-teal-500/20 rounded-lg text-sm shadow-sm outline-none focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Industry / Sector
                    </label>
                    <input
                      type="text"
                      name="industry"
                      value={formData.industry}
                      onChange={handleChange}
                      placeholder="Information Technology"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 focus:border-teal-600 focus:ring-teal-500/20 rounded-lg text-sm shadow-sm outline-none focus:ring-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleChange}
                      required
                      placeholder="Maria Santos"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 focus:border-teal-600 focus:ring-teal-500/20 rounded-lg text-sm shadow-sm outline-none focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleChange}
                      placeholder="09123456789"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 focus:border-teal-600 focus:ring-teal-500/20 rounded-lg text-sm shadow-sm outline-none focus:ring-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Company Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="hr@acmetech.com"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 focus:border-teal-600 focus:ring-teal-500/20 rounded-lg text-sm shadow-sm outline-none focus:ring-2"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Office Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Bongabong, Oriental Mindoro"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 focus:border-teal-600 focus:ring-teal-500/20 rounded-lg text-sm shadow-sm outline-none focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Website (Optional)
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="https://acmetech.com"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 focus:border-teal-600 focus:ring-teal-500/20 rounded-lg text-sm shadow-sm outline-none focus:ring-2"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Password & Confirmation Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="w-full pl-3.5 pr-9 py-2.5 bg-white border border-gray-200 focus:border-teal-600 focus:ring-teal-500/20 rounded-lg text-sm shadow-sm transition-all outline-none focus:ring-2"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center text-gray-500 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-teal-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="password_confirmation" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    id="password_confirmation"
                    name="password_confirmation"
                    value={formData.password_confirmation}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="w-full pl-3.5 pr-9 py-2.5 bg-white border border-gray-200 focus:border-teal-600 focus:ring-teal-500/20 rounded-lg text-sm shadow-sm transition-all outline-none focus:ring-2"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center text-gray-500 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-teal-700"
                    aria-label={showConfirm ? 'Hide confirmed password' : 'Show confirmed password'}
                    aria-pressed={showConfirm}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Password Security Requirements Pill Card */}
            <div className="space-y-1 rounded-lg border border-gray-200/80 bg-gray-50 p-3 text-xs text-gray-700">
              <div className="font-semibold text-gray-700 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Password Security Requirements:</span>
              </div>
              <div className="grid grid-cols-1 gap-x-3 gap-y-1 pl-5 text-xs sm:grid-cols-2">
                {passwordRules.map(([label, passed]) => (
                  <span key={label} className={`flex items-center gap-1 transition-colors ${passed ? 'text-emerald-600 font-semibold' : 'text-gray-600'}`}>
                    <span aria-hidden="true">{passed ? '✓' : '•'}</span>{label}
                  </span>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-[#009688] hover:bg-[#00897b] active:bg-[#00796b] text-white font-bold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <span>{loading ? 'Creating Account...' : formData.account_type === 'company' ? 'Register Company' : 'Create Student Account'}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/95 px-3 text-gray-400 font-semibold tracking-wider">Already registered?</span>
            </div>
          </div>

          {/* Sign In link */}
          <div className="text-center text-xs text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-emerald-800 hover:text-emerald-900 hover:underline">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
