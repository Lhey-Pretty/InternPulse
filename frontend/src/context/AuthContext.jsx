import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const authRevision = useRef(0);
  const pendingLogout = useRef(null);

  useEffect(() => {
    let active = true;
    const revision = authRevision.current;
    const isCurrentSession = () => active && authRevision.current === revision;
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const cachedUser = localStorage.getItem('user');

      // First, restore from localStorage immediately (fast path)
      if (token && cachedUser) {
        let restoredUser = null;
        try {
          restoredUser = JSON.parse(cachedUser);
        } catch (parseError) {
          console.error('Failed to parse cached user:', parseError);
        }

        try {
          // Use the server's role as the source of truth before choosing a dashboard.
          const response = await api.get('/auth/me');
          if (!isCurrentSession()) return;
          const verifiedUser = response.data.data?.user;
          if (!verifiedUser) throw new Error('The session response did not include a user.');
          localStorage.setItem('user', JSON.stringify(verifiedUser));
          setUser(verifiedUser);
        } catch (authError) {
          if (!isCurrentSession()) return;
          if (authError.response?.status === 401 || !restoredUser) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          } else {
            // Keep a cached session during temporary network/server errors.
            setUser(restoredUser);
          }
        } finally {
          if (isCurrentSession()) setLoading(false);
        }
        return;
      }

      // No token or cache — not logged in
      setLoading(false);
    };

    initAuth();
    return () => { active = false; };
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    
    // Check if there's a redirect path stored
    const redirectPath = localStorage.getItem('redirectAfterLogin');
    if (redirectPath) {
      localStorage.removeItem('redirectAfterLogin');
      window.location.href = redirectPath;
    }
    
    return user;
  };

  const loginWithGoogle = useCallback(async (credential) => {
    const response = await api.post('/auth/google', { credential });
    const { token, user } = response.data.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      const nextUser = { ...currentUser, ...updates };
      localStorage.setItem('user', JSON.stringify(nextUser));
      return nextUser;
    });
  }, []);

  const register = async (payload) => {
    const response = await api.post('/auth/register', payload);
    const { token, user } = response.data.data || {};
    if (response.data.data?.pending_approval) return response.data.data;
    if (!token || !user) {
      return response.data.data || response.data;
    }

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const logout = useCallback(() => {
    if (pendingLogout.current) return pendingLogout.current;

    const token = localStorage.getItem('token');
    authRevision.current += 1;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setLoading(false);
    if (!token) return Promise.resolve();

    // Revoke the captured session without letting a late response clear a new login.
    pendingLogout.current = api.post('/auth/logout', {}, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    }).catch((err) => {
      console.error('Logout error:', err);
    }).finally(() => {
      pendingLogout.current = null;
    });
    return pendingLogout.current;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, updateUser, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
