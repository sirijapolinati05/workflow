import axios from "axios";
import { useAuthStore } from "@/store/auth-store";

// Temporary console log for debugging production URL issues
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";
console.log("DEBUG: Connecting to API at:", API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().tokens?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const refreshToken = useAuthStore.getState().tokens?.refresh_token;
    if (error.response?.status === 401 && refreshToken && !error.config._retry) {
      error.config._retry = true;
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      useAuthStore.getState().setTokens(data);
      error.config.headers.Authorization = `Bearer ${data.access_token}`;
      return axios(error.config);
    }
    throw error;
  },
);
