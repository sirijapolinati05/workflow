import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Tokens = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status?: string | null;
};

type SessionState = {
  tokens: Tokens | null;
  user: User | null;
  setTokens: (tokens: Tokens | null) => void;
  setUser: (user: User | null) => void;
  clear: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      tokens: null,
      user: null,
      setTokens: (tokens) => set({ tokens }),
      setUser: (user) => set({ user }),
      clear: () => set({ tokens: null, user: null }),
    }),
    {
      name: "workflow-pro-mobile-session",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
