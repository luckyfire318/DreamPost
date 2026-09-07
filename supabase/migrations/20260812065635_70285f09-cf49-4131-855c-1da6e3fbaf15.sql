-- Community post restriction migration.
-- Uses canonical community_posts/post_media names and is safe on existing projects.

ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.can_view_posts(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id=_user_id AND status='approved' AND post_restricted=false
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_posts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_posts(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "approved members read posts" ON public.community_posts;
DROP POLICY IF EXISTS community_posts_select ON public.community_posts;
CREATE POLICY community_posts_select ON public.community_posts
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR (hidden=false AND status<>'deleted' AND public.can_view_posts(auth.uid()))
);

DROP POLICY IF EXISTS "approved members read post media" ON public.post_media;
DROP POLICY IF EXISTS post_media_select ON public.post_media;
CREATE POLICY post_media_select ON public.post_media
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR (
    public.can_view_posts(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.community_posts p
      WHERE p.id=post_media.post_id AND p.hidden=false AND p.status<>'deleted'
    )
  )
);
