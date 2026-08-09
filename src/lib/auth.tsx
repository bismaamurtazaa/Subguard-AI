import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  providerToken: string | null;
  gmailConnected: boolean;
  gmailEmail: string | null;
  lastScanAt: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  providerToken: null,
  gmailConnected: false,
  gmailEmail: null,
  lastScanAt: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshSession: async () => {},
});

/**
 * After a successful Google OAuth, store the Gmail connection details
 * so that fetchGmailStatus() finds a row in user_gmail_tokens.
 * Also ensures a profile row exists (FK requirement).
 */
async function storeGmailConnection(session: Session) {
  const userId = session.user.id;
  const gmailEmail = session.user.email ?? null;
  const providerRefreshToken = session.provider_refresh_token ?? null;

  console.log('[storeGmailConnection] Saving Gmail connection:', {
    userId,
    gmailEmail,
    hasProviderRefreshToken: !!providerRefreshToken,
  });

  // Ensure a profile row exists (FK constraint for user_gmail_tokens)
  const profileResult = await supabase.from('profiles').upsert({
    id: userId,
    display_name: session.user.user_metadata?.full_name ?? null,
    avatar_url: session.user.user_metadata?.avatar_url ?? null,
  }, { onConflict: 'id' });

  if (profileResult.error) {
    console.error('[storeGmailConnection] Profile upsert failed:', profileResult.error);
  }

  // Store the Gmail connection
  const tokenResult = await supabase.from('user_gmail_tokens').upsert({
    user_id: userId,
    gmail_email: gmailEmail,
    provider_refresh_token: providerRefreshToken,
  }, { onConflict: 'user_id' });

  if (tokenResult.error) {
    console.error('[storeGmailConnection] Gmail token upsert failed:', tokenResult.error);
  } else {
    console.log('[storeGmailConnection] Gmail connection saved successfully');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [providerToken, setProviderToken] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [lastScanAt, setLastScanAt] = useState<string | null>(null);

  const fetchGmailStatus = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('user_gmail_tokens')
      .select('gmail_email, last_scan_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setGmailConnected(true);
      setGmailEmail((data as unknown as { gmail_email: string | null }).gmail_email);
      setLastScanAt((data as unknown as { last_scan_at: string | null }).last_scan_at);
    } else {
      setGmailConnected(false);
      setGmailEmail(null);
      setLastScanAt(null);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      setProviderToken(session.provider_token ?? null);
      await fetchGmailStatus(session.user.id);
    }
  }, [fetchGmailStatus]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setProviderToken(session.provider_token ?? null);
        // If this is a Google OAuth session with a provider token, ensure tokens are stored
        if (session.provider_token) {
          storeGmailConnection(session).then(() => {
            fetchGmailStatus(session.user.id);
          });
        } else {
          fetchGmailStatus(session.user.id);
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setUser(session.user);
          setProviderToken(session.provider_token ?? null);
          // When signing in via Google OAuth, store the Gmail connection
          // so gmailConnected becomes true immediately
          if (session.provider_token) {
            storeGmailConnection(session).then(() => {
              fetchGmailStatus(session.user.id);
            });
          } else {
            fetchGmailStatus(session.user.id);
          }
        } else {
          setUser(null);
          setProviderToken(null);
          setGmailConnected(false);
          setGmailEmail(null);
          setLastScanAt(null);
        }
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, [fetchGmailStatus]);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: 'https://www.googleapis.com/auth/gmail.readonly',
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        providerToken,
        gmailConnected,
        gmailEmail,
        lastScanAt,
        signInWithGoogle,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}