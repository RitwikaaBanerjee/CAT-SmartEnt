import { useEffect, useState } from 'react';
import { getAnomalies } from '../services/api';
import {
  Radar,
  AlertTriangle,
  AlertOctagon,
  Info,
  TrendingDown,
  TrendingUp,
  Clock,
  Gauge,
} from 'lucide-react';

const severityConfig = {
  HIGH: {
    icon: AlertOctagon,
    bg: 'bg-status-critical-bg',
    text: 'text-status-critical',
    border: 'border-status-critical/20',
    label: 'HIGH',
  },
  MEDIUM: {
    icon: AlertTriangle,
    bg: 'bg-status-high-bg',
    text: 'text-status-high',
    border: 'border-status-high/20',
    label: 'MEDIUM',
  },
  LOW: {
    icon: Info,
    bg: 'bg-status-medium-bg',
    text: 'text-status-medium',
    border: 'border-status-medium/20',
    label: 'LOW',
  },
};

const anomalyIcons = {
  'Excessive idle time': Clock,
  'Unusually high operating hours': TrendingUp,
  'Abnormally low utilization': TrendingDown,
  'Abnormally high utilization': TrendingUp,
  'Extended rental period': Clock,
  'Unusually low operating hours': TrendingDown,
};

export default function Anomalies() {
  const [data, setData] = useState({ anomalies: [], method: '', threshold: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnomalies()
      .then(setData)
      .catch(() => setData({ anomalies: [], method: 'Error', threshold: 0 }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="mb-8">
          <div className="skeleton h-8 w-56 mb-2" />
          <div className="skeleton h-4 w-96" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-32 w-full" />
        ))}
      </div>
    );
  }

  const { anomalies, method, threshold } = data;
  const highCount = anomalies.filter(a => a.severity === 'HIGH').length;
  const mediumCount = anomalies.filter(a => a.severity === 'MEDIUM').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Anomaly Detection</h1>
        <p className="text-sm text-text-secondary mt-1">
          Unusual patterns detected using {method} (threshold: {threshold}σ) on fleet-wide equipment data.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-card border border-border-default rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-cat-yellow/10 p-1.5 rounded-lg">
              <Radar className="w-4 h-4 text-cat-yellow" />
            </div>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Total Anomalies</p>
          </div>
          <p className="text-2xl font-bold text-cat-yellow">{anomalies.length}</p>
        </div>
        <div className="bg-surface-card border border-border-default rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-status-critical-bg p-1.5 rounded-lg">
              <AlertOctagon className="w-4 h-4 text-status-critical" />
            </div>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">High Severity</p>
          </div>
          <p className="text-2xl font-bold text-status-critical">{highCount}</p>
        </div>
        <div className="bg-surface-card border border-border-default rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-status-high-bg p-1.5 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-status-high" />
            </div>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Medium Severity</p>
          </div>
          <p className="text-2xl font-bold text-status-high">{mediumCount}</p>
        </div>
      </div>

      {/* Anomaly Cards */}
      {anomalies.length === 0 ? (
        <div className="bg-surface-card border border-border-default rounded-xl p-12 text-center">
          <Radar className="w-12 h-12 text-text-muted opacity-20 mx-auto mb-3" />
          <p className="text-sm text-text-muted">No anomalies detected in the current fleet data.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {anomalies.map((anomaly, i) => {
            const config = severityConfig[anomaly.severity] || severityConfig.MEDIUM;
            const SevIcon = config.icon;
            const AnomalyIcon = anomalyIcons[anomaly.anomaly_type] || Radar;

            return (
              <div
                key={i}
                className={`bg-surface-card border ${config.border} rounded-xl p-5 hover:bg-surface-card-hover transition-colors`}
              >
                <div className="flex items-start gap-4">
                  <div className={`${config.bg} p-2 rounded-lg flex-shrink-0`}>
                    <AnomalyIcon className={`w-5 h-5 ${config.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                      <span className="text-sm font-bold text-text-primary">{anomaly.equipment_id}</span>
                      <span className="text-xs text-text-muted">· {anomaly.equipment_type}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-text-primary mb-1">{anomaly.anomaly_type}</h4>
                    <p className="text-xs text-text-secondary leading-relaxed mb-2">{anomaly.explanation}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                      <div className="bg-surface-secondary rounded-md px-3 py-2">
                        <p className="text-[10px] text-text-muted uppercase">Detected</p>
                        <p className="text-sm font-semibold text-text-primary">{anomaly.detected_value}</p>
                      </div>
                      <div className="bg-surface-secondary rounded-md px-3 py-2">
                        <p className="text-[10px] text-text-muted uppercase">Fleet Avg</p>
                        <p className="text-sm font-semibold text-text-primary">{anomaly.fleet_average}</p>
                      </div>
                      <div className="bg-surface-secondary rounded-md px-3 py-2">
                        <p className="text-[10px] text-text-muted uppercase">Z-Score</p>
                        <p className={`text-sm font-semibold ${config.text}`}>{anomaly.z_score}σ</p>
                      </div>
                      <div className="bg-surface-secondary rounded-md px-3 py-2">
                        <p className="text-[10px] text-text-muted uppercase">Metric</p>
                        <p className="text-sm font-semibold text-text-primary">{anomaly.metric}</p>
                      </div>
                    </div>

                    <div className="bg-surface-secondary rounded-md px-3 py-2">
                      <p className="text-[10px] text-text-muted uppercase mb-0.5">Recommended Action</p>
                      <p className="text-xs text-text-secondary leading-relaxed">{anomaly.recommended_action}</p>
                    </div>
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
