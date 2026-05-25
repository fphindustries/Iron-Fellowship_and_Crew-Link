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

export async function* aiPostStream(
  endpoint: string,
  params: unknown
): AsyncGenerator<string> {
  recordAiCall(endpoint + " · request", params);
  for await (const event of api.postStream(endpoint, params)) {
    if (event._debug) {
      recordAiCall(endpoint + " · provider", event._debug);
    } else if (event.text) {
      yield event.text;
    }
  }
}
