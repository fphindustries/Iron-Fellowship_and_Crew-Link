import { Timestamp } from "firebase/firestore";
import { Difficulty } from "types/Track.type";

export type CombatPosition = "in_control" | "in_a_bad_spot";

export interface CombatEnemy {
  name: string;
  notes?: string;
}

export interface CombatDocument {
  id: string;
  characterId: string;
  campaignId?: string;
  sessionId: string;
  objective: string;
  enemies: CombatEnemy[];
  position: CombatPosition;
  difficulty: Difficulty;
  trackId?: string;
  active: boolean;
  createdAt: Timestamp;
  endedAt?: Timestamp;
}
