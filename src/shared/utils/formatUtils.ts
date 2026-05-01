export const formatCurrency = (value: string | number): string => {
  const num = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('id-ID');
};
