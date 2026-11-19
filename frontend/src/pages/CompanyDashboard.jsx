import React, { useState } from 'react';
import {
  Award,
  Briefcase,
  Building2,
  CalendarCheck,
  CheckCircle,
  LayoutDashboard,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import InternsPanel from '../components/company/InternsPanel';
import AttendanceApprovalsPanel from '../components/company/AttendanceApprovalsPanel';
// JournalReviewPanel removed - journals are private
import CompanyEvaluationsPanel from '../components/company/EvaluationsPanel';
import CompanyEvaluationSummaryPanel, { StudentEvaluationForms } from '../components/company/EvaluationSummaryPanel';
import CompletionPanel from '../components/company/CompletionPanel';
import MatchScoresPanel from '../components/company/MatchScoresPanel';
import CompanyProfilePanel from '../components/company/ProfilePanel';
import CompanyOverviewPanel from '../components/company/OverviewPanel';
import ApplicantsPanel from '../components/company/ApplicantsPanel';
import PostingsPanel from '../components/company/PostingsPanel';

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
  const [tab, setTab] = useState('overview');
  const [view, setView] = useState('');

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
      {tab === 'interns' && <InternsPanel />}
      {tab === 'attendance' && <AttendanceApprovalsPanel />}
      {/* Journal Review removed - journals are private */}
      {tab === 'evaluations' && (
        <div>
          <SubTabs tabs={[['list', 'All Evaluations'], ['summary', 'Performance Summary']]} value={view || 'list'} onChange={setView} />
          {(view || 'list') === 'list' ? (
            <StudentEvaluationForms />
          ) : (
            <div className="space-y-6">
              <CompanyEvaluationSummaryPanel />
              <CompanyEvaluationsPanel />
            </div>
          )}
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
