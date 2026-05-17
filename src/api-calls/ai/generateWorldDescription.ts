import { api } from "config/api.config";
import { WorldDescriptionRequest, WorldDescriptionOutput } from "./_ai.type";

export const generateWorldDescription = (
  params: WorldDescriptionRequest
): Promise<WorldDescriptionOutput> =>
  api.post<WorldDescriptionOutput>("/api/ai/world/description", params);
