/**
 * Seed das 15 novas iniciativas com líderes e equipes atribuídos aleatoriamente.
 * Executar: npx tsx scripts/seed-initiatives.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const CREATED_BY = 'fd9b980b-fbb6-4970-8dc1-fa21c22dfb69'; // Neto Analista
const CLIENT_ID = '3b554c3c-3f8f-440b-b257-43ee5d8d967c'; // Fundo Hecttare
const FARM_ID = 'farm-1768436335203-mhxjy9i7y'; // Floresta 1

const PEOPLE = ['Antonio', 'Fernando de Paula', 'Henrique Lancsarics'];

function pickLeaderAndTeam(): { leader: string; team: string[] } {
  const shuffled = [...PEOPLE].sort(() => Math.random() - 0.5);
  return { leader: shuffled[0], team: shuffled.slice(1) };
}

const INITIATIVES = [
  {
    name: 'Mapeamento Cultural',
    tags: '#Cultura #Pessoas #Diagnóstico #ChangeManagement',
    description:
      'Avaliação estruturada da cultura organizacional para identificar valores, comportamentos dominantes e nível de prontidão para mudança, alinhando o mindset das equipes ao novo modelo de gestão.',
    milestones: [
      { title: 'Kick-off e alinhamento', percent: 20, due_date: '2026-02-10' },
      { title: 'Aplicação do assessment', percent: 40, due_date: '2026-02-24' },
      { title: 'Relatório e devolutiva', percent: 40, due_date: '2026-03-10' },
    ],
  },
  {
    name: 'ONA — Análise de Rede Organizacional',
    tags: '#Organização #Pessoas #Comunicação #ONA',
    description:
      'Mapeamento dos fluxos informais de comunicação e influência para identificar líderes informais, silos e gargalos de informação que impactam a eficiência organizacional.',
    milestones: [
      { title: 'Coleta de dados', percent: 30, due_date: '2026-02-17' },
      { title: 'Modelagem da rede', percent: 40, due_date: '2026-03-03' },
      { title: 'Relatório de insights', percent: 30, due_date: '2026-03-17' },
    ],
  },
  {
    name: 'Value Stream Mapping',
    tags: '#Processos #Operações #Lean #Eficiência',
    description:
      'Levantamento e análise dos processos produtivos fim-a-fim para identificar desperdícios, gargalos e oportunidades de melhoria, visando padronização e aumento de produtividade.',
    milestones: [
      { title: 'Levantamento do fluxo atual', percent: 30, due_date: '2026-02-24' },
      { title: 'Identificação de desperdícios', percent: 40, due_date: '2026-03-10' },
      { title: 'Desenho do fluxo futuro', percent: 30, due_date: '2026-03-24' },
    ],
  },
  {
    name: 'Processos Gerenciais',
    tags: '#BackOffice #Gestão #Financeiro #RH',
    description:
      'Análise dos processos administrativos e de suporte para definir níveis de serviço internos, garantir integridade dos dados e aumentar a eficiência da gestão.',
    milestones: [
      { title: 'Mapeamento Back Office', percent: 40, due_date: '2026-03-03' },
      { title: 'Definição de SLAs', percent: 30, due_date: '2026-03-17' },
      { title: 'Validação com gestão', percent: 30, due_date: '2026-03-31' },
    ],
  },
  {
    name: 'Protocolo Hectare 80 ha',
    tags: '#Produção #KPIs #AltaPerformance #Operacional',
    description:
      'Implementação do padrão técnico-operacional de alta performance com definição e acompanhamento de indicadores-chave de produtividade e eficiência de recursos.',
    milestones: [
      { title: 'Definição de KPIs', percent: 40, due_date: '2026-03-10' },
      { title: 'Implantação piloto', percent: 40, due_date: '2026-03-24' },
      { title: 'Ajustes finais', percent: 20, due_date: '2026-04-07' },
    ],
  },
  {
    name: 'Matriz de Riscos (ERM)',
    tags: '#Riscos #Governança #Compliance #ERM',
    description:
      'Identificação e priorização dos principais riscos operacionais, climáticos, financeiros e regulatórios, com definição de planos de mitigação e contingência.',
    milestones: [
      { title: 'Identificação de riscos', percent: 40, due_date: '2026-03-17' },
      { title: 'Construção do heatmap', percent: 30, due_date: '2026-03-31' },
      { title: 'Planos de mitigação', percent: 30, due_date: '2026-04-14' },
    ],
  },
  {
    name: 'Matriz de Oportunidades',
    tags: '#Estratégia #Crescimento #Eficiência #EBITDA',
    description:
      'Identificação e priorização de oportunidades de ganho financeiro e operacional, avaliadas por impacto econômico e facilidade de implementação.',
    milestones: [
      { title: 'Levantamento de iniciativas', percent: 40, due_date: '2026-03-24' },
      { title: 'Análise de impacto financeiro', percent: 30, due_date: '2026-04-07' },
      { title: 'Priorização', percent: 30, due_date: '2026-04-21' },
    ],
  },
  {
    name: 'Mentoria Estratégica',
    tags: '#Liderança #Pessoas #Desenvolvimento #PDI',
    description:
      'Avaliação das competências da liderança e estruturação de planos de desenvolvimento para alinhar capacidades gerenciais aos desafios estratégicos do projeto.',
    milestones: [
      { title: 'Assessment de liderança', percent: 40, due_date: '2026-03-31' },
      { title: 'Definição dos PDIs', percent: 30, due_date: '2026-04-14' },
      { title: 'Início da mentoria', percent: 30, due_date: '2026-04-28' },
    ],
  },
  {
    name: 'Plano Estratégico (5 anos)',
    tags: '#Estratégia #Planejamento #LongoPrazo #Crescimento',
    description:
      'Desenvolvimento do plano estratégico de longo prazo com definição de metas, drivers de crescimento, cenários e projeções financeiras.',
    milestones: [
      { title: 'Diagnóstico estratégico', percent: 30, due_date: '2026-05-05' },
      { title: 'Modelagem financeira', percent: 40, due_date: '2026-06-02' },
      { title: 'Documento final', percent: 30, due_date: '2026-06-30' },
    ],
  },
  {
    name: 'Plano de Sucessão',
    tags: '#Governança #Sucessão #Continuidade #FamíliaEmpresária',
    description:
      'Estruturação do plano de continuidade do negócio com definição de sucessores e regras de transição gerencial e patrimonial.',
    milestones: [
      { title: 'Identificação de sucessores', percent: 40, due_date: '2026-05-19' },
      { title: 'Definição de regras', percent: 30, due_date: '2026-06-16' },
      { title: 'Aprovação', percent: 30, due_date: '2026-07-07' },
    ],
  },
  {
    name: 'Organograma',
    tags: '#Estrutura #Organização #Papéis #Gestão',
    description:
      'Redesenho da estrutura organizacional com definição clara de funções e níveis hierárquicos para aumentar eficiência e agilidade decisória.',
    milestones: [
      { title: 'Diagnóstico estrutural', percent: 40, due_date: '2026-06-02' },
      { title: 'Novo desenho', percent: 40, due_date: '2026-06-30' },
      { title: 'Validação', percent: 20, due_date: '2026-07-14' },
    ],
  },
  {
    name: 'Governança e RACI',
    tags: '#Governança #Responsabilidades #RACI #Gestão',
    description:
      'Definição do modelo de governança e das responsabilidades de cada função, garantindo clareza decisória e accountability.',
    milestones: [
      { title: 'Definição de papéis', percent: 40, due_date: '2026-06-16' },
      { title: 'Construção da matriz', percent: 40, due_date: '2026-07-14' },
      { title: 'Aprovação', percent: 20, due_date: '2026-07-28' },
    ],
  },
  {
    name: 'Controladoria e DRE',
    tags: '#Financeiro #Controladoria #DRE #GestãoFinanceira',
    description:
      'Implantação de contabilidade gerencial e estrutura de resultados que reflita a real geração de caixa e suporte decisões estratégicas.',
    milestones: [
      { title: 'Estruturação contábil', percent: 40, due_date: '2026-06-30' },
      { title: 'Centros de custo', percent: 30, due_date: '2026-07-28' },
      { title: 'DRE gerencial', percent: 30, due_date: '2026-08-18' },
    ],
  },
  {
    name: 'Remuneração Variável',
    tags: '#Pessoas #Incentivos #Performance #Remuneração',
    description:
      'Definição do modelo de remuneração variável alinhado a metas e resultados, incentivando desempenho e alinhamento estratégico.',
    milestones: [
      { title: 'Desenho do modelo', percent: 40, due_date: '2026-07-14' },
      { title: 'Definição de metas', percent: 40, due_date: '2026-08-11' },
      { title: 'Validação', percent: 20, due_date: '2026-08-25' },
    ],
  },
  {
    name: 'Aprovação do Plano',
    tags: '#Governança #Stakeholders #Estratégia #Decisão',
    description:
      'Validação formal do plano estratégico, orçamento e cronograma pelos principais decisores e partes interessadas.',
    milestones: [
      { title: 'Apresentação executiva', percent: 40, due_date: '2026-08-18' },
      { title: 'Ajustes', percent: 30, due_date: '2026-09-01' },
      { title: 'Sign-off', percent: 30, due_date: '2026-09-15' },
    ],
  },
];

async function main() {
  for (const init of INITIATIVES) {
    const { leader, team } = pickLeaderAndTeam();
    const startDate = init.milestones[0].due_date;
    const endDate = init.milestones[init.milestones.length - 1].due_date;

    const { data: initiative, error: initError } = await supabase
      .from('initiatives')
      .insert({
        created_by: CREATED_BY,
        name: init.name,
        tags: init.tags,
        description: init.description,
        start_date: startDate,
        end_date: endDate,
        status: 'Não Iniciado',
        leader,
        client_id: CLIENT_ID,
        farm_id: FARM_ID,
      })
      .select('id')
      .single();

    if (initError) {
      console.error(`Erro ao criar "${init.name}":`, initError);
      continue;
    }

    const initiativeId = initiative!.id;

    const teamRows = team.map((name, i) => ({
      initiative_id: initiativeId,
      name,
      role: i === 0 ? 'RESPONSÁVEL' : 'APOIO',
      sort_order: i,
    }));

    const { error: teamError } = await supabase.from('initiative_team').insert(teamRows);
    if (teamError) {
      console.error(`Erro ao criar time para "${init.name}":`, teamError);
    }

    const milestoneRows = init.milestones.map((m, i) => ({
      initiative_id: initiativeId,
      title: m.title,
      percent: m.percent,
      completed: false,
      sort_order: i,
      due_date: m.due_date,
    }));

    const { error: milError } = await supabase.from('initiative_milestones').insert(milestoneRows);
    if (milError) {
      console.error(`Erro ao criar marcos para "${init.name}":`, milError);
    }

    console.log(`✓ ${init.name} — Líder: ${leader} | Equipe: ${team.join(', ')}`);
  }

  console.log('\n15 iniciativas inseridas com sucesso.');
}

main().catch(console.error);
