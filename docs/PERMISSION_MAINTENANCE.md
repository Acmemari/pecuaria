# Manutenção de Permissões por Fazenda

Este documento descreve como manter e estender o sistema de permissões granulares por analista/fazenda.

## Visão geral

As permissões são armazenadas em `analyst_farms.permissions` (JSONB) como mapa `{ "chave": "hidden" | "view" | "edit" }`. Apenas o analista responsável (`is_responsible = true`) pode adicionar/remover outros analistas e definir suas permissões.

## Local da taxonomia

**Arquivo:** `lib/permissions/permissionKeys.ts`

Contém:
- `PERMISSION_KEYS`: array de todas as chaves com `key`, `label` e `category`
- `DEFAULT_PERMISSIONS`: valor padrão para novos analistas adicionados

## Checklist ao adicionar nova tela/card/modal

1. **Adicionar nova chave em `permissionKeys.ts`:**
   ```ts
   { key: 'nova_feature:form', label: 'Formulário da nova feature', category: 'outros' }
   ```
   Inclua em `PERMISSION_KEYS` e em `DEFAULT_PERMISSIONS` (ex.: `'nova_feature:form': 'view'`).

2. **Integrar o componente:**
   - Importe `useFarmPermissions` de `lib/permissions/useFarmPermissions`
   - Chame o hook com `farmId` e `userId` (use `selectedFarm?.id` do contexto quando apropriado)
   - Bypass para admin: `if (user?.role === 'admin') { /* acesso total */ }`
   - Use `canView(key)`, `canEdit(key)`, `isHidden(key)` conforme necessário
   - Exemplo: `if (perms.isHidden('nova_feature:form')) return null;`
   - Para inputs: `disabled={!perms.canEdit('nova_feature:form')}`

3. **Incluir no UI do painel de permissões:**
   O modal `FarmPermissionsModal` usa `PERMISSION_KEYS` para listar entidades. Ao adicionar em `permissionKeys.ts`, a nova chave aparecerá automaticamente no painel.

## Migração de dados

Ao adicionar novas chaves:
- Novos analistas recebem `DEFAULT_PERMISSIONS` ao serem adicionados
- Analistas existentes: o `useFarmPermissions` faz merge com `DEFAULT_PERMISSIONS` para chaves ausentes. Se quiser valor explícito para todos, rode uma migration SQL atualizando `analyst_farms.permissions` (ex.: `permissions = permissions || '{"nova_chave": "view"}'::jsonb`)

## Testes

- Validar que **admins** mantêm acesso total (bypass de permissões)
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

- Hook: `lib/permissions/useFarmPermissions.ts`
- Modal de gestão: `components/FarmPermissionsModal.tsx`
- Integrações: `agents/FarmManagement.tsx`, `agents/ClientManagement.tsx`
