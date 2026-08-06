import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CreditCard,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Sparkles,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  useDashboardStats,
  useSubscriptions,
  useRecommendations,
  useAlerts,
} from '../hooks/use-subscriptions';

const COLORS = ['#0EA5E9', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

/* ────── Stat Card ────── */
function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-foreground/60">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent.replace('text-', '').replace('...', '')}10` }}
        >
          <Icon className={`h-5 w-5 ${accent}`} />
        </div>
      </div>
    </motion.div>
  );
}

/* ────── Category Pie ────── */
function CategoryChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Spend by Category</h3>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="55%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={44}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                fontSize: 13,
              }}
              formatter={(value) => `PKR ${Number(value).toLocaleString()}`}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2">
          {data.map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="flex-1 text-foreground/70">{entry.name}</span>
              <span className="font-medium text-foreground">
                PKR {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────── Upcoming Renewals ────── */
function UpcomingRenewals() {
  const subs = useSubscriptions();
  const navigate = useNavigate();
  const upcoming = subs
    .filter((s) => s.status === 'active' && s.next_billing_date)
    .sort(
      (a, b) =>
        new Date(a.next_billing_date!).getTime() -
        new Date(b.next_billing_date!).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Upcoming Renewals</h3>
        <button
          onClick={() => navigate('/subscriptions')}
          className="cursor-pointer text-xs font-medium text-primary transition-colors duration-150 hover:text-primary/80"
        >
          View all
        </button>
      </div>
      {upcoming.length === 0 ? (
        <p className="py-6 text-center text-sm text-foreground/40">No upcoming renewals</p>
      ) : (
        <div className="space-y-3">
          {upcoming.map((sub) => {
            const daysLeft = sub.next_billing_date
              ? Math.ceil(
                  (new Date(sub.next_billing_date).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24),
                )
              : 0;
            return (
              <button
                key={sub.id}
                onClick={() => navigate(`/subscriptions/${sub.id}`)}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <CalendarClock className="h-4 w-4 text-foreground/40" />
                  <span className="text-sm font-medium text-foreground">{sub.service_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground/60">
                    PKR {sub.price.toLocaleString()}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      daysLeft <= 3
                        ? 'bg-red-50 text-red-600'
                        : daysLeft <= 7
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {daysLeft <= 0 ? 'Today' : `${daysLeft}d`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ────── Top Recommendations ────── */
function TopRecommendations() {
  const recs = useRecommendations();
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Top Recommendations</h3>
        <button
          onClick={() => navigate('/recommendations')}
          className="cursor-pointer text-xs font-medium text-primary transition-colors duration-150 hover:text-primary/80"
        >
          View all
        </button>
      </div>
      {recs.length === 0 ? (
        <p className="py-6 text-center text-sm text-foreground/40">No recommendations yet</p>
      ) : (
        <div className="space-y-3">
          {recs.slice(0, 3).map((rec) => (
            <div
              key={rec.id}
              className="rounded-lg border border-border p-3 transition-colors duration-150 hover:bg-muted"
            >
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{rec.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-foreground/60">
                    {rec.description}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-green-600">
                  -PKR {rec.potential_savings_monthly.toLocaleString()}/mo
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────── Recent Alerts ────── */
function RecentAlerts() {
  const alerts = useAlerts();
  const navigate = useNavigate();
  const recent = alerts.slice(0, 3);

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent Alerts</h3>
        <button
          onClick={() => navigate('/alerts')}
          className="cursor-pointer text-xs font-medium text-primary transition-colors duration-150 hover:text-primary/80"
        >
          View all
        </button>
      </div>
      {recent.length === 0 ? (
        <p className="py-6 text-center text-sm text-foreground/40">No alerts</p>
      ) : (
        <div className="space-y-3">
          {recent.map((alert) => (
            <div key={alert.id} className="flex items-start gap-3">
              <div
                className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                  alert.urgency === 'high'
                    ? 'bg-destructive'
                    : alert.urgency === 'medium'
                      ? 'bg-accent'
                      : 'bg-primary'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{alert.title}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-foreground/50">{alert.message}</p>
              </div>
              {!alert.is_read && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────── Dashboard Page ────── */
export default function Dashboard() {
  const stats = useDashboardStats();
  const subs = useSubscriptions();

  // Build category data for pie chart
  const categoryMap = new Map<string, number>();
  subs
    .filter((s) => s.status === 'active')
    .forEach((s) => {
      const cat = s.category.charAt(0).toUpperCase() + s.category.slice(1);
      const monthly =
        s.billing_cycle === 'yearly' ? s.price / 12 : s.price;
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + monthly);
    });
  const pieData = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Your subscription overview at a glance
        </p>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
          <StatCard
            label="Active Subscriptions"
            value={stats.activeCount.toString()}
            icon={CreditCard}
            accent="text-primary"
          />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
          <StatCard
            label="Monthly Spend"
            value={`PKR ${stats.monthlyAvg.toLocaleString()}`}
            icon={TrendingDown}
            accent="text-destructive"
          />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
          <StatCard
            label="Potential Savings"
            value={`PKR ${stats.totalSavingsPossible.toLocaleString()}/mo`}
            icon={AlertTriangle}
            accent="text-green-600"
          />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
          <StatCard
            label="Urgent Alerts"
            value={stats.urgentAlerts.toString()}
            icon={ArrowRight}
            accent="text-accent"
          />
        </motion.div>
      </motion.div>

      {/* Charts & widgets grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryChart data={pieData} />
        <UpcomingRenewals />
        <TopRecommendations />
        <RecentAlerts />
      </div>
    </div>
  );
}