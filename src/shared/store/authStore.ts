import { create } from 'zustand';
import { UserRole } from '../../domain/models/User';
import type { User as FirebaseUser } from 'firebase/auth';

interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  branchId?: string;
}

interface AuthState {
  user: AuthUser | null; // Local PIN-verified user
  firebaseUser: FirebaseUser | null; // Cloud-verified user
  isFirebaseInitialized: boolean;
  isFirebaseReady: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  setFirebaseUser: (user: FirebaseUser | null) => void;
  setFirebaseReady: (status: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  firebaseUser: null,
  isFirebaseInitialized: false,
  isFirebaseReady: false,
  setFirebaseUser: (firebaseUser) => set({ firebaseUser, isFirebaseInitialized: true }),
  setFirebaseReady: (status) => set({ isFirebaseReady: status }),
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
