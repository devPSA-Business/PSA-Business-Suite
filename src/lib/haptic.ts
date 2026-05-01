export const triggerHaptic = (type: 'light' | 'success' | 'error' = 'light') => {
  if ('vibrate' in navigator) {
    if (type === 'light') navigator.vibrate(50);
    else if (type === 'success') navigator.vibrate([50, 50, 50]);
    else if (type === 'error') navigator.vibrate(200);
  }
};
