import { create } from 'zustand';

export interface HealthIssue {
  code: string;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
}

export interface HealthReport {
  timestamp: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  issues: HealthIssue[];
  storageUsedPercent: number;
  pendingSyncCount: number;
  dlqCount: number;
}

interface HealthState {
  currentReport: HealthReport | null;
  botVisible: boolean;
  setReport: (report: HealthReport) => void;
  showBot: () => void;
  hideBot: () => void;
}

export const useHealthStore = create<HealthState>((set) => ({
  currentReport: null,
  botVisible: false,
  setReport: (report) => {
    // Show bot automatically if critical issue found
    const shouldShow = report.status === 'CRITICAL';
    set((state) => ({ 
      currentReport: report,
      botVisible: state.botVisible || shouldShow
    }));
  },
  showBot: () => set({ botVisible: true }),
  hideBot: () => set({ botVisible: false })
}));
