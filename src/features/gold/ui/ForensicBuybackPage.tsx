import { BuybackForm } from './BuybackForm';

export function ForensicBuybackPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-brand-900">Buyback Forensik</h1>
        <p className="text-stone-500 mt-1">
          Penerimaan emas dari pelanggan (termasuk tanpa surat/rusak) dengan standar audit ketat.
        </p>
      </div>
      
      <BuybackForm />
    </div>
  );
}
