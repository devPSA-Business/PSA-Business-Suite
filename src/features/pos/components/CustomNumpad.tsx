import React from 'react';
import { Delete } from 'lucide-react';

interface CustomNumpadProps {
  onPress: (value: string) => void;
  onDelete: () => void;
}

export const CustomNumpad = React.memo(({ onPress, onDelete }: CustomNumpadProps) => {
  const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'C'];

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-stone-100 rounded-xl">
      {buttons.map((btn) => (
        <button
          key={btn}
          onClick={() => (btn === 'C' ? onDelete() : onPress(btn))}
          className="h-12 sm:h-14 flex items-center justify-center text-lg sm:text-xl font-bold bg-white rounded-lg shadow-sm hover:bg-gold-100 active:bg-gold-200 transition-colors text-brand-900"
        >
          {btn === 'C' ? <Delete className="w-5 h-5 sm:w-6 sm:h-6" /> : btn}
        </button>
      ))}
    </div>
  );
});

CustomNumpad.displayName = 'CustomNumpad';
