import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { StockHistory } from '../../../shared/api/db';
import { DIContainer } from '@infrastructure/di/Container';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';

interface StockHistoryViewerProps {
  stockId: string;
}

export const StockHistoryViewer: React.FC<StockHistoryViewerProps> = React.memo(({ stockId }) => {
  const history = useLiveQuery(
    () => DIContainer.liveQueries.observeStockHistory(stockId),
    [stockId]
  );

  const getActionIcon = (action: StockHistory['action']) => {
    switch (action) {
      case 'ADD': return <ArrowUp className="w-4 h-4 text-green-600" />;
      case 'REMOVE': return <ArrowDown className="w-4 h-4 text-red-600" />;
      case 'UPDATE': return <RefreshCw className="w-4 h-4 text-blue-600" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-brand-900">Riwayat Stok</h3>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-brand-900">
            <tr>
              <th className="p-2 text-left">Waktu</th>
              <th className="p-2 text-left">Aksi</th>
              <th className="p-2 text-left">Perubahan</th>
              <th className="p-2 text-left">Stok Akhir</th>
              <th className="p-2 text-left">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {history?.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{format(item.timestamp, 'dd/MM/yyyy HH:mm')}</td>
                <td className="p-2 flex items-center gap-1">
                  {getActionIcon(item.action)}
                  {item.action}
                </td>
                <td className={`p-2 font-mono ${item.quantityChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {item.quantityChange > 0 ? '+' : ''}{item.quantityChange}
                </td>
                <td className="p-2 font-semibold">{item.newQuantity}</td>
                <td className="p-2 text-stone-600">{item.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!history || history.length === 0) && (
          <div className="p-4 text-center text-stone-500">Tidak ada riwayat stok.</div>
        )}
      </div>
    </div>
  );
});
