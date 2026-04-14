/**
 * generate-character-portraits — Generate character portrait images using OpenAI
 *
 * Ported from functions/src/ai/generateCharacterPortraits.ts
 * Portrait generation always uses OpenAI image models regardless of provider setting.
 */
import OpenAI from "https://esm.sh/openai@6.29.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getAuthUser } from "../_shared/supabase-client.ts";

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

  const { look, act, wear, pronouns, paths, portraitStyleAnchor } = body as {
    look: string;
    act: string;
    wear: string;
    pronouns?: string;
    paths: string[];
    portraitStyleAnchor?: string;
  };

  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

  const pathsLine = paths?.length > 0 ? ` Character roles: ${paths.join(", ")}.` : "";
  const pronounsLine = pronouns ? ` Pronouns: ${pronouns}.` : "";
  const styleAnchorLine = portraitStyleAnchor ? ` Art style: ${portraitStyleAnchor}.` : "";

  const prompt = [
    "Ironsworn Starforged sci-fi RPG character portrait.",
    "Close-up portrait, face clearly visible and centered, head and shoulders only.",
    `Appearance: ${look}.`,
    `Personality: ${act}.`,
    `Wearing: ${wear}.`,
    pathsLine,
    pronounsLine,
    styleAnchorLine,
    "Digital art, dramatic lighting, square composition, no text, no watermarks.",
  ]
    .filter(Boolean)
    .join(" ");

  const result = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    n: 3,
    size: "1024x1024",
  });

  const images = (result.data ?? [])
    .map((d: { b64_json?: string }) => d.b64_json)
    .filter((b: string | undefined): b is string => typeof b === "string");

  return new Response(
    JSON.stringify({ images }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
