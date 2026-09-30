import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { makeCampaign, makeCharacter, makeNpc, type Campaign, type Character, type Npc } from '@/lib/game';

export function useGameData() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([makeCharacter()]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([makeCampaign()]);
  const [npcs, setNpcs] = useState<Npc[]>([makeNpc()]);
  const [error, setError] = useState('');
  const load = useCallback(async (id: string) => {
    const [sheets, rooms, enemies] = await Promise.all([supabase.from('sheets').select('*').eq('user_id', id).order('created_at'), supabase.from('campaigns').select('*').eq('master_id', id).order('created_at'), supabase.from('npcs').select('*').order('created_at')]);
    if (sheets.error || rooms.error || enemies.error) setError(sheets.error?.message || rooms.error?.message || enemies.error?.message || 'Não foi possível carregar os dados.');
    else { setCharacters((sheets.data ?? []) as unknown as Character[]); setCampaigns((rooms.data ?? []) as unknown as Campaign[]); setNpcs((enemies.data ?? []) as unknown as Npc[]); setError(''); }
    setReady(true);
  }, []);
  useEffect(() => { let active = true; supabase.auth.getUser().then(({ data }) => { if (!active) return; const id = data.user?.id ?? null; setUserId(id); if (id) void load(id); else setReady(true); }); return () => { active = false; }; }, [load]);
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
  return { userId, ready, characters, campaigns, npcs, error, saveCharacter, addCharacter, deleteCharacter, saveCampaign, addCampaign, saveNpc, addNpc, deleteNpc };
}
