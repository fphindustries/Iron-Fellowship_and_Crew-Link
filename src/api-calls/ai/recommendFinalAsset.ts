import { api } from "config/api.config";
import { AssetRecommendationRequest, AssetRecommendationOutput } from "./_ai.type";

export const recommendFinalAsset = (
  params: AssetRecommendationRequest
): Promise<AssetRecommendationOutput> =>
  api.post<AssetRecommendationOutput>("/api/ai/character/asset", params);
