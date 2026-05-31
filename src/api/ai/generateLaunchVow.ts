import { LaunchVowRequest } from "types/AI.type";
import { aiPostStream } from "./_aiPost";

export const generateLaunchVowStream = (
  params: LaunchVowRequest
): AsyncGenerator<string> => aiPostStream("/api/ai/launch/vow/stream", params);
