import { functions } from "config/firebase.config";
import { httpsCallable } from "firebase/functions";
import { createApiFunction } from "api-calls/createApiFunction";
import { StatAllocationRequest, StatAllocationOutput } from "./_ai.type";

export const recommendStatAllocation = createApiFunction<
  StatAllocationRequest,
  StatAllocationOutput
>(
  async (params) => {
    const fn = httpsCallable<StatAllocationRequest, StatAllocationOutput>(
      functions,
      "recommendStatAllocation"
    );
    const result = await fn(params);
    return result.data;
  },
  "Failed to get stat recommendations. Please try again."
);
