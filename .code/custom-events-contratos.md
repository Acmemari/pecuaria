# Contratos de CustomEvents (sinalização de UI)

Eventos mantidos para coordenação entre App.tsx e módulos de cadastro.
Não são usados para sincronização de dados — essa parte usa HierarchyContext.

## farmViewChange
- **Dispatcher:** FarmManagement
- **Listener:** App.tsx
- **Payload:** `{ detail: 'list' | 'form' }`
- **Uso:** Controlar exibição do botão "Voltar para lista" no header

## clientViewChange
- **Dispatcher:** ClientManagement
- **Listener:** App.tsx
- **Payload:** `{ detail: 'list' | 'form' }`
- **Uso:** Controlar exibição do botão "Voltar para lista" no header

## peopleViewChange
- **Dispatcher:** PeopleManagement
- **Listener:** App.tsx
- **Payload:** `{ detail: 'list' | 'form' }`
- **Uso:** Controlar exibição do botão "Voltar para lista" no header

## farmCancelForm
- **Dispatcher:** App.tsx (botão header)
- **Listener:** FarmManagement
- **Uso:** Fechar formulário ao clicar "Voltar"

## clientCancelForm
- **Dispatcher:** App.tsx (botão header) ou ClientManagement (handleCancel)
- **Listener:** ClientManagement
- **Uso:** Fechar formulário ao clicar "Voltar"

## peopleCancelForm
- **Dispatcher:** App.tsx (botão header)
- **Listener:** PeopleManagement
- **Uso:** Fechar formulário ao clicar "Voltar"

## clientNewClient
- **Dispatcher:** App.tsx (botão header)
- **Listener:** ClientManagement
- **Uso:** Abrir formulário de novo cliente
