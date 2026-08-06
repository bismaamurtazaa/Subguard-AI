import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
  mockSubscriptions,
  mockRecommendations,
  mockAlerts,
  mockOverlapGroups,
  mockUsageSignals,
  getOverlapMembersForGroup,
} from '../data/mock-data';
import type { Subscription, Recommendation, RenewalAlert, OverlapGroup } from '../lib/database.types';

/* ──────────── Helpers ──────────── */

function useUserId(): string | null {
  const { user } = useAuth();
  return user?.id ?? null;
}

function useIsAuthenticated(): boolean {
  const { user } = useAuth();
  return !!user;
}

/* ──────────── Subscriptions ──────────── */

export function useSubscriptions() {
  const userId = useUserId();
  const isAuth = useIsAuthenticated();

  const { data: dbSubs } = useQuery({
    queryKey: ['subscriptions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      return ((data as unknown) as Subscription[]) ?? [];
    },
    enabled: isAuth,
    staleTime: 1000 * 60 * 2,
  });

  return useMemo(
    () => (isAuth && dbSubs ? dbSubs : mockSubscriptions),
    [isAuth, dbSubs],
  );
}

export function useSubscription(id: string | undefined): Subscription | null {
  const userId = useUserId();
  const isAuth = useIsAuthenticated();

  const { data: dbSub } = useQuery({
    queryKey: ['subscription', userId, id],
    queryFn: async () => {
      if (!userId || !id) return null;
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      return (data as unknown as Subscription | null) ?? null;
    },
    enabled: isAuth && !!id,
    staleTime: 1000 * 60 * 2,
  });

  return useMemo(() => {
    if (isAuth && dbSub) return dbSub;
    if (!isAuth && id) return mockSubscriptions.find((s) => s.id === id) ?? null;
    return null;
  }, [isAuth, dbSub, id]);
}

/* ──────────── Recommendations ──────────── */

export function useRecommendations(): Recommendation[] {
  const userId = useUserId();
  const isAuth = useIsAuthenticated();

  const { data: dbRecs } = useQuery({
    queryKey: ['recommendations', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from('recommendations')
        .select('*')
        .eq('user_id', userId)
        .order('rank', { ascending: true });
      return (((data as unknown) as Recommendation[]) ?? []).filter((r) => !r.is_dismissed);
    },
    enabled: isAuth,
    staleTime: 1000 * 60 * 2,
  });

  return useMemo(
    () =>
      isAuth && dbRecs
        ? dbRecs
        : [...mockRecommendations]
            .filter((r) => !r.is_dismissed)
            .sort((a, b) => a.rank - b.rank),
    [isAuth, dbRecs],
  );
}

/* ──────────── Alerts ──────────── */

export function useAlerts(): RenewalAlert[] {
  const userId = useUserId();
  const isAuth = useIsAuthenticated();

  const { data: dbAlerts } = useQuery({
    queryKey: ['alerts', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from('renewal_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      return ((data as unknown) as RenewalAlert[]) ?? [];
    },
    enabled: isAuth,
    staleTime: 1000 * 60,
  });

  return useMemo(
    () =>
      isAuth && dbAlerts
        ? dbAlerts
        : [...mockAlerts].sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          ),
    [isAuth, dbAlerts],
  );
}

export function useUnreadAlertCount(): number {
  const alerts = useAlerts();
  return useMemo(() => alerts.filter((a) => !a.is_read).length, [alerts]);
}

/* ──────────── Overlaps ──────────── */

export function useOverlapGroups(): (OverlapGroup & { subscriptions: Subscription[] })[] {
  const userId = useUserId();
  const isAuth = useIsAuthenticated();

  const { data: dbGroups } = useQuery({
    queryKey: ['overlap-groups', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data: groups } = await supabase
        .from('overlap_groups')
        .select('*')
        .eq('user_id', userId);
      if (!groups) return [];

      const result: (OverlapGroup & { subscriptions: Subscription[] })[] = [];
      for (const group of (groups as unknown) as OverlapGroup[]) {
        const { data: members } = await supabase
          .from('overlap_members')
          .select('subscription_id')
          .eq('overlap_group_id', group.id);
        const subIds = (members as unknown as { subscription_id: string }[])?.map((m) => m.subscription_id) ?? [];
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('*')
          .in('id', subIds);
        result.push({ ...group, subscriptions: ((subs as unknown) as Subscription[]) ?? [] });
      }
      return result;
    },
    enabled: isAuth,
    staleTime: 1000 * 60 * 5,
  });

  return useMemo(
    () =>
      isAuth && dbGroups
        ? dbGroups
        : mockOverlapGroups.map((g) => ({
            ...g,
            subscriptions: getOverlapMembersForGroup(g.id),
          })),
    [isAuth, dbGroups],
  );
}

export function useSubscriptionOverlaps(
  subscriptionId: string,
): (OverlapGroup & { subscriptions: Subscription[] })[] {
  const groups = useOverlapGroups();

  return useMemo(
    () => groups.filter((g) => g.subscriptions.some((s) => s.id === subscriptionId)),
    [groups, subscriptionId],
  );
}

/* ──────────── Usage Signals ──────────── */

export function useUsageSignals(subscriptionId: string) {
  const userId = useUserId();
  const isAuth = useIsAuthenticated();

  const { data: dbSignals } = useQuery({
    queryKey: ['usage-signals', userId, subscriptionId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from('usage_signals')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('signal_date', { ascending: false });
      return data ?? [];
    },
    enabled: isAuth && !!subscriptionId,
    staleTime: 1000 * 60 * 5,
  });

  return useMemo(
    () =>
      isAuth && dbSignals
        ? dbSignals
        : mockUsageSignals
            .filter((s) => s.subscription_id === subscriptionId)
            .sort((a, b) => {
              const da = a.signal_date ? new Date(a.signal_date).getTime() : 0;
              const db = b.signal_date ? new Date(b.signal_date).getTime() : 0;
              return db - da;
            }),
    [isAuth, dbSignals, subscriptionId],
  );
}

/* ──────────── Dashboard Stats ──────────── */

export function useDashboardStats() {
  const subs = useSubscriptions();
  const alerts = useAlerts();
  const recs = useRecommendations();

  return useMemo(() => {
    const active = subs.filter((s) => s.status === 'active');
    const totalMonthly = active
      .filter((s) => s.billing_cycle === 'monthly')
      .reduce((sum, s) => sum + s.price, 0);
    const yearlySubs = active.filter((s) => s.billing_cycle === 'yearly');
    const totalYearlyAvg = totalMonthly * 12 + yearlySubs.reduce((sum, s) => sum + s.price, 0);
    const monthlyAvg = Math.round(totalYearlyAvg / 12);

    const urgentAlerts = alerts.filter((a) => !a.is_read && a.urgency === 'high').length;
    const totalSavingsPossible = recs
      .filter((r) => !r.is_dismissed)
      .reduce((sum, r) => sum + r.potential_savings_monthly, 0);

    return {
      activeCount: active.length,
      totalCount: subs.length,
      monthlyAvg,
      urgentAlerts,
      totalSavingsPossible,
      categories: [...new Set(subs.map((s) => s.category))],
    };
  }, [subs, alerts, recs]);
}

/* ──────────── Gmail Scan ──────────── */

export function useScanGmail() {
  const { providerToken, user } = useAuth();
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    emailsFound?: number;
    subscriptionsFound?: number;
  } | null>(null);

  const scan = useCallback(async () => {
    if (!providerToken || !user) {
      setScanResult({ success: false, message: 'Please sign in and connect Gmail first.' });
      return;
    }

    setScanning(true);
    setScanResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://ebgjdxnuxojjxqjmtbqq.supabase.co'}/functions/v1/scan-gmail`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ providerToken }),
        },
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Scan failed');
      }

      setScanResult({
        success: true,
        message: result.subscriptionsFound > 0
          ? `Found ${result.emailsFound} emails, detected ${result.subscriptionsFound} subscriptions!`
          : result.message || 'Scan complete. No new subscriptions detected.',
        emailsFound: result.emailsFound,
        subscriptionsFound: result.subscriptionsFound,
      });

      // Refresh all data
      await queryClient.invalidateQueries({ queryKey: ['subscriptions', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['recommendations', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['alerts', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['overlap-groups', user.id] });
    } catch (err) {
      setScanResult({
        success: false,
        message: err instanceof Error ? err.message : 'Scan failed. Please try again.',
      });
    } finally {
      setScanning(false);
    }
  }, [providerToken, user, queryClient]);

  return { scan, scanning, scanResult, clearResult: () => setScanResult(null) };
}

/* ──────────── Mutations (Supabase) ──────────── */

export function useDismissRecommendation() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const isAuth = useIsAuthenticated();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isAuth && userId) {
        await supabase.from('recommendations').update({ is_dismissed: true } as never).eq('id', id);
      } else {
        const rec = mockRecommendations.find((r) => r.id === id);
        if (rec) rec.is_dismissed = true;
      }
    },
    onSuccess: () => {
      if (isAuth) queryClient.invalidateQueries({ queryKey: ['recommendations', userId] });
    },
  });
}

export function useMarkAlertRead() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const isAuth = useIsAuthenticated();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isAuth && userId) {
        await supabase.from('renewal_alerts').update({ is_read: true } as never).eq('id', id);
      } else {
        const alert = mockAlerts.find((a) => a.id === id);
        if (alert) alert.is_read = true;
      }
    },
    onSuccess: () => {
      if (isAuth) queryClient.invalidateQueries({ queryKey: ['alerts', userId] });
    },
  });
}

export function useCancelSubscription() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const isAuth = useIsAuthenticated();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isAuth && userId) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            usage_score: 0,
            usage_label: 'rarely',
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', id);
      } else {
        const sub = mockSubscriptions.find((s) => s.id === id);
        if (sub) {
          sub.status = 'canceled';
          sub.usage_score = 0;
          sub.usage_label = 'rarely';
        }
      }
    },
    onSuccess: () => {
      if (isAuth) {
        queryClient.invalidateQueries({ queryKey: ['subscriptions', userId] });
      }
    },
  });
}

/* ──────────── Wrappers for backward compat ──────────── */

export function dismissRecommendation(id: string): void {
  const rec = mockRecommendations.find((r) => r.id === id);
  if (rec) rec.is_dismissed = true;
}

export function markAlertRead(id: string): void {
  const alert = mockAlerts.find((a) => a.id === id);
  if (alert) alert.is_read = true;
}

export function cancelSubscription(id: string): void {
  const sub = mockSubscriptions.find((s) => s.id === id);
  if (sub) {
    sub.status = 'canceled';
    sub.usage_score = 0;
    sub.usage_label = 'rarely';
  }
}

/* ──────────── Filters & Sorts ──────────── */

export type UsageFilter = 'all' | 'frequent' | 'moderate' | 'occasional' | 'rarely';
export type SortField = 'price' | 'next_billing_date' | 'service_name';
export type SortDir = 'asc' | 'desc';

export function filterSubscriptions(
  subs: Subscription[],
  search: string,
  usageFilter: UsageFilter,
  sortField: SortField,
  sortDir: SortDir,
): Subscription[] {
  let filtered = subs;

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((s) => s.service_name.toLowerCase().includes(q));
  }

  if (usageFilter !== 'all') {
    filtered = filtered.filter((s) => s.usage_label === usageFilter);
  }

  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortField === 'price') {
      cmp = a.price - b.price;
    } else if (sortField === 'next_billing_date') {
      const da = a.next_billing_date ?? '9999-12-31';
      const db = b.next_billing_date ?? '9999-12-31';
      cmp = da.localeCompare(db);
    } else {
      cmp = a.service_name.localeCompare(b.service_name);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return filtered;
}