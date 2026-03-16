export interface BackstoryPrompt {
  rollMin: number;
  rollMax: number;
  prompt: string;
}

export const BACKSTORY_PROMPTS: BackstoryPrompt[] = [
  { rollMin: 1,   rollMax: 7,   prompt: "You abandoned your kin after learning a troubling truth" },
  { rollMin: 8,   rollMax: 13,  prompt: "You are guided by a vision or prophecy" },
  { rollMin: 14,  rollMax: 20,  prompt: "You are haunted by past actions or failures" },
  { rollMin: 21,  rollMax: 27,  prompt: "You are running from a criminal past" },
  { rollMin: 28,  rollMax: 34,  prompt: "You are the sole survivor of an attack or calamity" },
  { rollMin: 35,  rollMax: 40,  prompt: "You escaped an abusive or unjust situation" },
  { rollMin: 41,  rollMax: 46,  prompt: "You have no memory of your former life" },
  { rollMin: 47,  rollMax: 53,  prompt: "You rejected a duty or destiny" },
  { rollMin: 54,  rollMax: 60,  prompt: "You were banished from your former home" },
  { rollMin: 61,  rollMax: 67,  prompt: "You were denied a birthright" },
  { rollMin: 68,  rollMax: 74,  prompt: "You were on your own for as long as you can remember" },
  { rollMin: 75,  rollMax: 81,  prompt: "You were sent away on a prolonged mission" },
  { rollMin: 82,  rollMax: 87,  prompt: "You were taken or lured away by someone" },
  { rollMin: 88,  rollMax: 94,  prompt: "Your ambitions outgrew your humble origins" },
  { rollMin: 95,  rollMax: 100, prompt: "Your wanderlust carried you far away" },
];

export function getPromptForRoll(roll: number): BackstoryPrompt | undefined {
  return BACKSTORY_PROMPTS.find((p) => roll >= p.rollMin && roll <= p.rollMax);
}
