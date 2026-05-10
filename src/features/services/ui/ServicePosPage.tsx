import { RepairForm } from '../components/RepairForm';

export function ServicePosPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-brand-900">Kasir Jasa</h1>
        <p className="text-stone-500 mt-2">
          Penerimaan perhiasan pelanggan untuk layanan reparasi, sepuh, atau patri.
        </p>
      </div>

      {/* Render RepairForm directly without additional card wrappers */}
      <RepairForm />
    </div>
  );
}
