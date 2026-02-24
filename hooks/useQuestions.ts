/**
 * Hook customizado para carregar e cachear perguntas do questionário
 * Evita chamadas duplicadas ao banco de dados
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Question } from '../components/questionnaire/types';
import { QuestionMeta } from '../lib/questionnaireResults';
import { createQuestionnaireError, ERROR_CODES } from '../lib/errorHandler';

// Cache global para evitar múltiplas chamadas
let questionsCache: Question[] | null = null;
let questionsMapCache: Map<string, QuestionMeta> | null = null;
let loadingPromise: Promise<void> | null = null;

export const useQuestions = () => {
  const [questions, setQuestions] = useState<Question[]>(questionsCache || []);
  const [questionsMap, setQuestionsMap] = useState<Map<string, QuestionMeta>>(questionsMapCache || new Map());
  const [loading, setLoading] = useState(!questionsCache);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Se já temos cache, use-o imediatamente
    if (questionsCache && questionsMapCache) {
      setQuestions(questionsCache);
      setQuestionsMap(questionsMapCache);
      setLoading(false);
      return;
    }

    // Se já está carregando, aguarde a promise existente
    if (loadingPromise) {
      loadingPromise
        .then(() => {
          if (questionsCache && questionsMapCache) {
            setQuestions(questionsCache);
            setQuestionsMap(questionsMapCache);
            setLoading(false);
          }
        })
        .catch(err => {
          setError(err);
          setLoading(false);
        });
      return;
    }

    // Inicie novo carregamento
    loadingPromise = loadQuestions();
    loadingPromise
      .then(() => {
        if (questionsCache && questionsMapCache) {
          setQuestions(questionsCache);
          setQuestionsMap(questionsMapCache);
          setLoading(false);
        }
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      })
      .finally(() => {
        loadingPromise = null;
      });
  }, []);

  return { questions, questionsMap, loading, error };
};

async function loadQuestions(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('questionnaire_questions')
      .select('*')
      .order('perg_number', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw createQuestionnaireError(
        ERROR_CODES.FETCH_QUESTIONS_ERROR,
        error.message,
        'Erro ao carregar perguntas do questionário',
      );
    }

    // Mapear para formato Question
    questionsCache = (data || []).map((row: any) => ({
      id: row.id,
      category: row.category,
      group: row.group,
      question: row.question,
      positiveAnswer: row.positive_answer,
      applicableTypes: row.applicable_types || [],
    }));

    // Criar mapa de metadados
    questionsMapCache = new Map();
    (data || []).forEach((row: any) => {
      const id = row.id == null ? '' : String(row.id).trim().toLowerCase();
      const positiveAnswer = row.positive_answer === 'Não' ? 'Não' : 'Sim';
      questionsMapCache!.set(id, {
        id,
        category: String(row.category ?? ''),
        group: String(row.group ?? ''),
        positiveAnswer,
      });
    });
  } catch (e) {
    console.error('Erro ao carregar perguntas:', e);
    throw e;
  }
}

/**
 * Função para limpar o cache quando necessário
 * Útil quando as perguntas são atualizadas no banco
 */
export const clearQuestionsCache = () => {
  questionsCache = null;
  questionsMapCache = null;
  loadingPromise = null;
};
