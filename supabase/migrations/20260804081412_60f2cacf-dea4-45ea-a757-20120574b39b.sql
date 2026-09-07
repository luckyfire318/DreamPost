-- Storage policies. Safe to replay: every policy is dropped before creation.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_active_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_interact(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_message(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.guard_profile_update() FROM anon;

DROP POLICY IF EXISTS "avatars readable" ON storage.objects;
CREATE POLICY "avatars readable" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='avatars' AND (public.has_role(auth.uid(),'admin') OR (storage.foldername(name))[1]=auth.uid()::text));
DROP POLICY IF EXISTS "avatars own write" ON storage.objects;
CREATE POLICY "avatars own write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1]=auth.uid()::text);
DROP POLICY IF EXISTS "avatars own update" ON storage.objects;
CREATE POLICY "avatars own update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='avatars' AND (storage.foldername(name))[1]=auth.uid()::text)
WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1]=auth.uid()::text);
DROP POLICY IF EXISTS "avatars own delete" ON storage.objects;
CREATE POLICY "avatars own delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='avatars' AND (storage.foldername(name))[1]=auth.uid()::text);

DROP POLICY IF EXISTS "post media read" ON storage.objects;
CREATE POLICY "post media read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='post-media' AND (public.has_role(auth.uid(),'admin') OR public.can_view_posts(auth.uid())));
DROP POLICY IF EXISTS "post media admin write" ON storage.objects;
CREATE POLICY "post media admin write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='post-media' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "post media admin delete" ON storage.objects;
CREATE POLICY "post media admin delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='post-media' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "chat media read" ON storage.objects;
CREATE POLICY "chat media read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='chat-media' AND (public.has_role(auth.uid(),'admin') OR (storage.foldername(name))[1]=auth.uid()::text));
DROP POLICY IF EXISTS "chat media write" ON storage.objects;
CREATE POLICY "chat media write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='chat-media' AND (public.has_role(auth.uid(),'admin') OR ((storage.foldername(name))[1]=auth.uid()::text AND (public.can_message(auth.uid()) OR public.can_interact(auth.uid())))));
DROP POLICY IF EXISTS "chat media admin delete" ON storage.objects;
CREATE POLICY "chat media admin delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='chat-media' AND public.has_role(auth.uid(),'admin'));
