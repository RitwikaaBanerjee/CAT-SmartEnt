import { useEffect, useState } from 'react';
import { getDashboard, getEquipment, getAlerts } from '../services/api';
import DashboardCard from '../components/DashboardCard';
import UtilizationChart from '../components/UtilizationChart';
import StatusChart from '../components/StatusChart';
import AlertPanel from '../components/AlertPanel';
import EquipmentTable from '../components/EquipmentTable';
import {
  Truck, Activity, AlertTriangle, CheckCircle2, 
  LogOut, Clock, CalendarClock, Zap
} from 'lucide-react';

export default function Dashboard() {
  const [dashboard, setDashboard] = useState({});
  const [equipment, setEquipment] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterSite, setFilterSite] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dashData, eqData, alertsData] = await Promise.all([
          getDashboard().catch(() => ({})),
          getEquipment().catch(() => ({ equipment: [] })),
          getAlerts().catch(() => ({ alerts: [] })),
        ]);
        setDashboard(dashData);
        setEquipment(eqData.equipment || []);
        setAlerts(alertsData.alerts || []);
      } finally {
        setLoading(false);
      }
    };
    loadData();
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
          <h1 className="text-2xl font-bold text-text-primary">Dashboard Overview</h1>
          <p className="text-sm text-text-secondary mt-1">
            Fleet utilization metrics and equipment intelligence.
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

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Fleet"
          value={loading ? '-' : dashboard.total_equipment || 0}
          icon={Truck}
          accentColor="text-text-primary"
          bgAccent="bg-surface-secondary"
          delay={0}
        />
        <DashboardCard
          title="Checked Out"
          value={loading ? '-' : dashboard.currently_checked_out || 0}
          icon={LogOut}
          accentColor="text-status-info"
          bgAccent="bg-status-info-bg"
          delay={50}
        />
        <DashboardCard
          title="Avg Utilization"
          value={loading ? '-' : `${dashboard.average_utilization || 0}%`}
          icon={Activity}
          accentColor="text-cat-yellow"
          bgAccent="bg-cat-yellow/10"
          delay={100}
        />
        <DashboardCard
          title="Total Operating Hours"
          value={loading ? '-' : dashboard.total_operating_hours || 0}
          icon={Zap}
          accentColor="text-text-primary"
          bgAccent="bg-surface-secondary"
          delay={150}
        />
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Highly Utilized"
          value={loading ? '-' : dashboard.highly_utilized_count || 0}
          icon={CheckCircle2}
          accentColor="text-status-low"
          bgAccent="bg-status-low-bg"
          delay={200}
        />
        <DashboardCard
          title="Under-utilized"
          value={loading ? '-' : dashboard.under_utilized_count || 0}
          icon={AlertTriangle}
          accentColor="text-status-high"
          bgAccent="bg-status-high-bg"
          delay={250}
        />
        <DashboardCard
          title="Due Soon (7 Days)"
          value={loading ? '-' : dashboard.due_soon || 0}
          icon={Clock}
          accentColor="text-status-medium"
          bgAccent="bg-status-medium-bg"
          delay={300}
        />
        <DashboardCard
          title="Overdue"
          value={loading ? '-' : dashboard.overdue || 0}
          icon={CalendarClock}
          accentColor="text-status-critical"
          bgAccent="bg-status-critical-bg"
          delay={350}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UtilizationChart equipment={filteredEquipment} loading={loading} />
        </div>
        <div>
          <StatusChart dashboard={dashboard} loading={loading} />
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EquipmentTable equipment={filteredEquipment} loading={loading} />
        </div>
        <div>
          <AlertPanel alerts={alerts} loading={loading} limit={5} />
        </div>
      </div>
    </div>
  );
}
