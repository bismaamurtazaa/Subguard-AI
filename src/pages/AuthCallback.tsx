import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LoaderCircle } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Completing sign in…');

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      const { data: initData, error: sessionError } = await supabase.auth.getSession();
      
      if (cancelled) return;

      if (sessionError) {
        console.error('[AuthCallback] getSession error:', sessionError);
        setError(sessionError.message);
        return;
      }

      let session = initData.session;

      if (!session) {
        // Maybe the PKCE exchange hasn't completed yet — try waiting
        console.warn('[AuthCallback] No session on first attempt, waiting…');
        setStatus('Processing authentication…');

        // Wait a moment and retry
        await new Promise(r => setTimeout(r, 1500));
        const retry = await supabase.auth.getSession();
        
        if (cancelled) return;

        if (retry.error || !retry.data.session) {
          console.error('[AuthCallback] Still no session after retry:', retry.error);
          setError('No session found. Please try signing in again.');
          return;
        }
        session = retry.data.session;
      }

      // 🔍 Log the full session to debug Gmail connection issues
      console.log('[AuthCallback] Session obtained:', {
        hasProviderToken: !!session.provider_token,
        hasProviderRefreshToken: !!session.provider_refresh_token,
        userId: session.user.id,
        email: session.user.email,
      });

      const userId = session.user.id;
      const gmailEmail = session.user.email ?? null;
      const providerRefreshToken = session.provider_refresh_token ?? null;

      // 1. Ensure a profile row exists (FK constraint for user_gmail_tokens)
      setStatus('Saving profile…');
      const profileResult = await supabase.from('profiles').upsert({
        id: userId,
        display_name: session.user.user_metadata?.full_name ?? null,
        avatar_url: session.user.user_metadata?.avatar_url ?? null,
      }, { onConflict: 'id' });

      if (profileResult.error) {
        console.error('[AuthCallback] Profile upsert failed:', profileResult.error);
        // Don't block — still try the Gmail token upsert
      } else {
        console.log('[AuthCallback] Profile upsert succeeded');
      }

      // 2. Store the Gmail connection details so gmailConnected shows as "Connected"
      setStatus('Saving Gmail connection…');
      const tokenResult = await supabase.from('user_gmail_tokens').upsert({
        user_id: userId,
        gmail_email: gmailEmail,
        provider_refresh_token: providerRefreshToken,
      }, { onConflict: 'user_id' });

      if (tokenResult.error) {
        console.error('[AuthCallback] Gmail token upsert failed:', tokenResult.error);
      } else {
        console.log('[AuthCallback] Gmail token upsert succeeded');
      }

      // 3. Navigate to dashboard
      if (!cancelled) {
        navigate('/', { replace: true });
      }
    };

    handleCallback();

    return () => { cancelled = true; };
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="rounded-xl border border-destructive/30 bg-red-50 p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-destructive">Authentication Error</p>
          <p className="mt-2 text-xs text-foreground/60">{error}</p>
          <button
            onClick={() => navigate('/settings')}
            className="mt-4 cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-all duration-150 hover:opacity-90"
          >
            Back to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-foreground/60">{status}</p>
      </div>
    </div>
  );
}