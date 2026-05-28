CREATE TABLE "campaign_starship" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id" uuid NOT NULL UNIQUE REFERENCES "campaigns"("id") ON DELETE CASCADE,
  "name"        text,
  "history"     text,
  "quirks"      text[] NOT NULL DEFAULT '{}',
  "image"       jsonb
);
