ALTER TABLE "yjs_documents" DROP CONSTRAINT "yjs_documents_entity_type_entity_id_unique";--> statement-breakpoint
ALTER TABLE "yjs_documents" ALTER COLUMN "entity_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "yjs_documents" ADD CONSTRAINT "yjs_documents_entity_type_entity_id_unique" UNIQUE("entity_type","entity_id");
