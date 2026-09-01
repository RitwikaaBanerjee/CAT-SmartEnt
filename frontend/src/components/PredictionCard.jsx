import { useState } from 'react';
import { postPredict } from '../services/api';
import {
  Brain,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Send,
} from 'lucide-react';

const EQUIPMENT_TYPES = ['Bulldozer', 'Crane', 'Excavator', 'Grader'];

const riskIcons = {
  Low: ShieldCheck,
  Medium: ShieldAlert,
  High: ShieldAlert,
};

const riskColors = {
  Low: 'text-status-low',
  Medium: 'text-status-medium',
  High: 'text-status-critical',
};

export default function PredictionCard() {
  const [form, setForm] = useState({
    equipment_id: '',
    equipment_type: EQUIPMENT_TYPES[0],
    engine_hours_per_day: '',
    idle_hours_per_day: '',
    operating_days: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const payload = {
        equipment_id: form.equipment_id || 'PREDICT',
        equipment_type: form.equipment_type,
        engine_hours_per_day: parseFloat(form.engine_hours_per_day),
        idle_hours_per_day: parseFloat(form.idle_hours_per_day),
        operating_days: parseInt(form.operating_days, 10),
      };
      const data = await postPredict(payload);
      setResult(data);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.errors?.join(', ') ||
        'Prediction request failed. Is the backend running?';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const RiskIcon = result ? riskIcons[result.risk_level] || ShieldAlert : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
      {/* Form */}
      <div className="bg-surface-card border border-border-default rounded-xl p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="bg-cat-yellow/10 p-2 rounded-lg">
            <Brain className="w-5 h-5 text-cat-yellow" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">
            Utilization Prediction
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Equipment ID
              </label>
              <input
                name="equipment_id"
                value={form.equipment_id}
                onChange={handleChange}
                placeholder="e.g. EXQ1001"
                className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cat-yellow/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Equipment Type
              </label>
              <select
                name="equipment_type"
                value={form.equipment_type}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border-default text-sm text-text-primary focus:outline-none focus:border-cat-yellow/50 transition-colors"
              >
                {EQUIPMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Engine Hrs/Day
              </label>
              <input
                name="engine_hours_per_day"
                type="number"
                step="0.1"
                min="0"
                max="24"
                required
                value={form.engine_hours_per_day}
                onChange={handleChange}
                placeholder="0.0"
                className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cat-yellow/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Idle Hrs/Day
              </label>
              <input
                name="idle_hours_per_day"
                type="number"
                step="0.1"
                min="0"
                max="24"
                required
                value={form.idle_hours_per_day}
                onChange={handleChange}
                placeholder="0.0"
                className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cat-yellow/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Operating Days
              </label>
              <input
                name="operating_days"
                type="number"
                min="1"
                required
                value={form.operating_days}
                onChange={handleChange}
                placeholder="1"
                className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cat-yellow/50 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cat-yellow text-cat-black text-sm font-semibold hover:bg-cat-yellow-light disabled:opacity-50 transition-colors duration-200"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {loading ? 'Predicting...' : 'Run Prediction'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-status-critical-bg border border-status-critical/20 text-xs text-status-critical">
            {error}
          </div>
        )}
      </div>

      {/* Result */}
      <div className="bg-surface-card border border-border-default rounded-xl p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-5">
          Prediction Result
        </h3>

        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-56 text-text-muted">
            <Gauge className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Submit equipment parameters to see prediction</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-56 text-text-muted">
            <Loader2 className="w-8 h-8 animate-spin text-cat-yellow mb-3" />
            <p className="text-sm">Running ML model...</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-5">
            {/* Main prediction */}
            <div className="text-center py-4">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
                Predicted Utilization
              </p>
              <p className="text-4xl font-bold text-cat-yellow">
                {result.prediction}%
              </p>
              <p className="text-sm text-text-secondary mt-1">
                {result.utilization_status}
              </p>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-secondary rounded-lg p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                  Risk Level
                </p>
                <div className="flex items-center gap-1.5">
                  {RiskIcon && (
                    <RiskIcon
                      className={`w-4 h-4 ${riskColors[result.risk_level]}`}
                    />
                  )}
                  <span
                    className={`text-sm font-semibold ${riskColors[result.risk_level]}`}
                  >
                    {result.risk_level}
                  </span>
                </div>
              </div>

              <div className="bg-surface-secondary rounded-lg p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                  Confidence
                </p>
                <p className="text-sm font-semibold text-text-primary">
                  {result.confidence !== undefined
                    ? `${(result.confidence * 100).toFixed(1)}%`
                    : 'N/A'}
                </p>
              </div>

              <div className="bg-surface-secondary rounded-lg p-3 col-span-2">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                  Recommendation
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {result.recommended_action}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
