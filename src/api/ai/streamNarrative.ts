import { NarrativeRequestPayload } from "types/aiGuide.types";
import { aiPostStream } from "./_aiPost";

export async function streamNarrative(
  payload: NarrativeRequestPayload,
  onChunk: (text: string) => void
): Promise<string> {
  let full = "";
  for await (const chunk of aiPostStream("/api/ai/narrative/stream", payload)) {
    full += chunk;
    onChunk(chunk);
  }
  return full;
}
