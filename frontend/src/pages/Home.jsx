import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Compass,
  FileCheck,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Moon,
  Search,
  Sparkles,
  Sun,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const [featuredPosting, setFeaturedPosting] = useState(null);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/internships', { params: { page: 1 } })
      .then(({ data }) => { if (active) setFeaturedPosting(data.data?.[0] || null); })
      .catch(() => { if (active) setFeaturedPosting(null); })
      .finally(() => { if (active) setFeaturedLoading(false); });
    return () => { active = false; };
  }, []);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('ip-theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ip-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ip-theme', 'light');
    }
  }, [darkMode]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const toggleTheme = () => setDarkMode(!darkMode);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans antialiased transition-colors duration-200">
      {/* ══════════════ NAVBAR ══════════════ */}
      <header className="fixed inset-x-0 top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/images/minsu-logo.png" alt="MinSU Seal" className="w-8 h-8 object-contain drop-shadow-sm" />
            <span className="whitespace-nowrap text-sm font-bold tracking-tight text-gray-900 dark:text-white sm:text-base"><span className="hidden sm:inline">MinSU </span>InternPulse</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500 dark:text-gray-400">
            <a href="#how-it-works" className="hover:text-gray-900 dark:hover:text-white transition-colors">How It Works</a>
            <a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#roles" className="hover:text-gray-900 dark:hover:text-white transition-colors">Roles</a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {user ? (
              <Link
                to={`/${user.role}/dashboard`}
                className="text-sm font-semibold bg-[#009688] hover:bg-[#00897b] text-white px-5 py-2 rounded-xl transition-all shadow-md shadow-teal-700/20"
              >
                Open Dashboard
              </Link>
            ) : (
              <Link
                to="/register"
                className="text-sm font-semibold bg-[#009688] hover:bg-[#00897b] text-white px-5 py-2 rounded-xl transition-all shadow-md shadow-teal-700/25 hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ══════════════ HERO ══════════════ */}
      <section className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-5 sm:pb-20 sm:pt-32">
        {/* Background glow decorations */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/40 dark:bg-emerald-900/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-200/40 dark:bg-emerald-900/20 rounded-full blur-3xl animate-float-delayed"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-emerald-100/30 to-teal-100/30 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-6xl mx-auto grid min-w-0 grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="min-w-0 animate-fade-up">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 px-4 py-1.5 rounded-full mb-6 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Mindoro State University · Bongabong Campus OJT Portal
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white leading-[1.1] tracking-tight mb-5 break-words">
              Find the Right Internship.
              <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Build Your Future.
              </span>
            </h1>

            <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed mb-8 max-w-lg">
              InternPulse automates student internship placement, attendance logging, daily activity journals, and performance evaluation for Mindoro State University.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <Link
                to="/internships"
                className="inline-flex items-center gap-2 bg-[#009688] hover:bg-[#00897b] active:bg-[#00796b] text-white font-semibold px-7 py-3 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-teal-700/20 hover:-translate-y-0.5"
              >
                Find Internship
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                to={user ? `/${user.role}/dashboard` : '/login'}
                className="inline-flex items-center gap-2 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50/50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 font-semibold px-7 py-3 rounded-xl text-sm transition-all duration-200"
              >
                {user ? 'Open Dashboard' : 'Log In'}
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-100 pt-5 text-sm font-semibold text-gray-600 dark:border-gray-800 dark:text-gray-300">
              <span>Internship opportunities</span>
              <span>Attendance and journals</span>
              <span>Performance tracking</span>
            </div>
          </div>

          {/* Hero Card Preview */}
          <div className="flex min-w-0 w-full justify-center lg:justify-end animate-fade-up">
            {featuredLoading ? (
              <div aria-label="Loading internship preview" className="h-72 w-full max-w-md animate-pulse rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
            ) : featuredPosting ? (
              <Link to={`/internships/${featuredPosting.id}`} className="group block w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                <div className="bg-gradient-to-r from-emerald-700 to-teal-700 px-6 py-5 sm:px-7">
                  <p className="text-sm font-semibold text-emerald-100">Featured opportunity</p>
                  <h2 className="mt-1 break-words text-xl font-extrabold leading-snug text-white">{featuredPosting.attributes?.title}</h2>
                  <p className="mt-1 text-sm text-emerald-100">{featuredPosting.company?.name || 'MinSU partner company'}</p>
                </div>
                <div className="space-y-4 p-6 sm:p-7">
                  <p className="line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{featuredPosting.attributes?.description || 'View the posting for role details and qualifications.'}</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
                    {featuredPosting.attributes?.location && <span className="inline-flex items-center gap-2"><Compass className="h-4 w-4 text-emerald-700" />{featuredPosting.attributes.location}</span>}
                    {featuredPosting.attributes?.requiredHours && <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-emerald-700" />{featuredPosting.attributes.requiredHours} required hours</span>}
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 group-hover:text-emerald-800 dark:text-emerald-400">Browse opportunity <span aria-hidden="true">→</span></span>
                </div>
              </Link>
            ) : (
              <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-7 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Explore internship opportunities</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">Browse approved openings from MinSU partner companies and find a role that fits your course and skills.</p>
                <Link to="/internships" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Browse internships</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <section id="how-it-works" className="py-20 px-5 bg-slate-50 dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">Process</p>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">How It Works</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">From signup to internship completion — four clear steps.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { num: '01', title: 'Create Your Profile', desc: 'Submit your personal info, course, skills, and required documents to your coordinator.' },
              { num: '02', title: 'Coordinator Assigns Company', desc: 'Your OJT Coordinator reviews your profile and assigns you to a partner company.' },
              { num: '03', title: 'Begin Your Internship', desc: 'Receive your assignment, report to the company, and officially start your OJT.' },
              { num: '04', title: 'Intern & Get Evaluated', desc: 'Log attendance, complete assigned tasks, and receive a performance evaluation.' },
            ].map((step) => (
              <div
                key={step.num}
                className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full">
                    Step {step.num}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ FEATURES ══════════════ */}
      <section id="features" className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">Features</p>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Everything in One Platform</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">Built for students, companies, coordinators, and administrators.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: <Sparkles className="w-5 h-5 text-emerald-600" />, title: 'Smart Matching', desc: 'ML-based algorithm matches students to internships using skills, course, and interests. Each match includes a percentage score and breakdown.' },
              { icon: <Search className="w-5 h-5 text-teal-600" />, title: 'Application Tracking', desc: 'Apply in one click. Track your application status from pending to shortlisted, interview, and accepted — all in real time.' },
              { icon: <Clock className="w-5 h-5 text-emerald-600" />, title: 'Attendance Monitoring', desc: 'Log daily time-in and time-out. The system auto-computes rendered hours and tracks progress toward the required OJT hours.' },
              { icon: <Briefcase className="w-5 h-5 text-teal-600" />, title: 'Task Management', desc: 'Company supervisors assign tasks to interns. Students update status, add notes, and submit output files per task.' },
              { icon: <TrendingUp className="w-5 h-5 text-emerald-600" />, title: 'Performance Evaluation', desc: '10-criteria evaluation system covering quality, punctuality, teamwork, and more. Auto-computes overall rating and grade description.' },
              { icon: <LayoutDashboard className="w-5 h-5 text-teal-600" />, title: 'Reports & Monitoring', desc: 'Coordinators and admins view placement rates, company participation, rendered hours, and student performance summaries.' },
            ].map((f, i) => (
              <div
                key={i}
                className="flex gap-4 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ ROLES ══════════════ */}
      <section id="roles" className="py-20 px-5 bg-slate-50 dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">Roles</p>
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Built for Everyone</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">Each role has a dedicated portal with the right set of tools.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Student / Intern',
                badge: 'Student',
                items: [
                  'Browse and apply to internship postings',
                  'View ML match score with breakdown',
                  'Log daily OJT attendance (time-in/out)',
                  'Complete and submit assigned tasks',
                  'View OJT completion evaluations',
                ],
              },
              {
                title: 'Company / Employer',
                badge: 'Company',
                items: [
                  'Post internship openings with requirements',
                  'Review applicants ranked by match score',
                  'Schedule and manage interviews',
                  'Assign tasks and give supervisor feedback',
                  'Submit performance evaluations',
                ],
              },
              {
                title: 'Coordinator / Admin',
                badge: 'Management',
                items: [
                  'Verify company accounts before they post',
                  'Approve or reject internship postings',
                  'Monitor all student placements',
                  'Track attendance and rendered hours',
                  'Generate placement and performance reports',
                ],
              },
            ].map((role, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-7 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {role.badge}
                    </span>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{role.title}</h3>
                  </div>
                </div>
                <ul className="space-y-3">
                  {role.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ CTA ══════════════ */}
      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-10 sm:p-12 shadow-2xl shadow-emerald-500/25 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
            <div className="relative">
              <h2 className="text-3xl font-extrabold text-white mb-3">Ready to Start Your Internship?</h2>
              <p className="text-emerald-100 mb-8 max-w-md mx-auto">
                Create your account today and let InternPulse match you with the perfect company.
              </p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-xl hover:-translate-y-0.5"
              >
                Get Started Now
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="bg-gray-900 dark:bg-gray-950 border-t border-gray-800 text-gray-400">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2.5">
            <img src="/images/minsu-logo.png" alt="MinSU Seal" className="w-6 h-6 object-contain" />
            <span>© {new Date().getFullYear()} InternPulse · MinSU Bongabong. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-5 text-gray-400 text-xs sm:text-sm">
            <span>ojt@minsu.edu.ph</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
