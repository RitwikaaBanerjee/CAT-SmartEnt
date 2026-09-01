import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const COLORS = {
  'Under-utilized': '#EF4444',
  'Moderately Utilized': '#EAB308',
  'Highly Utilized': '#22C55E',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-elevated border border-border-default rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-text-primary">
        {payload[0].name}
      </p>
      <p className="text-xs text-text-secondary mt-0.5">
        Count: <span className="font-medium text-cat-yellow">{payload[0].value}</span>
      </p>
    </div>
  );
};

export default function StatusChart({ dashboard = {}, loading = false }) {
  if (loading) {
    return (
      <div className="bg-surface-card border border-border-default rounded-xl p-5 animate-fade-in">
        <div className="skeleton h-5 w-44 mb-4" />
        <div className="skeleton h-52 w-full" />
      </div>
    );
  }

  const data = [
    { name: 'Under-utilized', value: dashboard.under_utilized_count || 0 },
    { name: 'Moderately Utilized', value: dashboard.moderately_utilized_count || 0 },
    { name: 'Highly Utilized', value: dashboard.highly_utilized_count || 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-5 animate-fade-in">
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        Status Distribution
      </h3>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={72}
              dataKey="value"
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex flex-col gap-2.5">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: COLORS[entry.name] }}
              />
              <span className="text-xs text-text-secondary">{entry.name}</span>
              <span className="text-xs font-semibold text-text-primary ml-auto pl-3">
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
