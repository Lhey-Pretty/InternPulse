import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CheckCircle,
  FileText,
  Shield,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../components/ui';
import api from '../api/client';
import DashboardLayout from '../components/DashboardLayout';
import AdminOverviewPanel from '../components/admin/OverviewPanel';
import { LayoutDashboard, GraduationCap, BrainCircuit, ScrollText, Settings } from 'lucide-react';
import AdminStudentsPanel from '../components/admin/StudentsPanel';
import AdminMlPanel from '../components/admin/MlDashboardPanel';
import AdminSessionsPanel from '../components/admin/SessionLogsPanel';
import AdminSettingsPanel from '../components/admin/SettingsPanel';
import AdminUsersPanel from '../components/admin/UsersPanel';
import AdminCompaniesPanel from '../components/admin/CompaniesPanel';
import AdminSkillsPanel from '../components/admin/SkillsPanel';
import AdminCompanyRequestsPanel from '../components/admin/CompanyRequestsPanel';
import AdminAuditLogsPanel from '../components/admin/AuditLogsPanel';
import AdminReportsPanel from '../components/admin/ReportsPanel';
import EvaluationCriteriaPanel from '../components/admin/EvaluationCriteriaPanel';

const fail = (e) => apiError(e);

const TABS = ['overview', 'reports', 'users', 'companies', 'requests', 'students', 'taxonomy', 'ml', 'sessions', 'settings', 'audit'];
const tabFromUrl = (params) => {
  const value = params.get('tab');
  return TABS.includes(value) ? value : 'overview';
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTabState] = useState(() => tabFromUrl(searchParams));

  // Keep the panel in sync with the address bar (back / forward navigation).
  useEffect(() => {
    setTabState(tabFromUrl(searchParams));
  }, [searchParams]);

  const setTab = useCallback((next) => {
    setTabState(next);
    setSearchParams(next === 'overview' ? {} : { tab: next });
  }, [setSearchParams]);
  const [reports, setReports] = useState(null);
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [report, userList, companyList] = await Promise.all([
        api.get('/admin/reports'),
        api.get('/admin/users'),
        api.get('/admin/companies'),
      ]);
      setReports(report.data.data);
      setUsers(userList.data.data?.data || []);
      setCompanies(companyList.data.data?.data || []);
    } catch (e) {
      setError(fail(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const navGroups = [
    {
      label: 'System Analytics',
      items: [
        { key: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
        { key: 'reports', label: 'Executive Reports', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      label: 'User & Partner Management',
      items: [
        {
          key: 'users',
          label: 'User Accounts',
          icon: <Users className="w-[18px] h-[18px]" />,
        },
        {
          key: 'companies',
          label: 'Partner Companies',
          icon: <Building2 className="w-[18px] h-[18px]" />,
        },
        { key: 'requests', label: 'Company Requests', icon: <FileText className="w-[18px] h-[18px]" /> },
        { key: 'students', label: 'Students', icon: <GraduationCap className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      label: 'Platform Administration',
      items: [
        { key: 'taxonomy', label: 'Skills Taxonomy', icon: <Shield className="w-[18px] h-[18px]" /> },
        { key: 'criteria', label: 'Evaluation Criteria', icon: <FileText className="w-[18px] h-[18px]" /> },
        { key: 'ml', label: 'ML Dashboard', icon: <BrainCircuit className="w-[18px] h-[18px]" /> },
        { key: 'sessions', label: 'Session Logs', icon: <ScrollText className="w-[18px] h-[18px]" /> },
        { key: 'settings', label: 'Settings', icon: <Settings className="w-[18px] h-[18px]" /> },
        { key: 'audit', label: 'Audit Logs', icon: <FileText className="w-[18px] h-[18px]" /> },
      ],
    },
  ];

  const titleMap = {
    overview: 'Admin Dashboard',
    reports: 'System Administration Reports',
    users: 'User Account Management',
    companies: 'Partner Company Verifications',
    requests: 'Student Company Requests',
    students: 'Student Management',
    ml: 'ML Recommendation Dashboard',
    sessions: 'Session Logs',
    settings: 'System Settings',
    taxonomy: 'Skills Taxonomy & AI Index',
    criteria: 'Evaluation Criteria Management',
    audit: 'Security & Audit History',
  };

  return (
    <DashboardLayout
      title={tab === 'criteria' ? 'Admin Console' : titleMap[tab] || 'Admin Console'}
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

      {tab === 'overview' && <AdminOverviewPanel onNavigate={setTab} />}

      {/* Reports Summary KPI Cards */}
      {tab === 'reports' && <AdminReportsPanel />}

      {/* Users List */}
      {tab === 'users' && <AdminUsersPanel currentUserId={user?.id} onChanged={load} />}

      {/* Companies List */}
      {tab === 'companies' && <AdminCompaniesPanel onChanged={load} />}

      {tab === 'requests' && <AdminCompanyRequestsPanel onChanged={load} />}

      {tab === 'audit' && <AdminAuditLogsPanel />}

      {tab === 'taxonomy' && <AdminSkillsPanel />}

      {tab === 'criteria' && <EvaluationCriteriaPanel />}

      {tab === 'students' && <AdminStudentsPanel />}
      {tab === 'ml' && <AdminMlPanel />}
      {tab === 'sessions' && <AdminSessionsPanel />}
      {tab === 'settings' && <AdminSettingsPanel />}
    </DashboardLayout>
  );
}
