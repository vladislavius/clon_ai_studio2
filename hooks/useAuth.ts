import { useState, useEffect } from 'react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { ADMIN_EMAILS } from '../constants';

interface UseAuthReturn {
  session: Session | null;
  authChecking: boolean;
  isOffline: boolean;
  isAdmin: boolean;
  setIsOffline: (value: boolean) => void;
  handleBypassAuth: () => void;
  handleLogout: () => Promise<void>;
}

/**
 * Custom hook for authentication management
 * Handles session, offline mode, and admin checks
 */
export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Determine admin status:
  // 1) Prefer secure flags from Supabase JWT/app_metadata or user_metadata
  // 2) Fallback to email list only for backwards compatibility / offline demo
  // Проверка роли администратора из JWT (app_metadata или user_metadata)
  const isAdminFromMetadata =
    !!session &&
    (session.user.app_metadata?.role === 'admin' ||
      session.user.user_metadata?.is_admin === true);

  // Для продакшена: только роль из JWT + оффлайн режим для демо
  // ADMIN_EMAILS используется только как fallback для разработки
  const isAdmin =
    isOffline ||
    isAdminFromMetadata ||
    // Fallback для dev/demo (можно удалить в продакшене)
    (import.meta.env.MODE === 'development' && session?.user?.email && ADMIN_EMAILS.includes(session.user.email));

  useEffect(() => {
    if (isOffline) {
      setAuthChecking(false);
      return;
    }

    if (!supabase) {
      setAuthChecking(false);
      return;
    }

    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (!isMounted) return; // Проверка перед обновлением состояния
      setSession(session);
      setAuthChecking(false);
    }).catch((error: unknown) => {
      if (!isMounted) return;
      
      // Обработка ошибки refresh token
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = String(error.message);
        if (errorMessage.includes('Refresh Token') || errorMessage.includes('Invalid')) {
          // Очищаем устаревший токен
          if (typeof window !== 'undefined' && localStorage) {
            localStorage.removeItem('sb-supabase-auth-token');
          }
        }
      }
      
      if (import.meta.env.DEV) {
        console.error('Error getting session:', error);
      }
      setAuthChecking(false);
    });

    // Listen for auth state changes
    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!isMounted) return; // Проверка перед обновлением состояния
      
      // Обработка ошибки refresh token
      if (_event === 'TOKEN_REFRESHED' && !session) {
        // Токен невалидный, очищаем localStorage
        if (typeof window !== 'undefined' && localStorage) {
          localStorage.removeItem('sb-supabase-auth-token');
        }
      }
      
      setSession(session);
      if (!session) {
        setIsOffline(false);
      }
    });
    subscription = sub;

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [isOffline]);

  const handleBypassAuth = () => {
    setIsOffline(true);
    setSession({ user: { email: ADMIN_EMAILS[0] } } as Session);
    setAuthChecking(false);
  };

  const handleLogout = async () => {
    // Immediate local cleanup to improve perceived performance
    setSession(null);
    setIsOffline(false);

    if (localStorage) {
      localStorage.removeItem('sb-supabase-auth-token'); // Supabase default key
    }

    if (!supabase || isOffline) return;

    try {
      // Attempt server logout with short timeout
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timed out')), 2000));
      await Promise.race([
        supabase.auth.signOut(),
        timeoutPromise
      ]);
    } catch (e) {
      console.warn('Logout error or timeout (force logout executed):', e);
    } finally {
      // Ensure reload to clear all in-memory states
      window.location.reload();
    }
  };

  return {
    session,
    authChecking,
    isOffline,
    isAdmin,
    setIsOffline,
    handleBypassAuth,
    handleLogout,
  };
}

