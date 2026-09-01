import { useEffect, useState } from 'react';
import { getEquipment } from '../services/api';
import EquipmentTable from '../components/EquipmentTable';

export default function Equipment() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterSite, setFilterSite] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    getEquipment()
      .then((data) => setEquipment(data.equipment || []))
      .catch(() => setEquipment([]))
      .finally(() => setLoading(false));
  }, []);

  // Get unique values for filters
  const sites = [...new Set(equipment.map(e => e.site_id).filter(Boolean))];
  const types = [...new Set(equipment.map(e => e.equipment_type))];
  const statuses = [...new Set(equipment.map(e => e.utilization_status))];

  // Apply filters
  const filteredEquipment = equipment.filter(e => {
    if (filterSite && e.site_id !== filterSite) return false;
    if (filterType && e.equipment_type !== filterType) return false;
    if (filterStatus && e.utilization_status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Equipment Fleet</h1>
          <p className="text-sm text-text-secondary mt-1">
            Complete overview of all registered equipment and their current utilization status.
          </p>
        </div>
        
        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3">
          <select 
            value={filterSite} 
            onChange={e => setFilterSite(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-surface-secondary border border-border-default text-xs font-medium text-text-secondary focus:outline-none focus:border-cat-yellow/50"
          >
            <option value="">All Sites</option>
            {sites.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-surface-secondary border border-border-default text-xs font-medium text-text-secondary focus:outline-none focus:border-cat-yellow/50"
          >
            <option value="">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-surface-secondary border border-border-default text-xs font-medium text-text-secondary focus:outline-none focus:border-cat-yellow/50"
          >
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <EquipmentTable equipment={filteredEquipment} loading={loading} />
    </div>
  );
}
