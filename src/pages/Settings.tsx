import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  DollarSign,
  User,
  Shield,
  LogOut,
  Check,
  LoaderCircle,
  RefreshCw,
  Plug,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useScanGmail } from '../hooks/use-subscriptions';

export default function SettingsPage() {
  const {
    user,
    loading: authLoading,
    gmailConnected,
    gmailEmail,
    lastScanAt,
    signInWithGoogle,
    signOut,
  } = useAuth();

  const { scan, scanning, scanResult, clearResult } = useScanGmail();

  const [currency, setCurrency] = useState('PKR');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveCurrency = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 600);
  };

  const handleScan = async () => {
    clearResult();
    await scan();
  };

  const displayName = user?.user_metadata?.full_name ?? 'Demo User';
  const email = user?.email ?? 'demo@subguard.ai';
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const lastScanDisplay = lastScanAt
    ? new Date(lastScanAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Manage your account, connected services, and preferences
        </p>
      </motion.div>

      <div className="space-y-6">
        {/* Profile section */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-solid p-6"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <User className="h-4 w-4 text-primary" />
            Profile
          </h2>
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {initials}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              <p className="text-xs text-foreground/50">{email}</p>
            </div>
          </div>
        </motion.section>

        {/* Connected accounts - Gmail */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card-solid p-6"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Mail className="h-4 w-4 text-primary" />
            Connected Accounts
          </h2>

          <div className="rounded-xl border border-white/20 bg-white/20 backdrop-blur-md p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 backdrop-blur-md border border-blue-500/20 text-blue-600">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Gmail</p>
                  {gmailConnected && gmailEmail ? (
                    <p className="text-xs text-foreground/40">
                      Read-only &middot; {gmailEmail}
                    </p>
                  ) : (
                    <p className="text-xs text-foreground/40">
                      Detect subscriptions from your inbox
                    </p>
                  )}
                </div>
              </div>

              {gmailConnected ? (
                <span className="rounded-full bg-green-500/10 backdrop-blur-md border border-green-500/20 px-3 py-1 text-[11px] font-semibold text-green-700">
                  Connected
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/10 backdrop-blur-md border border-amber-500/20 px-3 py-1 text-[11px] font-semibold text-amber-700">
                  Not connected
                </span>
              )}
            </div>

            {/* Scan Now / Connect section */}
            <div className="mt-3 border-t border-white/20 pt-3">
              {authLoading ? (
                <div className="flex items-center justify-center py-2">
                  <LoaderCircle className="h-4 w-4 animate-spin text-foreground/40" />
                </div>
              ) : !user ? (
                /* Not signed in — show sign in CTA */
                <div className="space-y-3">
                  <p className="text-xs text-foreground/50">
                    Sign in with Google to connect your Gmail and automatically detect your
                    subscriptions.
                  </p>
                  <button
                    onClick={signInWithGoogle}
                    className="flex cursor-pointer items-center gap-2 glass-btn-primary rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.97]"
                  >
                    <Plug className="h-4 w-4" />
                    Sign in with Google
                  </button>
                </div>
              ) : !gmailConnected ? (
                /* Signed in but Gmail not connected */
                <div className="space-y-3">
                  <p className="text-xs text-foreground/50">
                    Connect your Gmail account to scan for subscription emails. We use read-only
                    access — your emails are never stored or shared.
                  </p>
                  <button
                    onClick={signInWithGoogle}
                    className="flex cursor-pointer items-center gap-2 glass-btn-primary rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.97]"
                  >
                    <Plug className="h-4 w-4" />
                    Connect Gmail
                  </button>
                </div>
              ) : (
                /* Connected — show scan button and status */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-foreground/50">
                    <span>
                      Last scan:{' '}
                      {lastScanDisplay ? (
                        lastScanDisplay
                      ) : (
                        <span className="italic">Not yet scanned</span>
                      )}
                    </span>
                    <button className="cursor-pointer font-medium text-primary transition-colors duration-150 hover:text-primary/80">
                      Reconnect
                    </button>
                  </div>

                  <button
                    onClick={handleScan}
                    disabled={scanning}
                    className="flex cursor-pointer items-center gap-2 glass-btn-primary rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {scanning ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {scanning ? 'Scanning…' : 'Scan Now'}
                  </button>

                  {/* Scan result */}
                  {scanResult && (
                    <div
                      className={`rounded-xl px-3 py-2 text-xs backdrop-blur-md border ${
                        scanResult.success
                          ? 'bg-green-500/10 border-green-500/20 text-green-700'
                          : 'bg-red-500/10 border-red-500/20 text-red-700'
                      }`}
                    >
                      {scanResult.success ? (
                        <div className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 shrink-0" />
                          <span>{scanResult.message}</span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{scanResult.message}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sign out */}
                  <button
                    onClick={signOut}
                    className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground/40 transition-colors duration-150 hover:text-foreground/70"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="mt-3 text-xs text-foreground/40">
            SubGuard uses read-only Gmail access to detect subscription emails. Your emails are
            never stored or shared.
          </p>
        </motion.section>

        {/* Currency preference */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card-solid p-6"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <DollarSign className="h-4 w-4 text-primary" />
            Currency Preference
          </h2>
          <div className="flex items-center gap-3">
            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setSaved(false);
              }}
              className="glass-input rounded-xl px-3 py-2.5 text-sm text-foreground"
            >
              <option value="PKR">PKR — Pakistani Rupee</option>
              <option value="USD">USD — US Dollar</option>
              <option value="INR">INR — Indian Rupee</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="EUR">EUR — Euro</option>
            </select>
            <button
              onClick={handleSaveCurrency}
              disabled={saving}
              className="flex cursor-pointer items-center gap-2 glass-btn-primary rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : null}
              {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </motion.section>

        {/* Security */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card-solid p-6"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Shield className="h-4 w-4 text-primary" />
            Security & Data
          </h2>
          <div className="space-y-3 text-sm text-foreground/60">
            <div className="flex items-center justify-between">
              <span>Data retention</span>
              <span className="text-foreground/40">30 days after account deletion</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Encryption</span>
              <span className="text-foreground/40">AES-256 at rest</span>
            </div>
            <div className="flex items-center justify-between">
              <span>OAuth scopes</span>
              <span className="text-foreground/40">Read-only Gmail</span>
            </div>
          </div>
        </motion.section>

        {/* Danger zone */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-destructive/30 bg-destructive/5 backdrop-blur-md p-6"
        >
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
            <LogOut className="h-4 w-4" />
            Danger Zone
          </h2>
          <p className="mb-4 text-xs text-foreground/50">
            These actions are irreversible. Proceed with caution.
          </p>
          <button className="glass-btn-danger cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.97]">
            Delete Account
          </button>
        </motion.section>
      </div>
    </div>
  );
}