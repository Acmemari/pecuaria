# Validação do Fluxo Visitante

## Pré-requisito: Usuário Âncora

Antes de rodar as migrações de visitante, garanta que o analista âncora exista:

- **auth.users**: usuário com `id = '0238f4f4-5967-429e-9dce-3f6cc03f5a80'` (ex.: antonio@inttegra.com)
- **user_profiles**: mesmo usuário com `role = 'admin'` e `qualification` adequado

A migração `20260302100000_visitor_demo_context.sql` falha com mensagem clara se o usuário não existir.

## Aplicar migrações

```bash
supabase db push
```

Ou execute manualmente no Supabase SQL Editor, em ordem:
1. `supabase/migrations/20260302100000_visitor_demo_context.sql`
2. `supabase/migrations/20260302100001_visitor_demo_farm.sql`

## Validação SQL (pós-migração)

### Presença de dados demo
```sql
-- Cliente demo
SELECT * FROM public.clients WHERE id = '00000000-0000-0000-0000-000000000002';

-- Fazenda demo
SELECT * FROM public.farms WHERE id = '00000000-0000-0000-0000-000000000003';
```

### RLS (como visitante autenticado)
```sql
-- Deve retornar fazenda demo
SELECT * FROM public.farms WHERE client_id = '00000000-0000-0000-0000-000000000002';

-- Deve retornar vazio
SELECT * FROM public.farms WHERE client_id != '00000000-0000-0000-0000-000000000002';
```

## Validação funcional

1. **Login visitante**: conta com `qualification = 'visitante'`
2. **Header**: Analista "Inttegra (Visitante)" → Cliente "Visitante Demo" → Fazenda "Fazenda Demo"
3. **Seletores**: ocultos/desabilitados (hierarquia fixa)
4. **localStorage**: sem `hierarchySelection.v1` para visitantes
5. **VisitorContentGuard**: feature bloqueada (ex. Cadastro de Clientes) mostra blur + modal WhatsApp
