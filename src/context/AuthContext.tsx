import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Membership, Organization } from '@/lib/types';
import { can, type PermissionKey } from '@/lib/permissions';

interface AuthState {
  session: Session | null;
  loading: boolean;
  org: Organization | null;
  membership: Membership | null;
  perms: Set<string>;
  isSuperAdmin: boolean;
  selectOrg: (org: Organization) => Promise<void>;
  reloadPerms: () => Promise<void>;
  signOut: () => Promise<void>;
  has: (key: PermissionKey) => boolean;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [perms, setPerms] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) {
        setOrg(null);
        setMembership(null);
        setPerms(new Set());
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadPerms = useCallback(async (membershipId: string) => {
    const { data, error } = await supabase
      .from('member_permissions')
      .select('permission_key')
      .eq('membership_id', membershipId);
    if (error) {
      console.error('권한 로드 실패', error);
      setPerms(new Set());
      return;
    }
    setPerms(new Set((data ?? []).map((r) => r.permission_key as string)));
  }, []);

  const selectOrg = useCallback(
    async (next: Organization) => {
      if (!session?.user) return;
      setOrg(next);
      const { data: ms } = await supabase
        .from('memberships')
        .select('*')
        .eq('org_id', next.id)
        .eq('user_id', session.user.id)
        .single();
      setMembership(ms as Membership);
      if (ms) await loadPerms((ms as Membership).id);
    },
    [session, loadPerms]
  );

  const reloadPerms = useCallback(async () => {
    if (membership) await loadPerms(membership.id);
  }, [membership, loadPerms]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const isSuperAdmin = membership?.is_super_admin ?? false;

  const value: AuthState = {
    session,
    loading,
    org,
    membership,
    perms,
    isSuperAdmin,
    selectOrg,
    reloadPerms,
    signOut,
    has: (key) => can(perms, key, isSuperAdmin),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
