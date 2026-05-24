import { AssetRecommendationRequest, AssetRecommendationOutput } from "types/AI.type";
import { aiPost } from "./_aiPost";

export const recommendFinalAsset = (
  params: AssetRecommendationRequest
): Promise<AssetRecommendationOutput> =>
  aiPost<AssetRecommendationOutput>("/api/ai/character/asset", params);
