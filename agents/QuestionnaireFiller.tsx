import React, { useState, useEffect } from 'react';
import { FileCheck, CheckCircle2, ArrowLeft, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Farm } from '../types';

interface Question {
  id: string;
  category: string;
  group: string;
  question: string;
  positiveAnswer: 'Sim' | 'Não';
  applicableTypes: ('Cria' | 'Recria-Engorda' | 'Ciclo Completo')[];
}

interface QuestionnaireAnswer {
  questionId: string;
  answer: 'Sim' | 'Não' | null;
}

const STORAGE_KEY = 'agro-farms';

// Função para carregar todas as perguntas do questionário
const getAllQuestions = (): Question[] => {
  return [
    // GENTE - Domínio (1-4)
    { id: '1', category: 'Gente', group: 'Domínio', question: 'A equipe possui treinamento técnico atualizado para as funções que exerce?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '2', category: 'Gente', group: 'Domínio', question: 'Os colaboradores demonstram conhecimento técnico adequado para suas funções?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '3', category: 'Gente', group: 'Domínio', question: 'Existe um programa de capacitação contínua para a equipe?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '4', category: 'Gente', group: 'Domínio', question: 'A equipe tem acesso a informações técnicas atualizadas sobre pecuária?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // GENTE - Propósito (5-7)
    { id: '5', category: 'Gente', group: 'Propósito', question: 'A equipe compreende claramente os objetivos e metas da fazenda?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '6', category: 'Gente', group: 'Propósito', question: 'Os colaboradores se sentem parte importante do sucesso da propriedade?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '7', category: 'Gente', group: 'Propósito', question: 'Existe alinhamento entre os objetivos pessoais e os da fazenda?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // GENTE - Valores (8-11)
    { id: '8', category: 'Gente', group: 'Valores', question: 'A equipe compartilha valores como responsabilidade e comprometimento?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '9', category: 'Gente', group: 'Valores', question: 'Existe respeito e colaboração entre os membros da equipe?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '10', category: 'Gente', group: 'Valores', question: 'A integridade e ética são valores praticados no dia a dia?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '11', category: 'Gente', group: 'Valores', question: 'A segurança no trabalho é uma prioridade para todos?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // GENTE - Autonomia (12-15)
    { id: '12', category: 'Gente', group: 'Autonomia', question: 'Os colaboradores têm liberdade para tomar decisões operacionais no dia a dia?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '13', category: 'Gente', group: 'Autonomia', question: 'A equipe pode propor melhorias e soluções para os processos?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '14', category: 'Gente', group: 'Autonomia', question: 'Existe confiança para que os colaboradores resolvam problemas rotineiros?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '15', category: 'Gente', group: 'Autonomia', question: 'Os colaboradores se sentem empoderados para agir quando necessário?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // GESTÃO - Projeto (16-20)
    { id: '16', category: 'Gestão', group: 'Projeto', question: 'Existe um planejamento estratégico definido para a fazenda?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '17', category: 'Gestão', group: 'Projeto', question: 'As metas e objetivos são claramente definidos e comunicados?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '18', category: 'Gestão', group: 'Projeto', question: 'Existe um plano de investimentos para os próximos anos?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '19', category: 'Gestão', group: 'Projeto', question: 'O planejamento financeiro é feito de forma sistemática?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '20', category: 'Gestão', group: 'Projeto', question: 'Existe um cronograma de atividades para o ano?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // GESTÃO - Execução (21-26)
    { id: '21', category: 'Gestão', group: 'Execução', question: 'As atividades planejadas são executadas conforme o cronograma?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '22', category: 'Gestão', group: 'Execução', question: 'Existe acompanhamento regular do desempenho das atividades?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '23', category: 'Gestão', group: 'Execução', question: 'Os processos são documentados e seguidos corretamente?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '24', category: 'Gestão', group: 'Execução', question: 'Existe um sistema de controle de qualidade nas operações?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '25', category: 'Gestão', group: 'Execução', question: 'As não conformidades são identificadas e corrigidas rapidamente?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '26', category: 'Gestão', group: 'Execução', question: 'A equipe tem os recursos necessários para executar bem suas funções?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // GESTÃO - Gerenciamento (27-33)
    { id: '27', category: 'Gestão', group: 'Gerenciamento', question: 'Existe um controle rigoroso de entrada e saída de insumos?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '28', category: 'Gestão', group: 'Gerenciamento', question: 'Os custos são monitorados e controlados regularmente?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '29', category: 'Gestão', group: 'Gerenciamento', question: 'Existe um sistema de registro de todas as operações?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '30', category: 'Gestão', group: 'Gerenciamento', question: 'As informações são organizadas e facilmente acessíveis?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '31', category: 'Gestão', group: 'Gerenciamento', question: 'Existe análise periódica dos resultados e indicadores?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '32', category: 'Gestão', group: 'Gerenciamento', question: 'As decisões são tomadas com base em dados e informações?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '33', category: 'Gestão', group: 'Gerenciamento', question: 'Existe comunicação eficiente entre todos os níveis da organização?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // PRODUÇÃO - Manejo de Pastagens (34-40)
    { id: '34', category: 'Produção', group: 'Manejo de Pastagens', question: 'É feita a medição de altura de entrada e saída dos animais nos piquetes?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '35', category: 'Produção', group: 'Manejo de Pastagens', question: 'O sistema de pastejo rotacionado é utilizado?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '36', category: 'Produção', group: 'Manejo de Pastagens', question: 'Existe um plano de rotação de pastagens definido?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '37', category: 'Produção', group: 'Manejo de Pastagens', question: 'A lotação é ajustada conforme a disponibilidade de forragem?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '38', category: 'Produção', group: 'Manejo de Pastagens', question: 'É realizado o descanso adequado das pastagens?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '39', category: 'Produção', group: 'Manejo de Pastagens', question: 'A qualidade das pastagens é monitorada regularmente?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '40', category: 'Produção', group: 'Manejo de Pastagens', question: 'Existe controle de plantas invasoras nas pastagens?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // PRODUÇÃO - Solo (41-46)
    { id: '41', category: 'Produção', group: 'Cuidados com Solo', question: 'É realizada análise de solo periodicamente?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '42', category: 'Produção', group: 'Cuidados com Solo', question: 'Encontro alguns pontos de solo descoberto na fazenda', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'] },
    { id: '43', category: 'Produção', group: 'Cuidados com Solo', question: 'Encontro alguns pontos com presença de plantas invasoras na fazenda', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'] },
    { id: '44', category: 'Produção', group: 'Manejo de Pastagens', question: 'Encontro alguns pontos de pasto abaixo do ponto de manejo na fazenda', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'] },
    { id: '45', category: 'Produção', group: 'Cuidados com Solo', question: 'Encontro alguns pontos com erosão na fazenda', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'] },
    { id: '46', category: 'Produção', group: 'Cuidados com Solo', question: 'É feita correção de solo quando necessário?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // PRODUÇÃO - Suplementação (47-50)
    { id: '47', category: 'Produção', group: 'Suplementação de Precisão', question: 'Reconheço que alguns lotes chegam a apresentar escore corporal abaixo de 3', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'] },
    { id: '48', category: 'Produção', group: 'Suplementação de Precisão', question: 'A suplementação é ajustada conforme a necessidade nutricional?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '49', category: 'Produção', group: 'Suplementação de Precisão', question: 'Existe um programa de suplementação definido por categoria?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '50', category: 'Produção', group: 'Suplementação de Precisão', question: 'A qualidade dos suplementos é monitorada?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // PRODUÇÃO - Sanidade (51-54)
    { id: '51', category: 'Produção', group: 'Sanidade Forte', question: 'Tenho algumas aguadas naturais (rio, lago ou cacimba)', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'] },
    { id: '52', category: 'Produção', group: 'Sanidade Forte', question: 'O calendário sanitário é seguido rigorosamente em 100% do rebanho?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '53', category: 'Produção', group: 'Sanidade Forte', question: 'Existe controle de doenças e parasitas?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '54', category: 'Produção', group: 'Sanidade Forte', question: 'Os animais doentes são identificados e tratados rapidamente?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // PRODUÇÃO - Manejo de Pastagens (55-58)
    { id: '55', category: 'Produção', group: 'Manejo de Pastagens', question: 'Reconheço que muitas vezes meu pasto passa da altura ideal', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'] },
    { id: '56', category: 'Produção', group: 'Manejo de Pastagens', question: 'Reconheço que muitas vezes meu pasto rebaixa abaixo do recomendado', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'] },
    { id: '57', category: 'Produção', group: 'Manejo de Pastagens', question: 'A altura do pasto é mantida dentro da faixa ideal?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '58', category: 'Produção', group: 'Manejo de Pastagens', question: 'Existe monitoramento da taxa de lotação?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // PRODUÇÃO - Layout (59-61)
    { id: '59', category: 'Produção', group: 'Layout', question: 'O layout da propriedade facilita o manejo dos animais?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '60', category: 'Produção', group: 'Layout', question: 'Existe infraestrutura adequada para todas as operações?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '61', category: 'Produção', group: 'Layout', question: 'Os piquetes são de tamanho adequado para o manejo?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // PRODUÇÃO - Solo (62-65)
    { id: '62', category: 'Produção', group: 'Cuidados com Solo', question: 'É realizado manejo adequado para preservar o solo?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '63', category: 'Produção', group: 'Cuidados com Solo', question: 'Existe cobertura vegetal adequada em toda a propriedade?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '64', category: 'Produção', group: 'Cuidados com Solo', question: 'Para alta produção, preciso reformar meus pastos a cada 5 anos ou menos', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'] },
    { id: '65', category: 'Produção', group: 'Cuidados com Solo', question: 'O solo é mantido produtivo sem necessidade de reformas frequentes?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // PRODUÇÃO - Bem estar Animal (66-70)
    { id: '66', category: 'Produção', group: 'Bem estar animal', question: 'Os animais têm acesso adequado a água de qualidade?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '67', category: 'Produção', group: 'Bem estar animal', question: 'Existe sombra adequada para os animais?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '68', category: 'Produção', group: 'Bem estar animal', question: 'Os animais são manejados de forma tranquila e sem estresse?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '69', category: 'Produção', group: 'Bem estar animal', question: 'No verão, frequentemente observo animais deitados ofegantes por conta do calor intenso', positiveAnswer: 'Não', applicableTypes: ['Ciclo Completo'] },
    { id: '70', category: 'Produção', group: 'Bem estar animal', question: 'Existe monitoramento do bem-estar dos animais?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // PRODUÇÃO - Reprodução (71-74)
    { id: '71', category: 'Produção', group: 'Reprodução', question: 'Existe um programa reprodutivo definido?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '72', category: 'Produção', group: 'Reprodução', question: 'A taxa de prenhez é monitorada e controlada?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '73', category: 'Produção', group: 'Reprodução', question: 'Os touros são selecionados e avaliados adequadamente?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '74', category: 'Produção', group: 'Reprodução', question: 'Existe controle de estação de monta?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // PRODUÇÃO - Genética (75)
    { id: '75', category: 'Produção', group: 'Genética Melhoradora', question: 'Existe um programa de melhoramento genético?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // GENTE - Liderança (76-77)
    { id: '76', category: 'Gente', group: 'Liderança', question: 'Existe liderança clara e efetiva na propriedade?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '77', category: 'Gente', group: 'Liderança', question: 'A liderança promove o desenvolvimento da equipe?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // PRODUÇÃO - Estratégia de Entressafra (78-80)
    { id: '78', category: 'Produção', group: 'Estratégia de Entressafra', question: 'Existe uma estratégia definida para o período de entressafra?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '79', category: 'Produção', group: 'Estratégia de Entressafra', question: 'A produção de forragem é planejada para todo o ano?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '80', category: 'Produção', group: 'Estratégia de Entressafra', question: 'Existe reserva de forragem para períodos críticos?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    
    // PRODUÇÃO - Genética (81-83)
    { id: '81', category: 'Produção', group: 'Genética Melhoradora', question: 'Os animais são selecionados com base em critérios genéticos?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '82', category: 'Produção', group: 'Genética Melhoradora', question: 'Existe acompanhamento do desempenho genético do rebanho?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] },
    { id: '83', category: 'Produção', group: 'Genética Melhoradora', question: 'O programa genético está alinhado com os objetivos da propriedade?', positiveAnswer: 'Sim', applicableTypes: ['Ciclo Completo'] }
  ];
};

const QuestionnaireFiller: React.FC<{ questionnaireId?: string }> = ({ questionnaireId }) => {
  const { user } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'Sim' | 'Não' | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Carregar fazendas do localStorage
  useEffect(() => {
    loadFarms();
    loadQuestions();
  }, []);

  // Filtrar perguntas quando iniciar o questionário
  useEffect(() => {
    if (selectedFarm && showQuestionnaire && questions.length > 0) {
      const filtered = questions.filter(q => 
        q.applicableTypes.includes(selectedFarm.productionSystem)
      );
      setFilteredQuestions(filtered);
      setCurrentQuestionIndex(0);
      
      // Inicializar respostas
      const initialAnswers: Record<string, 'Sim' | 'Não' | null> = {};
      filtered.forEach(q => {
        initialAnswers[q.id] = null;
      });
      setAnswers(initialAnswers);
    }
  }, [selectedFarm, showQuestionnaire, questions]);

  const loadFarms = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const farmsArray = Array.isArray(parsed) ? parsed : [];
        setFarms(farmsArray);
      } else {
        setFarms([]);
      }
    } catch (error) {
      console.error('Erro ao carregar fazendas:', error);
      setFarms([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuestions = () => {
    try {
      const allQuestions = getAllQuestions();
      setQuestions(allQuestions);
    } catch (error) {
      console.error('Erro ao carregar perguntas:', error);
    }
  };

  const handleFarmSelect = (farm: Farm) => {
    setSelectedFarm(farm);
    setShowQuestionnaire(false);
  };

  const handleStartQuestionnaire = () => {
    setShowQuestionnaire(true);
  };

  const handleBackToFarms = () => {
    setSelectedFarm(null);
    setShowQuestionnaire(false);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setShowSuccess(false);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < filteredQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAnswerChange = (questionId: string, answer: 'Sim' | 'Não') => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    // Avançar automaticamente para a próxima pergunta após responder
    // Aguardar um pequeno delay para dar feedback visual
    setTimeout(() => {
      if (currentQuestionIndex < filteredQuestions.length - 1) {
        handleNextQuestion();
      }
      // Se for a última pergunta, não avança (mostra botão de enviar)
    }, 300);
  };

  const getCurrentQuestion = () => {
    return filteredQuestions[currentQuestionIndex] || null;
  };

  const getProgressPercentage = () => {
    if (filteredQuestions.length === 0) return 0;
    return ((currentQuestionIndex + 1) / filteredQuestions.length) * 100;
  };

  const handleSubmit = async () => {
    if (!selectedFarm) return;

    const unanswered = filteredQuestions.filter(q => !answers[q.id]);
    
    if (unanswered.length > 0) {
      alert(`Por favor, responda todas as perguntas. Faltam ${unanswered.length} pergunta(s).`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Por enquanto apenas simulação - será integrado com banco posteriormente
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const submissionData = {
        userId: user?.id,
        farmId: selectedFarm.id,
        farmName: selectedFarm.name,
        questionnaireId: questionnaireId || 'gente-gestao-producao',
        productionSystem: selectedFarm.productionSystem,
        answers: filteredQuestions.map(q => ({
          questionId: q.id,
          answer: answers[q.id],
          isPositive: answers[q.id] === q.positiveAnswer
        })),
        submittedAt: new Date().toISOString()
      };
      
      console.log('Respostas enviadas:', submissionData);
      setShowSuccess(true);
      
      // Reset após 3 segundos
      setTimeout(() => {
        setShowSuccess(false);
        setShowQuestionnaire(false);
        setSelectedFarm(null);
        setAnswers({});
        setCurrentQuestionIndex(0);
      }, 3000);
    } catch (error) {
      console.error('Erro ao enviar respostas:', error);
      alert('Erro ao enviar respostas. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allAnswered = () => {
    return filteredQuestions.every(q => answers[q.id] !== null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileCheck size={48} className="mx-auto text-ai-subtext/30 mb-3 animate-pulse" />
          <p className="text-sm text-ai-subtext">Carregando...</p>
        </div>
      </div>
    );
  }

  // Tela de seleção de fazenda
  if (!selectedFarm) {
    return (
      <div className="h-full flex flex-col p-3 md:p-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full">
          <div className="bg-white rounded-lg border border-ai-border p-4 md:p-6 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <FileCheck size={24} className="text-ai-accent" />
              <div>
                <h1 className="text-xl font-bold text-ai-text">Questionário: Gente/Gestão/Produção</h1>
                <p className="text-sm text-ai-subtext">Selecione uma fazenda para responder o questionário</p>
              </div>
            </div>
          </div>

          {farms.length === 0 ? (
            <div className="bg-white rounded-lg border border-ai-border p-6 text-center">
              <MapPin size={48} className="mx-auto text-ai-subtext/30 mb-3" />
              <p className="text-base text-ai-text mb-2">Nenhuma fazenda cadastrada</p>
              <p className="text-sm text-ai-subtext">
                Cadastre uma fazenda primeiro para responder o questionário.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {farms.map((farm) => (
                <button
                  key={farm.id}
                  onClick={() => handleFarmSelect(farm)}
                  className="w-full bg-white rounded-lg border border-ai-border p-4 hover:border-ai-accent hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-ai-text mb-1">{farm.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-ai-subtext">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {farm.city}, {farm.state}
                        </span>
                        <span className="px-2 py-1 bg-ai-accent/10 text-ai-accent rounded text-xs font-medium">
                          {farm.productionSystem}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 text-ai-accent">
                      <ArrowLeft size={20} className="transform rotate-180" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Tela de confirmação após selecionar fazenda
  if (selectedFarm && !showQuestionnaire) {
    return (
      <div className="h-full flex flex-col p-3 md:p-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full">
          <div className="bg-white rounded-lg border border-ai-border p-4 md:p-6">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={handleBackToFarms}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Voltar para seleção de fazenda"
              >
                <ArrowLeft size={20} className="text-ai-subtext" />
              </button>
              <FileCheck size={24} className="text-ai-accent" />
              <div>
                <h1 className="text-xl font-bold text-ai-text">Questionário: Gente/Gestão/Produção</h1>
                <p className="text-sm text-ai-subtext">Fazenda selecionada</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-ai-text mb-2">{selectedFarm.name}</h3>
                <div className="flex items-center gap-4 text-sm text-ai-subtext mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {selectedFarm.city}, {selectedFarm.state}
                  </span>
                  <span className="px-2 py-1 bg-ai-accent/10 text-ai-accent rounded text-xs font-medium">
                    {selectedFarm.productionSystem}
                  </span>
                </div>
              </div>
              <p className="text-sm text-ai-text">
                Clique no botão abaixo para iniciar o questionário para esta fazenda.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleStartQuestionnaire}
                className="px-6 py-3 bg-ai-accent text-white rounded-lg font-medium hover:bg-ai-accentHover transition-colors flex items-center gap-2"
              >
                <FileCheck size={18} />
                Responder Questionário
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tela do questionário (apenas quando showQuestionnaire for true)
  if (!selectedFarm || !showQuestionnaire) {
    return null;
  }

  const currentQuestion = getCurrentQuestion();
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === filteredQuestions.length - 1;
  const progress = getProgressPercentage();

  if (!currentQuestion) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-ai-subtext">Nenhuma pergunta encontrada.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3 md:p-4 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-ai-border p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowQuestionnaire(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Voltar"
              >
                <ArrowLeft size={20} className="text-ai-subtext" />
              </button>
              <FileCheck size={24} className="text-ai-accent" />
              <div>
                <h1 className="text-xl font-bold text-ai-text">Gente/Gestão/Produção</h1>
                <p className="text-sm text-ai-subtext">
                  Fazenda: {selectedFarm.name} ({selectedFarm.productionSystem})
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-ai-subtext mb-1">
              <span>Pergunta {currentQuestionIndex + 1} de {filteredQuestions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-ai-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-green-600" />
            <p className="text-sm text-green-700">Questionário enviado com sucesso!</p>
          </div>
        )}

        {/* Current Question */}
        <div className="bg-white rounded-lg border border-ai-border p-6">
          <div className="mb-4">
            <p className="text-sm font-medium text-ai-subtext mb-2">{currentQuestion.category} - {currentQuestion.group}</p>
            <h2 className="text-xl font-semibold text-ai-text">{currentQuestion.question}</h2>
          </div>
          
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => handleAnswerChange(currentQuestion.id, 'Sim')}
              className={`flex-1 px-6 py-4 rounded-lg font-medium transition-colors text-lg ${
                answers[currentQuestion.id] === 'Sim'
                  ? 'bg-green-100 border-2 border-green-500 text-green-700'
                  : 'bg-gray-100 border-2 border-gray-300 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => handleAnswerChange(currentQuestion.id, 'Não')}
              className={`flex-1 px-6 py-4 rounded-lg font-medium transition-colors text-lg ${
                answers[currentQuestion.id] === 'Não'
                  ? 'bg-red-100 border-2 border-red-500 text-red-700'
                  : 'bg-gray-100 border-2 border-gray-300 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Não
            </button>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-3 pt-4 border-t border-ai-border">
            <button
              onClick={handlePreviousQuestion}
              disabled={isFirstQuestion}
              className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                isFirstQuestion
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ArrowLeft size={18} />
              Anterior
            </button>

            {isLastQuestion ? (
              <button
                onClick={handleSubmit}
                disabled={!answers[currentQuestion.id] || isSubmitting}
                className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  answers[currentQuestion.id] && !isSubmitting
                    ? 'bg-ai-accent text-white hover:bg-ai-accentHover'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Enviar Questionário
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                disabled={!answers[currentQuestion.id]}
                className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  answers[currentQuestion.id]
                    ? 'bg-ai-accent text-white hover:bg-ai-accentHover'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Próxima
                <ArrowLeft size={18} className="transform rotate-180" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireFiller;
