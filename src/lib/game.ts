export type Character = {
  id: string; name: string; lineage: string; stage: string; concept: string; weapon: string;
  corpo: number; mente: number; espirito: number; pv_current: number; pv_max: number;
  pf_current: number; pf_max: number; karma: number; gs: number; exhaustion: number;
  sync: { name: string; level: number }[]; nomenclatures: { name: string; cost: number; effect: string }[];
  inventory: { name: string; quantity: number }[]; story: string;
};
export type Npc = { id: string; name: string; kind: string; hidden: boolean; pv_current: number; pv_max: number; pf_current: number; pf_max: number; corpo: number; mente: number; espirito: number; esquiva: number; bloqueio: number; notes: string };
export type Campaign = { id: string; name: string; code: string; scene: string; round: number; turn_index: number; combat_active: boolean; log: string[] };
export const dieFor = (n: number) => [0, 4, 6, 8, 10, 12][Math.max(1, Math.min(5, n))];
export const derived = (corpo: number) => ({ pv: [0,25,32,42,52,60][corpo] ?? 25, esquiva: [0,10,12,14,15,16][corpo] ?? 10, bloqueio: [0,3,5,7,10,12][corpo] ?? 3, deslocamento: [0,9,9,12,12,15][corpo] ?? 9 });
export const makeCharacter = (): Character => ({ id: crypto.randomUUID(), name: 'Novo Herdeiro', lineage: 'Humano', stage: 'Libertado', concept: '', weapon: '', corpo: 1, mente: 1, espirito: 1, pv_current: 25, pv_max: 25, pf_current: 0, pf_max: 20, karma: 0, gs: 1, exhaustion: 0, sync: [], nomenclatures: [], inventory: [], story: '' });
export const makeNpc = (): Npc => ({ id: crypto.randomUUID(), name: 'Novo inimigo', kind: 'inimigo', hidden: true, pv_current: 25, pv_max: 25, pf_current: 0, pf_max: 20, corpo: 1, mente: 1, espirito: 1, esquiva: 10, bloqueio: 3, notes: '' });
export const makeCampaign = (): Campaign => ({ id: crypto.randomUUID(), name: 'A primeira travessia', code: 'DM3JUT', scene: 'O limiar', round: 1, turn_index: 0, combat_active: false, log: [] });
export function roll(expression: string) {
  const match = expression.replace(/\s/g, '').match(/^(\d*)d(4|6|8|10|12|20|100)([+-]\d+)?$/i);
  if (!match) return null;
  const quantity = Number(match[1] || 1), sides = Number(match[2]), modifier = Number(match[3] || 0);
  if (quantity < 1 || quantity > 30) return null;
  const dice = Array.from({ length: quantity }, () => 1 + Math.floor(Math.random() * sides));
  return { dice, modifier, total: dice.reduce((a, b) => a + b, modifier), expression: `${quantity}d${sides}${modifier ? (modifier > 0 ? '+' : '') + modifier : ''}` };
}

export function karmaMaximum(mente:number,espirito:number){ return Math.max(1,Math.floor((mente*20)/2+(espirito*20)/4)); }
export function karmaStage(value:number,max:number){const percent=value/Math.max(1,max)*100;return percent>=70?"berserker":percent>=50?"gaki":"normal";}
