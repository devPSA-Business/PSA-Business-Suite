import React from 'react';
import { DeadLetterQueueViewer } from '../components/DeadLetterQueueViewer';

export function DeadLetterQueuePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-800">Dead Letter Queue (DLQ)</h1>
        <p className="text-stone-500 mt-1">Mengelola sinkronisasi data yang gagal dan macet dari server lokal ke cloud.</p>
      </div>
      
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-sm">
        <DeadLetterQueueViewer />
      </div>
    </div>
  );
}
