# TestSprite - Instruções e Funcionalidades do Módulo Iniciativas

Este documento descreve o comportamento atual do módulo **Iniciativas** para uso em testes (manual, e2e e geração automática no TestSprite).

## 1) Escopo do módulo

O módulo Iniciativas possui 2 telas principais:

- **Painel Executivo** (`iniciativas-overview`)
  - KPIs do portfólio
  - Gráfico de distribuição por status
  - Gráfico de saúde (progresso por iniciativa)
- **Atividades em Foco** (`iniciativas-atividades`)
  - Lista de iniciativas
  - Modal de cadastro/edição
  - Tela de gestão (detalhe da iniciativa)
  - Modal de evidências por marco

## 2) Contexto de perfis e filtros (regras importantes)

### 2.1 Perfil analista

- Vê iniciativas com `created_by = user.id`.
- Para criar iniciativa, precisa de **cliente selecionado**.

### 2.2 Perfil admin

- Vê iniciativas do **analista selecionado** no cabeçalho.
- Se não houver analista selecionado: não cria e vê aviso.
- Para criar iniciativa: precisa de **analista + cliente** selecionados.

### 2.3 Filtros globais

- O módulo usa filtros de contexto:
  - `Analista`
  - `Cliente`
  - `Fazenda`
- A listagem e o painel executivo respeitam os filtros por `client_id` e `farm_id`.

## 3) Funcionalidades implementadas

## 3.1 Listagem de iniciativas (Atividades em Foco)

- Exibe cards com:
  - Progresso (%)
  - Nome
  - Líder
  - Status
  - Cronograma (início -> fim)
  - Indicador visual de prazo (não iniciado, dentro do prazo, últimos 10%, vencido)
- Clique no card abre a **tela de Gestão**.
- Ação de exclusão disponível no card (ícone lixeira).

## 3.2 Cadastro de iniciativa (modal)

Campos:

- Nome da iniciativa (**obrigatório**)
- Tags
- Descrição
- Data início (**obrigatório**)
- Data final (**obrigatório**)
- Status
- Responsável/Líder (**obrigatório**, vindo de `people`)
- Time da iniciativa (máximo 5, sem duplicar líder)
- Marcos e % representatividade:
  - Título
  - Percentual
  - Data limite (`due_date`)
  - Adicionar/remover marcos

Validações:

- Nome obrigatório
- Data início obrigatória
- Data final obrigatória
- Líder obrigatório
- Início <= fim
- Soma dos marcos <= 100%
- Data limite do marco deve estar entre início e fim da iniciativa
- Limites de backend:
  - Nome até 300 chars
  - Descrição até 5000 chars
  - Máximo 50 marcos

Mensagens esperadas (toast):

- Sucesso: `Iniciativa salva com sucesso.`
- Erros e avisos conforme validações acima.

## 3.3 Edição de iniciativa

- Acesso por botão **Editar** na tela de Gestão.
- Carrega dados existentes (inclusive marcos e datas limite).
- Salva com `Atualizar`.
- Toast esperado: `Iniciativa atualizada com sucesso.`

## 3.4 Exclusão de iniciativa

- Acesso pela lixeira no card da lista ou na tela de gestão.
- Exibe modal de confirmação com aviso de irreversibilidade.
- Remove iniciativa e dados relacionados (marcos, time, evidências).
- Limpa arquivos do bucket `milestone-evidence` em modo best-effort.
- Toast esperado: `Iniciativa excluída com sucesso.`

## 3.5 Tela de Gestão (Geral & Marcos / Time do Projeto)

Elementos:

- Cabeçalho com botões: `Voltar`, `Excluir`, `Editar`
- Abas:
  - **Geral & Marcos**
  - **Time do Projeto**
- Geral:
  - Nome, status, liderança, tags, descrição
  - Início, final previsto e progresso
  - Lista de marcos com:
    - Check de conclusão (toggle)
    - Título
    - Data limite
    - CTA: "Clique para detalhar evidências"
    - Percentual
- Time:
  - Lista de membros com papel

Comportamentos:

- Toggle de marco atualiza progresso e status da iniciativa via trigger do banco.
- Tela recarrega detalhe e lista após atualização.

## 3.6 Evidência de Entrega por marco

Modal aberto ao clicar no texto/área de evidências do marco.

Conteúdo:

- Header: `EVIDÊNCIA DE ENTREGA` + título do marco
- Card de status do marco:
  - Botão para alternar concluído/não concluído
- Seção `Adicionar Entregável`:
  - Comentário (textarea)
  - Botão `Adicionar Comentário`
  - Upload por tipo:
    - Imagem
    - Vídeo
    - Planilha
    - Documento
- `Histórico de Evidências`:
  - Comentários acumulados com timestamp
  - Lista de arquivos anexados
  - Ações por arquivo: baixar/remover
- Rodapé:
  - `Fechar`
  - `Salvar Evidências`

Regras técnicas:

- Tamanho máximo de arquivo: **10MB**
- Bucket de storage: `milestone-evidence`
- Tipagem automática de arquivo por MIME/extensão
- Notas de evidência são append com separador e timestamp
- Existe proteção contra corrida ao criar evidência (tratamento de `23505`)

## 3.7 Painel Executivo (Iniciativas)

KPIs:

- Iniciativas Ativas (total)
- Entregas Realizadas (marcos concluídos)
- Em Andamento (status exato `Em Andamento`)
- Progresso Médio (%)

Gráficos:

- Distribuição por status
- Saúde do portfólio (progresso por iniciativa)

Estados:

- Loading
- Erro com botão `Tentar novamente`
- Empty state com mensagem para criar iniciativas

## 4) Casos de teste recomendados (TestSprite)

Use os cenários abaixo como base para geração/execução.

### INI-001 - Criar iniciativa com sucesso

**Pré-condição:** usuário com contexto válido (analista + cliente).

Passos:

1. Abrir `Iniciativas > Atividades`.
2. Clicar `Nova Iniciativa`.
3. Preencher nome, início, fim, líder.
4. Adicionar 2 marcos com soma <= 100.
5. Salvar.

Esperado:

- Toast de sucesso.
- Iniciativa aparece na lista.

### INI-002 - Bloqueio sem contexto obrigatório

Passos:

1. Como admin, remover analista selecionado.
2. Tentar criar iniciativa.

Esperado:

- Botão desabilitado ou aviso de seleção obrigatória.

### INI-003 - Validação soma de marcos > 100

Passos:

1. Criar/editar iniciativa com marcos somando 110%.
2. Tentar salvar.

Esperado:

- Toast de validação.
- Não salva.

### INI-004 - Validação de datas

Passos:

1. Definir início maior que fim.
2. Tentar salvar.

Esperado:

- Erro: início não pode ser posterior ao fim.

### INI-005 - Validação due_date fora do intervalo

Passos:

1. Definir marco com data limite antes do início (ou após o fim).
2. Salvar.

Esperado:

- Erro de data limite de marco.

### INI-006 - Abrir gestão e alternar status de marco

Passos:

1. Abrir iniciativa na lista.
2. Na aba Geral, clicar no check do marco.

Esperado:

- Marco alterna estado.
- Progresso é recalculado.
- Status da iniciativa pode mudar automaticamente via trigger.

### INI-007 - Fluxo completo de evidências

Passos:

1. Na gestão, abrir evidências de um marco.
2. Adicionar comentário.
3. Anexar 1 arquivo de cada tipo permitido.
4. Salvar evidências.
5. Baixar 1 arquivo.
6. Remover 1 arquivo.

Esperado:

- Comentário aparece no histórico.
- Arquivos aparecem e podem ser baixados/removidos.
- Toasts de sucesso.

### INI-008 - Upload acima de 10MB

Passos:

1. Tentar anexar arquivo maior que 10MB.

Esperado:

- Erro de tamanho máximo.
- Arquivo não é salvo.

### INI-009 - Excluir iniciativa

Passos:

1. Acionar excluir.
2. Confirmar no modal.

Esperado:

- Iniciativa removida da lista.
- Toast de sucesso.
- Evidências/marcos/time não disponíveis após exclusão.

### INI-010 - Painel executivo com dados

Passos:

1. Garantir iniciativas com status diferentes.
2. Abrir `Iniciativas > Painel Executivo`.

Esperado:

- KPIs com valores > 0 conforme base.
- Gráficos preenchidos.

## 5) Dados de teste sugeridos

- 1 analista
- 1 cliente vinculado ao analista
- 1 fazenda vinculada ao cliente
- 3 iniciativas com status distintos:
  - Não Iniciado
  - Em Andamento
  - Concluído
- Cada iniciativa com 2 a 4 marcos
- Pelo menos 1 marco com evidência (comentário + arquivo)

## 6) Mensagens-chave para validação textual

- `Iniciativa salva com sucesso.`
- `Iniciativa atualizada com sucesso.`
- `Iniciativa excluída com sucesso.`
- `Marco atualizado.`
- `Comentário adicionado.`
- `Evidências salvas.`
- `Arquivo removido.`
- `Nenhuma evidência anexada ainda.`

## 7) Observações para automação no TestSprite

- Sempre preparar contexto de cabeçalho (analista/cliente/fazenda) antes dos testes de criação.
- Testar variações por perfil (`admin` e `analista`).
- Em testes de arquivo, usar:
  - imagem pequena (`.png`)
  - vídeo pequeno (`.mp4`)
  - planilha (`.xlsx`)
  - documento (`.pdf`)
- Incluir asserts visuais de:
  - mudança de aba na gestão
  - progresso em %
  - status badge
  - presença de histórico de evidências

---

Se quiser, eu também posso gerar a versão deste mesmo documento em formato de **test plan tabelado** (ID, prioridade, pré-condição, passos, resultado esperado) para importar mais fácil no seu fluxo de QA.
