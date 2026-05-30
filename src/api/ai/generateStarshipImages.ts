import { aiPost } from "./_aiPost";

export const generateStarshipImages = (description: string): Promise<{ images: string[] }> =>
  aiPost<{ images: string[] }>("/api/ai/campaign/starship/images", { description });
