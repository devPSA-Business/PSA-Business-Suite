import { Printer } from 'lucide-react';
import { DIContainer } from '../../infrastructure/di/Container';
import { Transaction } from '../api/db';
import { useToastStore } from '../store/toastStore';

interface PrintButtonProps {
  transaction: Transaction;
}

export function PrintButton({ transaction }: PrintButtonProps) {
  const { addToast } = useToastStore();

  const handlePrint = async () => {
    try {
      await DIContainer.printService.print(transaction);
    } catch (error) {
      addToast((error as Error).message, 'error');
    }
  };

  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-sm font-medium transition-colors active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      <Printer size={16} />
      Cetak Struk
    </button>
  );
}
