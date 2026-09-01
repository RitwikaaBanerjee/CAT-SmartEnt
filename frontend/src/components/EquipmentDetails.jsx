import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEquipmentById } from '../services/api';
import {
  ArrowLeft, MapPin, MapPinOff, Clock, Calendar, Gauge, User,
  Loader2, LogIn, LogOut, History, AlertTriangle, Lightbulb, Radar
} from 'lucide-react';

const statusStyles = {
  'Under-utilized': {
    bg: 'bg-status-critical-bg',
    text: 'text-status-critical',
    ring: 'ring-status-critical/30',
  },
  'Moderately Utilized': {
    bg: 'bg-status-medium-bg',
    text: 'text-status-medium',
    ring: 'ring-status-medium/30',
  },
  'Highly Utilized': {
    bg: 'bg-status-low-bg',
    text: 'text-status-low',
    ring: 'ring-status-low/30',
  },
};

function InfoRow({ icon: Icon, label, value, valueClass = 'text-text-primary' }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Icon className="w-4 h-4 text-text-muted flex-shrink-0" />
      <span className="text-xs text-text-muted w-32 flex-shrink-0">{label}</span>
      <span className={`text-sm font-medium ${valueClass}`}>{value ?? '—'}</span>
    </div>
  );
}

export default function EquipmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getEquipmentById(id)
      .then(setData)
      .catch((err) => setError(err.response?.data?.error || 'Failed to load equipment'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-cat-yellow" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="bg-status-critical-bg border border-status-critical/20 rounded-xl p-6 text-center">
          <p className="text-sm text-status-critical">{error || 'Unknown Error'}</p>
        </div>
      </div>
    );
  }

  const style = statusStyles[data.utilization_status] || statusStyles['Moderately Utilized'];
  const hasAlerts = data.alerts && data.alerts.length > 0;
  const hasAnomalies = data.anomalies && data.anomalies.length > 0;
  const hasRecs = data.recommendations && data.recommendations.length > 0;
  const hasHistory = data.history && data.history.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        
        <Link 
          to="/checkin-checkout" 
          className="px-3 py-1.5 rounded-lg bg-cat-yellow/10 text-cat-yellow text-xs font-semibold hover:bg-cat-yellow hover:text-cat-black transition-colors"
        >
          Manage Check-in/out
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 bg-surface-card border border-border-default rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-text-primary">{data.equipment_id}</h2>
              <p className="text-sm text-text-secondary mt-0.5">{data.equipment_type}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${style.bg} ${style.text} ${style.ring}`}>
                {data.utilization_status}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${
                  data.current_status === 'Checked Out' ? 'bg-status-high-bg text-status-high ring-status-high/30' : 'bg-status-low-bg text-status-low ring-status-low/30'
              }`}>
                {data.current_status === 'Checked Out' ? <LogOut className="w-3 h-3" /> : <LogIn className="w-3 h-3" />}
                {data.current_status || 'Available'}
              </span>
            </div>
          </div>

          <div className="divide-y divide-border-subtle">
            <InfoRow icon={data.site_id ? MapPin : MapPinOff} label="Site / Location" value={data.site_id || 'Not assigned'} valueClass={data.site_id ? 'text-text-primary' : 'text-status-critical'} />
            <InfoRow icon={User} label="Operator" value={data.last_operator_id || 'Not assigned'} valueClass={data.last_operator_id ? 'text-text-primary' : 'text-status-critical'} />
            <InfoRow icon={Clock} label="Engine Hrs / Day" value={`${data.engine_hours_per_day} hrs`} />
            <InfoRow icon={Clock} label="Idle Hrs / Day" value={`${data.idle_hours_per_day} hrs`} />
            <InfoRow icon={Calendar} label="Operating Days" value={data.operating_days} />
            <InfoRow icon={Calendar} label="Check-out Date" value={data.check_out_date} />
            <InfoRow icon={Calendar} label="Check-in Date" value={data.check_in_date} />
            <InfoRow icon={Clock} label="Days Until Due" value={data.days_until_due !== null ? data.days_until_due : 'N/A'} valueClass={data.days_until_due < 0 ? 'text-status-critical' : data.days_until_due <= 7 ? 'text-status-medium' : 'text-status-low'} />
          </div>
        </div>

        {/* Utilization Gauge Card */}
        <div className="bg-surface-card border border-border-default rounded-xl p-6 flex flex-col items-center justify-center">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-4">Utilization</p>
          <div className="relative w-36 h-36 mb-4">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 144 144">
              <circle cx="72" cy="72" r="60" fill="none" stroke="#2A2E3F" strokeWidth="10" />
              <circle
                cx="72" cy="72" r="60" fill="none"
                stroke={data.utilization < 30 ? '#EF4444' : data.utilization < 80 ? '#EAB308' : '#22C55E'}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(data.utilization / 100) * 377} 377`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Gauge className="w-4 h-4 text-text-muted mb-1" />
              <span className="text-2xl font-bold text-text-primary">{data.utilization}%</span>
            </div>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
            {data.utilization_status}
          </span>
        </div>
      </div>

      {/* Intelligence Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Alerts & Anomalies */}
        <div className="lg:col-span-2 space-y-6">
          {(hasAlerts || hasAnomalies) ? (
             <div className="bg-surface-card border border-border-default rounded-xl p-5">
               <h3 className="text-sm font-semibold text-text-primary mb-4">Active Alerts & Anomalies</h3>
               <div className="space-y-3">
                 {data.alerts?.map((alert, i) => (
                   <div key={`al-${i}`} className="flex items-start gap-3 p-3 rounded-lg bg-surface-secondary">
                     <AlertTriangle className={`w-4 h-4 mt-0.5 ${alert.severity === 'CRITICAL' ? 'text-status-critical' : 'text-status-high'}`} />
                     <div>
                       <p className="text-xs font-semibold text-text-primary">{alert.alert_type.replace('_', ' ').toUpperCase()}</p>
                       <p className="text-xs text-text-secondary mt-0.5">{alert.message}</p>
                     </div>
                   </div>
                 ))}
                 {data.anomalies?.map((anomaly, i) => (
                   <div key={`an-${i}`} className="flex items-start gap-3 p-3 rounded-lg bg-surface-secondary">
                     <Radar className="w-4 h-4 mt-0.5 text-status-medium" />
                     <div>
                       <p className="text-xs font-semibold text-text-primary">ANOMALY: {anomaly.anomaly_type}</p>
                       <p className="text-xs text-text-secondary mt-0.5">{anomaly.explanation}</p>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          ) : (
             <div className="bg-surface-card border border-border-default rounded-xl p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-status-low mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-text-primary">No Active Alerts</p>
                <p className="text-xs text-text-muted mt-1">Equipment is operating normally.</p>
             </div>
          )}

          {/* Recommendations */}
          {hasRecs && (
            <div className="bg-surface-card border border-border-default rounded-xl p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Smart Recommendations</h3>
              <div className="space-y-3">
                {data.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-cat-yellow/5 border border-cat-yellow/20">
                    <Lightbulb className="w-4 h-4 text-cat-yellow mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-text-primary">{rec.title}</p>
                      <p className="text-xs text-text-secondary mt-1">{rec.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* History Timeline */}
        <div className="bg-surface-card border border-border-default rounded-xl p-5">
           <div className="flex items-center gap-2 mb-4">
             <History className="w-4 h-4 text-text-muted" />
             <h3 className="text-sm font-semibold text-text-primary">Recent History</h3>
           </div>
           
           {!hasHistory ? (
             <p className="text-xs text-text-muted text-center py-8">No history events recorded.</p>
           ) : (
             <div className="relative pl-3 border-l-2 border-border-subtle space-y-6">
               {data.history.slice(0, 5).map((evt, i) => (
                 <div key={i} className="relative">
                   <span className={`absolute -left-[17px] w-2.5 h-2.5 rounded-full ring-4 ring-surface-card ${
                     evt.event_type === 'checkout' ? 'bg-status-high' : 'bg-status-low'
                   }`} />
                   <p className="text-xs font-bold text-text-primary capitalize">
                     {evt.event_type === 'checkout' ? 'Checked Out' : 'Checked In'}
                   </p>
                   <p className="text-[10px] text-text-muted mb-1">
                     {new Date(evt.timestamp).toLocaleString()}
                   </p>
                   {(evt.operator_id || evt.site_id) && (
                     <p className="text-[11px] text-text-secondary mt-0.5">
                       {evt.operator_id && <span>By {evt.operator_id} </span>}
                       {evt.site_id && <span>at {evt.site_id}</span>}
                     </p>
                   )}
                   {evt.notes && <p className="text-[11px] text-text-muted mt-1 italic">{evt.notes}</p>}
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
