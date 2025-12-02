export interface CattleCalculatorInputs {
  pesoCompra: number;      // kg
  valorCompra: number;     // R$/kg
  pesoAbate: number;       // kg
  rendimentoCarcaca: number; // %
  valorVenda: number;      // R$/@
  gmd: number;             // kg/dia
  custoMensal: number;     // R$/cab/mês
}

export interface CalculationResults {
  pesoCompraArrobas: number;
  pesoFinalArrobas: number;
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
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  checkPermission: (feature: string) => boolean;
  checkLimit: (limit: keyof Plan['limits'], value: number) => boolean;
  upgradePlan: (planId: Plan['id']) => void;
}