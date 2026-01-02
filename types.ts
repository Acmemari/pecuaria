export interface CattleCalculatorInputs {
  pesoCompra: number;      // kg
  valorCompra: number;     // R$/kg
  pesoAbate: number;       // kg
  rendimentoCarcaca: number; // %
  valorVenda: number;      // R$/@
  gmd: number;             // kg/dia
  custoMensal: number;     // R$/cab/mês
  lotacao: number;         // UA/HA
}

export interface CalculationResults {
  pesoCompraArrobas: number;
  pesoFinalArrobas: number;
  pesoFinalKgCarcaca?: number; // Para Paraguai
  arrobasProduzidas: number;
  diasPermanencia: number;
  mesesPermanencia: number;
  valorBoi: number;         // Revenue
  custoCompra: number;      // Initial cost
  custoOperacional: number; // Operational cost
  custoTotal: number;
  resultadoPorBoi: number;  // Profit
  margemVenda: number;      // %
  resultadoMensal: number;  // %
  resultadoAnual: number;   // %
  custoPorArrobaProduzida: number;
  custoPorArrobaFinal: number;
  giroEstoque: number;      // % - Indicador 13
  producaoArrobaPorHa: number; // @/ha - Indicador 14
  resultadoPorArrobaFinal: number; // R$ - Indicador 15
  resultadoPorHectareAno: number; // R$ - Indicador 16
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'financeiro' | 'zootecnico' | 'mercado' | 'consultoria' | 'admin';
  status: 'active' | 'dev' | 'planned' | 'locked';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
  avatar?: string;
  plan?: 'basic' | 'pro' | 'enterprise';
  status?: 'active' | 'inactive';
  lastLogin?: string;
  organizationId?: string;
  phone?: string;
  qualification?: 'visitante' | 'cliente' | 'analista';
}

export interface Plan {
  id: 'basic' | 'pro' | 'enterprise';
  name: string;
  price: number;
  features: string[];
  limits: {
    agents: number;
    historyDays: number;
    users: number;
  };
}

export interface Organization {
  id: string;
  name: string;
  plan: Plan['id'];
  ownerId: string;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  checkPermission: (feature: string) => boolean;
  checkLimit: (limit: keyof Plan['limits'], value: number) => boolean;
  upgradePlan: (planId: Plan['id']) => void;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  clearPasswordRecovery: () => void;
}

export interface CattleScenario {
  id: string;
  user_id: string;
  name: string;
  inputs: CattleCalculatorInputs;
  results?: CalculationResults;
  created_at: string;
  updated_at: string;
}

export interface Farm {
  id: string;
  name: string;
  country: string;
  state: string;
  city: string;
  // Dimensões (em hectares)
  totalArea?: number;
  pastureArea?: number;
  agricultureArea?: number;
  otherCrops?: number;
  infrastructure?: number;
  reserveAndAPP?: number;
  propertyValue?: number;
  // Dados da propriedade
  propertyType: 'Própria' | 'Arrendada';
  weightMetric: 'Arroba (@)' | 'Quilograma (Kg)';
  // Dados do rebanho
  averageHerd?: number;
  herdValue?: number;
  commercializesGenetics: boolean;
  productionSystem: 'Cria' | 'Recria-Engorda' | 'Ciclo Completo';
  createdAt: string;
  updatedAt: string;
}