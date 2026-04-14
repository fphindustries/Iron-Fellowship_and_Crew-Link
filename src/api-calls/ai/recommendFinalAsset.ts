import { supabase } from "config/supabase.config";
import { createApiFunction } from "api-calls/createApiFunction";
import { AssetRecommendationRequest, AssetRecommendationOutput } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const recommendFinalAsset = createApiFunction<
  AssetRecommendationRequest,
  AssetRecommendationOutput
>(
  async (params) => {
    recordAiCall("recommendFinalAsset", params);
    const { data, error } = await supabase.functions.invoke<AssetRecommendationOutput>(
      "recommend-final-asset",
      { body: params }
    );
    if (error) throw error;
    return data as AssetRecommendationOutput;
  },
  "Failed to get asset recommendations. Please try again."
);
