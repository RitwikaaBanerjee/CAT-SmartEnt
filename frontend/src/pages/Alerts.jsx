import { useEffect, useState } from 'react';
import { getAlerts } from '../services/api';
import AlertPanel from '../components/AlertPanel';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAlerts()
      .then((data) => setAlerts(data.alerts || []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">System Alerts</h1>
        <p className="text-sm text-text-secondary mt-1">
          Automated warnings for overdue rentals, under-utilized equipment, and operational risks.
        </p>
      </div>

      <div className="max-w-4xl">
        <AlertPanel alerts={alerts} loading={loading} />
      </div>
    </div>
  );
}
