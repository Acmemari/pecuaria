# Fix: Botao "Salvar" do Cadastro de Fazendas permite multiplos cliques (duplicatas)

## Problema

Ao cadastrar uma nova fazenda, o botao "Cadastrar Fazenda" nao da feedback visual
de que esta processando. O usuario clicou varias vezes e 5 fazendas "Floresta 2 CC"
duplicadas foram criadas no banco de dados.

---

## Causa Raiz

### `agents/FarmManagement.tsx` - ZERO protecao contra double-click

O `handleSubmit` (linha 880) e uma funcao `async` que faz `await supabase.from('farms').insert()`:

1. **Nao existe estado `isSubmitting`** - nenhum `useState` controla se a submissao esta em andamento
2. **O botao NUNCA e desabilitado durante a operacao** - `disabled={formReadOnly || needsOrgForCreate || !isSaveEnabled}` (linha 1844) nao inclui guard de submissao
3. **`saveFarms()` e chamado ANTES do insert no banco** (linha 973 vs 982) - estado local atualiza mas form continua aberto
4. **O form so e resetado APOS o await** (linha 1038) - durante toda a operacao async, o botao permanece clicavel

### Sequencia do bug:

```
Clique 1 -> handleSubmit() -> saveFarms() (local) -> await insert() (DB, ~500ms)
Clique 2 -> handleSubmit() -> novo ID -> saveFarms() -> await insert()  <-- DUPLICATA
Clique 3 -> handleSubmit() -> novo ID -> saveFarms() -> await insert()  <-- DUPLICATA
... botao continua habilitado durante todo o processo ...
Clique 1 termina -> resetForm() -> mas ja e tarde demais
```

### Comparacao: LoginPage.tsx JA tem protecao correta

```typescript
// LoginPage.tsx - CORRETO:
const [isSubmitting, setIsSubmitting] = useState(false);
// botao: disabled={isSubmitting || ...}
// render: {isSubmitting ? <Loader2 animate-spin /> : 'Entrar'}
```

O FarmManagement NAO segue esse padrao.

---

## Arquivo a Modificar

`agents/FarmManagement.tsx`

---

## Correcao Passo a Passo

### 1. Adicionar estado `isSubmitting`

Localizar linha 170 (junto com os outros `useState`) e adicionar:

```typescript
// APOS a linha:
const [isCreatingNew, setIsCreatingNew] = useState(false);

// ADICIONAR:
const [isSubmitting, setIsSubmitting] = useState(false);
```

### 2. Envolver `handleSubmit` com guard e try/finally

Localizar a funcao `handleSubmit` (linha 880). Substituir por:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // === GUARD CONTRA DOUBLE-CLICK ===
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // --- Todo o codigo existente do handleSubmit vai aqui dentro ---
      // (linhas 883 ate 1044 do codigo original, SEM alteracao)

      const clientIdForNewFarm = selectedClient?.id ?? (isCliente ? user?.clientId ?? null : null);

      // Validacao: nao permitir criar fazenda sem organizacao
      if (!editingFarm && !clientIdForNewFarm) {
        const isAwaitingClients = !loadingClientsAvailability && (availableClientsCount ?? 0) === 0;
        const waitingMessage = 'Aguardando cadastro de organizações para liberar o cadastro de fazendas';
        onToast?.(
          isAwaitingClients ? waitingMessage : 'Por favor, selecione uma organização antes de cadastrar uma fazenda',
          'error',
        );
        setErrors({
          client: isAwaitingClients
            ? `${waitingMessage}.`
            : 'É necessário selecionar uma organização antes de cadastrar uma fazenda',
        });
        return; // return dentro do try sai da funcao, finally executa setIsSubmitting(false)
      }

      // ... (resto do codigo existente sem alteracao) ...

      // Verificar vinculo analista/cliente
      if (!editingFarm && selectedClient && user) {
        if (user.role !== 'admin' && selectedClient.analystId !== user.id) {
          // ... validacao existente ...
          return;
        }
      }

      if (!validateForm()) {
        return;
      }

      // ... preparar farmData, updatedFarms, saveFarms, insert/upsert ...
      // ... toast de sucesso, resetForm, setView ...

    } catch (err) {
      console.error('[FarmManagement] Unexpected error in handleSubmit:', err);
      onToast?.('Erro inesperado ao salvar fazenda', 'error');
    } finally {
      // === SEMPRE re-habilita o botao, mesmo em caso de erro ===
      setIsSubmitting(false);
    }
};
```

**IMPORTANTE:** O bloco `finally` garante que `isSubmitting` volta a `false` em TODOS os cenarios:
- Sucesso (apos insert)
- Validacao falhou (return prematuro)
- Erro de rede (catch)

### 3. Desabilitar botao durante submissao

Localizar o botao de submit (linha 1844). Alterar a prop `disabled`:

```typescript
// ANTES:
disabled={formReadOnly || needsOrgForCreate || !isSaveEnabled}

// DEPOIS:
disabled={formReadOnly || needsOrgForCreate || !isSaveEnabled || isSubmitting}
```

### 4. Adicionar feedback visual (spinner) no botao

Localizar o conteudo do botao (linhas 1848-1849). Substituir por:

```typescript
// ANTES:
<CheckCircle2 size={16} />
{editingFarm ? 'Atualizar Fazenda' : 'Cadastrar Fazenda'}

// DEPOIS:
{isSubmitting ? (
  <Loader2 size={16} className="animate-spin" />
) : (
  <CheckCircle2 size={16} />
)}
{isSubmitting
  ? (editingFarm ? 'Salvando...' : 'Cadastrando...')
  : (editingFarm ? 'Atualizar Fazenda' : 'Cadastrar Fazenda')}
```

**Nota:** `Loader2` ja e importado no topo do arquivo (linha 5), nao precisa adicionar import.

---

## Resumo Visual da Mudanca

### Antes (bugado):
```
[Cadastrar Fazenda]  <-- sempre habilitado, sem feedback
     clique clique clique -> 5 fazendas duplicadas
```

### Depois (correto):
```
[Cadastrar Fazenda]  <-- clique ->
[🔄 Cadastrando...]  <-- desabilitado, spinner girando
     clique clique -> nada acontece (disabled)
[Cadastrar Fazenda]  <-- re-habilitado apos sucesso ou erro
```

---

## Limpeza: Deletar fazendas duplicadas

Apos aplicar o fix, as 5 fazendas "Floresta 2 CC" duplicadas devem ser removidas:
- **Opcao 1:** Pelo app - clicar no icone de lixeira (vermelho) em cada card duplicado
- **Opcao 2:** Pelo Supabase Dashboard - deletar registros duplicados na tabela `farms`

---

## Verificacao

1. **Abrir formulario de nova fazenda** -> preencher todos os campos -> clicar "Cadastrar Fazenda"
2. **Botao deve mostrar spinner** ("Cadastrando...") e ficar desabilitado (opacidade 50%, cursor not-allowed)
3. **Clicar novamente rapidamente** durante o processamento -> nada acontece (botao disabled)
4. **Apos sucesso** -> toast "Fazenda cadastrada com sucesso!" -> volta para lista -> apenas 1 fazenda criada
5. **Testar edicao** -> clicar "Editar" -> alterar campo -> "Atualizar Fazenda" -> mesmo comportamento com "Salvando..."
6. **Testar erro de rede** -> desconectar internet -> clicar salvar -> erro mostrado -> botao volta a ficar habilitado
7. **Testar validacao** -> deixar nome vazio -> botao ja esta desabilitado por `isSaveEnabled`
