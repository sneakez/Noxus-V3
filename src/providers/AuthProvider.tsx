/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole, Tenant, TenantMembership, TenantRole } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  memberships: TenantMembership[];
  activeTenant: Tenant | null;
  activeRole: TenantRole | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; user: User | null }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  switchTenant: (tenantId: string) => void;
  createTenantOnboarding: (name: string, slug?: string) => Promise<{ tenant: Tenant | null; error: string | null }>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACTIVE_TENANT_KEY = 'nexus_active_tenant';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) {
      setProfile(null);
    } else {
      setProfile(data as Profile);
    }
  }, []);

  const loadMemberships = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('tenant_memberships')
      .select('*, tenant:tenants(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      setMemberships([]);
      setActiveTenant(null);
      return;
    }

    const mships = data as unknown as TenantMembership[];
    setMemberships(mships);

    // Restore active tenant from localStorage or default to first
    const savedTenantId = localStorage.getItem(ACTIVE_TENANT_KEY);
    const saved = savedTenantId
      ? mships.find((m) => m.tenant_id === savedTenantId)
      : null;
    const target = saved ?? mships[0];
    setActiveTenant(target?.tenant ?? null);
    if (target?.tenant_id) {
      localStorage.setItem(ACTIVE_TENANT_KEY, target.tenant_id);
    }
  }, []);

  const reloadUser = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session) {
      await Promise.all([
        loadProfile(data.session.user.id),
        loadMemberships(data.session.user.id),
      ]);
    }
  }, [loadProfile, loadMemberships]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        Promise.all([
          loadProfile(data.session.user.id),
          loadMemberships(data.session.user.id),
        ]).finally(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) {
        (async () => {
          await Promise.all([
            loadProfile(sess.user.id),
            loadMemberships(sess.user.id),
          ]);
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setMemberships([]);
        setActiveTenant(null);
        localStorage.removeItem(ACTIVE_TENANT_KEY);
        setLoading(false);
      }
    });

    return () => { sub.subscription.unsubscribe(); };
  }, [loadProfile, loadMemberships]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) return { error: error.message, user: null };
    return { error: null, user: data.user };
  }

  async function resetPasswordForEmail(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setMemberships([]);
    setActiveTenant(null);
    setSession(null);
    localStorage.removeItem(ACTIVE_TENANT_KEY);
  }

  function switchTenant(tenantId: string) {
    const m = memberships.find((m) => m.tenant_id === tenantId);
    if (m?.tenant) {
      setActiveTenant(m.tenant);
      localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
    }
  }

  async function createTenantOnboarding(name: string, slug?: string) {
    if (!session?.user) return { tenant: null, error: 'Chua dang nhap' };
    const generatedSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')).slice(0, 32);

    try {
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name,
          slug: generatedSlug,
        })
        .select()
        .single();

      if (tenantError || !tenantData) {
        return { tenant: null, error: tenantError?.message ?? 'Khong the tao to chuc' };
      }

      const { error: membershipError } = await supabase
        .from('tenant_memberships')
        .insert({
          tenant_id: tenantData.id,
          user_id: session.user.id,
          role: 'owner',
          status: 'active',
        });

      if (membershipError) {
        return { tenant: null, error: membershipError.message };
      }

      await loadMemberships(session.user.id);
      setActiveTenant(tenantData as Tenant);
      localStorage.setItem(ACTIVE_TENANT_KEY, tenantData.id);
      return { tenant: tenantData as Tenant, error: null };
    } catch (err: unknown) {
      return { tenant: null, error: (err as Error).message || 'Loi tao to chuc' };
    }
  }

  const activeRole = memberships.find((m) => m.tenant_id === activeTenant?.id)?.role ?? null;

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        memberships,
        activeTenant,
        activeRole,
        signIn,
        signUp,
        signOut,
        resetPasswordForEmail,
        updatePassword,
        switchTenant,
        createTenantOnboarding,
        reloadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useRole(): {
  role: UserRole | null;
  tenantRole: TenantRole | null;
  isAdmin: boolean;
  isManager: boolean;
  isWarehouse: boolean;
  canDelete: boolean;
  canManageFinance: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
} {
  const { profile, activeRole } = useAuth();
  const role = profile?.role ?? null;
  const tenantRole = activeRole;
  const isAdmin = tenantRole === 'owner' || tenantRole === 'admin';
  const isManager = tenantRole === 'manager' || isAdmin;
  const isWarehouse = tenantRole === 'warehouse';
  return {
    role,
    tenantRole,
    isAdmin,
    isManager,
    isWarehouse,
    canDelete: tenantRole === 'owner',
    canManageFinance: isManager,
    canManageSettings: isAdmin,
    canManageUsers: isAdmin,
  };
}
