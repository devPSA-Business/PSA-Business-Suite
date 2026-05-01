import { useRouter, useNavigate, useLocation } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { NavigationMap } from './navigation/NavigationMap';

export function BackButton() {
  const router = useRouter();
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // Cek jika ada history yang cukup untuk kembali (lebih dari 2 karena halaman saat ini dan halaman awal)
    if (window.history.length > 2) {
      router.history.back();
    } else {
      // Jika tidak, gunakan peta navigasi sebagai fallback cerdas
      const parentPath = NavigationMap[location.pathname] || '/';
      navigate({ to: parentPath, replace: true });
    }
  };

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-2 text-stone-500 hover:text-brand-900 transition-colors font-medium mb-4 md:mb-6 w-fit active:scale-95"
    >
      <ArrowLeft size={20} />
      <span>Kembali</span>
    </button>
  );
}
