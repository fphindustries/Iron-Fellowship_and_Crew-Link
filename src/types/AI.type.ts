// These types mirror functions/src/ai/_ai.type.ts.
// Keep in sync when modifying either side.

export type AiCopilotMode =
  | "storyGenerator"
  | "actionElaborator"
  | "stuckPlayer"
  | "sessionRecap"
  | "bookkeeper";

export type AiGuidedMode =
  | "sceneFrame"
  | "askOrAnswer"
  | "moveSuggestion"
  | "outcomeNarration"
  | "priceProposal"
  | "oracleInterpretation"
  | "clockAdvance"
  | "sceneChallengeGuidance"
  | "bookkeepingProposal"
  | "actionSuggestions"
  | "intentToMove"
  | "spotlightNudge";

export type AiMode = AiCopilotMode | AiGuidedMode;

export interface SuggestedAction {
  label: string;
  intentCategory: "investigative" | "risky" | "social" | "meta";
  moveName: string | null;
  stat: string | null;
  confidence: "high" | "medium" | "low";
  reason: string;
}

export interface ActionSuggestionsOutput {
  suggestions: SuggestedAction[];
}

export interface IntentToMoveOutput {
  moveName: string | null;
  stat: string | null;
  confidence: "high" | "medium" | "low";
  reason: string;
  assetSuggestions: string[];
}

export type AiGameSystem = "ironsworn" | "starforged";

export type AiCampaignType = "solo" | "co-op" | "guided" | "ai-guided";

// --- Provider & world AI settings ---

export type AiProviderName = "openai" | "anthropic";

export type AnthropicModelId =
  | "claude-sonnet-4-20250514"
  | "claude-haiku-4-5-20251001";

export interface WorldAiModeConfig {
  customInstructions?: string;
}

export interface WorldAiSettings {
  worldTonePrompt?: string;
  assumptions?: string;
  portraitStyleAnchor?: string;
  modeConfigs?: Partial<Record<AiMode, WorldAiModeConfig>>;
}

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

export interface AiGuideStateContext {
  currentScene?: {
    title: string;
    description: string;
    unresolvedQuestions: string[];
  };
  canonFacts?: string[];
  npcIntents?: Record<string, { currentIntent: string; hiddenAspects: string[]; firstImpressionRevealed: boolean }>;
  tensionClocks?: Array<{
    label: string;
    segments: number;
    filled: number;
    consequence: string;
  }>;
  sceneChallengeState?: {
    objective: string;
    progress: number;
    complicationsIntroduced: string[];
  } | null;
  spotlight?: {
    current?: string;
    recent: string[];
    quiet: string[];
  };
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
  guideState?: AiGuideStateContext;
}

export interface AiGuideRequest {
  mode: AiMode;
  context: AiCampaignContext;
  campaignId: string;
  worldId?: string;
}

export type LaunchIncidentSourceKey =
  | "truthsSelected"
  | "truthsQuestStarters"
  | "characterPaths"
  | "characterBackstory"
  | "starship"
  | "team"
  | "settlements"
  | "connection"
  | "sectorTrouble"
  | "actionTheme"
  | "characterGoal"
  | "starterTable";

export interface LaunchIncidentSource {
  key: LaunchIncidentSourceKey;
  label: string;
  rulebookPrompt: string;
}

export interface LaunchIncidentRequest {
  campaignId: string;
  worldId?: string;
  source: LaunchIncidentSource;
  oracleResults?: string[];
  previousIncidents?: string[];
  context: AiCampaignContext & {
    launchSetup?: {
      worldTruths: string[];
      characters: Array<{
        name: string;
        callsign?: string;
        role?: string;
        pronouns?: string;
        characteristics?: string;
        backstory?: string;
      }>;
      starship?: {
        name?: string | null;
        history?: string | null;
        quirks?: string[];
      } | null;
      sectors: Array<{
        name: string;
        region?: string;
        trouble?: string;
      }>;
      locations: Array<{
        name: string;
        type?: string;
        fields?: Record<string, string>;
      }>;
      npcs: Array<{
        name: string;
        role?: string;
        disposition?: string;
        goal?: string;
        rank?: string;
        callsign?: string;
      }>;
    };
  };
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

export interface AiGuideResponse {
  eventId: string;
  mode: AiMode;
  text?: string;
  bookkeeper?: BookkeeperOutput;
  recap?: SessionRecapOutput;
  structured?: object;
}

export interface PathRecommendation {
  backgroundName: string;
  roleName: string;
  asset1: string;
  asset2: string;
  reasoning: string;
}

export interface PathRecommendationOutput {
  recommendations: PathRecommendation[];
}

export interface PathRecommendationRequest {
  description: string;
  worldContext?: WorldContext;
}

export interface BackstoryRequest {
  prompt: string;
  paths?: string[];
  pathNames?: string[];
  role?: string;
  worldContext?: WorldContext;
}

export interface BackstoryOutput {
  backstory: string;
}

export interface VowRequest {
  paths: string[];
  backstory: string;
  prompt: string;
  role?: string;
  worldContext?: WorldContext;
}

export interface VowOutput {
  vow: string;
}

export interface AssetRecommendationRequest {
  paths: string[];
  backstory: string;
  backgroundVow: string;
  availableAssets: string[];
  worldContext?: WorldContext;
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
  finalAsset?: string;
  worldContext?: WorldContext;
}

export interface StatAllocation {
  statKey: string;
  value: number;
}

export interface StatAllocationOutput {
  allocations: StatAllocation[];
  reasoning: string;
}

// --- Randomize character appearance (character creation) ---

export interface RandomizeAppearanceRequest {
  paths: string[];
  backstory: string;
  backgroundVow: string;
  worldContext?: WorldContext;
}

export interface RandomizeAppearanceOutput {
  look: string;
  act: string;
  wear: string;
}

// --- Portrait generation (character creation) ---

export interface PortraitGenerationRequest {
  look: string;
  act: string;
  wear: string;
  pronouns?: string;
  paths: string[];
  role?: string;
  portraitStyleAnchor?: string;
}

export interface PortraitGenerationOutput {
  images: string[];
}

// --- World context (shared across character creation AI calls) ---

export interface WorldContext {
  truths?: WorldDescriptionTruth[];
  assumptions?: string;
}

// --- World description generation ---

export interface WorldDescriptionTruth {
  name: string;
  description: string;
}

export interface WorldDescriptionRequest {
  worldName: string;
  truths: WorldDescriptionTruth[];
  assumptions?: string;
  worldTonePrompt?: string;
}

export interface WorldDescriptionOutput {
  description: string;
}

// --- Character summary (character creation) ---

export interface CharacterSummaryRequest {
  name: string;
  paths: string[];
  backstory: string;
  backgroundVow: string;
  look: string;
  act: string;
  wear: string;
  pronouns: string;
  worldContext?: WorldContext;
}

export interface CharacterSummaryOutput {
  summary: string;
}

// --- Sector generation ---

export interface SectorGenerationSettlement {
  name: string;
  locationType: string;
  population: string;
  authority: string;
  projects: string;
  trouble?: string;
  firstLook?: string;
  isFocus?: boolean;
  planet?: {
    name: string;
    className: string;
    atmosphere?: string;
    observedFromSpace?: string;
    feature?: string;
    life?: string;
    diversity?: string;
    biomes?: string;
  };
}

export interface SectorGenerationRequest {
  sectorName: string;
  region: string;
  trouble: string;
  passageCount?: number;
  focusSettlementIndex?: number;
  settlements: SectorGenerationSettlement[];
  npc: { name: string; role: string; rank?: string; homeSettlementName?: string };
  stars?: { settlementName: string; stellarObject: string }[];
  worldContext?: WorldContext;
}

export interface SectorGenerationSettlementOutput {
  publicDescription: string;
  gmNotes: string;
  planetDescription: string | null;
}

export interface SectorGenerationOutput {
  settlementOutputs: SectorGenerationSettlementOutput[];
  npcPublicDescription: string;
  npcFirstLook: string;
  npcGoal: string;
  npcRevealedAspect: string;
  sectorPublicSummary?: string;
  sectorGMNotes: string;
  launchPacket?: {
    openingScene: string;
    visibleTrouble: string;
    rumors: string[];
    questStarters: string[];
    firstSessionQuestions: string[];
  };
}

export type AiEventStatus = "pending" | "accepted" | "rejected" | "edited";

export interface AiEventDocument {
  type: AiMode;
  contextSnapshot: Partial<AiCampaignContext>;
  response: AiGuideResponse;
  status: AiEventStatus;
  canonized: boolean;
  createdAt: Date;
  createdBy: string;
}
