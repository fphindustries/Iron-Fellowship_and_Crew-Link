CREATE TABLE "campaign_scene_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"scene_id" text NOT NULL,
	"type" text NOT NULL,
	"actor_id" text,
	"visibility" text DEFAULT 'public' NOT NULL,
	"payload_json" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "campaign_scene_events" ADD CONSTRAINT "campaign_scene_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
