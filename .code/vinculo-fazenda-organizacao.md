# Instrução: Vínculo seguro fazenda-organização

## Objetivo

Tornar inequívoco no formulário de fazendas qual organização está em contexto e definir um fluxo seguro para alteração de organização da fazenda, evitando inconsistências entre `farms.client_id`, `client_farms` e dados derivados.

## Contexto do problema

- As fazendas são sempre vinculadas a organizações (clientes).
- O analista pode estar em uma organização no cabeçalho, esquecer de trocar e criar a fazenda para a organização errada.
- Na edição, o save atual usa `selectedClient?.id || editingFarm.clientId`, o que pode mover a fazenda para outra organização de forma implícita.
- Há leitura mista por `farms.client_id` e `client_farms` em vários módulos, o que torna a troca de organização insegura sem normalização.

## Arquivos principais

- `agents/FarmManagement.tsx` — formulário de criação/edição de fazendas
- `contexts/HierarchyContext.tsx` — seleção de organização e carregamento de fazendas
- `lib/hooks/useFarmOperations.ts` — operações com fazendas (client_farms + farms.client_id)
- `lib/utils/farmMapper.ts` — payload para insert/upsert (client_id)
- `lib/initiatives.ts` — iniciativas com client_id e farm_id
- `supabase/migrations/20260219120000_farms_constraints_and_indexes.sql` — RLS e índices

## Decisão técnica

- É seguro oferecer “trocar organização da fazenda” somente como fluxo **explícito e controlado**.
- **Não** é seguro manter troca implícita no botão “Salvar” do formulário de edição.
- Fonte canônica recomendada: **`farms.client_id`**.

---

## Fase 1 — Clareza imediata no cadastro/edição (baixo risco)

1. Em `agents/FarmManagement.tsx`, adicionar bloco fixo no **topo do formulário** com contexto atual:
   - Texto: **Organização selecionada no cabeçalho:** `<nome da organização>`
   - Opcional: ID da organização (curto) para debug/suporte
2. Em **modo edição**, mostrar também:
   - **Organização atual da fazenda:** `<nome da organização da fazenda>` (usar `editingFarm.clientId` e resolver nome do cliente se necessário)
3. Se `selectedClient?.id !== editingFarm?.clientId` em modo edição:
   - Exibir **alerta crítico** (ex.: “Você está editando uma fazenda da organização X com a organização Y selecionada no cabeçalho.”)
   - **Bloquear** o submit padrão (botão “Atualizar Fazenda”) com mensagem clara; oferecer apenas “Transferir Organização” como ação explícita ou orientar a selecionar a organização correta no cabeçalho
4. Na **listagem de fazendas** (cards), exibir a organização de cada fazenda (nome ou badge) para reduzir erro antes de abrir edição

---

## Fase 2 — Corrigir risco atual de troca implícita

1. Em `agents/FarmManagement.tsx`, no caminho de **edição** (bloco `else if (editingFarm)`):
   - **Parar** de derivar `clientIdForDb` a partir de `selectedClient` automaticamente
   - Usar **sempre** `editingFarm.clientId` no save comum (upsert)
2. Separar semanticamente:
   - **Salvar Fazenda** = edita apenas dados da fazenda, **sem** alterar organização
   - **Transferir Organização** = ação dedicada (modal + RPC), implementada na Fase 3

---

## Fase 3 — Fluxo seguro de transferência de organização

1. **RPC transacional** no banco (ex.: `reassign_farm_client(p_farm_id, p_new_client_id)`) com:
   - Validação de permissão do ator (admin ou analista responsável pela fazenda)
   - Validação de que o cliente de destino existe e pertence ao analista (ou admin)
   - Lock da linha da fazenda durante a operação
2. Dentro da RPC, em **uma transação**:
   - Atualizar `farms.client_id` para o novo cliente
   - Reconciliar `client_farms`: remover vínculo(s) antigo(s), inserir um único vínculo novo (farm_id, new_client_id)
   - Opcional: registrar auditoria (farm_id, old_client_id, new_client_id, actor, timestamp) em tabela de log
3. No front:
   - Botão ou link “Transferir para outra organização” (visível em modo edição quando permitido)
   - **Modal de confirmação** com origem/destino claros e confirmação explícita (ex.: checkbox “Entendo que a fazenda passará a pertencer à organização Y”)
   - Chamar a RPC apenas após confirmação; em sucesso, recarregar fazendas e fechar/atualizar formulário

---

## Fase 4 — Integridade e compatibilidade

1. **Normalizar leitores** que combinam `client_farms` e `farms.client_id`:
   - `lib/hooks/useFarmOperations.ts` — priorizar `farms.client_id` como canônico; usar `client_farms` apenas se necessário para compatibilidade
   - `agents/AnalystManagement.tsx` — alinhar à mesma fonte
   - `agents/AgilePlanning.tsx` — idem
2. **Proteção no banco** (migrations):
   - Garantir unicidade por `farm_id` em `client_farms` (uma fazenda só pode ter um cliente na junction), se a tabela permanecer
   - Opcional: trigger ou constraint para manter consistência entre `farms.client_id` e a linha correspondente em `client_farms`

---

## Fase 5 — Validação e rollout

1. **Testes funcionais**:
   - Criar fazenda com organização explícita (verificar contexto no topo do form)
   - Editar fazenda sem mudar organização (save não altera client_id)
   - Com organização do cabeçalho diferente da fazenda em edição: submit padrão bloqueado, alerta exibido
   - Transferência explícita: origem/destino corretos, sem duplicidade em client_farms
2. **Regressão**: carregamento hierárquico em `HierarchyContext.tsx` (troca de organização recarrega fazendas por client_id)
3. **Rollout**: liberar transferência de organização via feature flag, se desejado

---

## Diagrama de fluxo (edição)

```
Editar Fazenda
       |
       v
selectedClient.id == editingFarm.clientId ?
       |
   Sim | Não
       |     +-> Bloquear "Atualizar Fazenda", mostrar alerta
       |     +-> Oferecer "Transferir Organização" -> Modal -> RPC reassign_farm_client
       |
       +-> Permitir "Atualizar Fazenda" (usa editingFarm.clientId no upsert)
```

---

## Riscos se não implementar

- Criação de fazenda na organização errada por esquecimento do analista.
- Edição “normal” movendo a fazenda para outra organização sem o usuário perceber.
- Inconsistência entre `farms.client_id` e `client_farms` e entre dados derivados (iniciativas, projetos, etc.) em caso de troca manual ou bug.

## Referências

- Plano original: `vínculo_seguro_fazenda-organização` (Cursor plans)
- Código de validação de hierarquia: `supabase/migrations/20260219140000_validate_hierarchy_rpc.sql`
- Policies de farms: `lib/supabase/migrations/016_create_farms_table.sql`, `supabase/migrations/20260219120000_farms_constraints_and_indexes.sql`
