import { useState, useEffect } from 'react';
import { getEquipmentById, postCheckout, postCheckin, getEquipmentHistory } from '../services/api';
import {
  QrCode,
  ScanLine,
  LogIn,
  LogOut,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Truck,
  MapPin,
  User,
  Clock,
  History,
  Camera,
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const DEMO_IDS = ['EXQ1001', 'EXQ1002', 'EXQ1003', 'EXQ1004', 'EXQ1005', 'EXQ1006', 'EXQ1007'];
const SITES = ['S001', 'S002', 'S003', 'S004', 'S005', 'S006'];
const OPERATORS = ['OP101', 'OP106', 'OP203', 'OP301', 'OP314', 'OP400', 'OP500'];

export default function CheckinCheckout() {
  const [equipmentId, setEquipmentId] = useState('');
  const [equipment, setEquipment] = useState(null);
  const [operatorId, setOperatorId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    if (!showCamera) return;

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear().catch(console.error);
        setShowCamera(false);
        handleScan(decodedText.trim().toUpperCase());
      },
      (error) => {
        // ignore continuous scanning errors
      }
    );

    return () => {
      try {
        scanner.clear().catch(() => {});
      } catch (err) {
        console.error("Scanner cleanup failed", err);
      }
    };
  }, [showCamera]);

  const lookupEquipment = async (id) => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    setEquipment(null);
    setResult(null);
    try {
      const data = await getEquipmentById(id.trim());
      setEquipment(data);
      // Load history
      const hist = await getEquipmentHistory(id.trim()).catch(() => ({ events: [] }));
      setHistory(hist.events || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Equipment not found');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (id) => {
    setEquipmentId(id);
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      lookupEquipment(id);
    }, 800);
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await postCheckout({
        equipment_id: equipment.equipment_id,
        operator_id: operatorId || null,
        site_id: siteId || null,
        notes,
      });
      setResult({ type: 'checkout', ...data });
      // Refresh equipment data
      lookupEquipment(equipment.equipment_id);
    } catch (err) {
      setError(err.response?.data?.error || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await postCheckin({
        equipment_id: equipment.equipment_id,
        notes,
      });
      setResult({ type: 'checkin', ...data });
      lookupEquipment(equipment.equipment_id);
    } catch (err) {
      setError(err.response?.data?.error || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const statusColor = equipment?.current_status === 'Checked Out'
    ? 'text-status-high'
    : 'text-status-low';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">QR Check-in / Check-out</h1>
        <p className="text-sm text-text-secondary mt-1">
          Scan or enter equipment ID to check equipment in or out. Demo mode available.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scanner Panel */}
        <div className="bg-surface-card border border-border-default rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="bg-cat-yellow/10 p-2 rounded-lg">
              <QrCode className="w-5 h-5 text-cat-yellow" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">
              Equipment Scanner
            </h3>
          </div>

          {/* QR Scanner Visual */}
          <div className="relative bg-surface-secondary border-2 border-dashed border-border-default rounded-xl p-6 mb-4 flex flex-col items-center justify-center min-h-[250px]">
            {showCamera ? (
              <div id="qr-reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-lg bg-black/5"></div>
            ) : scanning ? (
              <>
                <ScanLine className="w-16 h-16 text-cat-yellow animate-pulse mb-3" />
                <p className="text-sm text-cat-yellow font-medium">Processing...</p>
              </>
            ) : (
              <>
                <QrCode className="w-16 h-16 text-text-muted mb-3 opacity-30" />
                <button 
                  onClick={() => setShowCamera(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-elevated border border-border-default rounded-lg text-sm font-semibold text-text-primary hover:border-cat-yellow transition-colors mb-2"
                >
                  <Camera className="w-4 h-4 text-cat-yellow" />
                  Open Camera to Scan
                </button>
                <p className="text-[10px] text-text-muted">or use manual entry below</p>
              </>
            )}
            
            {showCamera && (
              <button 
                onClick={() => setShowCamera(false)}
                className="mt-4 px-3 py-1.5 rounded-lg bg-surface-elevated text-xs font-medium text-text-secondary hover:text-text-primary border border-border-default transition-colors"
              >
                Cancel Scanning
              </button>
            )}
          </div>

          {/* Manual Entry */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Equipment ID
              </label>
              <div className="flex gap-2">
                <input
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && lookupEquipment(equipmentId)}
                  placeholder="e.g. EXQ1001"
                  className="flex-1 px-3 py-2 rounded-lg bg-surface-secondary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cat-yellow/50 transition-colors"
                />
                <button
                  onClick={() => lookupEquipment(equipmentId)}
                  disabled={loading || !equipmentId.trim()}
                  className="px-4 py-2 rounded-lg bg-cat-yellow text-cat-black text-sm font-semibold hover:bg-cat-yellow-light disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lookup'}
                </button>
              </div>
            </div>

            {/* Demo Quick-Access */}
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
                Demo Scanner — Quick Access
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_IDS.map((id) => (
                  <button
                    key={id}
                    onClick={() => handleScan(id)}
                    className="px-2.5 py-1.5 rounded-md bg-surface-secondary border border-border-default text-xs font-medium text-text-secondary hover:border-cat-yellow/40 hover:text-cat-yellow transition-all"
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Equipment Info + Actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-status-critical-bg border border-status-critical/20 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-status-critical flex-shrink-0" />
              <p className="text-sm text-status-critical">{error}</p>
            </div>
          )}

          {/* Success Result */}
          {result && (
            <div className="p-4 rounded-xl bg-status-low-bg border border-status-low/20 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-status-low flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-status-low">
                  {result.type === 'checkout' ? 'Checked Out' : 'Checked In'} Successfully
                </p>
                <p className="text-xs text-status-low/80 mt-0.5">{result.message}</p>
                {result.rental_duration && (
                  <p className="text-xs text-text-secondary mt-1">Rental duration: {result.rental_duration}</p>
                )}
              </div>
            </div>
          )}

          {/* Equipment Card */}
          {equipment && (
            <div className="bg-surface-card border border-border-default rounded-xl p-6 animate-fade-in">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="bg-cat-yellow/10 p-2.5 rounded-lg">
                    <Truck className="w-6 h-6 text-cat-yellow" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">{equipment.equipment_id}</h2>
                    <p className="text-sm text-text-secondary">{equipment.equipment_type}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  equipment.current_status === 'Checked Out'
                    ? 'bg-status-high-bg text-status-high'
                    : 'bg-status-low-bg text-status-low'
                }`}>
                  {equipment.current_status === 'Checked Out' ? <LogOut className="w-3 h-3" /> : <LogIn className="w-3 h-3" />}
                  {equipment.current_status || 'Available'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="bg-surface-secondary rounded-lg p-3">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Site</p>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-sm font-medium text-text-primary">{equipment.site_id || 'N/A'}</span>
                  </div>
                </div>
                <div className="bg-surface-secondary rounded-lg p-3">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Operator</p>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-sm font-medium text-text-primary">{equipment.last_operator_id || 'N/A'}</span>
                  </div>
                </div>
                <div className="bg-surface-secondary rounded-lg p-3">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Utilization</p>
                  <span className="text-sm font-semibold text-cat-yellow">{equipment.utilization}%</span>
                </div>
                <div className="bg-surface-secondary rounded-lg p-3">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Engine Hrs/Day</p>
                  <span className="text-sm font-medium text-text-primary">{equipment.engine_hours_per_day}</span>
                </div>
              </div>

              {/* Action Form */}
              <div className="border-t border-border-subtle pt-5">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                  {equipment.current_status === 'Checked Out' ? 'Check-in Equipment' : 'Check-out Equipment'}
                </h4>

                {equipment.current_status !== 'Checked Out' && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Operator</label>
                      <select
                        value={operatorId}
                        onChange={(e) => setOperatorId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border-default text-sm text-text-primary focus:outline-none focus:border-cat-yellow/50"
                      >
                        <option value="">Select operator...</option>
                        {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Site</label>
                      <select
                        value={siteId}
                        onChange={(e) => setSiteId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border-default text-sm text-text-primary focus:outline-none focus:border-cat-yellow/50"
                      >
                        <option value="">Select site...</option>
                        {SITES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <label className="block text-xs text-text-muted mb-1">Notes (optional)</label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes..."
                    className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cat-yellow/50"
                  />
                </div>

                <div className="flex gap-3">
                  {equipment.current_status === 'Checked Out' ? (
                    <button
                      onClick={handleCheckin}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-status-low text-white text-sm font-semibold hover:bg-status-low/80 disabled:opacity-50 transition-colors"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                      Check In (Return)
                    </button>
                  ) : (
                    <button
                      onClick={handleCheckout}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cat-yellow text-cat-black text-sm font-semibold hover:bg-cat-yellow-light disabled:opacity-50 transition-colors"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                      Check Out
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden animate-fade-in">
              <div className="px-5 py-4 border-b border-border-default flex items-center gap-2">
                <History className="w-4 h-4 text-text-muted" />
                <h3 className="text-sm font-semibold text-text-primary">Recent Events</h3>
              </div>
              <div className="divide-y divide-border-subtle">
                {history.slice(0, 10).map((evt, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${
                      evt.event_type === 'checkout' ? 'bg-status-high-bg' : 'bg-status-low-bg'
                    }`}>
                      {evt.event_type === 'checkout'
                        ? <LogOut className="w-3.5 h-3.5 text-status-high" />
                        : <LogIn className="w-3.5 h-3.5 text-status-low" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary capitalize">
                        {evt.event_type === 'checkout' ? 'Checked Out' : 'Checked In'}
                        {evt.operator_id && <span className="text-text-secondary"> · {evt.operator_id}</span>}
                        {evt.site_id && <span className="text-text-secondary"> · {evt.site_id}</span>}
                      </p>
                      <p className="text-[11px] text-text-muted mt-0.5">{evt.notes}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-text-muted">
                      <Clock className="w-3 h-3" />
                      {new Date(evt.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!equipment && !error && !loading && (
            <div className="bg-surface-card border border-border-default rounded-xl p-12 flex flex-col items-center justify-center text-center">
              <QrCode className="w-16 h-16 text-text-muted opacity-20 mb-4" />
              <h3 className="text-sm font-semibold text-text-secondary mb-1">No Equipment Selected</h3>
              <p className="text-xs text-text-muted">
                Scan a QR code or enter an equipment ID to begin check-in/check-out.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
