ALTER TABLE "campaign_scene_events" ADD COLUMN "session_id" uuid;

UPDATE "campaign_scene_events"
SET "session_id" = ("payload_json"->>'sessionId')::uuid
WHERE "payload_json"->>'sessionId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

ALTER TABLE "campaign_scene_events" ADD CONSTRAINT "campaign_scene_events_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
