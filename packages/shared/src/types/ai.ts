import { AiEventStatus, AiProvider } from "../enums.js";

export interface AiGuideResponse {
  mode: string;
  text?: string;
  bookkeeperOutput?: BookkeeperOutput;
}

export interface BookkeeperOutput {
  vows?: BookkeeperVowUpdate[];
  npcs?: BookkeeperNpcUpdate[];
  locations?: BookkeeperLocationUpdate[];
}

export interface BookkeeperVowUpdate {
  vowId?: string;
  label: string;
  progressDelta?: number;
  status?: string;
}

export interface BookkeeperNpcUpdate {
  npcId?: string;
  name: string;
  notes?: string;
}

export interface BookkeeperLocationUpdate {
  locationId?: string;
  name: string;
  notes?: string;
}

export interface AiEvent {
  id: string;
  campaignId: string;
  type: string;
  contextSnapshot: Record<string, unknown>;
  response?: AiGuideResponse;
  status: AiEventStatus;
  canonized: boolean;
  createdAt: Date;
  createdBy: string;
}

export interface WorldAiSettings {
  provider: AiProvider;
  worldTonePrompt?: string;
  assumptions?: string;
  modeConfigs?: Record<string, AiModeConfig>;
}

export interface AiModeConfig {
  customInstructions?: string;
  anthropicModel?: string;
  openaiModel?: string;
}
