export default function DashboardCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor = 'text-cat-yellow',
  bgAccent = 'bg-cat-yellow/10',
  delay = 0,
}) {
  return (
    <div
      className="bg-surface-card border border-border-default rounded-xl p-5 hover:border-border-default hover:bg-surface-card-hover transition-all duration-300 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            {title}
          </p>
          <p className={`text-2xl font-bold ${accentColor}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`${bgAccent} p-2.5 rounded-lg`}>
            <Icon className={`w-5 h-5 ${accentColor}`} />
          </div>
        )}
      </div>
    </div>
  );
}
