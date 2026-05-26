import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'Weean' | 'Bảo Vy';

interface AuthState {
  userRole: UserRole | null;
  isLoading: boolean;
  setUserRole: (role: UserRole | null) => Promise<void>;
  loadUserRole: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  userRole: null,
  isLoading: true,
  setUserRole: async (role) => {
    try {
      if (role) {
        await AsyncStorage.setItem('walo_user_role', role);
      } else {
        await AsyncStorage.removeItem('walo_user_role');
      }
      set({ userRole: role });
    } catch (e) {
      console.error('Lỗi khi lưu vai trò người dùng:', e);
    }
  },
  loadUserRole: async () => {
    try {
      set({ isLoading: true });
      const role = await AsyncStorage.getItem('walo_user_role');
      set({ userRole: role as UserRole | null, isLoading: false });
    } catch (e) {
      console.error('Lỗi khi đọc vai trò người dùng:', e);
      set({ isLoading: false });
    }
  },
  logout: async () => {
    try {
      await AsyncStorage.removeItem('walo_user_role');
      set({ userRole: null });
    } catch (e) {
      console.error('Lỗi khi logout:', e);
    }
  },
}));
