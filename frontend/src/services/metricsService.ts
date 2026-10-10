import api from "./api";

export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get("/health");
    return response.status === 200;
  } catch {
    return false;
  }
};

export const getMetrics = async (): Promise<string> => {
  const response = await api.get<string>("/metrics");
  return response.data;
};