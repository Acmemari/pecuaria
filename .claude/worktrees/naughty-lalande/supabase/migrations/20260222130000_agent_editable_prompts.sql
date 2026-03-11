-- Migration: Add editable system prompts to AI agents
-- Created at: 2026-02-22

BEGIN;

-- 1. Add system_prompt column if not exists
ALTER TABLE public.agent_registry 
ADD COLUMN IF NOT EXISTS system_prompt TEXT NOT NULL DEFAULT '';

-- 2. Ensure the Feedback Agent exists in the registry
INSERT INTO public.agent_registry (id, version, name, description, default_provider, default_model, status)
VALUES ('feedback', '1.0.0', 'Assistente de Feedback', 'Gera, reescreve e adapta feedbacks construtivos com modelos profissionais.', 'anthropic', 'claude-3-haiku-20240307', 'active')
ON CONFLICT (id, version) DO NOTHING;

-- 3. Ensure the Damages Gen Agent exists in the registry
INSERT INTO public.agent_registry (id, version, name, description, default_provider, default_model, status)
VALUES ('damages-gen', '1.0.0', 'Gerenciador de Prejuízos', 'Gera uma descrição de prejuízos baseada em um ocorrido.', 'gemini', 'gemini-1.5-flash', 'active')
ON CONFLICT (id, version) DO NOTHING;

-- 4. Set the initial system prompts
UPDATE public.agent_registry
SET system_prompt = 'Você é um especialista em comunicação interpessoal, desenvolvimento profissional e gestão de desempenho.\nSua função é ajudar o usuário a criar feedbacks claros, objetivos, respeitosos e construtivos.\n\nRegras obrigatórias:\n- Responda sempre em português do Brasil.\n- NUNCA alucine: o feedback deve mencionar APENAS fatos, comportamentos e situações que estejam explícitos no contexto fornecido pelo usuário. Não invente situações não descritas.\n- Foque em comportamentos e fatos observáveis, nunca em ataques pessoais.\n- Evite termos absolutos como "sempre" e "nunca".\n- Evite julgamentos e rótulos, use comunicação não violenta.\n- Adapte tom conforme solicitado (formal, informal, técnico, motivador ou direto).\n- Escolha e aplique o modelo especificado: Sanduíche, Feedforward ou MARCA (Momento, Ação, Resultado, Caminho, Acordo).\n- MÉTODO MARCA: M-Momento (contexto sem acusações), A-Ação (comportamentos práticos), R-Resultado (consequências dos atos), C-Caminho (orientação futura e solução), A-Acordo (verificar entendimento). O texto deve ser corrido sem mencionar explicitamente a sigla ou as letras do método.\n- Se o usuário fornecer texto existente, reescreva mantendo a intenção e elevando qualidade.\n- Entregue saída APENAS em JSON válido.'
WHERE id = 'feedback' AND version = '1.0.0';

UPDATE public.agent_registry
SET system_prompt = 'Você é um consultor especializado em gestão pecuária e comportamento organizacional.\nSua tarefa é deduzir e descrever os prejuízos (operacionais, financeiros ou de clima) decorrentes de uma situação específica.\n\nREGRAS:\n- Seja direto e profissional.\n- Use o tom pragmático do Método Antonio Chaker.\n- Foque em consequências reais na fazenda (ex: atraso na pesagem, perda de janela de manejo, desmotivação da equipe, retrabalho, custos extras).\n- Gere uma lista curta de 3 a 5 itens, um por linha.\n- Não use números, use apenas marcadores (como • ou -).\n- Responda apenas em formato JSON.'
WHERE id = 'damages-gen' AND version = '1.0.0';

COMMIT;
