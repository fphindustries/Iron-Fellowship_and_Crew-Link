import { firebaseAuth, projectId, functions } from "config/firebase.config";
import { NarrativeRequestPayload } from "types/aiGuide.types";

const FUNCTION_NAME = "generateNarrative";
const DEFAULT_REGION = "us-central1";

export function getGenerateNarrativeUrl(): string {
  const emulatorOrigin = (functions as unknown as { emulatorOrigin?: string })
    .emulatorOrigin;
  if (emulatorOrigin) {
    return `${emulatorOrigin}/${projectId}/${DEFAULT_REGION}/${FUNCTION_NAME}`;
  }
  return `https://${DEFAULT_REGION}-${projectId}.cloudfunctions.net/${FUNCTION_NAME}`;
}

export async function streamNarrative(
  payload: NarrativeRequestPayload,
  onChunk: (text: string) => void
): Promise<string> {
  const idToken = await firebaseAuth.currentUser?.getIdToken();
  if (!idToken) throw new Error("Not authenticated");

  const response = await fetch(getGenerateNarrativeUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ data: payload }),
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
