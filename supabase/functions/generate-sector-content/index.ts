/**
 * generate-sector-content — Generate settlement and NPC descriptions for a Starforged sector
 *
 * Ported from functions/src/ai/generateSectorContent.ts
 */
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getAuthUser } from "../_shared/supabase-client.ts";
import { callStructuredGeneration } from "../_shared/ai-providers.ts";

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    settlementDescriptions: {
      type: "array",
      items: { type: "string" },
      description: "One atmospheric player-facing description per settlement, in the same order as the input.",
    },
    npcDescription: {
      type: "string",
      description: "A vivid 1–2 sentence player-facing description of the NPC.",
    },
  },
  required: ["settlementDescriptions", "npcDescription"],
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

  const { sectorName, region, trouble, settlements, npc, worldContext } = body as {
    sectorName: string;
    region: string;
    trouble: string;
    settlements: {
      name: string;
      locationType: string;
      population: string;
      authority: string;
      projects: string;
      trouble: string;
      planet?: { name: string; className: string; atmosphere?: string };
    }[];
    npc: { name: string; role: string };
    worldContext?: {
      assumptions?: string;
      truths?: { name: string; description: string }[];
    };
  };

  const systemLines = [
    "You are a creative writer for Ironsworn: Starforged, a gritty sci-fi tabletop RPG.",
    "Write vivid, atmospheric descriptions for a newly generated sector of the Forge.",
    "Each settlement description should be 1–2 sentences, player-facing, and evoke the settlement's character based on its oracle-generated attributes.",
    "The NPC description should be 1–2 sentences capturing the character's appearance, manner, or reputation in a way that intrigues the players.",
    "Write in present tense. Do not use headers or bullet points. Keep prose tight and evocative.",
  ];

  if (worldContext?.assumptions) {
    systemLines.push("", "Setting assumptions:", worldContext.assumptions);
  }

  if (worldContext?.truths && worldContext.truths.length > 0) {
    const truthsText = worldContext.truths.map((t) => `${t.name}: ${t.description}`).join("\n");
    systemLines.push("", "World truths:", truthsText);
  }

  const settlementLines = settlements.map((s, i) => {
    const lines = [
      `Settlement ${i + 1}: ${s.name}`,
      `  Location type: ${s.locationType}`,
      `  Population: ${s.population}`,
      `  Authority: ${s.authority}`,
      `  Projects: ${s.projects}`,
      `  Trouble: ${s.trouble}`,
    ];
    if (s.planet) {
      lines.push(
        `  Planet: ${s.planet.name} (${s.planet.className})${s.planet.atmosphere ? `, Atmosphere: ${s.planet.atmosphere}` : ""}`
      );
    }
    return lines.join("\n");
  });

  const userPrompt = [
    `Sector: ${sectorName} (${region})`,
    `Sector trouble: ${trouble}`,
    "",
    "Settlements:",
    ...settlementLines,
    "",
    `NPC Connection: ${npc.name}, Role: ${npc.role}`,
    "",
    `Generate exactly ${settlements.length} settlement description(s) and 1 NPC description.`,
  ].join("\n");

  const raw = await callStructuredGeneration({
    systemPrompt: systemLines.join("\n"),
    userPrompt,
    schema: OUTPUT_SCHEMA,
    schemaName: "SectorGenerationOutput",
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("generate-sector-content: failed to parse JSON", { raw });
    return new Response(JSON.stringify(null), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(
    JSON.stringify(parsed),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
