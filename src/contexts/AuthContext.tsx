import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  displayName: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Cache do isAdmin para evitar "flash" de dashboard errado no boot ───
const ADMIN_CACHE_KEY = 'medfinance:isAdmin';

function readAdminCache(userId: string): boolean {
  try {
    const raw = localStorage.getItem(ADMIN_CACHE_KEY);
    if (!raw) return false;
    const { uid, admin } = JSON.parse(raw);
    return uid === userId && admin === true;
  } catch {
    return false;
  }
}

function writeAdminCache(userId: string, admin: boolean) {
  try {
    localStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify({ uid: userId, admin }));
  } catch {
    /* storage indisponível, ignora */
  }
}

function clearAdminCache() {
  try { localStorage.removeItem(ADMIN_CACHE_KEY); } catch { /* ignora */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Evita re-disparar o RPC has_role para o mesmo usuário múltiplas vezes
  const checkedUidRef = useRef<string | null>(null);

  const checkAdminRole = useCallback(async (userId: string) => {
    if (checkedUidRef.current === userId) return;
    checkedUidRef.current = userId;

    const { data } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin',
    });
    const admin = !!data;
    setIsAdmin(admin);
    writeAdminCache(userId, admin);
  }, []);

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    setLoading(false);

    if (nextSession?.user) {
      // Otimismo: usa valor cacheado para renderizar o dashboard certo
      // sem esperar o RPC responder.
      setIsAdmin(readAdminCache(nextSession.user.id));
      // Verifica no servidor em background (não bloqueia a UI)
      setTimeout(() => checkAdminRole(nextSession.user!.id), 0);
    } else {
      setIsAdmin(false);
      checkedUidRef.current = null;
      clearAdminCache();
    }
  }, [checkAdminRole]);

  useEffect(() => {
    let cancelled = false;

    // Caminho rápido: lê sessão cacheada do localStorage (quase instantâneo)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      applySession(session);
    });

    // Listener para mudanças futuras (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      applySession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const logout = useCallback(async () => {
    clearAdminCache();
    await supabase.auth.signOut();
  }, []);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  return (
    <AuthContext.Provider value={{ user, session, loading, login, signup, logout, isAdmin, displayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}