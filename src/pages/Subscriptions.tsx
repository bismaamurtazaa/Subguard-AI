import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  ArrowUpDown,
  CreditCard,
  CalendarClock,
  Circle,
} from 'lucide-react';
import {
  useSubscriptions,
  filterSubscriptions,
} from '../hooks/use-subscriptions';
import type { UsageFilter, SortField, SortDir } from '../hooks/use-subscriptions';

const usageTabs: { label: string; value: UsageFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Frequent', value: 'frequent' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Occasional', value: 'occasional' },
  { label: 'Rarely', value: 'rarely' },
];

export default function Subscriptions() {
  const navigate = useNavigate();
  const allSubs = useSubscriptions();

  const [search, setSearch] = useState('');
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all');
  const [sortField, setSortField] = useState<SortField>('next_billing_date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const filtered = useMemo(
    () => filterSubscriptions(allSubs, search, usageFilter, sortField, sortDir),
    [allSubs, search, usageFilter, sortField, sortDir],
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const usageColor = (label: string) => {
    switch (label) {
      case 'frequent':
        return 'text-green-600 bg-green-50';
      case 'moderate':
        return 'text-blue-600 bg-blue-50';
      case 'occasional':
        return 'text-amber-600 bg-amber-50';
      case 'rarely':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-foreground/60 bg-muted';
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700';
      case 'trial':
        return 'bg-blue-50 text-blue-700';
      case 'paused':
        return 'bg-amber-50 text-amber-700';
      case 'canceled':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-muted text-foreground/60';
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Subscriptions</h1>
        <p className="mt-1 text-sm text-foreground/60">
          {allSubs.length} total &middot; {allSubs.filter((s) => s.status === 'active').length} active
        </p>
      </motion.div>

      {/* Search & filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input
            type="text"
            placeholder="Search subscriptions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-white py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-foreground/40 transition-colors duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground/50">Sort:</span>
          <button
            onClick={() => toggleSort('price')}
            className={`flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-150 ${
              sortField === 'price'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-foreground/60 hover:bg-muted'
            }`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Price
          </button>
          <button
            onClick={() => toggleSort('next_billing_date')}
            className={`flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors duration-150 ${
              sortField === 'next_billing_date'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-foreground/60 hover:bg-muted'
            }`}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Renewal
          </button>
        </div>
      </div>

      {/* Usage filter tabs */}
      <div
        className="mb-6 flex flex-wrap gap-1.5"
        role="tablist"
        aria-label="Filter by usage"
      >
        {usageTabs.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={usageFilter === tab.value}
            onClick={() => setUsageFilter(tab.value)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-150 ${
              usageFilter === tab.value
                ? 'bg-primary text-on-primary'
                : 'bg-muted text-foreground/60 hover:bg-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="mb-4 text-xs text-foreground/40">
        Showing {filtered.length} of {allSubs.length} subscriptions
      </p>

      {/* Subscription grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <CreditCard className="mb-3 h-10 w-10 text-foreground/20" />
          <p className="text-sm text-foreground/40">No subscriptions match your filters</p>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((sub) => (
            <motion.div
              key={sub.id}
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              onClick={() => navigate(`/subscriptions/${sub.id}`)}
              className="cursor-pointer rounded-xl border border-border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              {/* Top row */}
              <div className="mb-3 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {sub.service_name}
                  </h3>
                  <p className="mt-0.5 text-xs text-foreground/50 capitalize">
                    {sub.category}
                  </p>
                </div>
                <span
                  className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadge(sub.status)}`}
                >
                  {sub.status}
                </span>
              </div>

              {/* Price */}
              <p className="mb-3 text-xl font-bold text-foreground">
                PKR {sub.price.toLocaleString()}
                <span className="ml-1 text-xs font-normal text-foreground/40">
                  /{sub.billing_cycle === 'yearly' ? 'yr' : 'mo'}
                </span>
              </p>

              {/* Bottom row */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${usageColor(sub.usage_label)}`}
                >
                  <Circle className="h-1.5 w-1.5 fill-current" />
                  {sub.usage_label === 'frequent'
                    ? 'Likely Active'
                    : sub.usage_label === 'rarely'
                      ? 'Possibly Unused'
                      : sub.usage_label.charAt(0).toUpperCase() + sub.usage_label.slice(1)}
                </span>
                {sub.next_billing_date && (
                  <span className="text-[11px] text-foreground/40">
                    Next: {new Date(sub.next_billing_date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// Export the helper so other pages can use it
export { usageTabs, filterSubscriptions as filterSubs };