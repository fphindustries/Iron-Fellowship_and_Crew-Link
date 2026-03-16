// These types mirror functions/src/ai/_ai.type.ts.
// Keep in sync when modifying either side.

export type AiMode =
  | "storyGenerator"
  | "actionElaborator"
  | "stuckPlayer"
  | "sessionRecap"
  | "bookkeeper";

export type AiGameSystem = "ironsworn" | "starforged";

export type AiCampaignType = "solo" | "co-op" | "guided";

export interface AiRollResult {
  label: string;
  result: "hit" | "weakHit" | "miss";
  moveId?: string;
  oracleResult?: string;
}

export interface AiCharacterContext {
  name: string;
  stats: Record<string, number>;
  conditionMeters: Record<string, number>;
  momentum: number;
  activeAssets?: string[];
}

export interface AiTrackContext {
  label: string;
  difficulty: string;
  value: number;
}

export interface AiLocationContext {
  name: string;
  type?: string;
  fields?: Record<string, string>;
}

export interface AiNPCContext {
  name: string;
  role?: string;
  disposition?: string;
  goal?: string;
}

export interface AiCampaignContext {
  gameSystem: AiGameSystem;
  campaignName: string;
  campaignType: AiCampaignType;
  worldTruths?: Record<string, string>;
  activeVows: AiTrackContext[];
  activeJourneys: AiTrackContext[];
  characters: AiCharacterContext[];
  recentRolls: AiRollResult[];
  currentLocation?: AiLocationContext;
  currentNPCs?: AiNPCContext[];
  noteText?: string;
  freeformInput?: string;
}

export interface AiCopilotRequest {
  mode: AiMode;
  context: AiCampaignContext;
  campaignId: string;
}

export interface BookkeeperVowUpdate {
  label: string;
  suggestedProgress: number;
  notes: string | null;
}

export interface BookkeeperNPCChange {
  role: string | null;
  disposition: string | null;
  goal: string | null;
  revealedAspect: string | null;
}

export interface BookkeeperNPCUpdate {
  name: string;
  changes: BookkeeperNPCChange;
}

export interface BookkeeperLocationChange {
  type: string | null;
  trouble: string | null;
}

export interface BookkeeperLocationUpdate {
  name: string;
  changes: BookkeeperLocationChange;
}

export interface BookkeeperNewNPC {
  name: string;
  role: string | null;
  disposition: string | null;
}

export interface BookkeeperOutput {
  vowUpdates: BookkeeperVowUpdate[];
  npcUpdates: BookkeeperNPCUpdate[];
  locationUpdates: BookkeeperLocationUpdate[];
  newNPCs: BookkeeperNewNPC[];
  canonFacts: string[];
}

export interface SessionRecapOutput {
  summary: string;
  canonFacts: string[];
  npcMentions: { name: string; context: string }[];
  locationMentions: { name: string; context: string }[];
  suggestedNoteTitle: string;
}

export interface AiCopilotResponse {
  eventId: string;
  mode: AiMode;
  text?: string;
  bookkeeper?: BookkeeperOutput;
  recap?: SessionRecapOutput;
}

export interface PathRecommendation {
  backgroundName: string;
  asset1: string;
  asset2: string;
  reasoning: string;
}

export interface PathRecommendationOutput {
  recommendations: PathRecommendation[];
}

export interface PathRecommendationRequest {
  description: string;
}

export interface BackstoryRequest {
  prompt: string;
}

export interface BackstoryOutput {
  backstory: string;
}

export interface VowRequest {
  paths: string[];
  backstory: string;
  prompt: string;
}

export interface VowOutput {
  vow: string;
}

export interface AssetRecommendationRequest {
  paths: string[];
  backstory: string;
  backgroundVow: string;
}

export interface AssetRecommendation {
  assetName: string;
  reasoning: string;
}

export interface AssetRecommendationOutput {
  recommendations: AssetRecommendation[];
}

// --- Stat allocation (character creation) ---

export interface StatAllocationEntry {
  key: string;
  label: string;
  description: string;
}

export interface StatAllocationRequest {
  paths: string[];
  backstory: string;
  backgroundVow: string;
  stats: StatAllocationEntry[];
}

export interface StatAllocation {
  statKey: string;
  value: number;
}

export interface StatAllocationOutput {
  allocations: StatAllocation[];
  reasoning: string;
}

export type AiEventStatus = "pending" | "accepted" | "rejected" | "edited";

export interface AiEventDocument {
  type: AiMode;
  contextSnapshot: Partial<AiCampaignContext>;
  response: AiCopilotResponse;
  status: AiEventStatus;
  canonized: boolean;
  createdAt: Date;
  createdBy: string;
}
