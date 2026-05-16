import axios from "axios";

import { useSessionStore } from "@/store/session-store";

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = useSessionStore.getState().tokens?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

