import { supabase } from './supabase';

export interface SaveFeedbackInput {
  createdBy: string;
  recipientPersonId?: string | null;
  recipientName: string;
  recipientEmail?: string | null;
  context: string;
  feedbackType: string;
  objective: string;
  whatHappened?: string | null;
  eventDate?: string | null;
  eventMoment?: string | null;
  damages?: string | null;
  tone: string;
  format: string;
  structure: string;
  lengthPreference: string;
  generatedFeedback: string;
  generatedStructure: string;
  tips?: string[];
  farmId?: string | null;
}

export interface SavedFeedback {
  id: string;
  created_by: string;
  recipient_person_id: string | null;
  recipient_name: string;
  recipient_email: string | null;
  context: string;
  feedback_type: string;
  objective: string;
  what_happened: string | null;
  event_date: string | null;
  event_moment: string | null;
  damages: string | null;
  tone: string;
  format: string;
  structure: string;
  length_preference: string;
  generated_feedback: string;
  generated_structure: string;
  tips: string[];
  farm_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function saveFeedback(input: SaveFeedbackInput): Promise<SavedFeedback> {
  const recipientName = (input.recipientName || '').trim();
  if (recipientName.length < 2) {
    throw new Error('Destinatário inválido.');
  }

  const { data, error } = await supabase
    .from('saved_feedbacks')
    .insert({
      created_by: input.createdBy,
      recipient_person_id: input.recipientPersonId || null,
      recipient_name: recipientName,
      recipient_email: input.recipientEmail?.trim().toLowerCase() || null,
      context: input.context,
      feedback_type: input.feedbackType,
      objective: input.objective,
      what_happened: input.whatHappened || null,
      event_date: input.eventDate || null,
      event_moment: input.eventMoment || null,
      damages: input.damages || null,
      tone: input.tone,
      format: input.format,
      structure: input.structure,
      length_preference: input.lengthPreference,
      generated_feedback: input.generatedFeedback,
      generated_structure: input.generatedStructure,
      tips: input.tips || [],
      farm_id: input.farmId || null,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Erro ao salvar feedback.');
  }
  return data as SavedFeedback;
}

export async function getSavedFeedbacks(): Promise<SavedFeedback[]> {
  const { data, error } = await supabase.from('saved_feedbacks').select('*').order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') return [];
    throw new Error(error.message || 'Erro ao carregar feedbacks salvos.');
  }
  return (data || []) as SavedFeedback[];
}
