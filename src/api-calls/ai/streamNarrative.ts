import { supabase } from "config/supabase.config";
import { NarrativeRequestPayload } from "types/aiGuide.types";

export async function streamNarrative(
  payload: NarrativeRequestPayload,
  onChunk: (text: string) => void
): Promise<string> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token ?? "";
  if (!token) throw new Error("Not authenticated");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-narrative`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    streamDone = done;
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (!json) continue;
      try {
        const parsed = JSON.parse(json) as {
          message?: { text?: string };
          result?: unknown;
        };
        if (parsed.message?.text) {
          fullText += parsed.message.text;
          onChunk(fullText);
        }
      } catch {
        // ignore malformed SSE lines
      }
    }
  }

  return fullText;
}
