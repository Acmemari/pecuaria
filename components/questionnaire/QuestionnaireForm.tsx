import React, { useMemo } from 'react';
import { ArrowLeft, CheckCircle2, FileCheck } from 'lucide-react';
import { Farm } from '../../types';
import { Question } from './types';

interface QuestionnaireFormProps {
    farm: Farm;
    questions: Question[]; // Filtered questions
    currentQuestionIndex: number;
    answers: Record<string, 'Sim' | 'Não' | null>;
    showSuccess: boolean;
    isSubmitting: boolean;
    onAnswer: (questionId: string, answer: 'Sim' | 'Não') => void;
    onNext: () => void;
    onPrevious: () => void;
    onSubmit: () => void;
    onExit: () => void;
}

export const QuestionnaireForm: React.FC<QuestionnaireFormProps> = ({
    farm,
    questions,
    currentQuestionIndex,
    answers,
    showSuccess,
    isSubmitting,
    onAnswer,
    onNext,
    onPrevious,
    onSubmit,
    onExit
}) => {
    const currentQuestion = questions[currentQuestionIndex];
    const isFirstQuestion = currentQuestionIndex === 0;
    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    const progress = useMemo(() => {
        if (questions.length === 0) return 0;
        const answeredCount = questions.filter(q => answers[q.id] !== null && answers[q.id] !== undefined).length;
        return (answeredCount / questions.length) * 100;
    }, [questions, answers]);

    if (!currentQuestion) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-ai-subtext">Nenhuma pergunta encontrada.</p>
                <button onClick={onExit} className="ml-4 text-ai-accent">Voltar</button>
            </div>
        );
    }

    // Helper for button class
    const getOptionClass = (option: 'Sim' | 'Não') => {
        const isSelected = answers[currentQuestion.id] === option;
        if (option === 'Sim') {
            return isSelected
                ? 'bg-green-100 border-2 border-green-500 text-green-700 change-transform scale-[1.02]'
                : 'bg-gray-100 border-2 border-gray-300 text-gray-700 hover:bg-gray-200';
        } else {
            return isSelected
                ? 'bg-red-100 border-2 border-red-500 text-red-700 change-transform scale-[1.02]'
                : 'bg-gray-100 border-2 border-gray-300 text-gray-700 hover:bg-gray-200';
        }
    };


    return (
        <div className="h-full flex flex-col p-3 md:p-4 overflow-y-auto">
            <div className="max-w-3xl mx-auto w-full space-y-6">
                {/* Header */}
                <div className="bg-white rounded-lg border border-ai-border p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onExit}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Sair do questionário"
                            >
                                <ArrowLeft size={20} className="text-ai-subtext" />
                            </button>
                            <FileCheck size={24} className="text-ai-accent" />
                            <div>
                                <h1 className="text-xl font-bold text-ai-text">Gente/Gestão/Produção</h1>
                                <p className="text-sm text-ai-subtext">
                                    Fazenda: {farm.name} ({farm.productionSystem})
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-ai-accent h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="text-right text-xs text-ai-subtext mt-1">
                            {Math.floor(progress)}% concluído
                        </div>
                    </div>
                </div>

                {/* Success Message */}
                {showSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 animate-fade-in">
                        <CheckCircle2 size={20} className="text-green-600" />
                        <p className="text-sm text-green-700">Questionário salvo no Meus Salvos.</p>
                    </div>
                )}

                {/* Current Question */}
                <div className="bg-white rounded-lg border border-ai-border p-6 shadow-sm">
                    <div className="mb-4 min-h-[6.5rem]">
                        <p className="text-sm font-medium text-ai-subtext mb-2">{currentQuestion.category} - {currentQuestion.group}</p>
                        <h2 className="text-xl font-semibold text-ai-text leading-snug">{currentQuestion.question}</h2>
                    </div>

                    <div className="flex gap-4 mb-6">
                        <button
                            type="button"
                            onClick={() => onAnswer(currentQuestion.id, 'Sim')}
                            className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all duration-200 text-lg ${getOptionClass('Sim')}`}
                        >
                            Sim
                        </button>
                        <button
                            type="button"
                            onClick={() => onAnswer(currentQuestion.id, 'Não')}
                            className={`flex-1 px-6 py-4 rounded-lg font-medium transition-all duration-200 text-lg ${getOptionClass('Não')}`}
                        >
                            Não
                        </button>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between gap-3 pt-4 border-t border-ai-border">
                        <button
                            onClick={onPrevious}
                            disabled={isFirstQuestion}
                            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${isFirstQuestion
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            <ArrowLeft size={18} />
                            Anterior
                        </button>

                        {isLastQuestion ? (
                            <button
                                onClick={onSubmit}
                                disabled={!answers[currentQuestion.id] || isSubmitting}
                                className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${answers[currentQuestion.id] && !isSubmitting
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
                                onClick={onNext}
                                disabled={!answers[currentQuestion.id]}
                                className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${answers[currentQuestion.id]
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
