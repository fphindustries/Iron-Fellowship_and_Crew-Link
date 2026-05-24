import { api } from "config/api.config";
import { recordAiCall } from "stores/aiDebug";

export async function aiPost<T>(endpoint: string, params: unknown): Promise<T> {
  recordAiCall(endpoint + " · request", params);
  const raw = await api.post<any>(endpoint, params);
  if (raw?._debug) {
    recordAiCall(endpoint + " · provider", raw._debug);
    const { _debug: _, ...rest } = raw;
    return rest as T;
  }
  return raw as T;
}
