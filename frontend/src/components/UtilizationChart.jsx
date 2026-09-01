import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const getBarColor = (utilization) => {
  if (utilization < 30) return '#EF4444';
  if (utilization < 80) return '#EAB308';
  return '#22C55E';
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-elevated border border-border-default rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-text-primary">{label}</p>
      <p className="text-xs text-text-secondary mt-0.5">
        Utilization: <span className="font-medium text-cat-yellow">{payload[0].value}%</span>
      </p>
    </div>
  );
};

export default function UtilizationChart({ equipment = [], loading = false }) {
  if (loading) {
    return (
      <div className="bg-surface-card border border-border-default rounded-xl p-5 animate-fade-in">
        <div className="skeleton h-5 w-48 mb-4" />
        <div className="skeleton h-52 w-full" />
      </div>
    );
  }

  const data = equipment.map((e) => ({
    name: e.equipment_id,
    utilization: e.utilization,
    type: e.equipment_type,
  }));

  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        Equipment Utilization
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barSize={32} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2E3F" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#9498A8', fontSize: 11 }}
            axisLine={{ stroke: '#2A2E3F' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#9498A8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,203,5,0.05)' }} />
          <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={getBarColor(entry.utilization)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
