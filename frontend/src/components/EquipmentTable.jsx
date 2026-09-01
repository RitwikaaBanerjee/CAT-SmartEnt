import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, MapPinOff } from 'lucide-react';

const statusStyles = {
  'Under-utilized': {
    bg: 'bg-status-critical-bg',
    text: 'text-status-critical',
    dot: 'bg-status-critical',
  },
  'Moderately Utilized': {
    bg: 'bg-status-medium-bg',
    text: 'text-status-medium',
    dot: 'bg-status-medium',
  },
  'Highly Utilized': {
    bg: 'bg-status-low-bg',
    text: 'text-status-low',
    dot: 'bg-status-low',
  },
};

export default function EquipmentTable({ equipment = [], loading = false }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden animate-fade-in">
        <div className="px-5 py-4 border-b border-border-default">
          <div className="skeleton h-5 w-40" />
        </div>
        <div className="p-5 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden animate-fade-in">
      <div className="px-5 py-4 border-b border-border-default flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          Equipment Fleet
        </h3>
        <span className="text-xs text-text-muted">
          {equipment.length} unit{equipment.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-secondary">
              <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Equipment
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Type
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Site
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Utilization
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                Status
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {equipment.map((item) => {
              const style =
                statusStyles[item.utilization_status] || statusStyles['Moderately Utilized'];

              return (
                <tr
                  key={item.equipment_id}
                  onClick={() => navigate(`/equipment/${item.equipment_id}`)}
                  className="hover:bg-surface-card-hover cursor-pointer transition-colors duration-150"
                >
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-text-primary">
                      {item.equipment_id}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-text-secondary">
                    {item.equipment_type}
                  </td>
                  <td className="px-5 py-3.5">
                    {item.site_id ? (
                      <span className="flex items-center gap-1.5 text-text-secondary">
                        <MapPin className="w-3.5 h-3.5 text-status-low" />
                        {item.site_id}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-text-muted">
                        <MapPinOff className="w-3.5 h-3.5 text-status-critical" />
                        Missing
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-20 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${style.dot}`}
                          style={{ width: `${Math.min(item.utilization, 100)}%` }}
                        />
                      </div>
                      <span className="text-text-primary font-medium text-xs w-12 text-right">
                        {item.utilization}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      {item.utilization_status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <ChevronRight className="w-4 h-4 text-text-muted inline-block" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
