import { functions } from "config/firebase.config";
import { httpsCallable } from "firebase/functions";
import { createApiFunction } from "api-calls/createApiFunction";
import { AssetRecommendationRequest, AssetRecommendationOutput } from "./_ai.type";

export const recommendFinalAsset = createApiFunction<
  AssetRecommendationRequest,
  AssetRecommendationOutput
>(
  async (params) => {
    const fn = httpsCallable<AssetRecommendationRequest, AssetRecommendationOutput>(
      functions,
      "recommendFinalAsset"
    );
    const result = await fn(params);
    return result.data;
  },
  "Failed to get asset recommendations. Please try again."
);
