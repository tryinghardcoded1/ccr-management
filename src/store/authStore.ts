import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useStore } from './index';

interface User {
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: async (email, password) => {
        const sysUsers = useStore.getState().systemUsers;
        const matchingUser = sysUsers.find(u => u.email === email && u.password === password && u.status === 'Active');

        if (matchingUser) {
          const user: User = {
            email: matchingUser.email,
            name: matchingUser.name,
            role: matchingUser.role.toLowerCase(),
          };
          set({ user, isAuthenticated: true });
          return true;
        }
        return false;
      },
      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'rental-auth-storage',
    }
  )
);
