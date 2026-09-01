import { useEffect, useState } from 'react';
import { getEquipment } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
} from 'recharts';
import { BarChart3, Clock, Gauge } from 'lucide-react';

const getBarColor = (util) => {
  if (util < 30) return '#EF4444';
  if (util < 80) return '#EAB308';
  return '#22C55E';
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-elevated border border-border-default rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-text-primary">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs text-text-secondary mt-0.5">
          {p.name}: <span className="font-medium" style={{ color: p.color }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function UsageLogging() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEquipment()
      .then((data) => setEquipment(data.equipment || []))
      .catch(() => setEquipment([]))
      .finally(() => setLoading(false));
  }, []);

  // Prepare chart data
  const utilizationData = equipment.map(e => ({
    name: e.equipment_id,
    utilization: e.utilization,
    type: e.equipment_type,
  }));

  const hoursData = equipment.map(e => ({
    name: e.equipment_id,
    engine: e.engine_hours_per_day,
    idle: e.idle_hours_per_day,
    type: e.equipment_type,
  }));

  const totalHoursData = equipment.map(e => ({
    name: e.equipment_id,
    'Total Engine': e.total_engine_hours || e.engine_hours_per_day * e.operating_days,
    'Total Idle': e.total_idle_hours || e.idle_hours_per_day * e.operating_days,
    type: e.equipment_type,
  }));

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="mb-8">
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-80" />
        </div>
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Usage & Activity Log</h1>
        <p className="text-sm text-text-secondary mt-1">
          Track daily usage, utilization trends, and operating vs idle hours across the fleet.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-card border border-border-default rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-cat-yellow/10 p-1.5 rounded-lg">
              <Gauge className="w-4 h-4 text-cat-yellow" />
            </div>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Avg Utilization</p>
          </div>
          <p className="text-2xl font-bold text-cat-yellow">
            {equipment.length > 0 ? (equipment.reduce((s, e) => s + e.utilization, 0) / equipment.length).toFixed(1) : 0}%
          </p>
        </div>
        <div className="bg-surface-card border border-border-default rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-status-low-bg p-1.5 rounded-lg">
              <BarChart3 className="w-4 h-4 text-status-low" />
            </div>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Total Engine Hours</p>
          </div>
          <p className="text-2xl font-bold text-status-low">
            {equipment.reduce((s, e) => s + (e.total_engine_hours || e.engine_hours_per_day * e.operating_days), 0).toFixed(0)} hrs
          </p>
        </div>
        <div className="bg-surface-card border border-border-default rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-status-critical-bg p-1.5 rounded-lg">
              <Clock className="w-4 h-4 text-status-critical" />
            </div>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Total Idle Hours</p>
          </div>
          <p className="text-2xl font-bold text-status-critical">
            {equipment.reduce((s, e) => s + (e.total_idle_hours || e.idle_hours_per_day * e.operating_days), 0).toFixed(0)} hrs
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization Chart */}
        <div className="bg-surface-card border border-border-default rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Utilization by Equipment</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={utilizationData} barSize={28} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2E3F" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#9498A8', fontSize: 11 }} axisLine={{ stroke: '#2A2E3F' }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#9498A8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,203,5,0.05)' }} />
              <Bar dataKey="utilization" name="Utilization %" radius={[4, 4, 0, 0]}>
                {utilizationData.map((entry, i) => (
                  <Cell key={i} fill={getBarColor(entry.utilization)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Operating vs Idle Hours/Day */}
        <div className="bg-surface-card border border-border-default rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Operating vs Idle Hours (per day)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hoursData} barSize={14} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2E3F" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#9498A8', fontSize: 11 }} axisLine={{ stroke: '#2A2E3F' }} tickLine={false} />
              <YAxis tick={{ fill: '#9498A8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}h`} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,203,5,0.05)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: '#9498A8' }} />
              <Bar dataKey="engine" name="Engine Hrs" fill="#22C55E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="idle" name="Idle Hrs" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Total Hours Chart */}
      <div className="bg-surface-card border border-border-default rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Total Operating vs Idle Hours (rental period)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={totalHoursData} barSize={20} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2E3F" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#9498A8', fontSize: 11 }} axisLine={{ stroke: '#2A2E3F' }} tickLine={false} />
            <YAxis tick={{ fill: '#9498A8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}h`} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,203,5,0.05)' }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: '#9498A8' }} />
            <Bar dataKey="Total Engine" fill="#22C55E" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Total Idle" fill="#EF4444" stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Usage Table */}
      <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-default">
          <h3 className="text-sm font-semibold text-text-primary">Equipment Usage Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-secondary">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Equipment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Site</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Operator</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Engine h/d</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Idle h/d</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Op. Days</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Utilization</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Check-out</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Check-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {equipment.map(e => (
                <tr key={e.equipment_id} className="hover:bg-surface-card-hover transition-colors">
                  <td className="px-4 py-3 font-semibold text-text-primary">{e.equipment_id}</td>
                  <td className="px-4 py-3 text-text-secondary">{e.equipment_type}</td>
                  <td className="px-4 py-3 text-text-secondary">{e.site_id || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary">{e.last_operator_id || '—'}</td>
                  <td className="px-4 py-3 text-right text-text-primary">{e.engine_hours_per_day}</td>
                  <td className="px-4 py-3 text-right text-text-primary">{e.idle_hours_per_day}</td>
                  <td className="px-4 py-3 text-right text-text-primary">{e.operating_days}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${
                      e.utilization < 30 ? 'text-status-critical' : e.utilization < 80 ? 'text-status-medium' : 'text-status-low'
                    }`}>{e.utilization}%</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{e.check_out_date}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{e.check_in_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
