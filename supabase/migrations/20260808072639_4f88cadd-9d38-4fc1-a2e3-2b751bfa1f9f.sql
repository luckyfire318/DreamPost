REVOKE ALL ON FUNCTION public.guard_profile_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_insert() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_interact(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_message(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_active_member(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_interact(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_message(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_member(uuid) TO authenticated, service_role;