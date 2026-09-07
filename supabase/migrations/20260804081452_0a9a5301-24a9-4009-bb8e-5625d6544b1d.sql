GRANT EXECUTE ON FUNCTION public.is_active_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_interact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_message(uuid) TO authenticated;