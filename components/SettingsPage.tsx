import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  User as UserIcon,
  Lock,
  Building2,
  Palette,
  Shield,
  HelpCircle,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  Trash2,
  LogOut,
  Upload,
  Download,
  Globe,
  Moon,
  Sun,
  Monitor,
  Plus,
  Edit,
  Search,
  FileCheck
} from 'lucide-react';

interface SettingsPageProps {
  user: User;
  onBack: () => void;
  onToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onLogout: () => void;
}

type TabId = 'profile' | 'account' | 'company' | 'appearance' | 'privacy' | 'support' | 'questionnaires';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onBack, onToast, onLogout }) => {
  const { refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Profile state
  const [profileData, setProfileData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: '',
    avatar: user.avatar || user.name?.charAt(0).toUpperCase() || 'U'
  });

  // Account state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [emailVerified, setEmailVerified] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Company state
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyForm, setCompanyForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    description: '',
    plan: 'basic' as 'basic' | 'pro' | 'enterprise',
    status: 'active' as 'active' | 'inactive' | 'pending'
  });

  // Appearance state
  const [appearance, setAppearance] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    language: 'pt-BR',
    dateFormat: 'DD/MM/YYYY',
    currency: 'BRL'
  });

  // Privacy state
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'private',
    dataSharing: false
  });

  // Questions state (apenas para admin)
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [questionForm, setQuestionForm] = useState({
    category: '' as 'Gente' | 'Gestão' | 'Produção' | '',
    group: '',
    question: '',
    positiveAnswer: 'Sim' as 'Sim' | 'Não',
    applicableTypes: [] as ('Cria' | 'Recria-Engorda' | 'Ciclo Completo')[]
  });

  // Estrutura de categorias e grupos
  const categoriesAndGroups = {
    'Gente': ['Liderança', 'Valores', 'Autonomia', 'Domínio', 'Propósito'],
    'Gestão': ['Projeto', 'Execução', 'Gerenciamento'],
    'Produção': ['Cuidados com Solo', 'Manejo de Pastagens', 'Estratégia de Entressafra', 'Layout', 'Suplementação de Precisão', 'Genética Melhoradora', 'Reprodução', 'Sanidade Forte', 'Bem estar animal']
  };

  const tabs: Tab[] = [
    { id: 'profile', label: 'Perfil', icon: <UserIcon size={18} /> },
    { id: 'account', label: 'Conta', icon: <Lock size={18} /> },
    { id: 'company', label: 'Cadastro de Empresa', icon: <Building2 size={18} /> },
    { id: 'appearance', label: 'Aparência', icon: <Palette size={18} /> },
    { id: 'privacy', label: 'Privacidade', icon: <Shield size={18} /> },
    { id: 'support', label: 'Suporte', icon: <HelpCircle size={18} /> },
    ...(user.role === 'admin' ? [{ id: 'questionnaires' as TabId, label: 'Questionários', icon: <FileCheck size={18} /> }] : [])
  ];

  useEffect(() => {
    // Check email verification status
    const checkEmailVerification = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setEmailVerified(authUser.email_confirmed_at !== null);
      }
    };
    checkEmailVerification();

    // Load user profile data
    loadUserProfile();
    
    // Load companies if on company tab
    if (activeTab === 'company') {
      loadCompanies();
    }
    
    // Load questions if on questionnaires tab
    if (activeTab === 'questionnaires' && user.role === 'admin') {
      loadQuestions();
    }
  }, [activeTab]);

  const loadQuestions = async () => {
    setIsLoadingQuestions(true);
    try {
      // Questionário pré-cadastrado "Gente/Gestão/Produção" - 83 perguntas para Ciclo Completo
      const defaultQuestions: any[] = [
        // GENTE - Domínio (1-4)
        { id: '1', category: 'Gente', group: 'Domínio', question: 'A equipe possui treinamento técnico atualizado para as funções que exerce?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '2', category: 'Gente', group: 'Domínio', question: 'Os colaboradores demonstram conhecimento técnico adequado para suas funções?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '3', category: 'Gente', group: 'Domínio', question: 'Existe um programa de capacitação contínua para a equipe?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '4', category: 'Gente', group: 'Domínio', question: 'A equipe tem acesso a informações técnicas atualizadas sobre pecuária?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // GENTE - Propósito (5-7)
        { id: '5', category: 'Gente', group: 'Propósito', question: 'A equipe compreende claramente os objetivos e metas da fazenda?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '6', category: 'Gente', group: 'Propósito', question: 'Os colaboradores se sentem parte importante do sucesso da propriedade?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '7', category: 'Gente', group: 'Propósito', question: 'Existe alinhamento entre os objetivos pessoais e os da fazenda?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // GENTE - Valores (8-11)
        { id: '8', category: 'Gente', group: 'Valores', question: 'A equipe compartilha valores como responsabilidade e comprometimento?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '9', category: 'Gente', group: 'Valores', question: 'Existe respeito e colaboração entre os membros da equipe?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '10', category: 'Gente', group: 'Valores', question: 'A integridade e ética são valores praticados no dia a dia?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '11', category: 'Gente', group: 'Valores', question: 'A segurança no trabalho é uma prioridade para todos?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // GENTE - Autonomia (12-15)
        { id: '12', category: 'Gente', group: 'Autonomia', question: 'Os colaboradores têm liberdade para tomar decisões operacionais no dia a dia?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '13', category: 'Gente', group: 'Autonomia', question: 'A equipe pode propor melhorias e soluções para os processos?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '14', category: 'Gente', group: 'Autonomia', question: 'Existe confiança para que os colaboradores resolvam problemas rotineiros?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '15', category: 'Gente', group: 'Autonomia', question: 'Os colaboradores se sentem empoderados para agir quando necessário?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // GESTÃO - Projeto (16-20)
        { id: '16', category: 'Gestão', group: 'Projeto', question: 'Existe um planejamento estratégico definido para a fazenda?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '17', category: 'Gestão', group: 'Projeto', question: 'As metas e objetivos são claramente definidos e comunicados?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '18', category: 'Gestão', group: 'Projeto', question: 'Existe um plano de investimentos para os próximos anos?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '19', category: 'Gestão', group: 'Projeto', question: 'O planejamento financeiro é feito de forma sistemática?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '20', category: 'Gestão', group: 'Projeto', question: 'Existe um cronograma de atividades para o ano?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // GESTÃO - Execução (21-26)
        { id: '21', category: 'Gestão', group: 'Execução', question: 'As atividades planejadas são executadas conforme o cronograma?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '22', category: 'Gestão', group: 'Execução', question: 'Existe acompanhamento regular do desempenho das atividades?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '23', category: 'Gestão', group: 'Execução', question: 'Os processos são documentados e seguidos corretamente?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '24', category: 'Gestão', group: 'Execução', question: 'Existe um sistema de controle de qualidade nas operações?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '25', category: 'Gestão', group: 'Execução', question: 'As não conformidades são identificadas e corrigidas rapidamente?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '26', category: 'Gestão', group: 'Execução', question: 'A equipe tem os recursos necessários para executar bem suas funções?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // GESTÃO - Gerenciamento (27-33)
        { id: '27', category: 'Gestão', group: 'Gerenciamento', question: 'Existe um controle rigoroso de entrada e saída de insumos?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '28', category: 'Gestão', group: 'Gerenciamento', question: 'Os custos são monitorados e controlados regularmente?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '29', category: 'Gestão', group: 'Gerenciamento', question: 'Existe um sistema de registro de todas as operações?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '30', category: 'Gestão', group: 'Gerenciamento', question: 'As informações são organizadas e facilmente acessíveis?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '31', category: 'Gestão', group: 'Gerenciamento', question: 'Existe análise periódica dos resultados e indicadores?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '32', category: 'Gestão', group: 'Gerenciamento', question: 'As decisões são tomadas com base em dados e informações?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '33', category: 'Gestão', group: 'Gerenciamento', question: 'Existe comunicação eficiente entre todos os níveis da organização?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // PRODUÇÃO - Manejo de Pastagens (34-40)
        { id: '34', category: 'Produção', group: 'Manejo de Pastagens', question: 'É feita a medição de altura de entrada e saída dos animais nos piquetes?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '35', category: 'Produção', group: 'Manejo de Pastagens', question: 'O sistema de pastejo rotacionado é utilizado?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '36', category: 'Produção', group: 'Manejo de Pastagens', question: 'Existe um plano de rotação de pastagens definido?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '37', category: 'Produção', group: 'Manejo de Pastagens', question: 'A lotação é ajustada conforme a disponibilidade de forragem?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '38', category: 'Produção', group: 'Manejo de Pastagens', question: 'É realizado o descanso adequado das pastagens?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '39', category: 'Produção', group: 'Manejo de Pastagens', question: 'A qualidade das pastagens é monitorada regularmente?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '40', category: 'Produção', group: 'Manejo de Pastagens', question: 'Existe controle de plantas invasoras nas pastagens?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // PRODUÇÃO - Solo (41-46)
        { id: '41', category: 'Produção', group: 'Cuidados com Solo', question: 'É realizada análise de solo periodicamente?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '42', category: 'Produção', group: 'Cuidados com Solo', question: 'Encontro alguns pontos de solo descoberto na fazenda', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '43', category: 'Produção', group: 'Cuidados com Solo', question: 'Encontro alguns pontos com presença de plantas invasoras na fazenda', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '44', category: 'Produção', group: 'Manejo de Pastagens', question: 'Encontro alguns pontos de pasto abaixo do ponto de manejo na fazenda', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '45', category: 'Produção', group: 'Cuidados com Solo', question: 'Encontro alguns pontos com erosão na fazenda', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '46', category: 'Produção', group: 'Cuidados com Solo', question: 'É feita correção de solo quando necessário?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // PRODUÇÃO - Suplementação (47-50)
        { id: '47', category: 'Produção', group: 'Suplementação de Precisão', question: 'Reconheço que alguns lotes chegam a apresentar escore corporal abaixo de 3', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '48', category: 'Produção', group: 'Suplementação de Precisão', question: 'A suplementação é ajustada conforme a necessidade nutricional?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '49', category: 'Produção', group: 'Suplementação de Precisão', question: 'Existe um programa de suplementação definido por categoria?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '50', category: 'Produção', group: 'Suplementação de Precisão', question: 'A qualidade dos suplementos é monitorada?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // PRODUÇÃO - Sanidade (51-54)
        { id: '51', category: 'Produção', group: 'Sanidade Forte', question: 'Tenho algumas aguadas naturais (rio, lago ou cacimba)', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '52', category: 'Produção', group: 'Sanidade Forte', question: 'O calendário sanitário é seguido rigorosamente em 100% do rebanho?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '53', category: 'Produção', group: 'Sanidade Forte', question: 'Existe controle de doenças e parasitas?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '54', category: 'Produção', group: 'Sanidade Forte', question: 'Os animais doentes são identificados e tratados rapidamente?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // PRODUÇÃO - Manejo de Pastagens (55-58)
        { id: '55', category: 'Produção', group: 'Manejo de Pastagens', question: 'Reconheço que muitas vezes meu pasto passa da altura ideal', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '56', category: 'Produção', group: 'Manejo de Pastagens', question: 'Reconheço que muitas vezes meu pasto rebaixa abaixo do recomendado', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '57', category: 'Produção', group: 'Manejo de Pastagens', question: 'A altura do pasto é mantida dentro da faixa ideal?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '58', category: 'Produção', group: 'Manejo de Pastagens', question: 'Existe monitoramento da taxa de lotação?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // PRODUÇÃO - Layout (59-61)
        { id: '59', category: 'Produção', group: 'Layout', question: 'O layout da propriedade facilita o manejo dos animais?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '60', category: 'Produção', group: 'Layout', question: 'Existe infraestrutura adequada para todas as operações?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '61', category: 'Produção', group: 'Layout', question: 'Os piquetes são de tamanho adequado para o manejo?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // PRODUÇÃO - Solo (62-65)
        { id: '62', category: 'Produção', group: 'Cuidados com Solo', question: 'É realizado manejo adequado para preservar o solo?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '63', category: 'Produção', group: 'Cuidados com Solo', question: 'Existe cobertura vegetal adequada em toda a propriedade?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '64', category: 'Produção', group: 'Cuidados com Solo', question: 'Para alta produção, preciso reformar meus pastos a cada 5 anos ou menos', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '65', category: 'Produção', group: 'Cuidados com Solo', question: 'O solo é mantido produtivo sem necessidade de reformas frequentes?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // PRODUÇÃO - Bem estar Animal (66-70)
        { id: '66', category: 'Produção', group: 'Bem estar animal', question: 'Os animais têm acesso adequado a água de qualidade?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '67', category: 'Produção', group: 'Bem estar animal', question: 'Existe sombra adequada para os animais?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '68', category: 'Produção', group: 'Bem estar animal', question: 'Os animais são manejados de forma tranquila e sem estresse?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '69', category: 'Produção', group: 'Bem estar animal', question: 'No verão, frequentemente observo animais deitados ofegantes por conta do calor intenso', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '70', category: 'Produção', group: 'Bem estar animal', question: 'Existe monitoramento do bem-estar dos animais?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // PRODUÇÃO - Reprodução (71-74)
        { id: '71', category: 'Produção', group: 'Reprodução', question: 'Existe um programa reprodutivo definido?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '72', category: 'Produção', group: 'Reprodução', question: 'A taxa de prenhez é monitorada e controlada?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '73', category: 'Produção', group: 'Reprodução', question: 'Os touros são selecionados e avaliados adequadamente?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '74', category: 'Produção', group: 'Reprodução', question: 'Existe controle de estação de monta?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // PRODUÇÃO - Genética (75)
        { id: '75', category: 'Produção', group: 'Genética Melhoradora', question: 'Existe um programa de melhoramento genético?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // GENTE - Liderança (76-77)
        { id: '76', category: 'Gente', group: 'Liderança', question: 'Existe liderança clara e efetiva na propriedade?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '77', category: 'Gente', group: 'Liderança', question: 'A liderança promove o desenvolvimento da equipe?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // PRODUÇÃO - Estratégia de Entressafra (78-80)
        { id: '78', category: 'Produção', group: 'Estratégia de Entressafra', question: 'Existe uma estratégia definida para o período de entressafra?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '79', category: 'Produção', group: 'Estratégia de Entressafra', question: 'A produção de forragem é planejada para todo o ano?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '80', category: 'Produção', group: 'Estratégia de Entressafra', question: 'Existe reserva de forragem para períodos críticos?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        
        // PRODUÇÃO - Genética (81-83)
        { id: '81', category: 'Produção', group: 'Genética Melhoradora', question: 'Os animais são selecionados com base em critérios genéticos?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '82', category: 'Produção', group: 'Genética Melhoradora', question: 'Existe acompanhamento do desempenho genético do rebanho?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: '83', category: 'Produção', group: 'Genética Melhoradora', question: 'O programa genético está alinhado com os objetivos da propriedade?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'], created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      ];
      setQuestions(defaultQuestions);
    } catch (error) {
      console.error('Erro ao carregar perguntas:', error);
      onToast('Erro ao carregar perguntas', 'error');
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.category || !questionForm.group || !questionForm.question) {
      onToast('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    if (questionForm.applicableTypes.length === 0) {
      onToast('Selecione pelo menos um tipo de questionário aplicável', 'error');
      return;
    }

    try {
      // Por enquanto apenas estrutura - será implementado posteriormente
      const questionData = {
        id: editingQuestion?.id || Date.now().toString(),
        category: questionForm.category,
        group: questionForm.group,
        question: questionForm.question,
        positiveAnswer: questionForm.positiveAnswer,
        applicableTypes: questionForm.applicableTypes,
        created_at: editingQuestion?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (editingQuestion) {
        // Atualizar
        setQuestions(questions.map(q => q.id === editingQuestion.id ? questionData : q));
        onToast('Pergunta atualizada com sucesso!', 'success');
      } else {
        // Criar
        setQuestions([...questions, questionData]);
        onToast('Pergunta criada com sucesso!', 'success');
      }

      setShowQuestionForm(false);
      setEditingQuestion(null);
      setQuestionForm({
        category: '' as '' | 'Gente' | 'Gestão' | 'Produção',
        group: '',
        question: '',
        positiveAnswer: 'Sim' as 'Sim' | 'Não',
        applicableTypes: []
      });
    } catch (error) {
      console.error('Erro ao salvar pergunta:', error);
      onToast('Erro ao salvar pergunta', 'error');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta pergunta?')) {
      try {
        setQuestions(questions.filter(q => q.id !== questionId));
        onToast('Pergunta excluída com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao excluir pergunta:', error);
        onToast('Erro ao excluir pergunta', 'error');
      }
    }
  };

  const handleToggleApplicableType = (type: 'Cria' | 'Recria-Engorda' | 'Ciclo Completo') => {
    setQuestionForm(prev => ({
      ...prev,
      applicableTypes: prev.applicableTypes.includes(type)
        ? prev.applicableTypes.filter(t => t !== type)
        : [...prev.applicableTypes, type]
    }));
  };

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setProfileData({
          name: data.name || user.name || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
          avatar: data.avatar || user.avatar || user.name?.charAt(0).toUpperCase() || 'U'
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          name: profileData.name,
          phone: profileData.phone || null,
          avatar: profileData.avatar
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update email if changed
      if (profileData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profileData.email
        });
        if (emailError) throw emailError;
      }

      await refreshProfile();
      onToast('Perfil atualizado com sucesso!', 'success');
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      onToast(error.message || 'Erro ao salvar perfil', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      onToast('As senhas não coincidem', 'error');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      onToast('A senha deve ter pelo menos 6 caracteres', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      onToast('Senha alterada com sucesso!', 'success');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      onToast(error.message || 'Erro ao alterar senha', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsSaving(true);
    try {
      // Note: Actual account deletion requires admin privileges
      // For now, we'll mark the account as inactive and sign out
      // Admin can handle actual deletion via admin panel
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ status: 'inactive' })
        .eq('id', user.id);

      if (profileError) throw profileError;

      onToast('Sua conta foi marcada para exclusão. Entre em contato com o suporte para finalizar o processo.', 'info');

      // Sign out the user
      await supabase.auth.signOut();

      setTimeout(() => {
        onLogout();
      }, 2000);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      onToast(error.message || 'Erro ao processar exclusão. Entre em contato com o suporte.', 'error');
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDownloadData = async () => {
    try {
      // Fetch all user data
      const [profileData, messagesData, scenariosData] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', user.id).single(),
        supabase.from('chat_messages').select('*').eq('user_id', user.id),
        supabase.from('cattle_scenarios').select('*').eq('user_id', user.id)
      ]);

      const exportData = {
        profile: profileData.data,
        messages: messagesData.data,
        scenarios: scenariosData.data,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pecuaria-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onToast('Dados exportados com sucesso!', 'success');
    } catch (error: any) {
      console.error('Error exporting data:', error);
      onToast('Erro ao exportar dados', 'error');
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-ai-text mb-4">Informações do Perfil</h3>

        {/* Avatar Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-ai-text mb-2">Foto do Perfil</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-ai-accent text-white flex items-center justify-center text-2xl font-bold">
              {profileData.avatar || profileData.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <button className="px-4 py-2 bg-ai-surface border border-ai-border rounded-lg text-sm text-ai-text hover:bg-ai-surface2 transition-colors flex items-center gap-2">
                <Upload size={16} />
                Alterar Foto
              </button>
              <p className="text-xs text-ai-subtext mt-1">JPG, PNG ou GIF. Máx. 2MB</p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-ai-text mb-2">Nome Completo</label>
          <input
            type="text"
            value={profileData.name}
            onChange={(e) => handleProfileChange('name', e.target.value)}
            className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
            placeholder="Seu nome completo"
          />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-ai-text mb-2">Email</label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => handleProfileChange('email', e.target.value)}
              className="flex-1 px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
              placeholder="seu@email.com"
            />
            {emailVerified && (
              <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded border border-green-200">
                <CheckCircle2 size={14} />
                Verificado
              </span>
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-ai-text mb-2">Telefone</label>
          <input
            type="tel"
            value={profileData.phone}
            onChange={(e) => handleProfileChange('phone', e.target.value)}
            className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
            placeholder="(00) 00000-0000"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveProfile}
          disabled={isSaving || !hasUnsavedChanges}
          className="px-6 py-2.5 bg-ai-accent text-white rounded-lg font-medium hover:bg-ai-accentHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save size={16} />
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-6">
      {/* Change Password */}
      <div>
        <h3 className="text-lg font-semibold text-ai-text mb-4">Alterar Senha</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ai-text mb-2">Senha Atual</label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent pr-10"
                placeholder="Digite sua senha atual"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ai-subtext hover:text-ai-text"
              >
                {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ai-text mb-2">Nova Senha</label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent pr-10"
                placeholder="Digite sua nova senha"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ai-subtext hover:text-ai-text"
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ai-text mb-2">Confirmar Nova Senha</label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent pr-10"
                placeholder="Confirme sua nova senha"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ai-subtext hover:text-ai-text"
              >
                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            onClick={handlePasswordChange}
            disabled={isSaving || !passwordData.newPassword || !passwordData.confirmPassword}
            className="px-6 py-2.5 bg-ai-accent text-white rounded-lg font-medium hover:bg-ai-accentHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </div>
      </div>

      {/* Two Factor Authentication */}
      <div className="border-t border-ai-border pt-6">
        <h3 className="text-lg font-semibold text-ai-text mb-4">Segurança</h3>
        <div className="flex items-center justify-between p-4 bg-ai-surface rounded-lg border border-ai-border">
          <div>
            <p className="font-medium text-ai-text">Verificação em Duas Etapas</p>
            <p className="text-sm text-ai-subtext mt-1">Adicione uma camada extra de segurança à sua conta</p>
          </div>
          <button
            onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${twoFactorEnabled ? 'bg-ai-accent' : 'bg-gray-300'
              }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="border-t border-ai-border pt-6">
        <h3 className="text-lg font-semibold text-ai-text mb-4">Sessões Ativas</h3>
        <div className="space-y-2">
          <div className="p-4 bg-ai-surface rounded-lg border border-ai-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ai-text">Sessão Atual</p>
                <p className="text-sm text-ai-subtext">Este dispositivo • {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
              <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded border border-green-200">
                Ativa
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account */}
      <div className="border-t border-ai-border pt-6">
        <h3 className="text-lg font-semibold text-red-600 mb-4">Zona de Perigo</h3>
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-800 mb-4">
            Ao excluir sua conta, todos os seus dados serão permanentemente removidos. Esta ação não pode ser desfeita.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} />
            Excluir Conta
          </button>
        </div>
      </div>
    </div>
  );

  const loadCompanies = async () => {
    setIsLoadingCompanies(true);
    try {
      // Admins can see all companies, regular users see only their own
      let query = supabase
        .from('organizations')
        .select('*');

      if (user.role !== 'admin') {
        query = query.eq('owner_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      // Remove duplicates by name (case-insensitive) - keep the most recent one
      if (data && data.length > 0) {
        const uniqueCompanies = data.filter((company, index, self) => {
          const firstIndex = self.findIndex((c) => 
            c.name.toLowerCase().trim() === company.name.toLowerCase().trim()
          );
          // Keep only the first occurrence (most recent due to order by created_at desc)
          return index === firstIndex;
        });
        
        console.log('[SettingsPage] Loaded companies:', uniqueCompanies.length, 'unique companies (from', data.length, 'total)');
        setCompanies(uniqueCompanies);
      } else {
        setCompanies([]);
      }
    } catch (error: any) {
      console.error('Error loading companies:', error);
      onToast('Erro ao carregar empresas', 'error');
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const handleCompanyFormChange = (field: string, value: string) => {
    setCompanyForm(prev => ({ ...prev, [field]: value }));
  };

  const formatPhone = (phone: string): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 11) {
      return cleanPhone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (cleanPhone.length === 10) {
      return cleanPhone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    return phone;
  };

  const formatCEP = (cep: string): string => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      return cleanCEP.replace(/^(\d{5})(\d{3})$/, '$1-$2');
    }
    return cep;
  };

  const handleSaveCompany = async () => {
    if (!companyForm.name.trim()) {
      onToast('Nome da empresa é obrigatório', 'error');
      return;
    }

    // Only admins can create companies
    if (user.role !== 'admin') {
      onToast('Apenas administradores podem cadastrar empresas', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const companyName = companyForm.name.trim();
      
      // Check for duplicate name (case-insensitive) when creating new company
      if (!editingCompany) {
        const { data: existingCompanies, error: checkError } = await supabase
          .from('organizations')
          .select('id, name')
          .ilike('name', companyName);
        
        if (checkError) throw checkError;
        
        if (existingCompanies && existingCompanies.length > 0) {
          onToast('Já existe uma empresa com este nome', 'error');
          setIsSaving(false);
          return;
        }
      }

      const companyData = {
        name: companyName,
        phone: companyForm.phone ? companyForm.phone.replace(/\D/g, '') : null,
        address: companyForm.address.trim() || null,
        city: companyForm.city.trim() || null,
        state: companyForm.state.trim().toUpperCase() || null,
        zip_code: companyForm.zip_code ? companyForm.zip_code.replace(/\D/g, '') : null,
        description: companyForm.description.trim() || null,
        plan: companyForm.plan,
        status: companyForm.status,
        owner_id: user.id,
        updated_at: new Date().toISOString()
      };

      if (editingCompany) {
        // Update existing company
        const { error } = await supabase
          .from('organizations')
          .update(companyData)
          .eq('id', editingCompany.id);

        if (error) throw error;
        onToast('Empresa atualizada com sucesso!', 'success');
      } else {
        // Create new company
        const { error } = await supabase
          .from('organizations')
          .insert(companyData);

        if (error) throw error;
        onToast('Empresa cadastrada com sucesso!', 'success');
      }

      setShowCompanyForm(false);
      setEditingCompany(null);
      resetCompanyForm();
      await loadCompanies();
    } catch (error: any) {
      console.error('Error saving company:', error);
      onToast(error.message || 'Erro ao salvar empresa', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCompany = (company: any) => {
    // Only admins can edit companies
    if (user.role !== 'admin') {
      onToast('Apenas administradores podem editar empresas', 'error');
      return;
    }
    setEditingCompany(company);
    setCompanyForm({
      name: company.name || '',
      phone: company.phone ? formatPhone(company.phone) : '',
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      zip_code: company.zip_code ? formatCEP(company.zip_code) : '',
      description: company.description || '',
      plan: company.plan || 'basic',
      status: company.status || 'active'
    });
    setShowCompanyForm(true);
  };

  const handleDeleteCompany = async (companyId: string) => {
    // Only admins can delete companies
    if (user.role !== 'admin') {
      onToast('Apenas administradores podem excluir empresas', 'error');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.')) {
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', companyId);

      if (error) throw error;
      onToast('Empresa excluída com sucesso!', 'success');
      await loadCompanies();
    } catch (error: any) {
      console.error('Error deleting company:', error);
      onToast(error.message || 'Erro ao excluir empresa', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const resetCompanyForm = () => {
    setCompanyForm({
      name: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      description: '',
      plan: 'basic',
      status: 'active'
    });
    setEditingCompany(null);
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderCompanyTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-ai-text">Cadastro de Empresas</h3>
        {user.role === 'admin' && (
          <button
            onClick={() => {
              resetCompanyForm();
              setShowCompanyForm(true);
            }}
            className="px-4 py-2 bg-ai-accent text-white rounded-lg font-medium hover:bg-ai-accentHover transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Nova Empresa
          </button>
        )}
      </div>

      {/* Company Form Modal */}
      {showCompanyForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ai-text">
                {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
              </h3>
              <button
                onClick={() => {
                  setShowCompanyForm(false);
                  resetCompanyForm();
                }}
                className="text-ai-subtext hover:text-ai-text"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
          <div>
                <label className="block text-sm font-medium text-ai-text mb-2">
                  Nome da Empresa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => handleCompanyFormChange('name', e.target.value)}
                  className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
                  placeholder="Nome da empresa"
                  required
                />
          </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-ai-text mb-2">Telefone</label>
                <input
                  type="text"
                  value={companyForm.phone}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    handleCompanyFormChange('phone', formatted);
                  }}
                  className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-ai-text mb-2">Endereço</label>
                <input
                  type="text"
                  value={companyForm.address}
                  onChange={(e) => handleCompanyFormChange('address', e.target.value)}
                  className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
                  placeholder="Rua, número, complemento"
                />
              </div>

              {/* City, State, ZIP Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ai-text mb-2">Cidade</label>
                  <input
                    type="text"
                    value={companyForm.city}
                    onChange={(e) => handleCompanyFormChange('city', e.target.value)}
                    className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
                    placeholder="Cidade"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ai-text mb-2">UF</label>
                  <input
                    type="text"
                    value={companyForm.state}
                    onChange={(e) => handleCompanyFormChange('state', e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ai-text mb-2">CEP</label>
                <input
                  type="text"
                  value={companyForm.zip_code}
                  onChange={(e) => {
                    const formatted = formatCEP(e.target.value);
                    handleCompanyFormChange('zip_code', formatted);
                  }}
                  className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>

              {/* Plan and Status Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ai-text mb-2">Plano</label>
                  <select
                    value={companyForm.plan}
                    onChange={(e) => handleCompanyFormChange('plan', e.target.value)}
                    className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
                  >
                    <option value="basic">Básico</option>
                    <option value="pro">Profissional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ai-text mb-2">Status</label>
                  <select
                    value={companyForm.status}
                    onChange={(e) => handleCompanyFormChange('status', e.target.value)}
                    className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                    <option value="pending">Pendente</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-ai-text mb-2">Descrição</label>
                <textarea
                  value={companyForm.description}
                  onChange={(e) => handleCompanyFormChange('description', e.target.value)}
                  className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
                  placeholder="Descrição da empresa ou atividade principal"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
          <button
                onClick={() => {
                  setShowCompanyForm(false);
                  resetCompanyForm();
                }}
                className="flex-1 px-4 py-2 border border-ai-border text-ai-text rounded-lg font-medium hover:bg-ai-surface2 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCompany}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-ai-accent text-white rounded-lg font-medium hover:bg-ai-accentHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {isSaving ? 'Salvando...' : editingCompany ? 'Atualizar' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ai-subtext" size={18} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
          placeholder="Buscar empresas por nome..."
        />
      </div>

      {/* Companies Table */}
      {isLoadingCompanies ? (
        <div className="text-center py-8 text-ai-subtext">Carregando empresas...</div>
      ) : filteredCompanies.length === 0 ? (
        <div className="text-center py-8 text-ai-subtext">
          {searchTerm ? 'Nenhuma empresa encontrada' : user.role === 'admin' 
            ? 'Nenhuma empresa cadastrada. Clique em "Nova Empresa" para começar.'
            : 'Nenhuma empresa cadastrada.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-ai-surface border-b border-ai-border">
                <th className="px-4 py-3 text-left text-sm font-semibold text-ai-text">Nome</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ai-text">Plano</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ai-text">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-ai-text">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company) => (
                <tr key={company.id} className="border-b border-ai-border hover:bg-ai-surface/50">
                  <td className="px-4 py-3 text-sm text-ai-text">{company.name}</td>
                  <td className="px-4 py-3 text-sm text-ai-subtext">
                    <span className={`px-2 py-1 rounded text-xs ${
                      company.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                      company.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {company.plan === 'enterprise' ? 'Enterprise' :
                       company.plan === 'pro' ? 'Profissional' : 'Básico'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-ai-subtext">
                    <span className={`px-2 py-1 rounded text-xs ${
                      company.status === 'active' ? 'bg-green-100 text-green-700' :
                      company.status === 'inactive' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {company.status === 'active' ? 'Ativo' :
                       company.status === 'inactive' ? 'Inativo' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.role === 'admin' && (
                        <>
                          <button
                            onClick={() => handleEditCompany(company)}
                            className="p-2 text-ai-accent hover:bg-ai-surface2 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit size={16} />
          </button>
                          <button
                            onClick={() => handleDeleteCompany(company.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
        </div>
                  </td>
                </tr>
      ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-ai-text mb-4">Personalização</h3>

      {/* Theme */}
      <div>
        <label className="block text-sm font-medium text-ai-text mb-2">Tema</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'light', label: 'Claro', icon: <Sun size={20} /> },
            { value: 'dark', label: 'Escuro', icon: <Moon size={20} /> },
            { value: 'system', label: 'Automático', icon: <Monitor size={20} /> }
          ].map((theme) => (
            <button
              key={theme.value}
              onClick={() => setAppearance(prev => ({ ...prev, theme: theme.value as any }))}
              className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-colors ${appearance.theme === theme.value
                ? 'border-ai-accent bg-ai-accent/10'
                : 'border-ai-border bg-white hover:border-ai-subtext'
                }`}
            >
              {theme.icon}
              <span className="text-sm font-medium text-ai-text">{theme.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <label className="block text-sm font-medium text-ai-text mb-2">Idioma</label>
        <select
          value={appearance.language}
          onChange={(e) => setAppearance(prev => ({ ...prev, language: e.target.value }))}
          className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
        >
          <option value="pt-BR">Português (Brasil)</option>
          <option value="en-US">English (US)</option>
          <option value="es-ES">Español</option>
        </select>
      </div>

      {/* Date Format */}
      <div>
        <label className="block text-sm font-medium text-ai-text mb-2">Formato de Data</label>
        <select
          value={appearance.dateFormat}
          onChange={(e) => setAppearance(prev => ({ ...prev, dateFormat: e.target.value }))}
          className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
        >
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </select>
      </div>

      {/* Currency */}
      <div>
        <label className="block text-sm font-medium text-ai-text mb-2">Moeda Padrão</label>
        <select
          value={appearance.currency}
          onChange={(e) => setAppearance(prev => ({ ...prev, currency: e.target.value }))}
          className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
        >
          <option value="BRL">R$ (Real Brasileiro)</option>
          <option value="USD">$ (Dólar Americano)</option>
          <option value="EUR">€ (Euro)</option>
        </select>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-ai-text mb-4">Configurações de Privacidade</h3>

      {/* Profile Visibility */}
      <div>
        <label className="block text-sm font-medium text-ai-text mb-2">Visibilidade do Perfil</label>
        <select
          value={privacy.profileVisibility}
          onChange={(e) => setPrivacy(prev => ({ ...prev, profileVisibility: e.target.value }))}
          className="w-full px-4 py-2 border border-ai-border rounded-lg bg-white text-ai-text focus:outline-none focus:ring-2 focus:ring-ai-accent"
        >
          <option value="private">Privado</option>
          <option value="public">Público</option>
          <option value="contacts">Apenas Contatos</option>
        </select>
      </div>

      {/* Data Sharing */}
      <div className="flex items-center justify-between p-4 bg-ai-surface rounded-lg border border-ai-border">
        <div>
          <p className="font-medium text-ai-text">Compartilhamento de Dados</p>
          <p className="text-sm text-ai-subtext mt-1">Permitir compartilhamento anônimo de dados para melhorias</p>
        </div>
        <button
          onClick={() => setPrivacy(prev => ({ ...prev, dataSharing: !prev.dataSharing }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${privacy.dataSharing ? 'bg-ai-accent' : 'bg-gray-300'
            }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${privacy.dataSharing ? 'translate-x-6' : 'translate-x-1'
              }`}
          />
        </button>
      </div>

      {/* Download Data */}
      <div className="border-t border-ai-border pt-6">
        <h3 className="text-lg font-semibold text-ai-text mb-4">LGPD - Seus Dados</h3>
        <div className="p-4 bg-ai-surface rounded-lg border border-ai-border">
          <p className="text-sm text-ai-subtext mb-4">
            Você tem o direito de baixar todos os seus dados pessoais armazenados em nossa plataforma.
          </p>
          <button
            onClick={handleDownloadData}
            className="px-4 py-2 bg-ai-accent text-white rounded-lg font-medium hover:bg-ai-accentHover transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Baixar Meus Dados
          </button>
        </div>
      </div>

      {/* Activity History */}
      <div className="border-t border-ai-border pt-6">
        <h3 className="text-lg font-semibold text-ai-text mb-4">Histórico de Atividades</h3>
        <div className="p-4 bg-ai-surface rounded-lg border border-ai-border">
          <p className="text-sm text-ai-subtext">
            Seu histórico de atividades está sendo registrado para melhorar sua experiência.
          </p>
          <button className="mt-4 px-4 py-2 border border-ai-border text-ai-text rounded-lg font-medium hover:bg-ai-surface2 transition-colors">
            Ver Histórico Completo
          </button>
        </div>
      </div>
    </div>
  );

  const renderSupportTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-ai-text mb-4">Central de Ajuda</h3>

      <div className="grid md:grid-cols-2 gap-4">
        <a
          href="#"
          className="p-6 bg-ai-surface rounded-lg border border-ai-border hover:border-ai-subtext transition-colors"
        >
          <HelpCircle size={24} className="text-ai-accent mb-3" />
          <h4 className="font-medium text-ai-text mb-2">Central de Ajuda</h4>
          <p className="text-sm text-ai-subtext">Encontre respostas para suas dúvidas</p>
        </a>

        <button
          onClick={() => onToast('Funcionalidade em desenvolvimento', 'info')}
          className="p-6 bg-ai-surface rounded-lg border border-ai-border hover:border-ai-subtext transition-colors text-left"
        >
          <HelpCircle size={24} className="text-ai-accent mb-3" />
          <h4 className="font-medium text-ai-text mb-2">Reportar Problema</h4>
          <p className="text-sm text-ai-subtext">Envie um relatório de bug ou problema</p>
        </button>

        <button
          onClick={() => onToast('Funcionalidade em desenvolvimento', 'info')}
          className="p-6 bg-ai-surface rounded-lg border border-ai-border hover:border-ai-subtext transition-colors text-left"
        >
          <HelpCircle size={24} className="text-ai-accent mb-3" />
          <h4 className="font-medium text-ai-text mb-2">Enviar Feedback</h4>
          <p className="text-sm text-ai-subtext">Compartilhe suas sugestões e ideias</p>
        </button>

        <div className="p-6 bg-ai-surface rounded-lg border border-ai-border">
          <Globe size={24} className="text-ai-accent mb-3" />
          <h4 className="font-medium text-ai-text mb-2">Documentação Legal</h4>
          <div className="space-y-2 mt-3">
            <a href="#" className="text-sm text-ai-accent hover:underline block">Termos de Uso</a>
            <a href="#" className="text-sm text-ai-accent hover:underline block">Política de Privacidade</a>
          </div>
        </div>
      </div>
    </div>
  );

  // Função para converter códigos de sistema para o formato aplicável
  const convertSystemCodes = (systemCode: string): ('Cria' | 'Recria-Engorda' | 'Ciclo Completo')[] => {
    const codes = systemCode.split(';').map(c => c.trim());
    const result: ('Cria' | 'Recria-Engorda' | 'Ciclo Completo')[] = [];
    
    if (codes.includes('CC')) {
      result.push('Ciclo Completo');
    }
    if (codes.includes('CR')) {
      result.push('Cria');
    }
    if (codes.includes('RE')) {
      result.push('Recria-Engorda');
    }
    
    return result;
  };

  // Função para processar e importar CSV
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Verificar se é um arquivo CSV
    if (!file.name.endsWith('.csv')) {
      onToast('Por favor, selecione um arquivo CSV', 'error');
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        onToast('O arquivo CSV está vazio ou não possui dados', 'error');
        return;
      }

      // Parsear cabeçalho (primeira linha)
      const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      // Encontrar índices das colunas esperadas
      const categoryIdx = header.findIndex(h => 
        h.toLowerCase().includes('categoria') || h.toLowerCase().includes('category')
      );
      const groupIdx = header.findIndex(h => 
        h.toLowerCase().includes('grupo') || h.toLowerCase().includes('group')
      );
      const questionIdx = header.findIndex(h => 
        h.toLowerCase().includes('pergunta') || h.toLowerCase().includes('question')
      );
      const positiveAnswerIdx = header.findIndex(h => 
        h.toLowerCase().includes('resposta') || h.toLowerCase().includes('positive') || h.toLowerCase().includes('resp')
      );
      const systemIdx = header.findIndex(h => 
        h.toLowerCase().includes('sistema') || h.toLowerCase().includes('system')
      );

      if (categoryIdx === -1 || groupIdx === -1 || questionIdx === -1 || positiveAnswerIdx === -1 || systemIdx === -1) {
        onToast('Formato CSV inválido. Colunas esperadas: Categoria, Grupo, Pergunta, Resposta positiva, SISTEMA', 'error');
        return;
      }

      // Processar linhas de dados
      const importedQuestions: any[] = [];
      let idCounter = 1;

      for (let i = 1; i < lines.length; i++) {
        // Parsear linha (considerando aspas e vírgulas dentro de campos)
        const line = lines[i];
        const values: string[] = [];
        let currentValue = '';
        let insideQuotes = false;

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === ',' && !insideQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim()); // Adicionar último valor

        if (values.length < Math.max(categoryIdx, groupIdx, questionIdx, positiveAnswerIdx, systemIdx) + 1) {
          continue; // Pular linhas incompletas
        }

        const category = values[categoryIdx]?.replace(/^"|"$/g, '').trim();
        const group = values[groupIdx]?.replace(/^"|"$/g, '').trim();
        const question = values[questionIdx]?.replace(/^"|"$/g, '').trim();
        const positiveAnswer = values[positiveAnswerIdx]?.replace(/^"|"$/g, '').trim();
        const systemCode = values[systemIdx]?.replace(/^"|"$/g, '').trim();

        if (!category || !group || !question || !positiveAnswer || !systemCode) {
          continue; // Pular linhas com campos obrigatórios vazios
        }

        // Validar categoria
        if (!['Gente', 'Gestão', 'Produção'].includes(category)) {
          console.warn(`Categoria inválida na linha ${i + 1}: ${category}`);
          continue;
        }

        // Validar resposta positiva
        if (!['Sim', 'Não', 'sim', 'não', 'SIM', 'NÃO'].includes(positiveAnswer)) {
          console.warn(`Resposta positiva inválida na linha ${i + 1}: ${positiveAnswer}`);
          continue;
        }

        // Converter códigos de sistema
        const applicableTypes = convertSystemCodes(systemCode);

        if (applicableTypes.length === 0) {
          console.warn(`Código de sistema inválido na linha ${i + 1}: ${systemCode}`);
          continue;
        }

        importedQuestions.push({
          id: String(idCounter++),
          category: category,
          group: group,
          question: question,
          positiveAnswer: positiveAnswer.charAt(0).toUpperCase() + positiveAnswer.slice(1).toLowerCase() as 'Sim' | 'Não',
          applicableTypes: applicableTypes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      if (importedQuestions.length === 0) {
        onToast('Nenhuma pergunta válida foi encontrada no arquivo CSV', 'error');
        return;
      }

      // Substituir todas as perguntas pelas importadas
      setQuestions(importedQuestions);
      onToast(`${importedQuestions.length} pergunta(s) importada(s) com sucesso!`, 'success');

      // Limpar o input para permitir reimportação do mesmo arquivo
      event.target.value = '';
    } catch (error) {
      console.error('Erro ao importar CSV:', error);
      onToast('Erro ao processar arquivo CSV. Verifique o formato do arquivo.', 'error');
    }
  };

  const renderQuestionnairesTab = () => {
    const availableGroups = questionForm.category ? categoriesAndGroups[questionForm.category] || [] : [];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ai-text">Configurar Perguntas</h3>
            <p className="text-sm text-ai-subtext mt-1">
              Cadastre e gerencie as perguntas do banco de dados.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors cursor-pointer">
              <Upload size={18} />
              Importar CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
              />
            </label>
            <button
              onClick={() => {
                setEditingQuestion(null);
                setQuestionForm({
                  category: '' as '' | 'Gente' | 'Gestão' | 'Produção',
                  group: '',
                  question: '',
                  positiveAnswer: 'Sim' as 'Sim' | 'Não',
                  applicableTypes: []
                });
                setShowQuestionForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-ai-accent text-white rounded-lg font-medium hover:bg-ai-accentHover transition-colors"
            >
              <Plus size={18} />
              Adicionar Pergunta
            </button>
          </div>
        </div>

        {showQuestionForm && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-ai-text">
                {editingQuestion ? 'Editar Pergunta' : 'Nova Pergunta'}
              </h4>
              <button
                onClick={() => {
                  setShowQuestionForm(false);
                  setEditingQuestion(null);
                }}
                className="text-ai-subtext hover:text-ai-text"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ai-text mb-1">
                  Categoria <span className="text-red-500">*</span>
                </label>
                <select
                  value={questionForm.category}
                  onChange={(e) => {
                    setQuestionForm({
                      ...questionForm,
                      category: e.target.value as 'Gente' | 'Gestão' | 'Produção',
                      group: '' // Reset group when category changes
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-green-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent bg-white"
                >
                  <option value="">Selecione a categoria</option>
                  <option value="Gente">Gente</option>
                  <option value="Gestão">Gestão</option>
                  <option value="Produção">Produção</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ai-text mb-1">
                  Grupo <span className="text-red-500">*</span>
                </label>
                <select
                  value={questionForm.group}
                  onChange={(e) => setQuestionForm({ ...questionForm, group: e.target.value })}
                  disabled={!questionForm.category}
                  className="w-full px-3 py-2 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione o grupo</option>
                  {availableGroups.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ai-text mb-1">
                  Pergunta <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                  placeholder="Descreva a pergunta de Sim ou Não..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-ai-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ai-accent bg-white resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ai-text mb-2">
                  Resposta Esperada (Positiva) <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, positiveAnswer: 'Sim' })}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      questionForm.positiveAnswer === 'Sim'
                        ? 'bg-green-100 border-2 border-green-500 text-green-700'
                        : 'bg-gray-100 border-2 border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, positiveAnswer: 'Não' })}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      questionForm.positiveAnswer === 'Não'
                        ? 'bg-green-100 border-2 border-green-500 text-green-700'
                        : 'bg-gray-100 border-2 border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Não
                  </button>
                </div>
                <p className="text-xs text-ai-subtext mt-2">
                  * A resposta selecionada acima será contabilizada como 100% de performance para o item.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ai-text mb-2">
                  Tipos de Questionário Aplicáveis <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(['Cria', 'Recria-Engorda', 'Ciclo Completo'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleToggleApplicableType(type)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        questionForm.applicableTypes.includes(type)
                          ? 'bg-ai-accent text-white'
                          : 'bg-gray-100 border-2 border-gray-300 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveQuestion}
                  className="flex-1 px-4 py-2 bg-ai-accent text-white rounded-lg font-medium hover:bg-ai-accentHover transition-colors"
                >
                  Salvar
                </button>
                <button
                  onClick={() => {
                    setShowQuestionForm(false);
                    setEditingQuestion(null);
                  }}
                  className="px-4 py-2 border border-ai-border text-ai-text rounded-lg font-medium hover:bg-ai-surface2 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-ai-border overflow-hidden">
          {questions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-ai-surface border-b border-ai-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ai-text uppercase">Categoria / Grupo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ai-text uppercase">Pergunta</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ai-text uppercase">Resp. Positiva</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ai-text uppercase">Tipos</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ai-text uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ai-border">
                  {questions.map((question) => (
                    <tr key={question.id} className="hover:bg-ai-surface/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-green-600">{question.category}</span>
                          <span className="text-xs text-ai-subtext">{question.group}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-ai-text max-w-md">
                        {question.question}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {question.positiveAnswer}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {question.applicableTypes.map((type: string) => (
                            <span
                              key={type}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                            >
                              {type.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingQuestion(question);
                              setQuestionForm({
                                category: question.category,
                                group: question.group,
                                question: question.question,
                                positiveAnswer: question.positiveAnswer,
                                applicableTypes: question.applicableTypes
                              });
                              setShowQuestionForm(true);
                            }}
                            className="p-1.5 text-ai-subtext hover:text-ai-accent hover:bg-ai-surface2 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="p-1.5 text-ai-subtext hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <FileCheck size={48} className="mx-auto text-ai-subtext/30 mb-3" />
              <p className="text-sm text-ai-subtext">Nenhuma pergunta cadastrada</p>
              <p className="text-xs text-ai-subtext mt-1">Clique em "Adicionar Pergunta" para começar</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'account':
        return renderAccountTab();
      case 'company':
        return renderCompanyTab();
      case 'appearance':
        return renderAppearanceTab();
      case 'privacy':
        return renderPrivacyTab();
      case 'support':
        return renderSupportTab();
      case 'questionnaires':
        return renderQuestionnairesTab();
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 animate-in fade-in duration-500">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Confirmar Exclusão</h3>
            <p className="text-sm text-ai-subtext mb-6">
              Tem certeza que deseja excluir sua conta? Esta ação é permanente e não pode ser desfeita.
              Todos os seus dados serão perdidos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-ai-border text-ai-text rounded-lg font-medium hover:bg-ai-surface2 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Excluindo...' : 'Excluir Conta'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-lg border border-ai-border p-2 sticky top-4">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                    ? 'bg-ai-accent text-white'
                    : 'text-ai-text hover:bg-ai-surface2'
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-white rounded-lg border border-ai-border p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

