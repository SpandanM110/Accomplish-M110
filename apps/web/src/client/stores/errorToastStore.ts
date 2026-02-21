import { create } from 'zustand';

interface ErrorToastState {
  message: string | null;
  showError: (message: string) => void;
  dismiss: () => void;
}

export const useErrorToastStore = create<ErrorToastState>((set) => ({
  message: null,
  showError: (message: string) => set({ message }),
  dismiss: () => set({ message: null }),
}));
