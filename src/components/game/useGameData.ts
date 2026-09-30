import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { makeCampaign, makeCharacter, makeNpc, type Campaign, type Character, type Npc } from '@/lib/game';

export function useGameData() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [characters, setCharacters] = useState<Character[]>(() => [makeCharacter()]);
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => [makeCampaign()]);
  const [npcs, setNpcs] = useState<Npc[]>(() => [makeNpc()]);
  const [error, setError] = useState('');
  const [profileName, setProfileName] = useState('');
  const [memberships, setMemberships] = useState<{campaign_id:string;user_id:string;character_id:string|null}[]>([]);
  const [partyCharacters, setPartyCharacters] = useState<Character[]>([]);
  const [demoHydrated, setDemoHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('herdeiros-demo-v1');
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.characters)) setCharacters(saved.characters);
        if (Array.isArray(saved.campaigns)) setCampaigns(saved.campaigns);
        if (Array.isArray(saved.npcs)) setNpcs(saved.npcs);
      } else {
        window.localStorage.setItem('herdeiros-demo-v1', JSON.stringify({ characters: [makeCharacter()], campaigns: [makeCampaign()], npcs: [makeNpc()] }));
      }
    } catch { /* Invalid demo data starts a fresh session. */ }
    setDemoHydrated(true);
  }, []);
  useEffect(() => {
    if (demoHydrated && ready && !userId) window.localStorage.setItem('herdeiros-demo-v1', JSON.stringify({ characters, campaigns, npcs }));
  }, [demoHydrated, ready, userId, characters, campaigns, npcs]);
  const load = useCallback(async (id: string) => {
    const [sheets, rooms, enemies, memberRows, profile] = await Promise.all([supabase.from('sheets').select('*').eq('user_id', id).order('created_at'), supabase.from('campaigns').select('*').order('created_at'), supabase.from('npcs').select('*').order('created_at'), supabase.from('campaign_members').select('*'),supabase.from('profiles').select('display_name').eq('id',id).maybeSingle()]);
    if (sheets.error || rooms.error || enemies.error || memberRows.error) setError(sheets.error?.message || rooms.error?.message || enemies.error?.message || memberRows.error?.message || 'Não foi possível carregar os dados.');
    else { setCharacters((sheets.data ?? []) as unknown as Character[]); setCampaigns((rooms.data ?? []) as unknown as Campaign[]); setNpcs((enemies.data ?? []) as unknown as Npc[]); setMemberships((memberRows.data ?? []) as {campaign_id:string;user_id:string;character_id:string|null}[]); const memberIds=(memberRows.data??[]).map(m=>m.character_id).filter((value):value is string=>!!value); if(memberIds.length){ const party=await supabase.from('sheets').select('*').in('id',memberIds); if(party.error)setError(party.error.message); else setPartyCharacters((party.data??[]) as unknown as Character[]); }else setPartyCharacters([]); setProfileName(profile.data?.display_name || ''); setError(''); }
    setReady(true);
  }, []);
  useEffect(() => { let active = true; supabase.auth.getUser().then(async ({ data }) => { if (!active) return; const id = data.user?.id ?? null; setUserId(id); if (id) { const name=data.user?.user_metadata?.['display_name']; if(typeof name==='string'&&name.trim()) await supabase.from('profiles').upsert({id,display_name:name.trim().slice(0,60)},{onConflict:'id',ignoreDuplicates:true}); if(active)void load(id); }else setReady(true); }); const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='USER_UPDATED')void supabase.auth.getUser().then(({data})=>{if(!active)return; const next=data.user?.id??null;setUserId(next);if(next)void load(next);else {setMemberships([]);setPartyCharacters([]);setReady(true)};});}); return () => { active = false; subscription.unsubscribe(); }; }, [load]);
  async function saveCharacter(character: Character) {
    setCharacters(prev => prev.map(c => c.id === character.id ? character : c));
    if (!userId) return;
    const { error: err } = await supabase.from('sheets').update(character).eq('id', character.id).eq('user_id', userId);
    if (err) setError(err.message);
  }
  async function addCharacter() {
    const character = makeCharacter();
    if (userId) { const { data, error: err } = await supabase.from('sheets').insert({ ...character, user_id: userId }).select().single(); if (err) { setError(err.message); return null; } setCharacters(prev => [...prev, data as unknown as Character]); return data.id; }
    setCharacters(prev => [...prev, character]); return character.id;
  }
  async function deleteCharacter(id: string) { if (userId) { const { error: err } = await supabase.from('sheets').delete().eq('id', id).eq('user_id', userId); if (err) { setError(err.message); return; } } setCharacters(prev => prev.filter(c => c.id !== id)); }
  async function saveCampaign(campaign: Campaign) { setCampaigns(prev => prev.map(c => c.id === campaign.id ? campaign : c)); if (userId) { const { error: err } = await supabase.from('campaigns').update(campaign).eq('id', campaign.id).eq('master_id', userId); if (err) setError(err.message); } }
  async function addCampaign() { const campaign = { ...makeCampaign(), code: Math.random().toString(36).slice(2,8).toUpperCase() }; if (userId) { const { data, error: err } = await supabase.from('campaigns').insert({ ...campaign, master_id: userId }).select().single(); if (err) { setError(err.message); return null; } setCampaigns(prev => [...prev, data as unknown as Campaign]); return data.id; } setCampaigns(prev => [...prev, campaign]); return campaign.id; }
  async function saveNpc(npc: Npc) { setNpcs(prev => prev.map(n => n.id === npc.id ? npc : n)); if (userId) { const { error: err } = await supabase.from('npcs').update(npc).eq('id', npc.id); if (err) setError(err.message); } }
  async function addNpc(campaignId: string) { const npc = makeNpc(); if (userId) { const { data, error: err } = await supabase.from('npcs').insert({ ...npc, campaign_id: campaignId }).select().single(); if (err) { setError(err.message); return null; } setNpcs(prev => [...prev, data as unknown as Npc]); return data.id; } setNpcs(prev => [...prev, npc]); return npc.id; }
  async function deleteNpc(id: string) { if (userId) { const { error: err } = await supabase.from('npcs').delete().eq('id', id); if (err) { setError(err.message); return; } } setNpcs(prev => prev.filter(n => n.id !== id)); }
  async function saveProfile(name: string) { if (!userId) return; const trimmed=name.trim().slice(0,60); if (!trimmed) { setError('Informe um nome de perfil.'); return; } const {error:err}=await supabase.from('profiles').upsert({id:userId,display_name:trimmed}); if(err)setError(err.message); else setProfileName(trimmed); }
  async function setRoomPassword(id:string,password:string) { if (!userId) return 'Entre na sua conta para criar uma senha.'; const {error:err}=await supabase.rpc('set_campaign_password',{p_campaign:id,p_password:password}); return err?.message??null; }
  async function joinRoom(code:string,password:string) { if (!userId) return 'Entre na sua conta para participar da mesa.'; const {data, error:err}=await supabase.rpc('join_campaign',{p_code:code,p_password:password}); if(err) return err.message; await load(userId); return data; }
  async function selectMemberCharacter(campaignId:string,characterId:string|null) {if(!userId)return; const {error:err}=await supabase.from('campaign_members').update({character_id:characterId}).eq('campaign_id',campaignId).eq('user_id',userId); if(err)setError(err.message); else setMemberships(prev=>prev.map(m=>m.campaign_id===campaignId&&m.user_id===userId?{...m,character_id:characterId}:m));}
  async function leaveRoom(campaignId:string){if(!userId)return; const {error:err}=await supabase.from('campaign_members').delete().eq('campaign_id',campaignId).eq('user_id',userId); if(err)setError(err.message);else await load(userId);}
  useEffect(()=>{if(!userId)return; const channel=supabase.channel(`herdeiros-live-${userId}`).on('postgres_changes',{event:'*',schema:'public',table:'campaigns'},()=>void load(userId)).on('postgres_changes',{event:'*',schema:'public',table:'npcs'},()=>void load(userId)).on('postgres_changes',{event:'*',schema:'public',table:'campaign_members'},()=>void load(userId)).on('postgres_changes',{event:'*',schema:'public',table:'sheets'},()=>void load(userId)).subscribe(); return ()=>{void supabase.removeChannel(channel)}},[userId,load]);
  return { userId, ready, characters, partyCharacters, campaigns, npcs, memberships, profileName, error, saveProfile, setRoomPassword, joinRoom, selectMemberCharacter, leaveRoom, saveCharacter, addCharacter, deleteCharacter, saveCampaign, addCampaign, saveNpc, addNpc, deleteNpc };
}
