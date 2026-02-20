/**
 * Taxonomia de chaves de permissão para acesso por analista à fazenda.
 * Cada chave mapeia para um nível: "hidden" | "view" | "edit"
 */

export type PermissionLevel = 'hidden' | 'view' | 'edit';

export type PermissionCategory = 'cadastros' | 'gerenciamento' | 'assistentes' | 'documentos';

export interface PermissionKeyDef {
  key: string;
  label: string;
  description: string;
  location: string;
  icon: string;
  category: PermissionCategory;
}

/** Todas as chaves de permissão do sistema (ordem para UI) */
export const PERMISSION_KEYS: PermissionKeyDef[] = [
  // Cadastros
  {
    key: 'farms:card',
    label: 'Lista de fazendas',
    description: 'Ver os cards das fazendas cadastradas',
    location: 'Cadastros > Fazendas',
    icon: 'Home',
    category: 'cadastros',
  },
  {
    key: 'farms:form',
    label: 'Cadastro de fazenda',
    description: 'Formulário de dados da fazenda',
    location: 'Cadastros > Fazendas > Formulário',
    icon: 'FileText',
    category: 'cadastros',
  },
  {
    key: 'farms:delete',
    label: 'Excluir fazenda',
    description: 'Botão e ação de excluir fazenda',
    location: 'Cadastros > Fazendas > Ação',
    icon: 'Trash2',
    category: 'cadastros',
  },
  {
    key: 'clients:card',
    label: 'Lista de clientes',
    description: 'Ver os clientes da fazenda',
    location: 'Cadastros > Clientes',
    icon: 'Building2',
    category: 'cadastros',
  },
  {
    key: 'clients:form',
    label: 'Cadastro de cliente',
    description: 'Formulário de dados do cliente',
    location: 'Cadastros > Clientes > Formulário',
    icon: 'FileText',
    category: 'cadastros',
  },
  {
    key: 'clients:farms_modal',
    label: 'Fazendas do cliente',
    description: 'Modal com lista de fazendas do cliente',
    location: 'Cadastros > Clientes > Modal Fazendas',
    icon: 'Home',
    category: 'cadastros',
  },
  {
    key: 'people:card',
    label: 'Lista de pessoas',
    description: 'Ver as pessoas cadastradas',
    location: 'Cadastros > Pessoas',
    icon: 'Users',
    category: 'cadastros',
  },
  {
    key: 'people:form',
    label: 'Cadastro de pessoa',
    description: 'Formulário de dados da pessoa',
    location: 'Cadastros > Pessoas > Formulário',
    icon: 'FileText',
    category: 'cadastros',
  },
  // Gerenciamento
  {
    key: 'projects:structure',
    label: 'Estrutura programas/entregas/atividades',
    description: 'Árvore de programas, entregas e atividades',
    location: 'Gerenciamento > Estrutura do Projeto',
    icon: 'FolderTree',
    category: 'gerenciamento',
  },
  {
    key: 'projects:program_modal',
    label: 'Modal de programa',
    description: 'Cadastro e edição de programa',
    location: 'Gerenciamento > Estrutura > Modal Programa',
    icon: 'LayoutList',
    category: 'gerenciamento',
  },
  {
    key: 'projects:delivery_modal',
    label: 'Modal de entrega',
    description: 'Cadastro e edição de entrega',
    location: 'Gerenciamento > Estrutura > Modal Entrega',
    icon: 'Package',
    category: 'gerenciamento',
  },
  {
    key: 'projects:activity_modal',
    label: 'Modal de atividade',
    description: 'Cadastro e edição de atividade',
    location: 'Gerenciamento > Estrutura > Modal Atividade',
    icon: 'ListChecks',
    category: 'gerenciamento',
  },
  {
    key: 'projects:task_modal',
    label: 'Modal de tarefa',
    description: 'Cadastro e edição de tarefa',
    location: 'Gerenciamento > Estrutura > Modal Tarefa',
    icon: 'SquareCheck',
    category: 'gerenciamento',
  },
  {
    key: 'initiatives:overview',
    label: 'Visão de iniciativas',
    description: 'Tela de overview de iniciativas',
    location: 'Gerenciamento > Visão Geral',
    icon: 'LayoutDashboard',
    category: 'gerenciamento',
  },
  {
    key: 'initiatives:form',
    label: 'Cadastro de iniciativa',
    description: 'Formulário de iniciativa',
    location: 'Gerenciamento > Iniciativas > Formulário',
    icon: 'FileText',
    category: 'gerenciamento',
  },
  {
    key: 'initiatives:kanban',
    label: 'Kanban de tarefas',
    description: 'Quadro Kanban de tarefas',
    location: 'Gerenciamento > Kanban',
    icon: 'Columns',
    category: 'gerenciamento',
  },
  {
    key: 'initiatives:evidence',
    label: 'Evidências de entrega',
    description: 'Upload e visualização de evidências',
    location: 'Gerenciamento > Entregas > Evidências',
    icon: 'Paperclip',
    category: 'gerenciamento',
  },
  // Documentos
  {
    key: 'documents:client',
    label: 'Documentos do cliente',
    description: 'Arquivos e documentos do cliente',
    location: 'Documentos',
    icon: 'FolderOpen',
    category: 'documentos',
  },
  // Assistentes
  {
    key: 'calculator:scenarios',
    label: 'Cenários da calculadora',
    description: 'Cenários salvos da calculadora de rentabilidade',
    location: 'Assistentes > Meus Salvos',
    icon: 'Calculator',
    category: 'assistentes',
  },
];

/** Labels para categorias (espelham o sidebar) */
export const PERMISSION_CATEGORY_LABELS: Record<PermissionCategory, string> = {
  cadastros: 'Cadastros',
  gerenciamento: 'Gerenciamento',
  assistentes: 'Assistentes',
  documentos: 'Documentos',
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
