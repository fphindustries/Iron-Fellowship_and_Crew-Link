import { SectorGenerationRequest, SectorGenerationOutput } from "types/AI.type";
import { aiPostStream } from "./_aiPost";

export async function generateSectorContent(
  params: SectorGenerationRequest
): Promise<SectorGenerationOutput> {
  let text = "";
  for await (const chunk of aiPostStream("/api/ai/sector/content", params)) {
    text += chunk;
  }
  if (!text) throw new Error("Sector generation returned no result");
  return JSON.parse(text) as SectorGenerationOutput;
}
