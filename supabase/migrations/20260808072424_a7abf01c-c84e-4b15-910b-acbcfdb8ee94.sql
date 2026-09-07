-- Canonical schema compatibility migration.
-- The original version referenced legacy `posts`/`comments` tables and could
-- fail with 42P01 on a fresh canonical Supabase project. The canonical tables,
-- functions, profile guards and realtime configuration are created by the
-- initial migration. Keep this migration intentionally idempotent.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_bg_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_category text NOT NULL DEFAULT 'general';

CREATE OR REPLACE FUNCTION public.guard_profile_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF public.has_role(auth.uid(),'admin') OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  NEW.id:=auth.uid();
  NEW.status:='pending';
  NEW.state:='pending'::public.member_state;
  NEW.post_restricted:=false;
  NEW.message_restricted:=false;
  NEW.details_locked:=false;
  NEW.profile_locked:=false;
  NEW.chat_category:='general';
  NEW.username:=lower(trim(NEW.username));
  NEW.email:=lower(coalesce(nullif(auth.jwt()->>'email',''),NEW.email));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS guard_profile_insert ON public.profiles;
CREATE TRIGGER guard_profile_insert BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_insert();

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key ON public.profiles(lower(username)) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_key ON public.profiles(lower(email)) WHERE email IS NOT NULL;

ALTER TABLE public.community_posts REPLICA IDENTITY FULL;
ALTER TABLE public.post_media REPLICA IDENTITY FULL;
ALTER TABLE public.post_likes REPLICA IDENTITY FULL;
ALTER TABLE public.post_comments REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='community_posts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='post_media') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.post_media;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='post_likes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='post_comments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
