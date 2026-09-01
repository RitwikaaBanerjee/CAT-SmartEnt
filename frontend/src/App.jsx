import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/Equipment';
import Alerts from './pages/Alerts';
import Predict from './pages/Predict';
import CheckinCheckout from './pages/CheckinCheckout';
import UsageLogging from './pages/UsageLogging';
import Anomalies from './pages/Anomalies';
import Forecast from './pages/Forecast';
import Recommendations from './pages/Recommendations';
import EquipmentDetails from './components/EquipmentDetails';
import { useEffect, useState } from 'react';
import { getHealth } from './services/api';
import { ServerCrash } from 'lucide-react';

function App() {
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    getHealth()
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  return (
    <Router>
      <div className="flex min-h-screen bg-surface-primary text-text-primary">
        <Sidebar />
        
        <main className="flex-1 ml-[220px] p-8">
          {backendStatus === 'offline' && (
            <div className="mb-6 p-4 rounded-xl bg-status-critical-bg border border-status-critical/20 flex items-center gap-3">
              <ServerCrash className="w-5 h-5 text-status-critical" />
              <div>
                <h4 className="text-sm font-semibold text-status-critical">Backend Offline</h4>
                <p className="text-xs text-status-critical/80 mt-0.5">
                  Cannot connect to the Flask API. Ensure it is running on port 5000.
                </p>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/equipment" element={<Equipment />} />
              <Route path="/equipment/:id" element={<EquipmentDetails />} />
              <Route path="/checkin-checkout" element={<CheckinCheckout />} />
              <Route path="/usage" element={<UsageLogging />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/anomalies" element={<Anomalies />} />
              <Route path="/forecast" element={<Forecast />} />
              <Route path="/recommendations" element={<Recommendations />} />
              <Route path="/predict" element={<Predict />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
