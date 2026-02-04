export interface Question {
    id: string;
    category: string;
    group: string;
    question: string;
    positiveAnswer: 'Sim' | 'Não';
    applicableTypes: ('Cria' | 'Recria-Engorda' | 'Ciclo Completo')[];
}
