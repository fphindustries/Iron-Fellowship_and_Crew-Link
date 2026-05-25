ALTER TABLE "yjs_documents" ALTER COLUMN "entity_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "world_ai_settings" DROP COLUMN IF EXISTS "provider";