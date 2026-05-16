import axios from "axios";

import { useAuthStore } from "@/store/auth-store";

const apiBaseUrl = "http://127.0.0.1:8000/api/v1";

export const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/v1",
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
      const { data } = await axios.post(`http://127.0.0.1:8000/api/v1/auth/refresh`, {
        refresh_token: refreshToken,
      });
      useAuthStore.getState().setTokens(data);
      error.config.headers.Authorization = `Bearer ${data.access_token}`;
      return axios(error.config);
    }
    throw error;
  },
);
