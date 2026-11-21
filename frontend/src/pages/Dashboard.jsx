import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../components/ui';
import api from '../api/client';
import DashboardLayout from '../components/DashboardLayout';
import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  CalendarCheck,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LineChart,
  User,
} from 'lucide-react';
import OverviewPanel from '../components/student/OverviewPanel';
import JournalPanel from '../components/student/JournalPanel';
import AttendancePanel from '../components/student/AttendancePanel';
import WeeklyLogPanel from '../components/student/WeeklyLogPanel';
import TasksPanel from '../components/student/TasksPanel';
import EvaluationsPanel from '../components/student/EvaluationsPanel';
import EvaluationSummaryPanel from '../components/student/EvaluationSummaryPanel';

import PerformancePanel from '../components/student/PerformancePanel';
import SkillsPanel from '../components/student/SkillsPanel';
import ProfileEditPanel from '../components/student/ProfileEditPanel';
import PlacementRecsPanel from '../components/student/PlacementRecsPanel';
import ApplicationsPanel from '../components/student/ApplicationsPanel';
import OpportunitiesPanel from '../components/student/OpportunitiesPanel';
import CompanyEvaluationPanel from '../components/student/CompanyEvaluationPanel';
import CompanyRequestsPanel from '../components/student/CompanyRequestsPanel';
import CompletionSummaryPanel from '../components/student/CompletionSummaryPanel';

const getApiError = (error) => apiError(error, 'Unable to complete this request.');

// Tabs that were split across the sidebar before the merge.
const LEGACY_ROUTES = {
  journal: { tab: 'journals', view: 'daily' },
  weekly: { tab: 'journals', view: 'weekly' },
  company: { tab: 'companies', view: 'rate' },
  requests: { tab: 'companies', view: 'request' },
  opportunities: { tab: 'internships', view: 'browse' },
  recommendations: { tab: 'internships', view: 'ai' },
  evaluations: { tab: 'performance', view: 'evaluations' },
  skills: { tab: 'profile', view: 'skills' },
};

const resolveRoute = (tabKey, viewKey = '') => {
  if (LEGACY_ROUTES[tabKey]) return LEGACY_ROUTES[tabKey];
  return { tab: tabKey || 'overview', view: viewKey };
};

function SubTabs({ tabs, value, onChange }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer ${value === key
            ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function RecommendationsList({ status, recommendations }) {
  return (
    <div className="space-y-4">
      {status === 'unavailable' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-300">
          Recommendation engine is currently idle. Please check back later.
        </div>
      )}
      {status === 'loading' && (
        <div className="py-16 text-center text-gray-400 dark:text-gray-400">Calculating your best internship matches...</div>
      )}
      {status === 'completed' && recommendations.length === 0 && (
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-12 text-center text-gray-400 dark:text-gray-400">
          No matching recommendations found for your course and skills yet.
        </div>
      )}
      {recommendations.map((rec) => (
        <div
          key={rec.id}
          className="rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-sm border border-gray-100 dark:border-gray-800 dark:text-gray-100"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">{rec.title}</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{rec.company_name || 'Partner Company'}</p>
            </div>
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800 px-3.5 py-1 text-xs font-extrabold">
              {rec.match_percentage}% Match
            </span>
          </div>
          {rec.why_recommended?.length > 0 && (
            <p className="mt-3 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {rec.why_recommended.join(' · ')}
            </p>
          )}
          {rec.missing_skills?.length > 0 && (
            <div className="mt-3 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <span className="font-semibold">Skill tips:</span> {rec.missing_skills.join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRoute = resolveRoute(searchParams.get('tab') || 'overview', searchParams.get('view') || '');
  const [tab, setTabState] = useState(initialRoute.tab);
  const [view, setViewState] = useState(initialRoute.view);
  const setTab = (t) => {
    const route = resolveRoute(t);
    setTabState(route.tab);
    setViewState(route.view);
    if (route.tab === 'overview') setSearchParams({}, { replace: true });
    else setSearchParams(route.view ? { tab: route.tab, view: route.view } : { tab: route.tab }, { replace: true });
  };
  const setView = (v) => {
    setViewState(v);
    setSearchParams({ tab, view: v }, { replace: true });
  };
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationStatus, setRecommendationStatus] = useState('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const hasAcceptedApplication = applications.some((app) => app.status === 'accepted')
    || (profile?.applications || []).some((app) => app.status === 'accepted')
    || (profile?.placements || []).some((placement) => ['active', 'on_hold'].includes(placement.status));
  const currentPlacement = (profile?.placements || []).find((placement) => ['active', 'on_hold'].includes(placement.status)) || null;

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [applicationResponse, profileResponse] = await Promise.all([
        api.get('/applications'),
        api.get('/profile/student').then((response) => ({ ...response, profileMissing: false })).catch((requestError) => {
          if (requestError.response?.status === 404) return { data: { data: null }, profileMissing: true };
          return { data: { data: null }, profileMissing: false, profileError: getApiError(requestError) };
        }),
      ]);
      setApplications(applicationResponse.data.data?.data || []);
      setProfile(profileResponse.data.data || null);
      setProfileMissing(profileResponse.profileMissing);
      setProfileLoadError(profileResponse.profileError || '');
      try {
        setRecommendationStatus('loading');
        const recommendationResponse = await api.get('/student/recommendations');
        setRecommendations(recommendationResponse.data.data?.recommendations || []);
        setRecommendationStatus('completed');
      } catch (recommendationError) {
        setRecommendationStatus(recommendationError.response?.status === 503 ? 'unavailable' : 'error');
      }
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'student') {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    if (!loading && profileMissing && tab !== 'profile') setTab('profile');
  }, [loading, profileMissing, tab]);

  // Redirect from internships tab if student has accepted application
  useEffect(() => {
    if (!loading && tab === 'internships' && hasAcceptedApplication) {
      setTab('placements');
    }
  }, [tab, hasAcceptedApplication, loading]);

  useEffect(() => {
    if (!loading && tab === 'applications' && hasAcceptedApplication) {
      setTab('placements');
    }
  }, [tab, hasAcceptedApplication, loading]);

  // Check if student has accepted application
  const navGroups = [
    {
      label: 'General',
      items: [
        { key: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
        { key: 'profile', label: 'My Profile', icon: <User className="w-[18px] h-[18px]" /> },
        { key: 'placements', label: 'Placements', icon: <Award className="w-[18px] h-[18px]" /> },
        { key: 'companies', label: 'Companies', icon: <Building2 className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      label: 'Internship',
      items: [
        // Hide "Find Internship" if student has accepted application
        ...(loading || hasAcceptedApplication ? [] : [
          { key: 'internships', label: 'Find Internship', icon: <Briefcase className="w-[18px] h-[18px]" /> },
        ]),
        ...(!loading && hasAcceptedApplication ? [] : [{
          key: 'applications',
          label: 'My Applications',
          icon: <FileText className="w-[18px] h-[18px]" />,
        }]),
        { key: 'attendance', label: 'Attendance', icon: <CalendarCheck className="w-[18px] h-[18px]" /> },
        { key: 'tasks', label: 'Assigned Tasks', icon: <ClipboardList className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      label: 'Records',
      items: [
        { key: 'journals', label: 'Journals', icon: <BookOpen className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      label: 'Performance',
      items: [
        { key: 'performance', label: 'Performance', icon: <LineChart className="w-[18px] h-[18px]" /> },
        { key: 'completion', label: 'Completion Summary', icon: <FileSpreadsheet className="w-[18px] h-[18px]" /> },
      ],
    },
  ];

  const pageTitleMap = {
    overview: 'Student Dashboard',
    profile: 'Student Profile',
    placements: 'My Placement',
    companies: 'Company Portal & Ratings',
    internships: 'Find Internship',
    applications: 'My Applications',
    attendance: 'Daily Attendance Logging',
    tasks: 'Internship Tasks',
    journals: 'Activity Journals',
    performance: 'Performance & Evaluations',
    completion: 'Completion Summary',
  };

  return (
    <DashboardLayout
      title={pageTitleMap[tab] || 'Student Dashboard'}
      activeTab={tab}
      onTabChange={setTab}
      navGroups={navGroups}
    >
      {/* Alert Messages */}
      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/50 dark:border-rose-800 p-4 text-sm text-rose-700 dark:text-rose-300 shadow-sm">
          {error}
          <button type="button" onClick={loadData} className="ml-3 font-semibold underline underline-offset-2">Try again</button>
        </div>
      )}

      {/* Panels */}
      {tab === 'overview' && <OverviewPanel onNavigate={setTab} hasAcceptedApplication={hasAcceptedApplication} />}
      {tab === 'attendance' && <AttendancePanel onNavigate={setTab} hasAcceptedApplication={hasAcceptedApplication} />}
      {tab === 'tasks' && <TasksPanel />}

      {tab === 'journals' && (
        <div>
          <SubTabs tabs={[['daily', 'Daily Journal'], ['weekly', 'Weekly Log']]} value={view || 'daily'} onChange={setView} />
          {(view || 'daily') === 'daily' ? <JournalPanel /> : <WeeklyLogPanel />}
        </div>
      )}

      {tab === 'performance' && (
        <div>
          <SubTabs tabs={[['metrics', 'Performance Metrics'], ['evaluations', 'Supervisor Evaluations'], ['summary', 'Evaluation Summary']]} value={view || 'metrics'} onChange={setView} />
          {(view || 'metrics') === 'metrics' ? <PerformancePanel /> : (view === 'summary' ? <EvaluationSummaryPanel /> : <EvaluationsPanel />)}
        </div>
      )}

      {tab === 'companies' && (
        <div>
          <SubTabs tabs={[['rate', 'Rate Company'], ['request', 'Request Company']]} value={view || 'rate'} onChange={setView} />
          {(view || 'rate') === 'rate' ? <CompanyEvaluationPanel /> : <CompanyRequestsPanel />}
        </div>
      )}

      {tab === 'completion' && <CompletionSummaryPanel onNavigate={setTab} />}

      {tab === 'internships' && loading && (
        <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">Checking your placement status…</p>
      )}
      {tab === 'internships' && !loading && !hasAcceptedApplication && (
        <div>
          <SubTabs tabs={[['browse', 'Browse Internships'], ['ai', 'AI Matches']]} value={view || 'browse'} onChange={setView} />
          {(view || 'browse') === 'browse' ? <OpportunitiesPanel /> : (
            <RecommendationsList status={recommendationStatus} recommendations={recommendations} />
          )}
        </div>
      )}

      {/* Applications List */}
      {tab === 'applications' && <ApplicationsPanel onNavigate={setTab} hasAcceptedApplication={hasAcceptedApplication} placement={currentPlacement} />}

      {/* Student Profile Card */}
      {tab === 'profile' && (
        <div>
          {(profileMissing || searchParams.get('onboarding') === '1') && (
            <div role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100">
              <p className="font-bold">Complete your student profile</p>
              <p className="mt-1">Add your first name, last name, and course to finish setting up your OJT account.</p>
            </div>
          )}
          {profileLoadError && (
            <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
              <p>{profileLoadError}</p>
              <button type="button" onClick={loadData} className="mt-2 font-semibold underline">Try again</button>
            </div>
          )}
          <SubTabs tabs={[['profile', 'Profile'], ['skills', 'Skills']]} value={view || 'profile'} onChange={setView} />
          {(view || 'profile') === 'skills' && <SkillsPanel onNavigate={() => setView('profile')} />}
          {(view || 'profile') === 'profile' && (
          <>
        <div className="rounded-2xl bg-white dark:bg-gray-900 p-7 shadow-sm border border-gray-100 dark:border-gray-800 dark:text-gray-100">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Student Academic Profile</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Official information registered for your OJT program.</p>
            </div>
          </div>
          {profile ? (
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider dark:text-gray-400">Full Name</span>
                <p className="font-bold text-gray-900 dark:text-white mt-1">
                  {profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}` || user?.name}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider dark:text-gray-400">Degree / Course</span>
                <p className="font-bold text-gray-900 dark:text-white mt-1">{profile.course || 'Bachelor of Science in Information Technology'}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider dark:text-gray-400">Year Level</span>
                <p className="font-bold text-gray-900 dark:text-white mt-1">{profile.year_level || '4th Year'}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider dark:text-gray-400">Required OJT Hours</span>
                <p className="font-bold text-gray-900 dark:text-white mt-1">{profile.required_hours || 600} hours</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-400">Loading student profile details...</p>
          )}
        </div>
        <div className="mt-4"><ProfileEditPanel onSaved={async () => {
          await loadData();
          if (searchParams.get('onboarding') === '1') setSearchParams({ tab: 'profile' }, { replace: true });
        }} /></div>
          </>
          )}
        </div>
      )}

      {tab === 'placements' && <PlacementRecsPanel />}

    </DashboardLayout>
  );
}
