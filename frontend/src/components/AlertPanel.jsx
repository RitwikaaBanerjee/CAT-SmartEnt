import { AlertTriangle, AlertOctagon, Info } from 'lucide-react';

const severityConfig = {
  CRITICAL: {
    icon: AlertOctagon,
    bg: 'bg-status-critical-bg',
    text: 'text-status-critical',
    border: 'border-status-critical/20',
    label: 'Critical',
  },
  WARNING: {
    icon: AlertTriangle,
    bg: 'bg-status-high-bg',
    text: 'text-status-high',
    border: 'border-status-high/20',
    label: 'Warning',
  },
  INFO: {
    icon: Info,
    bg: 'bg-status-info-bg',
    text: 'text-status-info',
    border: 'border-status-info/20',
    label: 'Info',
  },
};

export default function AlertPanel({ alerts = [], loading = false, limit }) {
  if (loading) {
    return (
      <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden animate-fade-in">
        <div className="px-5 py-4 border-b border-border-default">
          <div className="skeleton h-5 w-32" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const displayed = limit ? alerts.slice(0, limit) : alerts;

  return (
    <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden animate-fade-in">
      <div className="px-5 py-4 border-b border-border-default flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          Active Alerts
        </h3>
        <span className="text-xs text-text-muted">
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {displayed.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-text-muted">No active alerts</p>
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          {displayed.map((alert, i) => {
            const config = severityConfig[alert.severity] || severityConfig.INFO;
            const Icon = config.icon;
            const dateStr = alert.timestamp ? new Date(alert.timestamp).toLocaleString() : '';

            return (
              <div
                key={i}
                className="px-5 py-3.5 hover:bg-surface-card-hover transition-colors duration-150"
              >
                <div className="flex items-start gap-3">
                  <div className={`${config.bg} p-1.5 rounded-md mt-0.5 flex-shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${config.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${config.bg} ${config.text}`}
                      >
                        {config.label}
                      </span>
                      <span className="text-xs font-bold text-text-primary">
                        {alert.equipment_id}
                      </span>
                      {alert.alert_type && (
                         <span className="text-[10px] text-text-muted uppercase tracking-wider ml-1">
                            {alert.alert_type.replace('_', ' ')}
                         </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed mt-1">
                      {alert.message}
                    </p>
                    {alert.recommendation && (
                      <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                        → {alert.recommendation}
                      </p>
                    )}
                    {alert.recommended_action && (
                      <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                        → {alert.recommended_action}
                      </p>
                    )}
                    {dateStr && (
                       <p className="text-[10px] text-text-muted mt-1.5">{dateStr}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
