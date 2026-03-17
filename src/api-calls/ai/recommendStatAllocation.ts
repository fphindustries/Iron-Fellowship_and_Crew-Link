import { functions } from "config/firebase.config";
import { httpsCallable } from "firebase/functions";
import { createApiFunction } from "api-calls/createApiFunction";
import { StatAllocationRequest, StatAllocationOutput } from "./_ai.type";
import { recordAiCall } from "stores/aiDebug";

export const recommendStatAllocation = createApiFunction<
  StatAllocationRequest,
  StatAllocationOutput
>(
  async (params) => {
    recordAiCall("recommendStatAllocation", params);
    const fn = httpsCallable<StatAllocationRequest, StatAllocationOutput>(
      functions,
      "recommendStatAllocation"
    );
    const result = await fn(params);
    return result.data;
  },
  "Failed to get stat recommendations. Please try again."
);
