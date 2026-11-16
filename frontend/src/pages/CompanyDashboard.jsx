import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  CalendarCheck,
  CheckCircle,
  FileText,
  LayoutDashboard,
  Plus,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../components/ui';
import api from '../api/client';
import DashboardLayout from '../components/DashboardLayout';
import InternsPanel from '../components/company/InternsPanel';
import AttendanceApprovalsPanel from '../components/company/AttendanceApprovalsPanel';
// JournalReviewPanel removed - journals are private
import CompanyEvaluationsPanel from '../components/company/EvaluationsPanel';
import CompanyEvaluationSummaryPanel from '../components/company/EvaluationSummaryPanel';
import CompletionPanel from '../components/company/CompletionPanel';
import MatchScoresPanel from '../components/company/MatchScoresPanel';
import CompanyProfilePanel from '../components/company/ProfilePanel';
import CompanyOverviewPanel from '../components/company/OverviewPanel';
import ApplicantsPanel from '../components/company/ApplicantsPanel';
import PostingsPanel from '../components/company/PostingsPanel';

const emptyForm = {
  title: '',
  position: '',
  description: '',
  responsibilities: '',
  qualifications: '',
  slots: 1,
  duration_months: '',
  required_hours: '',
  location: '',
  work_setup: 'on-site',
  is_paid: false,
  allowance: '',
  application_deadline: '',
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

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [view, setView] = useState('');
  const [postings, setPostings] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [placementForms, setPlacementForms] = useState({});

  const viewResume = async (application) => {
    try {
      const res = await api.get(`/company/applicants/${application.id}/resume`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
    } catch {
      setError('No resume on file for this applicant.');
    }
  };

  const submitPlacementRequest = async (application) => {
    const f = placementForms[application.id];
    if (!f?.start_date || !f?.end_date || !f?.required_hours) {
      setError('Please fill in all placement schedule fields.');
      return;
    }
    try {
      await api.post(`/company/applicants/${application.id}/placement-request`, f);
      setMessage('Placement request submitted for coordinator approval.');
      setPlacementForms((prev) => ({ ...prev, [application.id]: null }));
      await load();
    } catch (requestError) {
      setError(apiError(requestError));
    }
  };

  const load = async () => {
    try {
      const [postingsResponse, applicantsResponse] = await Promise.all([
        api.get('/company/postings'),
        api.get('/company/applicants'),
      ]);
      setPostings(postingsResponse.data.data?.data || []);
      setApplicants(applicantsResponse.data.data?.data || []);
    } catch (requestError) {
      setError(apiError(requestError));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submitPosting = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.patch(`/company/postings/${editing.id}`, form);
        setMessage('Posting updated and submitted for review.');
      } else {
        await api.post('/company/postings', form);
        setMessage('Posting submitted for review.');
      }
      setForm(emptyForm);
      setEditing(null);
      await load();
    } catch (requestError) {
      setError(apiError(requestError));
    }
  };

  const updateStatus = async (application, status) => {
    try {
      await api.patch(`/company/applicants/${application.id}/status`, { status });
      setMessage('Applicant status updated.');
      await load();
    } catch (requestError) {
      setError(apiError(requestError));
    }
  };

  const navGroups = [
    {
      label: 'Internship',
      items: [
        { key: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
        { key: 'postings', label: 'Job Postings', icon: <Briefcase className="w-[18px] h-[18px]" /> },
        {
          key: 'applicants',
          label: 'Applicants',
          icon: <Users className="w-[18px] h-[18px]" />,
        },
        { key: 'match-scores', label: 'Match Scores', icon: <Zap className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      label: 'Company',
      items: [
        { key: 'profile', label: 'Company Profile', icon: <Building2 className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      label: 'Management',
      items: [
        { key: 'interns', label: 'Active Interns', icon: <UserCheck className="w-[18px] h-[18px]" /> },
        { key: 'attendance', label: 'Attendance Approvals', icon: <CalendarCheck className="w-[18px] h-[18px]" /> },
        // Journal Review removed - journals are private to students and coordinators
        { key: 'completion', label: 'Completion Approval', icon: <CheckCircle className="w-[18px] h-[18px]" /> },
        { key: 'evaluations', label: 'Performance Evaluations', icon: <Award className="w-[18px] h-[18px]" /> },
      ],
    },
  ];

  const titleMap = {
    postings: 'Job Postings Management',
    applicants: 'Applicant Applications',
    interns: 'Active Interns Directory',
    attendance: 'Attendance Approvals',
    journals: 'Student Activity Journals',
    evaluations: 'Intern Performance Evaluations',
    completion: 'OJT Completion Approvals',
    'match-scores': 'Student Match Ranking',
  };

  return (
    <DashboardLayout
      title={titleMap[tab] || 'Company Partner Portal'}
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

      {tab === 'interns' && <InternsPanel />}
      {tab === 'attendance' && <AttendanceApprovalsPanel />}
      {/* Journal Review removed - journals are private */}
      {tab === 'evaluations' && (
        <div>
          <SubTabs tabs={[['list', 'All Evaluations'], ['summary', 'Performance Summary']]} value={view || 'list'} onChange={setView} />
          {(view || 'list') === 'list' ? <CompanyEvaluationsPanel /> : <CompanyEvaluationSummaryPanel />}
        </div>
      )}
      {tab === 'completion' && <CompletionPanel />}
      {tab === 'match-scores' && <MatchScoresPanel />}
      {tab === 'profile' && <CompanyProfilePanel />}
      {tab === 'overview' && <CompanyOverviewPanel onNavigate={setTab} />}

      {tab === 'postings' && <PostingsPanel />}

      {tab === 'applicants' && <ApplicantsPanel />}

    </DashboardLayout>
  );
}
