-- DreamPost canonical initial schema.
-- This migration is intentionally idempotent so it can be applied to an empty
-- project or safely replayed while an existing schema is being synchronized.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('member','admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.post_status AS ENUM ('published','hidden','deleted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.media_type AS ENUM ('image','video','document','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.conversation_type AS ENUM ('member_admin','member_member'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.message_type AS ENUM ('text','image','video','document','system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.room_status AS ENUM ('active','expired','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.restriction_type AS ENUM ('community_post','send_message','account_suspended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.member_state AS ENUM ('pending','approved','blocked','suspended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  full_name text,
  email text,
  dob date,
  avatar_url text,
  bio text,
  state public.member_state NOT NULL DEFAULT 'pending',
  terms_accepted boolean NOT NULL DEFAULT false,
  profile_locked boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  chat_bg_url text,
  chat_category text NOT NULL DEFAULT 'general',
  theme text NOT NULL DEFAULT 'blush',
  status text NOT NULL DEFAULT 'pending',
  post_restricted boolean NOT NULL DEFAULT false,
  message_restricted boolean NOT NULL DEFAULT false,
  details_locked boolean NOT NULL DEFAULT false,
  accepted_terms boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  caption text,
  status public.post_status NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  hidden_at timestamptz,
  deleted_at timestamptz,
  hidden boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  media_type public.media_type NOT NULL DEFAULT 'image',
  storage_path text NOT NULL,
  file_name text,
  file_size_bytes bigint,
  mime_type text,
  width integer,
  height integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  position integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id,user_id)
);
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  media_path text,
  image_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_type public.conversation_type NOT NULL DEFAULT 'member_admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id,user_id)
);
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type public.message_type NOT NULL DEFAULT 'text',
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id),
  member_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  media_path text,
  media_type text
);
CREATE TABLE IF NOT EXISTS public.private_chatrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_code text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  max_members integer NOT NULL DEFAULT 10 CHECK (max_members BETWEEN 1 AND 10),
  status public.room_status NOT NULL DEFAULT 'active',
  closed_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.private_chatroom_members (
  room_id uuid NOT NULL REFERENCES public.private_chatrooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  PRIMARY KEY (room_id,user_id)
);
CREATE TABLE IF NOT EXISTS public.private_chatroom_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.private_chatrooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type public.message_type NOT NULL DEFAULT 'text',
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restriction public.restriction_type NOT NULL,
  imposed_by uuid REFERENCES auth.users(id),
  active boolean NOT NULL DEFAULT true,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.media_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_type public.media_type NOT NULL UNIQUE,
  max_size_mb numeric NOT NULL DEFAULT 10,
  enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.user_theme_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_id uuid REFERENCES public.themes(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role);
$$;
CREATE OR REPLACE FUNCTION public.is_active_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id=_user_id AND status='approved');
$$;
CREATE OR REPLACE FUNCTION public.can_interact(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id=_user_id AND status='approved' AND post_restricted=false);
$$;
CREATE OR REPLACE FUNCTION public.can_message(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id=_user_id AND status='approved' AND message_restricted=false);
$$;
CREATE OR REPLACE FUNCTION public.can_view_posts(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_active_member(_user_id) AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=_user_id AND post_restricted=true);
$$;

CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF public.has_role(auth.uid(),'admin') OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  NEW.id:=OLD.id; NEW.status:=OLD.status; NEW.state:=OLD.state;
  NEW.post_restricted:=OLD.post_restricted; NEW.message_restricted:=OLD.message_restricted;
  NEW.details_locked:=OLD.details_locked; NEW.profile_locked:=OLD.profile_locked;
  NEW.email:=OLD.email; NEW.username:=OLD.username; NEW.accepted_terms:=OLD.accepted_terms;
  NEW.terms_accepted:=OLD.terms_accepted; NEW.created_at:=OLD.created_at;
  IF OLD.details_locked OR OLD.profile_locked THEN NEW.full_name:=OLD.full_name; NEW.dob:=OLD.dob; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS guard_profile_update ON public.profiles;
CREATE TRIGGER guard_profile_update BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_chatrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_chatroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_chatroom_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_theme_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_select ON public.user_roles;
CREATE POLICY roles_select ON public.user_roles FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS roles_insert_member ON public.user_roles;
CREATE POLICY roles_insert_member ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND role='member');
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (id=auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (id=auth.uid());
DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING (id=auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (id=auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS community_posts_select ON public.community_posts;
CREATE POLICY community_posts_select ON public.community_posts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR (hidden=false AND status<>'deleted' AND public.can_view_posts(auth.uid())));
DROP POLICY IF EXISTS community_posts_admin ON public.community_posts;
CREATE POLICY community_posts_admin ON public.community_posts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS post_media_select ON public.post_media;
CREATE POLICY post_media_select ON public.post_media FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR (public.can_view_posts(auth.uid()) AND EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id=post_media.post_id AND p.hidden=false AND p.status<>'deleted')));
DROP POLICY IF EXISTS post_media_admin ON public.post_media;
CREATE POLICY post_media_admin ON public.post_media FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS post_likes_select ON public.post_likes;
CREATE POLICY post_likes_select ON public.post_likes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR user_id=auth.uid());
DROP POLICY IF EXISTS post_likes_write ON public.post_likes;
CREATE POLICY post_likes_write ON public.post_likes FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND public.can_interact(auth.uid()));
DROP POLICY IF EXISTS post_likes_delete ON public.post_likes;
CREATE POLICY post_likes_delete ON public.post_likes FOR DELETE TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS post_comments_select ON public.post_comments;
CREATE POLICY post_comments_select ON public.post_comments FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR (user_id=auth.uid() AND public.can_interact(auth.uid())));
DROP POLICY IF EXISTS post_comments_insert ON public.post_comments;
CREATE POLICY post_comments_insert ON public.post_comments FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND public.can_interact(auth.uid()));
DROP POLICY IF EXISTS post_comments_delete ON public.post_comments;
CREATE POLICY post_comments_delete ON public.post_comments FOR DELETE TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR sender_id=auth.uid() OR member_id=auth.uid() OR EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id=messages.conversation_id AND cm.user_id=auth.uid()));
DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id=auth.uid() AND (public.has_role(auth.uid(),'admin') OR public.can_message(auth.uid())));
DROP POLICY IF EXISTS messages_delete ON public.messages;
CREATE POLICY messages_delete ON public.messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR sender_id=auth.uid());
DROP POLICY IF EXISTS private_room_members_select ON public.private_chatroom_members;
CREATE POLICY private_room_members_select ON public.private_chatroom_members FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS private_room_messages_select ON public.private_chatroom_messages;
CREATE POLICY private_room_messages_select ON public.private_chatroom_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.private_chatroom_members m WHERE m.room_id=private_chatroom_messages.room_id AND m.user_id=auth.uid() AND m.left_at IS NULL));
DROP POLICY IF EXISTS private_room_messages_insert ON public.private_chatroom_messages;
CREATE POLICY private_room_messages_insert ON public.private_chatroom_messages FOR INSERT TO authenticated WITH CHECK (sender_id=auth.uid() AND (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.private_chatroom_members m WHERE m.room_id=private_chatroom_messages.room_id AND m.user_id=auth.uid() AND m.left_at IS NULL)));
DROP POLICY IF EXISTS notifications_self ON public.notifications;
CREATE POLICY notifications_self ON public.notifications FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS media_limits_select ON public.media_limits;
CREATE POLICY media_limits_select ON public.media_limits FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS media_limits_admin ON public.media_limits;
CREATE POLICY media_limits_admin ON public.media_limits FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS app_settings_select ON public.app_settings;
CREATE POLICY app_settings_select ON public.app_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS app_settings_admin ON public.app_settings;
CREATE POLICY app_settings_admin ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS community_posts_created_idx ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS post_media_post_idx ON public.post_media(post_id,sort_order);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages(conversation_id,created_at);
CREATE INDEX IF NOT EXISTS private_room_messages_idx ON public.private_chatroom_messages(room_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON public.profiles(lower(username)) WHERE username IS NOT NULL;

INSERT INTO public.media_limits(media_type,max_size_mb,enabled) VALUES
 ('image',10,true),('video',50,true),('document',7,true)
ON CONFLICT (media_type) DO NOTHING;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.post_media;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.private_chatroom_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.private_chatroom_members;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.private_chatrooms;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
