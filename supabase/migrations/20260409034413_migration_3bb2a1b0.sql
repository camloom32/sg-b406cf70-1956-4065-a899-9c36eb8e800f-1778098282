-- Create storage bucket for showcase images
INSERT INTO storage.buckets (id, name, public)
VALUES ('showcase-images', 'showcase-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for public access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'showcase-images');

CREATE POLICY "Authenticated users can upload showcase images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'showcase-images' AND auth.role() = 'authenticated');