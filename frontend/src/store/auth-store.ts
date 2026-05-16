import { create } from "zustand";
import { persist } from "zustand/middleware";

type Tokens = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

type CurrentUser = {
  id: string;
  email: string;
  full_name: string;
  role: { name: string } | string;
  status?: string | null;
  job_title?: string | null;
  signature?: string | null;
  avatar_url?: string | null;
  profile?: {
    department?: string | null;
  } | null;
};

type AuthState = {
  tokens: Tokens | null;
  user: CurrentUser | null;
  setTokens: (tokens: Tokens | null) => void;
  setUser: (user: CurrentUser | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      tokens: null,
      user: null,
      setTokens: (tokens) => set({ tokens }),
      setUser: (user) => set({ user }),
      logout: () => set({ tokens: null, user: null }),
    }),
    { name: "workflow-pro-auth" },
  ),
);
