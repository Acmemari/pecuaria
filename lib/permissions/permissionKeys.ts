/**
 * Taxonomia de chaves de permissão para acesso por analista à fazenda.
 * Cada chave mapeia para um nível: "hidden" | "view" | "edit"
 */

export type PermissionLevel = 'hidden' | 'view' | 'edit';

export interface PermissionKeyDef {
  key: string;
  label: string;
  category: 'cadastros' | 'projetos' | 'documentos' | 'outros';
}

/** Todas as chaves de permissão do sistema (ordem para UI) */
export const PERMISSION_KEYS: PermissionKeyDef[] = [
  // Cadastros
  { key: 'farms:card', label: 'Lista de fazendas', category: 'cadastros' },
  { key: 'farms:form', label: 'Formulário de fazenda', category: 'cadastros' },
  { key: 'farms:delete', label: 'Excluir fazenda', category: 'cadastros' },
  { key: 'clients:card', label: 'Lista de clientes', category: 'cadastros' },
  { key: 'clients:form', label: 'Formulário de cliente', category: 'cadastros' },
  { key: 'clients:farms_modal', label: 'Modal de fazendas do cliente', category: 'cadastros' },
  { key: 'people:card', label: 'Lista de pessoas', category: 'cadastros' },
  { key: 'people:form', label: 'Formulário de pessoa', category: 'cadastros' },
  // Projetos e Iniciativas
  { key: 'projects:structure', label: 'Estrutura de programas/entregas/atividades', category: 'projetos' },
  { key: 'projects:program_modal', label: 'Modal de programa', category: 'projetos' },
  { key: 'projects:delivery_modal', label: 'Modal de entrega', category: 'projetos' },
  { key: 'projects:activity_modal', label: 'Modal de atividade', category: 'projetos' },
  { key: 'projects:task_modal', label: 'Modal de tarefa', category: 'projetos' },
  { key: 'initiatives:overview', label: 'Visão de iniciativas', category: 'projetos' },
  { key: 'initiatives:form', label: 'Formulário de iniciativa', category: 'projetos' },
  { key: 'initiatives:kanban', label: 'Kanban de tarefas', category: 'projetos' },
  { key: 'initiatives:evidence', label: 'Evidências de entrega', category: 'projetos' },
  // Documentos e outros
  { key: 'documents:client', label: 'Documentos do cliente', category: 'documentos' },
  { key: 'calculator:scenarios', label: 'Cenários da calculadora', category: 'outros' },
];

/** Labels para categorias */
export const PERMISSION_CATEGORY_LABELS: Record<string, string> = {
  cadastros: 'Cadastros',
  projetos: 'Projetos',
  documentos: 'Documentos',
  outros: 'Outros',
};

/** Valor padrão para novas permissões (analistas adicionados) */
export const DEFAULT_PERMISSIONS: Record<string, PermissionLevel> = {
  'farms:card': 'view',
  'farms:form': 'view',
  'farms:delete': 'hidden',
  'clients:card': 'view',
  'clients:form': 'view',
  'clients:farms_modal': 'view',
  'people:card': 'view',
  'people:form': 'view',
  'projects:structure': 'view',
  'projects:program_modal': 'view',
  'projects:delivery_modal': 'view',
  'projects:activity_modal': 'view',
  'projects:task_modal': 'view',
  'initiatives:overview': 'view',
  'initiatives:form': 'view',
  'initiatives:kanban': 'view',
  'initiatives:evidence': 'view',
  'documents:client': 'view',
  'calculator:scenarios': 'view',
};
