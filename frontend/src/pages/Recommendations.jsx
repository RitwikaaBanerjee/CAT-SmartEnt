import { useEffect, useState } from 'react';
import { getRecommendations } from '../services/api';
import {
  Lightbulb, AlertOctagon, AlertTriangle, Info,
  TrendingUp, TrendingDown, Clock, CheckCircle2, Zap
} from 'lucide-react';

const priorityConfig = {
  CRITICAL: {
    icon: AlertOctagon,
    bg: 'bg-status-critical-bg',
    text: 'text-status-critical',
    border: 'border-status-critical/20',
  },
  HIGH: {
    icon: AlertTriangle,
    bg: 'bg-status-high-bg',
    text: 'text-status-high',
    border: 'border-status-high/20',
  },
  MEDIUM: {
    icon: Info,
    bg: 'bg-status-medium-bg',
    text: 'text-status-medium',
    border: 'border-status-medium/20',
  },
  LOW: {
    icon: Lightbulb,
    bg: 'bg-surface-secondary',
    text: 'text-text-muted',
    border: 'border-border-default',
  }
};

const categoryIcons = {
  utilization: TrendingDown,
  cost_savings: Zap,
  rental_extension: TrendingUp,
  return_planning: CheckCircle2,
  overdue: Clock,
  maintenance: AlertTriangle,
  investigation: Info,
  fleet_planning: TrendingUp,
};

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecommendations()
      .then(data => setRecommendations(data.recommendations || []))
      .catch(() => setRecommendations([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="mb-8">
          <div className="skeleton h-8 w-64 mb-2" />
          <div className="skeleton h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Smart Recommendations</h1>
        <p className="text-sm text-text-secondary mt-1">
          Actionable intelligence derived from equipment utilization, anomalies, and demand forecasting.
        </p>
      </div>

      {recommendations.length === 0 ? (
        <div className="bg-surface-card border border-border-default rounded-xl p-12 text-center">
          <Lightbulb className="w-12 h-12 text-text-muted opacity-20 mx-auto mb-3" />
          <p className="text-sm text-text-muted">No smart recommendations available at this time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {recommendations.map((rec, i) => {
            const priorityStyle = priorityConfig[rec.priority] || priorityConfig.MEDIUM;
            const CatIcon = categoryIcons[rec.category] || Lightbulb;
            
            return (
              <div 
                key={i} 
                className={`bg-surface-card border ${priorityStyle.border} rounded-xl overflow-hidden hover:-translate-y-0.5 transition-transform duration-200`}
              >
                <div className={`px-5 py-2.5 ${priorityStyle.bg} flex items-center justify-between border-b ${priorityStyle.border}`}>
                  <div className="flex items-center gap-2">
                    <CatIcon className={`w-4 h-4 ${priorityStyle.text}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${priorityStyle.text}`}>
                      {rec.category.replace('_', ' ')}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ring-current ${priorityStyle.text}`}>
                    {rec.priority}
                  </span>
                </div>
                
                <div className="p-5">
                  <h3 className="text-base font-bold text-text-primary mb-2">
                    {rec.title}
                  </h3>
                  
                  {rec.equipment_id && (
                    <div className="inline-block bg-surface-secondary px-2.5 py-1 rounded text-xs font-mono text-text-primary mb-3">
                      {rec.equipment_id}
                    </div>
                  )}
                  
                  <p className="text-sm text-text-secondary leading-relaxed mb-4">
                    {rec.message}
                  </p>
                  
                  <div className="bg-surface-secondary/50 rounded-lg p-3 border-l-2 border-border-default">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Reasoning</p>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {rec.explanation}
                    </p>
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
