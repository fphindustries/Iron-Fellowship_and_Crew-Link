import { LaunchOpeningSceneRequest } from "types/AI.type";
import { aiPostStream } from "./_aiPost";

export const generateLaunchOpeningSceneStream = (
  params: LaunchOpeningSceneRequest
): AsyncGenerator<string> =>
  aiPostStream("/api/ai/launch/opening-scene/stream", params);
