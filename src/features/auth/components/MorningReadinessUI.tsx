import { logger } from '@lib/logger';
import React, { useEffect, useState } from 'react';
import { Printer, MonitorSmartphone, Scale, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../../shared/store/authStore';
import { DIContainer } from '../../../infrastructure/di/Container';

type CheckResult = 'idle' | 'pending' | 'success' | 'failed';

interface MorningReadinessUIProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const MorningReadinessUI: React.FC<MorningReadinessUIProps> = ({ onSuccess, onCancel }) => {
  const { user } = useAuthStore();
  
  const [printer, setPrinter] = useState<CheckResult>('idle');
  const [drawer, setDrawer] = useState<CheckResult>('idle');
  const [scale, setScale] = useState<CheckResult>('idle');
  
  const [blocked, setBlocked] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setBlocked(!(printer === 'success' && drawer === 'success' && scale === 'success'));
  }, [printer, drawer, scale]);

  const saveAudit = async (checkType: string, isSuccess: boolean, errorMsg?: string) => {
    try {
      const details = JSON.stringify({
        check: checkType,
        result: isSuccess ? 'SUCCESS' : 'FAILED',
        error: errorMsg,
        flag: 'READINESS_RESULT'
      });
      
      // Menggunakan UnitOfWork untuk memastikan Cryptographic Chaining tetap terjaga
      await DIContainer.unitOfWork.registerAudit(
        'HARDWARE_READINESS_CHECK',
        user?.name || 'UNKNOWN',
        details
      );
    } catch (err) {
      logger.error('Failed to save audit log for readiness check', { error: err instanceof Error ? err.message : String(err) });
    }
  };

  const runCheck = async (type: 'printer' | 'drawer' | 'scale') => {
    const setter = type === 'printer' ? setPrinter : type === 'drawer' ? setDrawer : setScale;
    setter('pending');
    setMessage(null);
    setRunning(true);
    
    try {
      let ok = false;
      if (type === 'printer') ok = await DIContainer.hardwareCheckService.testPrinter();
      if (type === 'drawer') ok = await DIContainer.hardwareCheckService.testDrawer();
      if (type === 'scale') ok = await DIContainer.hardwareCheckService.testScale();
      
      setter(ok ? 'success' : 'failed');
      await saveAudit(type, ok);

      if (!ok) setMessage('Salah satu perangkat gagal. Periksa koneksi kabel dan coba lagi.');
    } catch (err) {
      setter('failed');
      setMessage('Terjadi kesalahan sistem saat melakukan pengecekan hardware.');
      await saveAudit(type, false, String(err));
    } finally {
      setRunning(false);
    }
  };

  const handleOpenShift = () => {
    if (!blocked) {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-stone-200">
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-brand-900">Morning Readiness</h2>
              <p className="text-stone-500 text-sm mt-1">Selesaikan tes hardware sebelum membuka shift.</p>
            </div>
            <button onClick={onCancel} className="text-stone-400 hover:text-stone-600 transition-colors">
              <XCircle size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <CheckRow
              icon={<Printer size={20} />}
              label="Printer Thermal"
              description="Tes koneksi & cetak struk"
              status={printer}
              onTest={() => runCheck('printer')}
              disabled={printer === 'pending' || running}
            />

            <CheckRow
              icon={<MonitorSmartphone size={20} />}
              label="Cash Drawer"
              description="Tes pelatuk laci kasir"
              status={drawer}
              onTest={() => runCheck('drawer')}
              disabled={drawer === 'pending' || running}
            />

            <CheckRow
              icon={<Scale size={20} />}
              label="Timbangan Digital"
              description="Tes koneksi WebSerial"
              status={scale}
              onTest={() => runCheck('scale')}
              disabled={scale === 'pending' || running}
            />

            {message && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700 text-sm">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <p>{message}</p>
              </div>
            )}

            <div className="pt-6 mt-6 border-t border-stone-100">
              <button
                className="w-full py-3.5 bg-brand-900 text-white font-bold rounded-xl hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                disabled={blocked}
                onClick={handleOpenShift}
              >
                Lanjutkan Buka Shift
              </button>
              {blocked && (
                <p className="text-center text-xs text-stone-500 mt-3">
                  * Semua indikator harus berwarna hijau (SUCCESS) untuk melanjutkan.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

type CheckRowProps = {
  icon: React.ReactNode;
  label: string;
  description: string;
  status: CheckResult;
  onTest: () => void;
  disabled?: boolean;
};

const CheckRow: React.FC<CheckRowProps> = ({ icon, label, description, status, onTest, disabled }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-200">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white rounded-lg text-stone-500 shadow-sm border border-stone-100">
          {icon}
        </div>
        <div>
          <div className="font-bold text-stone-800">{label}</div>
          <div className="text-xs text-stone-500">{description}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {status === 'success' && (
          <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md">
            <CheckCircle2 size={14} /> OK
          </span>
        )}
        {status === 'failed' && (
          <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-md">
            <XCircle size={14} /> GAGAL
          </span>
        )}
        
        <button 
          className="px-4 py-2 bg-white border border-stone-300 text-stone-700 text-sm font-bold rounded-lg hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[100px] flex justify-center items-center"
          onClick={onTest} 
          disabled={disabled}
        >
          {status === 'pending' ? <Loader2 size={16} className="animate-spin" /> : 'Test'}
        </button>
      </div>
    </div>
  );
};
