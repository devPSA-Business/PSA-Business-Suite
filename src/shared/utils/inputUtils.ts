import React from 'react';

/**
 * Mencegah input karakter yang tidak valid (seperti 'e', '+', '-') pada input bertipe number.
 * Digunakan pada event onKeyDown.
 */
export const handleNumberInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-'].includes(e.key)) {
    e.preventDefault();
  }
};

/**
 * Membersihkan string dari karakter non-numerik (kecuali titik desimal).
 * Mengubah koma menjadi titik untuk standarisasi desimal.
 * Mencegah multiple dots dan memastikan format angka valid.
 */
export const sanitizeNumberInput = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  const strValue = String(value);
  
  // Ganti koma dengan titik, lalu hapus semua karakter selain angka dan titik
  let normalized = strValue.replace(/,/g, '.').replace(/[^\d.]/g, '');
  
  // Mencegah multiple dots: Hanya izinkan satu titik pertama
  const dotIndex = normalized.indexOf('.');
  if (dotIndex !== -1) {
    const mainPart = normalized.substring(0, dotIndex + 1);
    const restPart = normalized.substring(dotIndex + 1).replace(/\./g, '');
    normalized = mainPart + restPart;
  }
  
  return normalized;
};

/**
 * Validasi ketat untuk nilai numerik (P1 Financial Guard).
 * Memeriksa apakah nilai adalah angka yang berhingga, bukan NaN, 
 * dan berada dalam range yang diizinkan (default 0 - 1M).
 */
export const isValidNumericValue = (
  value: string | number, 
  min: number = 0, 
  max: number = 1000000000
): boolean => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return (
    typeof num === 'number' && 
    isFinite(num) && 
    !isNaN(num) && 
    num >= min && 
    num <= max
  );
};
