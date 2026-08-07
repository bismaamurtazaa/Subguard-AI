import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LoaderCircle } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (!data.session) {
        setError('No session found. Please try signing in again.');
        return;
      }

      const session = data.session;
      const userId = session.user.id;
      const gmailEmail = session.user.email ?? null;
      const providerRefreshToken = session.provider_refresh_token ?? null;

      try {
        // 1. Ensure a profile row exists (FK constraint for user_gmail_tokens)
        await supabase.from('profiles').upsert({
          id: userId,
          display_name: session.user.user_metadata?.full_name ?? null,
          avatar_url: session.user.user_metadata?.avatar_url ?? null,
        }, { onConflict: 'id' });

        // 2. Store the Gmail connection details so gmailConnected shows as "Connected"
        await supabase.from('user_gmail_tokens').upsert({
          user_id: userId,
          gmail_email: gmailEmail,
          provider_refresh_token: providerRefreshToken,
        }, { onConflict: 'user_id' });

        // 3. Navigate to dashboard
        navigate('/', { replace: true });
      } catch (err) {
        console.error('Error storing Gmail tokens after OAuth:', err);
        // Even if storing fails, navigate so the user isn't stuck
        navigate('/', { replace: true });
      }
    };

    handleCallback();
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
        <p className="text-sm text-foreground/60">Completing sign in…</p>
      </div>
    </div>
  );
}