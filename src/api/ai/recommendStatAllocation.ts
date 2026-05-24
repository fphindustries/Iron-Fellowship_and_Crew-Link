import { StatAllocationRequest, StatAllocationOutput } from "types/AI.type";
import { aiPost } from "./_aiPost";

export const recommendStatAllocation = (
  params: StatAllocationRequest
): Promise<StatAllocationOutput> =>
  aiPost<StatAllocationOutput>("/api/ai/character/stats", params);
