/**
 * recommend-character-paths — Recommend Starforged background paths based on character concept
 *
 * Ported from functions/src/ai/recommendCharacterPaths.ts
 */
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getAuthUser } from "../_shared/supabase-client.ts";
import { callStructuredGeneration } from "../_shared/ai-providers.ts";

const BACKGROUNDS_REFERENCE = `
1–5: Battlefield Medic — HEALER, VETERAN
6–10: Delegate — BANNERSWORN, DIPLOMAT
11–15: Exobiologist — LORE HUNTER, NATURALIST
16–20: Far Trader — NAVIGATOR, TRADER
21–25: Fugitive Hunter — ARMORED, BOUNTY HUNTER
26–30: Hacker — INFILTRATOR, TECH
31–35: Hotshot Pilot — ACE, NAVIGATOR
36–40: Interstellar Scout — EXPLORER, VOIDBORN
41–45: Monster Hunter — GUNNER, SLAYER
46–50: Occultist — OUTCAST, SHADE
51–55: Operative — INFILTRATOR, BLADEMASTER
56–60: Outlaw — FUGITIVE, GUNSLINGER
61–65: Private Investigator — BRAWLER, SLEUTH
66–70: Prophet — DEVOTANT, SEER
71–75: Psionicist — KINETIC, VESTIGE
76–80: Smuggler — COURIER, SCOUNDREL
81–85: Spiritualist — HAUNTED, EMPATH
86–90: Starship Engineer — GEARHEAD, TECH
91–95: Supersoldier — AUGMENTED, MERCENARY
96–100: Tomb Raider — SCAVENGER, SCOUNDREL
`.trim();

const PATH_RECOMMENDATION_SCHEMA = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          backgroundName: { type: "string" },
          asset1: { type: "string" },
          asset2: { type: "string" },
          reasoning: { type: "string" },
        },
        required: ["backgroundName", "asset1", "asset2", "reasoning"],
        additionalProperties: false,
      },
    },
  },
  required: ["recommendations"],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const user = await getAuthUser(req);
  if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  let body: Record<string, unknown>;
  try {
    const raw = await req.json();
    body = raw.data ?? raw;
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const { description } = body as { description: string };
  if (!description?.trim()) {
    return new Response(JSON.stringify(null), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const systemPrompt = [
    "You are a character creation assistant for Ironsworn: Starforged, a sci-fi narrative RPG.",
    "Given a character concept description, recommend exactly 3 backgrounds from the provided table that best fit.",
    "Use ONLY background names and asset names from the table — do not invent new ones.",
    "Return asset names exactly as they appear in the table (e.g. 'ACE', 'LORE HUNTER').",
    "Keep reasoning brief (1-2 sentences) and focused on why the background fits the concept.",
  ].join("\n");

  const userPrompt = [
    `Available backgrounds:\n${BACKGROUNDS_REFERENCE}`,
    "",
    `Character concept: "${description}"`,
    "",
    "Recommend 3 backgrounds that best fit this concept.",
  ].join("\n");

  const resultText = await callStructuredGeneration({
    systemPrompt,
    userPrompt,
    schema: PATH_RECOMMENDATION_SCHEMA,
    schemaName: "path_recommendation_output",
  });

  const output = JSON.parse(resultText);

  return new Response(
    JSON.stringify(output),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
