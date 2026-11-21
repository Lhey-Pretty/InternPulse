import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications', { params: { per_page: 8 } });
      setNotifications(res.data.data?.notifications?.data || []);
      setUnread(res.data.data?.unread_count || 0);
    } catch {
      // bell is non-critical
    }
  }, [user]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const getNotificationRoute = (notification) => {
    const data = notification.data || {};
    const type = notification.type;

    // Student approval - go to Users page with highlight
    if (type === 'student_approval' && data.student_profile_id) {
      return `/admin/dashboard?tab=users&inactive_only=1&highlight=${data.student_profile_id}`;
    }

    // Company approval - go to Users page with highlight
    if (type === 'company_approval' && data.company_profile_id) {
      return `/admin/dashboard?tab=users&inactive_only=1&highlight=${data.company_profile_id}`;
    }

    // Posting approval - go to Postings tab
    if (type === 'posting_approval' || type === 'posting_pending') {
      return `/coordinator/dashboard?tab=postings&status=pending`;
    }

    // Application notifications - go to Applicants tab
    if (type === 'application_received' && data.application_id) {
      return `/company/dashboard?tab=applicants`;
    }

    // Placement notifications - go to Placements tab
    if (type === 'placement_created' || type === 'placement_confirmed') {
      return user?.role === 'coordinator' 
        ? `/coordinator/dashboard?tab=placements`
        : `/student/dashboard?tab=placement`;
    }

    // Journal notifications
    if (type === 'journal_submitted' || type === 'journal_reviewed') {
      return user?.role === 'coordinator'
        ? `/coordinator/dashboard?tab=journals`
        : `/student/dashboard?tab=journal`;
    }

    // Evaluation notifications
    if (type === 'evaluation_submitted' || type === 'evaluation_received') {
      return user?.role === 'company'
        ? `/company/dashboard?tab=evaluations`
        : `/student/dashboard?tab=evaluations`;
    }

    // Default: stay on current page
    return null;
  };

  const markRead = async (n) => {
    if (!n.is_read) {
      try { await api.patch(`/notifications/${n.id}/read`); } catch {}
    }
    
    const route = getNotificationRoute(n);
    if (route) {
      setOpen(false);
      navigate(route);
    }
    
    load();
  };

  const markAll = async () => {
    try { await api.post('/notifications/read-all'); } catch {}
    load();
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-700 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-gray-800">
            <p className="text-sm font-bold text-slate-900 dark:text-gray-100">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:underline dark:text-green-300">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-gray-400">No notifications yet.</p>
            ) : notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n)}
                className={`block w-full border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-gray-800 dark:hover:bg-gray-800 ${n.is_read ? 'opacity-60' : ''}`}
              >
                <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-gray-400">{n.message}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400 dark:text-gray-400">{new Date(n.created_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
