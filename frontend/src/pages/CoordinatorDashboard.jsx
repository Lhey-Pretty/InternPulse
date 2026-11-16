import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle,
  FileText,
  LayoutDashboard,
  LineChart,
  Shield,
  Users,
  XCircle,
  ArrowRight,
  TrendingUp,
  Clock,
  Award,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../components/ui';
import api from '../api/client';
import DashboardLayout from '../components/DashboardLayout';
import PostingsPanel from '../components/coordinator/PostingsPanel';
import StudentsPanel from '../components/coordinator/StudentsPanel';
import JournalsPanel from '../components/coordinator/JournalsPanel';
import ReportsPanel from '../components/coordinator/ReportsPanel';
import RecommendationsPanel from '../components/coordinator/RecommendationsPanel';
import CompaniesPanel from '../components/coordinator/CompaniesPanel';
import PlacementsPanel from '../components/coordinator/PlacementsPanel';
import CoordinatorProfilePanel from '../components/coordinator/ProfilePanel';
import ApplicationsReviewPanel from '../components/coordinator/ApplicationsReviewPanel';

const errorMessage = (error) => apiError(error);

function Empty({ text }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-12 text-center text-gray-400">
      {text}
    </div>
  );
}

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [overviewData, setOverviewData] = useState(null);
  const [applications, setApplications] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [recStudentId, setRecStudentId] = useState(null);
  const goRecommend = (studentId) => { setRecStudentId(studentId); setTab('recommendations'); };

  const load = async () => {
    try {
      setLoading(true);
      const [overviewRes, applicationResponse, companyResponse, placementResponse] = await Promise.all([
        api.get('/coordinator/overview').catch(() => ({ data: { data: null } })),
        api.get('/coordinator/applications').catch(() => ({ data: { data: { data: [] } } })),
        api.get('/coordinator/companies').catch(() => ({ data: { data: { data: [] } } })),
        api.get('/coordinator/placements').catch(() => ({ data: { data: { data: [] } } })),
      ]);
      setOverviewData(overviewRes.data?.data || null);
      setApplications(applicationResponse.data.data?.data || []);
      setCompanies(companyResponse.data.data?.data || []);
      setPlacements(placementResponse.data.data?.data || []);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateApplication = async (application, status) => {
    try {
      await api.patch(`/coordinator/applications/${application.id}/status`, { status });
      setMessage('Application status updated.');
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const updateCompany = async (company, status) => {
    try {
      await api.patch(`/coordinator/companies/${company.id}/verification`, { status });
      setMessage('Company verification updated.');
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const approvePostingQuick = async (postingId) => {
    try {
      await api.patch(`/coordinator/postings/${postingId}/approve`);
      setMessage('Internship posting approved.');
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const stats = overviewData?.stats || {
    total_students: 0,
    students_on_internship: 0,
    students_completed: 0,
    students_without_placement: 0,
    pending_postings: 0,
    total_companies: 0,
    verified_companies: 0,
    pending_companies: 0,
    approved_postings: 0,
  };

  const recentPlacements = overviewData?.recent_placements || [];
  const pendingPostings = overviewData?.pending_postings || [];

  const statCards = [
    {
      label: 'Total Students',
      value: stats.total_students,
      gradient: 'from-blue-500 to-emerald-600',
      hint: 'Enrolled in OJT',
    },
    {
      label: 'On Internship',
      value: stats.students_on_internship,
      gradient: 'from-emerald-500 to-teal-600',
      hint: 'Actively training',
    },
    {
      label: 'Completed',
      value: stats.students_completed,
      gradient: 'from-emerald-500 to-pink-600',
      hint: 'Cleared hours',
    },
    {
      label: 'Unplaced',
      value: stats.students_without_placement,
      gradient: 'from-amber-500 to-orange-600',
      hint: 'Awaiting placement confirmation',
    },
    {
      label: 'Pending Postings',
      value: stats.pending_postings,
      gradient: 'from-rose-500 to-red-600',
      hint: 'Awaiting approval',
    },
  ];

  const navGroups = [
    {
      label: 'General',
      items: [
        {
          key: 'overview',
          label: 'Dashboard',
          icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
        },
      ],
    },
    {
      label: 'Internship',
      items: [
        {
          key: 'applications',
          label: 'Student Applications',
          icon: <FileText className="w-[18px] h-[18px]" />,
        },
        { key: 'students', label: 'Students', icon: <Users className="w-[18px] h-[18px]" /> },
        { key: 'companies', label: 'Companies', icon: <Building2 className="w-[18px] h-[18px]" /> },
        { key: 'postings', label: 'Postings', icon: <Briefcase className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      label: 'Placements',
      items: [
        { key: 'placements', label: 'Monitor Placements', icon: <Shield className="w-[18px] h-[18px]" /> },
        { key: 'recommendations', label: 'Placement Recommendations', icon: <Award className="w-[18px] h-[18px]" /> },
        { key: 'journals', label: 'Student Journals', icon: <BookOpen className="w-[18px] h-[18px]" /> },
        { key: 'reports', label: 'Reports', icon: <LineChart className="w-[18px] h-[18px]" /> },
        { key: 'profile', label: 'My Profile', icon: <Users className="w-[18px] h-[18px]" /> },
      ],
    },
  ];

  const titleMap = {
    overview: 'Coordinator Overview Dashboard',
    applications: 'Student Applications Review',
    postings: 'Internship Posting Approvals',
    companies: 'Company Verification & Directory',
    students: 'Student OJT Directory',
    placements: 'Student Placement Monitoring',
    recommendations: 'Placement Recommendations',
    journals: 'Student Activity Journals Review',
    reports: 'OJT Placement & Summary Reports',
  };

  return (
    <DashboardLayout
      title={titleMap[tab] || 'Coordinator Portal'}
      activeTab={tab}
      onTabChange={setTab}
      navGroups={navGroups}
    >
      {message && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 dark:border-emerald-800 p-4 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2 shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/50 dark:border-rose-800 p-4 text-sm text-rose-700 dark:text-rose-300 shadow-sm">
          {error}
        </div>
      )}

      {/* OVERVIEW TAB: EXACT BLADE REPLICA */}
      {tab === 'overview' && (
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#064e26] via-[#0b6333] to-[#043319] text-white p-6 sm:p-8 shadow-xl shadow-emerald-950/20 border border-emerald-600/30">
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute right-1/3 -top-10 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-emerald-100 border border-white/20 mb-3">
                  Academic Coordinator Portal
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Welcome back, {user?.name || 'Coordinator'}!
                </h1>
                <p className="text-emerald-100/90 text-sm sm:text-base mt-1 max-w-xl">
                  Oversee student placements, review company listings, and monitor student graduation clearance.
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <button
                  onClick={() => setTab('students')}
                  className="inline-flex items-center gap-2 bg-white text-[#064e26] hover:bg-emerald-50 font-bold px-5 py-3 rounded-xl shadow-lg transition-all duration-200 hover:-translate-y-0.5 text-sm cursor-pointer"
                >
                  <Users className="w-4 h-4 text-emerald-700" />
                  Student Directory
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
            {statCards.map((s, idx) => (
              <div
                key={idx}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 block relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400">
                    {s.label}
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  {s.value}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-medium">
                  {s.hint}
                </p>
              </div>
            ))}
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pending Postings */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 hover:shadow-md transition-all duration-200 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Pending Postings</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Employer listings awaiting review</p>
                </div>
                <button
                  onClick={() => setTab('postings')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3 flex-1">
                {pendingPostings.length === 0 ? (
                  <div className="text-center py-10 px-4 flex flex-col items-center justify-center h-full">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">All caught up!</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">No pending postings need approval.</p>
                  </div>
                ) : (
                  pendingPostings.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-800"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {p.company_profile?.company_name || 'Company'}
                        </p>
                      </div>
                      <button
                        onClick={() => approvePostingQuick(p.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        Approve
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Placements */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 hover:shadow-md transition-all duration-200 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Recent Placements</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Newly assigned trainees</p>
                </div>
                <button
                  onClick={() => setTab('placements')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3 flex-1">
                {recentPlacements.length === 0 ? (
                  <div className="text-center py-10 px-4 flex flex-col items-center justify-center h-full">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No placements yet</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Assigned placements will appear here.</p>
                  </div>
                ) : (
                  recentPlacements.map((pl) => (
                    <div
                      key={pl.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors border border-transparent hover:border-gray-100 dark:border-gray-800"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {(pl.student_profile?.first_name || pl.student_profile?.full_name || '?')[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {pl.student_profile?.full_name || `${pl.student_profile?.first_name || ''} ${pl.student_profile?.last_name || ''}`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {pl.internship_posting?.company_profile?.company_name || 'Partner Company'}
                        </p>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold border capitalize shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60">
                        {pl.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Partner Companies Breakdown */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 hover:shadow-md transition-all duration-200 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Partner Companies</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Employer verification & active slots</p>
                </div>
                <button
                  onClick={() => setTab('companies')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3 flex-1">
                {[
                  { label: 'Total Partner Companies', val: stats.total_companies, badge: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
                  { label: 'Verified Employers', val: stats.verified_companies, badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' },
                  { label: 'Pending Verification', val: stats.pending_companies, badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' },
                  { label: 'Active Approved Postings', val: stats.approved_postings, badge: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' },
                ].map((row, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/80"
                  >
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{row.label}</span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${row.badge}`}>{row.val}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setTab('companies')}
                  className="w-full inline-flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Manage Partner Network →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB PANELS */}
      {tab === 'postings' && <PostingsPanel />}
      {tab === 'students' && <StudentsPanel onRecommend={goRecommend} />}
      {tab === 'journals' && <JournalsPanel />}
      {tab === 'reports' && <ReportsPanel />}
      {tab === 'recommendations' && (
        <RecommendationsPanel presetStudentId={recStudentId} onPresetConsumed={() => setRecStudentId(null)} />
      )}

      {tab === 'applications' && <ApplicationsReviewPanel />}
      {tab === 'companies' && <CompaniesPanel />}
      {tab === 'placements' && <PlacementsPanel />}
      {tab === 'profile' && <CoordinatorProfilePanel />}
    </DashboardLayout>
  );
}
