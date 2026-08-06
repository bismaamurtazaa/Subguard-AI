import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ExternalLink,
  X,
  TrendingDown,
  Search,
  Ban,
} from 'lucide-react';
import {
  useRecommendations,
  useDismissRecommendation,
  useCancelSubscription,
} from '../hooks/use-subscriptions';
import type { Recommendation } from '../lib/database.types';

const urgencyLabels: Record<string, string> = {
  high: 'Urgent',
  medium: 'Review',
  low: 'Consider',
};

const typeIcons: Record<string, React.ElementType> = {
  cancel: Ban,
  downgrade: TrendingDown,
  investigate: Search,
};

export default function Recommendations() {
  const navigate = useNavigate();
  const recs = useRecommendations();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const dismissMutation = useDismissRecommendation();
  const cancelMutation = useCancelSubscription();

  const visible = recs.filter((r) => !dismissed.has(r.id));

  const handleDismiss = (id: string) => {
    dismissMutation.mutate(id);
    setDismissed((prev) => new Set(prev).add(id));
  };

  const handleCancel = (rec: Recommendation) => {
    if (rec.subscription_id) {
      const confirmed = window.confirm(
        `Mark "${rec.title}" as canceled?`,
      );
      if (confirmed) {
        cancelMutation.mutate(rec.subscription_id);
        handleDismiss(rec.id);
      }
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Recommendations</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Ranked suggestions to save money and optimize your subscriptions
        </p>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6 grid grid-cols-3 gap-4 glass-card p-4"
      >
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{visible.length}</p>
          <p className="text-xs text-foreground/50">Suggestions</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            PKR {visible.reduce((s, r) => s + r.potential_savings_monthly, 0).toLocaleString()}
          </p>
          <p className="text-xs text-foreground/50">Potential savings / mo</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-600">
            PKR {visible.reduce((s, r) => s + r.potential_savings_yearly, 0).toLocaleString()}
          </p>
          <p className="text-xs text-foreground/50">Potential savings / yr</p>
        </div>
      </motion.div>

      {/* Recommendations list */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center glass-card py-20">
          <Sparkles className="mb-3 h-10 w-10 text-primary/30" />
          <p className="text-sm font-medium text-foreground/60">All caught up!</p>
          <p className="mt-1 text-xs text-foreground/40">
            Dismissed recommendations won't show here
          </p>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          className="space-y-4"
        >
          {visible.map((rec) => {
            const Icon = typeIcons[rec.recommendation_type] ?? Sparkles;
            return (
              <motion.div
                key={rec.id}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                className={`glass-card overflow-hidden transition-all duration-200 hover:-translate-y-0.5 ${
                  rec.urgency === 'high' ? 'ring-1 ring-destructive/30' : ''
                }`}
              >
                {/* Urgency header bar */}
                <div className="flex items-center justify-between rounded-t-xl bg-white/20 backdrop-blur-md px-5 py-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                        rec.urgency === 'high'
                          ? 'bg-red-100 text-red-700'
                          : rec.urgency === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {urgencyLabels[rec.urgency]}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                        rec.recommendation_type === 'cancel'
                          ? 'bg-red-100 text-red-700'
                          : rec.recommendation_type === 'downgrade'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {rec.recommendation_type}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDismiss(rec.id)}
                    className="cursor-pointer rounded-lg p-1.5 text-foreground/30 glass-btn transition-all duration-150 hover:text-foreground/60"
                    aria-label="Dismiss recommendation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 backdrop-blur-md border border-primary/20">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-foreground">{rec.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-foreground/60">
                        {rec.description}
                      </p>

                      {/* Savings */}
                      <div className="mt-4 flex flex-wrap gap-4">
                        <div className="rounded-xl bg-green-500/10 backdrop-blur-md border border-green-500/20 px-3 py-2">
                          <p className="text-xs text-green-600/70">Save monthly</p>
                          <p className="text-lg font-bold text-green-700">
                            PKR {rec.potential_savings_monthly.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-xl bg-blue-500/10 backdrop-blur-md border border-blue-500/20 px-3 py-2">
                          <p className="text-xs text-blue-600/70">Save yearly</p>
                          <p className="text-lg font-bold text-blue-700">
                            PKR {rec.potential_savings_yearly.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="mt-4 flex flex-wrap gap-3">
                        {rec.subscription_id && (
                          <button
                            onClick={() => navigate(`/subscriptions/${rec.subscription_id}`)}
                            className="glass-btn cursor-pointer rounded-xl px-4 py-2 text-sm font-medium text-foreground/70"
                          >
                            View subscription
                          </button>
                        )}
                        {rec.recommendation_type === 'cancel' && rec.subscription_id && (
                          <button
                            onClick={() => handleCancel(rec)}
                            className="glass-btn-danger cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.97]"
                          >
                            <Ban className="mr-1.5 inline h-4 w-4" />
                            Mark as Canceled
                          </button>
                        )}
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(rec.title.replace(/cancel|downgrade|investigate/i, '').trim())}+cancel+subscription`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="glass-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-foreground/70"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Find cancel link
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}