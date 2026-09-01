import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  AlertTriangle,
  Brain,
  QrCode,
  BarChart3,
  Radar,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/equipment', icon: Truck, label: 'Equipment' },
  { to: '/checkin-checkout', icon: QrCode, label: 'Check-in/out' },
  { to: '/usage', icon: BarChart3, label: 'Usage Log' },
  { to: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  { to: '/anomalies', icon: Radar, label: 'Anomalies' },
  { to: '/forecast', icon: TrendingUp, label: 'Forecast' },
  { to: '/recommendations', icon: Lightbulb, label: 'Recommend' },
  { to: '/predict', icon: Brain, label: 'ML Predict' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed top-0 left-0 h-screen w-[220px] bg-surface-secondary border-r border-border-default flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border-default">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-cat-yellow flex items-center justify-center">
            <Truck className="w-5 h-5 text-cat-black" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-text-primary tracking-wide leading-none">
              CAT SmartEnt
            </h1>
            <p className="text-[10px] text-text-muted mt-0.5 tracking-widest uppercase">
              Rental Tracking
            </p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => {
          const isActive =
            to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200
                ${
                  isActive
                    ? 'bg-cat-yellow/10 text-cat-yellow'
                    : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
                }`}
            >
              <Icon className="w-[16px] h-[16px] flex-shrink-0" />
              {label}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cat-yellow" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border-default">
        <p className="text-[10px] text-text-muted uppercase tracking-widest">
          Caterpillar Hackathon
        </p>
      </div>
    </aside>
  );
}
