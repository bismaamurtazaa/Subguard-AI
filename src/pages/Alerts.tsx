import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, AlertTriangle, CalendarClock } from 'lucide-react';
import { useAlerts, useMarkAlertRead } from '../hooks/use-subscriptions';

export default function Alerts() {
  const navigate = useNavigate();
  const alerts = useAlerts();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const markReadMutation = useMarkAlertRead();

  const handleMarkRead = (id: string) => {
    markReadMutation.mutate(id);
    setReadIds((prev) => new Set(prev).add(id));
  };

  const markAllRead = () => {
    alerts.forEach((a) => {
      markReadMutation.mutate(a.id);
      setReadIds((prev) => new Set(prev).add(a.id));
    });
  };

  const urgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return AlertTriangle;
      case 'medium':
        return CalendarClock;
      default:
        return Bell;
    }
  };

  const urgencyBadge: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Alerts</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Renewal reminders and trial-end notifications
          </p>
        </div>
        {alerts.filter((a) => !readIds.has(a.id) && !a.is_read).length > 0 && (
          <button
            onClick={markAllRead}
            className="flex cursor-pointer items-center gap-1.5 glass-btn rounded-xl px-3 py-2 text-xs font-medium text-foreground/60"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </motion.div>

      {/* Alert count summary */}
      <div className="mb-6 flex gap-4">
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 backdrop-blur-md border border-red-500/20 px-3 py-2.5">
          <span className="text-xs font-medium text-red-600">
            {alerts.filter((a) => a.urgency === 'high' && !readIds.has(a.id) && !a.is_read).length}
          </span>
          <span className="text-xs text-red-500/70">Urgent</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 backdrop-blur-md border border-amber-500/20 px-3 py-2.5">
          <span className="text-xs font-medium text-amber-600">
            {alerts.filter((a) => a.urgency === 'medium' && !readIds.has(a.id) && !a.is_read).length}
          </span>
          <span className="text-xs text-amber-500/70">Medium</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-blue-500/10 backdrop-blur-md border border-blue-500/20 px-3 py-2.5">
          <span className="text-xs font-medium text-blue-600">
            {alerts.filter((a) => a.urgency === 'low' && !readIds.has(a.id) && !a.is_read).length}
          </span>
          <span className="text-xs text-blue-500/70">Low</span>
        </div>
      </div>

      {/* Alerts list */}
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center glass-card py-20">
          <Bell className="mb-3 h-10 w-10 text-foreground/20" />
          <p className="text-sm font-medium text-foreground/60">No alerts</p>
          <p className="mt-1 text-xs text-foreground/40">
            Renewal and trial-end notifications will appear here
          </p>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          className="space-y-3"
        >
          {alerts.map((alert) => {
            const isRead = readIds.has(alert.id) || alert.is_read;
            const urg = alert.urgency ?? 'low';
            const Icon = urgencyIcon(urg);
            return (
              <motion.div
                key={alert.id}
                variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
                className={`glass-card overflow-hidden transition-all duration-200 hover:-translate-y-0.5 ${
                  !isRead ? 'ring-1 ring-primary/20' : ''
                }`}
              >
                <div className="flex items-start gap-4 p-5">
                  {/* Urgency indicator */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl backdrop-blur-md border ${
                      urg === 'high'
                        ? 'bg-red-500/10 border-red-500/20 text-destructive'
                        : urg === 'medium'
                          ? 'bg-amber-500/10 border-amber-500/20 text-accent'
                          : 'bg-blue-500/10 border-blue-500/20 text-primary'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{alert.title}</h3>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${urgencyBadge[urg]}`}
                        >
                          {urg}
                        </span>
                      </div>
                      {!isRead && (
                        <button
                          onClick={() => handleMarkRead(alert.id)}
                          className="flex shrink-0 cursor-pointer items-center gap-1 glass-btn rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-foreground/50"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Mark read
                        </button>
                      )}
                    </div>

                    {alert.message && (
                      <p className="mt-1.5 text-sm text-foreground/60">{alert.message}</p>
                    )}

                    <div className="mt-3 flex items-center gap-3 text-xs text-foreground/40">
                      <span>{new Date(alert.created_at ?? Date.now()).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}</span>
                      <button
                        onClick={() => navigate(`/subscriptions/${alert.subscription_id}`)}
                        className="cursor-pointer font-medium text-primary transition-colors duration-150 hover:text-primary/80"
                      >
                        View subscription →
                      </button>
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