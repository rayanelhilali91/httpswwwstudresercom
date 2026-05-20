DROP POLICY IF EXISTS "studio-images authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "studio-images authenticated update own" ON storage.objects;
DROP POLICY IF EXISTS "studio-images authenticated delete own" ON storage.objects;
DROP POLICY IF EXISTS "Studio owners update own images" ON storage.objects;
DROP POLICY IF EXISTS "Studio owners delete own images" ON storage.objects;