/**
 * Seed de 15 tarefas na Rotina Semanal para Fazenda Agrícola Anamélia.
 * Distribui as tarefas entre os funcionários da fazenda.
 * Executar: npx tsx scripts/seed-atividades-fazenda-anamelia.ts
 */

import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Carrega .env.local e .env (o script roda da raiz do projeto)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(join(root, '.env.local'))) dotenv.config({ path: join(root, '.env.local') });
dotenv.config({ path: join(root, '.env') });

import { createClient } from '@supabase/supabase-js';

const FARM_NAME = 'Agrícola Anamélia';
const FARM_SEARCH_TERMS = ['Agrícola Anamélia', 'Anamélia', 'Anamelia'];
const TAGS = [
  '#planejamento',
  '#desenvolvimento',
  '#revisão',
  '#deploy',
  '#reunião',
  '#bug',
  '#docs',
];

const ATIVIDADES = [
  { titulo: 'Vistoria pastagem', descricao: 'Verificar condição das pastagens e consumo de forragem' },
  { titulo: 'Controle de pesagem', descricao: 'Registrar pesagens dos lotes conforme cronograma' },
  { titulo: 'Manutenção cercas', descricao: 'Revisar e reparar cercas em área de maior movimento' },
  { titulo: 'Aplicação de vermífugo', descricao: 'Aplicar vermífugo conforme protocolo da fazenda' },
  { titulo: 'Rotação de pasto', descricao: 'Conferir e executar rotacionamento dos lotes' },
  { titulo: 'Controle de natalidade', descricao: 'Registrar nascimentos e condições das matrizes' },
  { titulo: 'Inspeção de cochos', descricao: 'Verificar cochos e disponibilidade de sal mineral' },
  { titulo: 'Limpeza de bebedouros', descricao: 'Limpar e verificar nível dos bebedouros' },
  { titulo: 'Registro de pesagens', descricao: 'Lançar pesagens no sistema de gestão' },
  { titulo: 'Avaliação de lotes', descricao: 'Avaliar ganho de peso e condição corporal' },
  { titulo: 'Revisão de cercas elétricas', descricao: 'Testar energizadores e reparar fios soltos' },
  { titulo: 'Controle de vacinas', descricao: 'Conferir carteira de vacinação e aplicar pendências' },
  { titulo: 'Conferência de estoque', descricao: 'Inventariar medicamentos e insumos' },
  { titulo: 'Manejo de pastagem', descricao: 'Ajustar lotação e descanso dos piquetes' },
  { titulo: 'Relatório semanal', descricao: 'Consolidar dados e enviar relatório ao gestor' },
];

function parseDateStr(s: string): Date {
  return new Date(s + 'T00:00:00');
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const s = parseDateStr(start);
  const e = parseDateStr(end);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    dates.push(toDateStr(new Date(d)));
  }
  return dates;
}

async function main() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error(
      'Erro: Defina VITE_SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY no .env.local ou .env.',
    );
    process.exit(1);
  }

  const supabase = createClient(url, key);

  // 1. Buscar fazenda: por FARM_ID (env) ou por nome
  let farm: { id: string; name: string } | null = null;
  const farmIdEnv = process.env.FARM_ID?.trim();

  if (farmIdEnv) {
    const { data, error } = await supabase
      .from('farms')
      .select('id, name')
      .eq('id', farmIdEnv)
      .maybeSingle();
    if (error) {
      console.error('Erro ao buscar fazenda por ID:', error.message);
      process.exit(1);
    }
    farm = data;
  }

  if (!farm) {
    for (const term of FARM_SEARCH_TERMS) {
      const { data, error } = await supabase
        .from('farms')
        .select('id, name')
        .ilike('name', `%${term}%`)
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('Erro ao buscar fazenda:', error.message);
        process.exit(1);
      }
      if (data) {
        farm = data;
        break;
      }
    }
  }

  if (!farm) {
    // Fallback: buscar via client com nome "Agrícola Anamélia"
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .ilike('name', `%${FARM_NAME}%`)
      .limit(1)
      .maybeSingle();
    if (client) {
      const { data } = await supabase
        .from('farms')
        .select('id, name')
        .eq('client_id', client.id)
        .limit(1)
        .maybeSingle();
      farm = data;
    }
  }

  if (!farm) {
    console.error(
      `Fazenda "${FARM_NAME}" não encontrada. Opções:\n` +
        `  1. Defina FARM_ID no .env.local com o id da fazenda (ex: FARM_ID=farm-xxx-xxx)\n` +
        `  2. Verifique se a fazenda existe em farms com nome contendo "Agrícola Anamélia" ou "Anamélia"`,
    );
    process.exit(1);
  }

  console.log(`Fazenda encontrada: ${farm.name} (${farm.id})`);

  // 2. Buscar funcionários da fazenda com assume_tarefas_fazenda
  const { data: peopleFromFarm } = await supabase
    .from('people')
    .select('id, full_name, preferred_name')
    .eq('farm_id', farm.id)
    .eq('assume_tarefas_fazenda', true)
    .order('full_name');

  let people = peopleFromFarm ?? [];

  if (people.length === 0) {
    console.warn(
      `Nenhum funcionário com assume_tarefas_fazenda na fazenda. Usando fallback: todas as pessoas com assume_tarefas_fazenda.`,
    );
    const { data: fallback } = await supabase
      .from('people')
      .select('id, full_name, preferred_name')
      .eq('assume_tarefas_fazenda', true)
      .order('full_name');
    people = fallback ?? [];
  }

  if (people.length === 0) {
    console.error(
      'Nenhuma pessoa com assume_tarefas_fazenda cadastrada. Cadastre pelo menos uma pessoa antes de rodar o script.',
    );
    process.exit(1);
  }

  console.log(`Funcionários: ${people.map((p) => p.preferred_name || p.full_name).join(', ')}`);

  // 3. Buscar semana aberta
  const { data: semana, error: semanaError } = await supabase
    .from('semanas')
    .select('id, numero, data_inicio, data_fim')
    .eq('aberta', true)
    .order('numero', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (semanaError) {
    console.error('Erro ao buscar semana:', semanaError.message);
    process.exit(1);
  }

  if (!semana) {
    console.error(
      'Nenhuma semana aberta encontrada. Abra uma semana na Rotina Semanal antes de rodar o script.',
    );
    process.exit(1);
  }

  console.log(`Semana: ${semana.numero} (${semana.data_inicio} – ${semana.data_fim})`);

  // 4. Distribuir datas de término entre início e fim da semana
  const weekDates = getDatesBetween(semana.data_inicio, semana.data_fim);

  const rows = ATIVIDADES.map((a, i) => {
    const pessoa = people[i % people.length];
    const dataTermino = weekDates[i % weekDates.length] ?? null;
    const tag = TAGS[i % TAGS.length];
    return {
      semana_id: semana.id,
      titulo: a.titulo,
      descricao: a.descricao,
      pessoa_id: pessoa.id,
      data_termino: dataTermino,
      tag,
      status: 'a fazer' as const,
    };
  });

  const { data: inserted, error: insertError } = await supabase
    .from('atividades')
    .insert(rows)
    .select('id, titulo, pessoa_id');

  if (insertError) {
    console.error('Erro ao inserir atividades:', insertError.message);
    if (insertError.code === '23503') {
      console.error(
        '\nDica: Se o erro for de FK em pessoa_id, a tabela atividades pode referenciar pessoas(id). Crie uma migration para alterar a FK para people(id).',
      );
    }
    process.exit(1);
  }

  console.log(`\n15 atividades criadas com sucesso.`);
  for (const a of inserted ?? []) {
    const p = people.find((x) => x.id === a.pessoa_id);
    const nome = p?.preferred_name || p?.full_name || '?';
    console.log(`  - ${a.titulo} → ${nome}`);
  }
}

main().catch(console.error);
