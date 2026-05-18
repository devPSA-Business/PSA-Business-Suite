/**
 * @ai_context: Banner indikator lingkungan DEV / Preview.
 * @business_rule: WAJIB muncul di lingkungan non-produksi agar owner tidak bingung
 *   mana yang Preview dan mana yang Produksi. TIDAK muncul di build produksi (VITE_IS_PREVIEW != true && PROD).
 * @security_tier: LOW — UI only, tidak mengubah data
 */

import { useState } from 'react';
import { FlaskConical, X, ExternalLink } from 'lucide-react';

const IS_PREVIEW = import.meta.env.VITE_IS_PREVIEW === 'true';
const IS_DEV = import.meta.env.DEV === true;
const PROD_URL = 'https://psa-business-suite.web.app';

export function DevPreviewBanner() {
  const [dismissed, setDismissed] = useState(false);

  // Tidak tampil di produksi murni
  if (!IS_PREVIEW && !IS_DEV) return null;
  if (dismissed) return null;

  const label = IS_DEV ? 'MODE DEVELOPER LOKAL' : 'PREVIEW — BUKAN PRODUKSI';
  const sublabel = IS_DEV
    ? 'Data & perubahan di sini tidak mempengaruhi toko'
    : 'Branch ini sedang dalam peninjauan sebelum ke produksi';

  return (
    <div
      data-component-id="DevPreviewBanner"
      data-error-domain="dev"
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between
                 bg-amber-400 text-amber-950 px-3 py-1.5 text-xs font-bold
                 shadow-md shadow-amber-500/30"
      role="banner"
      aria-label="Lingkungan preview — bukan produksi"
    >
      {/* Kiri: ikon + label */}
      <div className="flex items-center gap-2 min-w-0">
        <FlaskConical size={14} className="shrink-0" />
        <span className="tracking-wider uppercase truncate">{label}</span>
        <span className="hidden sm:inline text-amber-800 font-normal normal-case truncate">
          — {sublabel}
        </span>
      </div>

      {/* Kanan: link produksi + tutup */}
      <div className="flex items-center gap-3 shrink-0 ml-2">
        {!IS_DEV && (
          <a
            href={PROD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 underline underline-offset-2
                       hover:text-amber-900 transition-colors whitespace-nowrap"
          >
            <ExternalLink size={12} />
            <span className="hidden xs:inline">Buka Produksi</span>
          </a>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="p-0.5 rounded hover:bg-amber-500/40 transition-colors"
          aria-label="Tutup banner preview"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
