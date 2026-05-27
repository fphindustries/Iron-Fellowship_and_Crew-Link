import { createWithEqualityFn } from "zustand/traditional";
import { immer } from "zustand/middleware/immer";
import { IStore } from "./store.type";
import { createCharacterSlice } from "./character/character.slice";
import { createAuthSlice } from "./auth/auth.slice";
import { createCampaignSlice } from "./campaign/campaign.slice";
import { createUsersSlice } from "./user/users.slice";
import { createWorldSlice } from "./world/world.slice";
import { shallow } from "zustand/shallow";
import { createSettingsSlice } from "./settings/settings.slice";
import { createNotesSlice } from "./notes/notes.slice";
import { createGameLogSlice } from "./gameLog/gameLog.slice";
import { createAppStateSlice } from "./appState/appState.slice";
import { createHomebrewSlice } from "./homebrew/homebrew.slice";
import { createRulesSlice } from "./rules/rules.slice";
import { createAiSlice } from "./ai/ai.slice";
import { createSessionLogSlice } from "./sessionLog/sessionLog.slice";
import { createAIGuideSlice } from "./aiGuide/aiGuide.slice";

export const useStore = createWithEqualityFn<IStore>()(
  immer((...params) => ({
    appState: createAppStateSlice(...params),
    characters: createCharacterSlice(...params),
    campaigns: createCampaignSlice(...params),
    worlds: createWorldSlice(...params),
    auth: createAuthSlice(...params),
    users: createUsersSlice(...params),
    settings: createSettingsSlice(...params),
    notes: createNotesSlice(...params),
    gameLog: createGameLogSlice(...params),
    sessionLog: createSessionLogSlice(...params),
    homebrew: createHomebrewSlice(...params),
    rules: createRulesSlice(...params),
    ai: createAiSlice(...params),
    aiGuide: createAIGuideSlice(...params),
  })),
  shallow
);
