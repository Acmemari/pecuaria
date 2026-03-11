# Implementação do Cadastro de Empresa

## Resumo das Alterações

A funcionalidade de **Notificações** na aba de Configurações foi substituída por **Cadastro de Empresa**, permitindo que usuários gerenciem empresas de forma completa e organizada.

## Alterações Realizadas

### 1. Banco de Dados

#### Migration: `004_add_company_fields.sql`

Adiciona campos completos para cadastro de empresa na tabela `organizations`:

- **CNPJ**: Número de registro da empresa (14 dígitos)
- **Email**: Email de contato da empresa
- **Phone**: Telefone de contato
- **Address**: Endereço completo
- **City**: Cidade
- **State**: Estado (UF)
- **ZIP Code**: CEP
- **Description**: Descrição da empresa ou atividade principal
- **Status**: Status da empresa (active, inactive, pending)

#### Migration: `005_organizations_rls_policies.sql`

Garante segurança completa com políticas RLS (Row Level Security):

- Usuários podem criar empresas onde são proprietários
- Usuários podem visualizar apenas suas próprias empresas
- Usuários podem editar apenas suas próprias empresas
- Usuários podem excluir apenas suas próprias empresas
- Admins têm acesso completo a todas as empresas

### 2. Interface do Usuário

#### Componente: `components/SettingsPage.tsx`

**Alterações principais:**

1. **Substituição da aba "Notificações" por "Cadastro de Empresa"**
   - Ícone alterado de `Bell` para `Building2`
   - Tipo `TabId` atualizado de `'notifications'` para `'company'`

2. **Formulário de Cadastro/Edição**
   - Modal completo com todos os campos de empresa
   - Validação de CNPJ (14 dígitos)
   - Formatação automática de CNPJ, telefone e CEP
   - Campos obrigatórios e opcionais claramente marcados
   - Suporte para criar e editar empresas

3. **Tabela de Empresas**
   - Listagem completa de empresas cadastradas
   - Busca por nome, CNPJ ou email
   - Colunas: Nome, CNPJ, Email, Plano, Status, Ações
   - Badges coloridos para plano e status
   - Ações de editar e excluir por linha

4. **Funcionalidades**
   - **Criar**: Botão "Nova Empresa" abre formulário vazio
   - **Editar**: Ícone de edição preenche formulário com dados existentes
   - **Excluir**: Confirmação antes de excluir
   - **Buscar**: Campo de busca filtra empresas em tempo real
   - **Validação**: Validação de CNPJ e campos obrigatórios

## Estrutura da Tabela `organizations`

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  description TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('basic', 'pro', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Funcionalidades Implementadas

### ✅ Cadastro de Empresa

- Formulário completo com validação
- Formatação automática de CNPJ, telefone e CEP
- Validação de campos obrigatórios
- Integração com Supabase

### ✅ Listagem de Empresas

- Tabela responsiva e organizada
- Busca em tempo real
- Filtros visuais por plano e status
- Carregamento assíncrono

### ✅ Edição de Empresa

- Pré-preenchimento do formulário
- Atualização de dados existentes
- Validação mantida durante edição

### ✅ Exclusão de Empresa

- Confirmação antes de excluir
- Verificação de propriedade (segurança)
- Feedback visual ao usuário

### ✅ Segurança

- Políticas RLS implementadas
- Usuários só acessam suas próprias empresas
- Admins têm acesso completo
- Validação no frontend e backend

## Formatação Automática

O sistema aplica formatação automática nos seguintes campos:

- **CNPJ**: `00.000.000/0000-00` (14 dígitos)
- **Telefone**: `(00) 00000-0000` (11 dígitos) ou `(00) 0000-0000` (10 dígitos)
- **CEP**: `00000-000` (8 dígitos)

## Validações Implementadas

1. **Nome da Empresa**: Obrigatório
2. **CNPJ**: Deve conter exatamente 14 dígitos (se preenchido)
3. **Email**: Formato de email válido (se preenchido)
4. **Estado (UF)**: Máximo 2 caracteres, convertido para maiúsculas
5. **Plano**: Deve ser 'basic', 'pro' ou 'enterprise'
6. **Status**: Deve ser 'active', 'inactive' ou 'pending'

## Integração com Sistema Existente

### Relacionamentos

- `organizations.owner_id` → `auth.users.id`
- `user_profiles.organization_id` → `organizations.id`
- `chat_messages.organization_id` → `organizations.id`
- `calculations.organization_id` → `organizations.id`

### Permissões

- Usuários podem gerenciar apenas empresas onde são proprietários
- Admins podem visualizar e editar todas as empresas
- RLS garante segurança no nível do banco de dados

## Como Usar

### Para Usuários

1. **Acessar Cadastro de Empresa**
   - Vá para Configurações (ícone de engrenagem)
   - Clique na aba "Cadastro de Empresa"

2. **Cadastrar Nova Empresa**
   - Clique em "Nova Empresa"
   - Preencha os campos obrigatórios (Nome)
   - Preencha campos opcionais conforme necessário
   - Clique em "Cadastrar"

3. **Editar Empresa**
   - Na tabela, clique no ícone de edição (lápis)
   - Modifique os campos desejados
   - Clique em "Atualizar"

4. **Excluir Empresa**
   - Na tabela, clique no ícone de excluir (lixeira)
   - Confirme a exclusão

5. **Buscar Empresa**
   - Use o campo de busca no topo da tabela
   - Digite nome, CNPJ ou email

### Para Desenvolvedores

#### Adicionar Novos Campos

1. Adicione a coluna na migration:

```sql
ALTER TABLE organizations ADD COLUMN novo_campo TEXT;
```

2. Atualize o estado do formulário:

```typescript
const [companyForm, setCompanyForm] = useState({
  // ... campos existentes
  novo_campo: '',
});
```

3. Adicione o campo no formulário:

```tsx
<div>
  <label>Novo Campo</label>
  <input value={companyForm.novo_campo} onChange={e => handleCompanyFormChange('novo_campo', e.target.value)} />
</div>
```

4. Atualize a tabela (se necessário):

```tsx
<th>Novo Campo</th>
<td>{company.novo_campo || '-'}</td>
```

## Considerações Técnicas

### Performance

- Índices criados em `cnpj`, `status` e `owner_id` para consultas rápidas
- Busca otimizada com filtros no frontend
- Carregamento assíncrono de dados

### Segurança

- RLS (Row Level Security) ativado
- Validação no frontend e backend
- Verificação de propriedade antes de operações

### UX/UI

- Interface responsiva
- Feedback visual em todas as ações
- Formatação automática melhora experiência
- Mensagens de erro claras

## Próximos Passos (Opcional)

1. **Validação de CNPJ**: Implementar validação completa de dígitos verificadores
2. **Integração com API de CEP**: Buscar endereço automaticamente pelo CEP
3. **Upload de Logo**: Permitir upload de logo da empresa
4. **Histórico de Alterações**: Registrar histórico de mudanças
5. **Exportação**: Exportar lista de empresas em CSV/Excel
6. **Múltiplos Proprietários**: Permitir múltiplos proprietários por empresa

## Troubleshooting

### Empresa não aparece na lista

- Verifique se o usuário é o proprietário (`owner_id`)
- Verifique políticas RLS no Supabase
- Verifique console do navegador para erros

### Erro ao salvar empresa

- Verifique se o nome está preenchido (obrigatório)
- Verifique formato do CNPJ (14 dígitos)
- Verifique permissões RLS no Supabase

### Formatação não funciona

- Certifique-se de que os campos estão usando as funções de formatação
- Verifique se os valores estão sendo limpos antes de salvar

## Arquivos Modificados

- `components/SettingsPage.tsx` - Componente principal
- `lib/supabase/migrations/004_add_company_fields.sql` - Campos da tabela
- `lib/supabase/migrations/005_organizations_rls_policies.sql` - Políticas RLS

## Conclusão

A implementação do cadastro de empresa substitui completamente a funcionalidade de notificações, oferecendo uma solução robusta e segura para gerenciamento de empresas. O sistema está integrado com a arquitetura existente e segue as melhores práticas de segurança e UX.
