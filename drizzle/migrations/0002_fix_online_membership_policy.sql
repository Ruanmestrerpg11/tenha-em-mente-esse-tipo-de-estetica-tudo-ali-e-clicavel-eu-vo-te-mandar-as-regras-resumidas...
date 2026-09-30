CREATE OR REPLACE FUNCTION public.is_campaign_master(p_campaign uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM public.campaigns c WHERE c.id=p_campaign AND c.master_id=auth.uid()) $$;
REVOKE ALL ON FUNCTION public.is_campaign_master(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_campaign_master(uuid) TO authenticated;
DROP POLICY "Member reads membership" ON public.campaign_members;
CREATE POLICY "Member reads membership" ON public.campaign_members FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_campaign_master(campaign_id));