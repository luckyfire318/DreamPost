ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_category text NOT NULL DEFAULT 'general';

CREATE OR REPLACE FUNCTION public.guard_profile_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.id := OLD.id;
  NEW.status := OLD.status;
  NEW.post_restricted := OLD.post_restricted;
  NEW.message_restricted := OLD.message_restricted;
  NEW.details_locked := OLD.details_locked;
  NEW.chat_category := OLD.chat_category;
  NEW.email := OLD.email;
  NEW.username := OLD.username;
  NEW.accepted_terms := OLD.accepted_terms;
  NEW.created_at := OLD.created_at;
  IF OLD.details_locked THEN
    NEW.full_name := OLD.full_name;
    NEW.dob := OLD.dob;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_profile_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.id := auth.uid();
  NEW.status := 'pending'::member_status;
  NEW.post_restricted := false;
  NEW.message_restricted := false;
  NEW.details_locked := false;
  NEW.chat_category := 'general';
  NEW.username := lower(trim(NEW.username));
  NEW.email := lower(coalesce(nullif(auth.jwt() ->> 'email', ''), NEW.email));
  RETURN NEW;
END;
$function$;