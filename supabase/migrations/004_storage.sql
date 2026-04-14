-- =============================================================================
-- 004_storage.sql
-- Supabase Storage buckets and policies
-- Mirrors storage.rules from Firebase
-- =============================================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'character-portraits',
    'character-portraits',
    true,                           -- Public bucket — portraits are displayed to all players
    5242880,                        -- 5 MB (matches storage.rules: 5 * 1024 * 1024)
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  ),
  (
    'world-images',
    'world-images',
    false,                          -- Private bucket — requires auth to read
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- character-portraits bucket policies
-- mirrors: /characters/{userId}/characters/{characterId}/{allPaths=**}
--   read: public
--   write: owner (userId == request.auth.uid), max 5MB, images only
--   delete: owner
-- ---------------------------------------------------------------------------

-- Public read (bucket is public, so this is automatic, but explicit policy for clarity)
CREATE POLICY "character_portraits_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'character-portraits');

-- Owner upload: path must start with {userId}/ matching auth.uid()
CREATE POLICY "character_portraits_insert_owner"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'character-portraits'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "character_portraits_update_owner"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'character-portraits'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "character_portraits_delete_owner"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'character-portraits'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- world-images bucket policies
-- mirrors: /worlds/{worldId}/{locations|npcs|lore}/{itemId}/{allPaths=**}
--   read: authenticated
--   write: authenticated, max 5MB, images only
--   delete: authenticated
-- ---------------------------------------------------------------------------

CREATE POLICY "world_images_select_auth"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'world-images'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "world_images_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'world-images'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "world_images_update_auth"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'world-images'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "world_images_delete_auth"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'world-images'
    AND auth.uid() IS NOT NULL
  );
