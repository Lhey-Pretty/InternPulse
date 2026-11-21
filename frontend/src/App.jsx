import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const InternshipsList = lazy(() => import('./pages/Internships').then((module) => ({ default: module.InternshipsList })));
const InternshipDetail = lazy(() => import('./pages/Internships').then((module) => ({ default: module.InternshipDetail })));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CompanyDashboard = lazy(() => import('./pages/CompanyDashboard'));
const CoordinatorDashboard = lazy(() => import('./pages/CoordinatorDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950 dark:text-gray-100" role="status" aria-label="Loading page">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RoleDashboardRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={`/${user.role}/dashboard`} replace />;
}

function RoleRoute({ role, children }) {
  const { user } = useAuth();

  if (user?.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/InternPulse">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/internships" element={<InternshipsList />} />
            <Route path="/internships/:id" element={<InternshipDetail />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RoleDashboardRedirect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute>
                  <RoleRoute role="student">
                    <Dashboard />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/dashboard"
              element={
                <ProtectedRoute>
                  <RoleRoute role="company">
                    <CompanyDashboard />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/coordinator/dashboard"
              element={
                <ProtectedRoute>
                  <RoleRoute role="coordinator">
                    <CoordinatorDashboard />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <RoleRoute role="admin">
                    <AdminDashboard />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
