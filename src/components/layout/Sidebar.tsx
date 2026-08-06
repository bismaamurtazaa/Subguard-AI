import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Lightbulb,
  Bell,
  Settings,
} from 'lucide-react';
import { useUnreadAlertCount } from '../../hooks/use-subscriptions';
import { useAuth } from '../../lib/auth';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/recommendations', label: 'Recommendations', icon: Lightbulb },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const unreadAlerts = useUnreadAlertCount();
  const { user } = useAuth();

  const displayName = user?.user_metadata?.full_name ?? 'SubGuard';
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border bg-white"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-8 w-8 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-on-primary">
            {user ? initials : 'S'}
          </div>
        )}
        <span className="text-lg font-bold tracking-tight text-foreground">
          SubGuard
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground/70 hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span>{label}</span>
            {label === 'Alerts' && unreadAlerts > 0 && (
              <span
                className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white"
                aria-label={`${unreadAlerts} unread alerts`}
              >
                {unreadAlerts}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-6 py-4">
        <p className="text-xs text-foreground/50">SubGuard AI &middot; v1.0</p>
      </div>
    </aside>
  );
}