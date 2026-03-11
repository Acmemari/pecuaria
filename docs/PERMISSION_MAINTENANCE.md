# Manutenção de Permissões por Fazenda

Este documento descreve como manter e estender o sistema de permissões granulares por analista/fazenda.

## Visão geral

As permissões são armazenadas em `analyst_farms.permissions` (JSONB) como mapa `{ "chave": "hidden" | "view" | "edit" }`. Apenas o analista responsável (`is_responsible = true`) pode adicionar/remover outros analistas e definir suas permissões.

## Local da taxonomia

**Arquivo:** `lib/permissions/permissionKeys.ts`

Contém:

- `PERMISSION_KEYS`: array de todas as chaves com `key`, `label`, `description`, `location`, `icon` e `category`
- `DEFAULT_PERMISSIONS`: valor padrão para novos analistas adicionados
- Categorias: `cadastros`, `gerenciamento`, `documentos`, `assistentes` (espelham o sidebar)

## Checklist ao adicionar nova tela/card/modal

1. **Adicionar nova chave em `permissionKeys.ts`:**

   ```ts
   {
     key: 'nova_feature:form',
     label: 'Cadastro da nova feature',
     description: 'Formulário de dados da feature',
     location: 'Seção > Subseção > Formulário',
     icon: 'FileText',
     category: 'cadastros', // ou gerenciamento, documentos, assistentes
   }
   ```

   Inclua em `PERMISSION_KEYS` e em `DEFAULT_PERMISSIONS` (ex.: `'nova_feature:form': 'view'`).

2. **Integrar o componente:**
   - Importe `useFarmPermissions` ou `useBatchFarmPermissions` de `lib/permissions/useFarmPermissions`
   - Chame o hook com `(farmId, userId, user?.role)` — o terceiro parâmetro faz o bypass de admin automaticamente (sem query)
   - Use `canView(key)`, `canEdit(key)`, `isHidden(key)` conforme necessário
   - Exemplo: `if (perms.isHidden('nova_feature:form')) return null;`
   - Para inputs: `disabled={!perms.canEdit('nova_feature:form')}`
   - Para fallback: use a constante `NO_ACCESS` ao invés de objeto inline: `perms={batchPerms[id] ?? NO_ACCESS}`

3. **Incluir no UI do painel de permissões:**
   O modal `FarmPermissionsModal` usa `PERMISSION_KEYS` para listar entidades. Ao adicionar em `permissionKeys.ts`, a nova chave aparecerá automaticamente no painel.

## Migração de dados

Ao adicionar novas chaves:

- Novos analistas recebem `DEFAULT_PERMISSIONS` ao serem adicionados
- Analistas existentes: o `useFarmPermissions` faz merge com `DEFAULT_PERMISSIONS` para chaves ausentes. Se quiser valor explícito para todos, rode uma migration SQL atualizando `analyst_farms.permissions` (ex.: `permissions = permissions || '{"nova_chave": "view"}'::jsonb`)

## Arquitetura (refatorada)

- **Admin bypass**: os hooks recebem `userRole` e retornam `FULL_ACCESS` para admins sem executar query
- **Constantes estáveis**: `FULL_ACCESS`, `NO_ACCESS`, `LOADING_RESULT` — usadas como referências imutáveis
- **Batch**: `useBatchFarmPermissions` evita N+1; `isResponsible` vem junto, sem query extra

## Testes

- Validar que **admins** mantêm acesso total (via `userRole` nos hooks)
- Validar que **analistas secundários** respeitam `permissions` (ocultar/ver/editar)
- Testar o fluxo: responsável adiciona analista da mesma empresa, define permissões, analista vê apenas o permitido

## Estrutura de dados

```sql
analyst_farms (
  id UUID,
  analyst_id UUID,
  farm_id TEXT,
  is_responsible BOOLEAN DEFAULT false,
  permissions JSONB DEFAULT '{}'
)
```

Exemplo de `permissions`:

```json
{
  "farms:form": "edit",
  "clients:form": "view",
  "people:card": "hidden"
}
```

## Referências

- Hooks e constantes: `lib/permissions/useFarmPermissions.ts` — `useFarmPermissions`, `useBatchFarmPermissions`, `NO_ACCESS`, `FULL_ACCESS`
- Modal de gestão: `components/FarmPermissionsModal.tsx`
- Integrações: `agents/FarmManagement.tsx`
