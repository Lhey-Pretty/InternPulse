import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const cachedUser = localStorage.getItem('user');

      // First, restore from localStorage immediately (fast path)
      if (token && cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
          setLoading(false);
          
          // Then verify token with API in background (no await)
          api.get('/auth/me').catch(err => {
            if (err.response?.status === 401) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setUser(null);
            }
          });
          return;
        } catch (parseError) {
          console.error('Failed to parse cached user:', parseError);
        }
      }

      // No token or cache — not logged in
      setLoading(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    const markPasswordChangeRequired = () => {
      setUser((currentUser) => {
        if (!currentUser) return currentUser;
        const nextUser = { ...currentUser, password_change_required: true };
        localStorage.setItem('user', JSON.stringify(nextUser));
        return nextUser;
      });
    };

    window.addEventListener('password-change-required', markPasswordChangeRequired);
    return () => window.removeEventListener('password-change-required', markPasswordChangeRequired);
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
    if (!token || !user) {
      return response.data;
    }

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, updateUser, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
