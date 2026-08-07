import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ExternalLink,
  Circle,
  Tag,
  Activity,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import {
  useSubscription,
  useUsageSignals,
  useSubscriptionOverlaps,
  useCancelSubscription,
} from '../hooks/use-subscriptions';

export default function SubscriptionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sub = useSubscription(id);
  const signals = useUsageSignals(id ?? '');
  const overlaps = useSubscriptionOverlaps(id ?? '');
  const cancelMutation = useCancelSubscription();

  if (!sub) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-lg text-foreground/40">Subscription not found</p>
        <button
          onClick={() => navigate('/subscriptions')}
          className="mt-4 cursor-pointer text-sm font-medium text-primary transition-colors duration-150 hover:text-primary/80"
        >
          ← Back to subscriptions
        </button>
      </div>
    );
  }

  const daysUntilRenewal = sub.next_billing_date
    ? Math.ceil(
        (new Date(sub.next_billing_date).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const handleCancel = () => {
    if (window.confirm(`Cancel ${sub.service_name}? This will mark it as canceled.`)) {
      cancelMutation.mutate(sub.id);
      navigate('/subscriptions');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <button
          onClick={() => navigate('/subscriptions')}
          className="glass-btn flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm text-foreground/60"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to subscriptions
        </button>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Service info */}
          <div className="glass-card-solid p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{sub.service_name}</h1>
                <p className="mt-1 text-sm capitalize text-foreground/50">
                  {sub.category} &middot; {sub.status}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md ${
                sub.usage_label === 'frequent'
                  ? 'text-green-700 bg-green-500/10 border-green-500/20'
                  : sub.usage_label === 'moderate'
                    ? 'text-blue-700 bg-blue-500/10 border-blue-500/20'
                    : sub.usage_label === 'occasional'
                      ? 'text-amber-700 bg-amber-500/10 border-amber-500/20'
                      : sub.usage_label === 'rarely'
                        ? 'text-red-700 bg-red-500/10 border-red-500/20'
                        : 'text-foreground/60 bg-white/20 border-white/20'
              }`}
              >
                <Circle className="h-2 w-2 fill-current" />
                {sub.usage_label === 'frequent'
                  ? 'Likely Active'
                  : sub.usage_label === 'rarely'
                    ? 'Possibly Unused'
                    : (sub.usage_label ?? 'moderate').charAt(0).toUpperCase() + (sub.usage_label ?? 'moderate').slice(1)}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <InfoTile label="Price" value={`PKR ${sub.price.toLocaleString()}`} />
              <InfoTile
                label="Billing"
                value={sub.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'}
              />
              <InfoTile
                label="Next Renewal"
                value={
                  sub.next_billing_date
                    ? new Date(sub.next_billing_date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'
                }
              />
              <InfoTile label="Usage Score" value={`${sub.usage_score}/100`} />
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-3">
              {sub.cancellation_link && sub.status !== 'canceled' && (
                <a
                  href={sub.cancellation_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-foreground/80"
                >
                  <ExternalLink className="h-4 w-4" />
                  Cancellation page
                </a>
              )}
              {!sub.cancellation_link && sub.status !== 'canceled' && (
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(sub.service_name)}+cancel+subscription`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-foreground/80"
                >
                  <ExternalLink className="h-4 w-4" />
                  Search cancel steps
                </a>
              )}
              {sub.status === 'active' && (
                <button
                  onClick={handleCancel}
                  className="glass-btn-danger cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.97]"
                >
                  Mark as Canceled
                </button>
              )}
            </div>
          </div>

          {/* Usage signals timeline */}
          <div className="glass-card-solid p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Activity className="h-4 w-4 text-primary" />
              Usage Signals
            </h2>
            {signals.length === 0 ? (
              <p className="py-4 text-sm text-foreground/40">No usage signals recorded yet</p>
            ) : (
              <div className="space-y-4">
                {signals.map((signal) => (
                  <div key={signal.id} className="relative flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary/40 backdrop-blur-md ring-1 ring-white/30" />
                      <div className="mt-1 h-full w-px bg-white/10" />
                    </div>
                    <div className="min-w-0 flex-1 pb-4">
                      <p className="text-sm font-medium text-foreground">
                        {signal.signal_summary ?? 'Activity recorded'}
                      </p>
                      {signal.signal_date && (
                        <p className="mt-0.5 text-xs text-foreground/40">
                          {new Date(signal.signal_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* Overlap groups */}
          <div className="glass-card-solid p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Layers className="h-4 w-4 text-primary" />
              Overlaps
            </h2>
            {overlaps.length === 0 ? (
              <p className="py-4 text-center text-xs text-foreground/40">No overlaps detected</p>
            ) : (
              <div className="space-y-3">
                {overlaps.map((group) => (
                  <div
                    key={group.id}
                    className="rounded-lg border border-amber-500/20 bg-amber-500/5 backdrop-blur-md p-3"
                  >
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {group.category}
                    </p>
                    {group.subscriptions.length > 1 && (
                      <div className="mt-2 space-y-1">
                        {group.subscriptions.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => navigate(`/subscriptions/${s.id}`)}
                            className="flex w-full cursor-pointer items-center justify-between rounded px-2 py-1 text-xs transition-colors duration-150 hover:bg-amber-500/10"
                          >
                            <span className={s.id === sub.id ? 'font-semibold text-foreground' : 'text-foreground/70'}>
                              {s.service_name}
                            </span>
                            <span className="text-foreground/50">
                              PKR {s.price.toLocaleString()}/mo
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick info */}
          <div className="glass-card-solid p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Tag className="h-4 w-4 text-primary" />
              Details
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-foreground/50">Currency</dt>
                <dd className="font-medium text-foreground">{sub.currency}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-foreground/50">Added</dt>
                <dd className="font-medium text-foreground">
                  {sub.is_manually_added ? 'Manually' : 'Auto-detected'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-foreground/50">Created</dt>
                <dd className="font-medium text-foreground">
                  {new Date(sub.created_at ?? Date.now()).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </dd>
              </div>
              {daysUntilRenewal !== null && (
                <div className="flex justify-between">
                  <dt className="text-foreground/50">Renewal in</dt>
                  <dd
                    className={`font-medium ${
                      daysUntilRenewal <= 3 ? 'text-destructive' : 'text-foreground'
                    }`}
                  >
                    {daysUntilRenewal <= 0 ? 'Today' : `${daysUntilRenewal} days`}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/20 backdrop-blur-md border border-white/20 p-3">
      <p className="text-xs text-foreground/50">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}