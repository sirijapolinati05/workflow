import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

type QuickAccessRole = "ADMIN" | "EMPLOYEE";

type QuickAccessAccount = {
  id: string;
  label: string;
  email: string;
  role: QuickAccessRole;
  full_name: string;
  status?: string | null;
};

export const QUICK_ACCESS_PASSWORD = "1234";

export const QUICK_ACCESS_ACCOUNTS: QuickAccessAccount[] = [
  {
    id: "admin-krishna",
    label: "Krishna",
    email: "krishna@workflowpro.com",
    role: "ADMIN",
    full_name: "Krishna",
    status: "ACTIVE",
  },
  {
    id: "employee-aarav",
    label: "Aarav",
    email: "aarav@workflowpro.com",
    role: "EMPLOYEE",
    full_name: "Aarav",
    status: "ACTIVE",
  },
  {
    id: "employee-diyaa",
    label: "Diyaa",
    email: "diyaa@workflowpro.com",
    role: "EMPLOYEE",
    full_name: "Diyaa",
    status: "ACTIVE",
  },
  {
    id: "employee-isha",
    label: "Isha",
    email: "isha@workflowpro.com",
    role: "EMPLOYEE",
    full_name: "Isha",
    status: "ACTIVE",
  },
  {
    id: "employee-rithvik",
    label: "Rithvik",
    email: "rithvik@workflowpro.com",
    role: "EMPLOYEE",
    full_name: "Rithvik",
    status: "ACTIVE",
  },
  {
    id: "employee-saanvi",
    label: "Saanvi",
    email: "saanvi@workflowpro.com",
    role: "EMPLOYEE",
    full_name: "Saanvi",
    status: "ACTIVE",
  },
];

export async function login(email: string, password: string) {
  const { data } = await api.post("/auth/login", { email, password });
  useAuthStore.getState().setTokens(data);
  const me = await api.get("/auth/me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  useAuthStore.getState().setUser(me.data);
  return data;
}

export async function fetchCurrentUser() {
  const { data } = await api.get("/auth/me");
  useAuthStore.getState().setUser(data);
  return data;
}
