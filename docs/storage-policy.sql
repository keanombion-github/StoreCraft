-- Only public product/widget/logo imagery belongs in this bucket.
-- Supabase documents SQL bucket creation. Object writes always use its Storage API.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('storecraft-assets', 'storecraft-assets', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION commerce.can_upload_storecraft_asset()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM commerce."Stores" WHERE "OwnerUserId" = auth.uid()); $$;
REVOKE ALL ON FUNCTION commerce.can_upload_storecraft_asset() FROM PUBLIC;
GRANT USAGE ON SCHEMA commerce TO authenticated;
GRANT EXECUTE ON FUNCTION commerce.can_upload_storecraft_asset() TO authenticated;
CREATE POLICY storecraft_asset_upload ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'storecraft-assets'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$'
  AND commerce.can_upload_storecraft_asset()
);
