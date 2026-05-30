import { LaunchIncidentRequest } from "types/AI.type";
import { aiPostStream } from "./_aiPost";

export const generateLaunchIncidentStream = (
  params: LaunchIncidentRequest
): AsyncGenerator<string> =>
  aiPostStream("/api/ai/launch/inciting-incident/stream", params);
