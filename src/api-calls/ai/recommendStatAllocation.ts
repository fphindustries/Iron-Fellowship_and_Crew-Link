import { api } from "config/api.config";
import { StatAllocationRequest, StatAllocationOutput } from "./_ai.type";

export const recommendStatAllocation = (
  params: StatAllocationRequest
): Promise<StatAllocationOutput> =>
  api.post<StatAllocationOutput>("/api/ai/character/stats", params);
