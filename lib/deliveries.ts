import { supabase } from './supabase';
import { sanitizeText } from './inputSanitizer';

export interface DeliveryRow {
  id: string;
  created_by: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryPayload {
  name: string;
  description?: string;
}

const MAX_NAME_LENGTH = 300;
const MAX_DESCRIPTION_LENGTH = 5000;

function mapDeliveryError(error: unknown, fallbackMessage: string): Error {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : '';
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  const normalized = `${code} ${message}`.toLowerCase();
  if (
    normalized.includes('42p01') ||
    normalized.includes('relation') && normalized.includes('deliveries') && normalized.includes('does not exist')
  ) {
    return new Error('Tabela de entregas não encontrada. Aplique as migrations do banco (db push) e tente novamente.');
  }

  if (message.trim()) {
    return new Error(message);
  }

  return new Error(fallbackMessage);
}

function validateUserId(userId: string): void {
  if (!userId?.trim()) {
    throw new Error('ID do usuário é obrigatório.');
  }
}

function validateDeliveryId(id: string): void {
  if (!id?.trim()) {
    throw new Error('ID da entrega é obrigatório.');
  }
}

function validatePayload(payload: DeliveryPayload): void {
  const name = payload.name?.trim() || '';
  if (!name) {
    throw new Error('O nome da entrega é obrigatório.');
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new Error(`O nome da entrega é muito longo (máx ${MAX_NAME_LENGTH} caracteres).`);
  }
  if ((payload.description || '').length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`A descrição é muito longa (máx ${MAX_DESCRIPTION_LENGTH} caracteres).`);
  }
}

export async function fetchDeliveries(createdBy: string): Promise<DeliveryRow[]> {
  validateUserId(createdBy);
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('created_by', createdBy)
    .order('name', { ascending: true });
  if (error) throw mapDeliveryError(error, 'Erro ao carregar entregas.');
  return (data || []) as DeliveryRow[];
}

export async function createDelivery(
  createdBy: string,
  payload: DeliveryPayload
): Promise<DeliveryRow> {
  validateUserId(createdBy);
  validatePayload(payload);

  const { data, error } = await supabase
    .from('deliveries')
    .insert({
      created_by: createdBy,
      name: sanitizeText(payload.name),
      description: payload.description?.trim() ? sanitizeText(payload.description) : null,
    })
    .select('*')
    .single();
  if (error || !data) throw mapDeliveryError(error, 'Erro ao criar entrega.');
  return data as DeliveryRow;
}

export async function updateDelivery(
  deliveryId: string,
  payload: DeliveryPayload
): Promise<DeliveryRow> {
  validateDeliveryId(deliveryId);
  validatePayload(payload);

  const { data, error } = await supabase
    .from('deliveries')
    .update({
      name: sanitizeText(payload.name),
      description: payload.description?.trim() ? sanitizeText(payload.description) : null,
    })
    .eq('id', deliveryId)
    .select('*')
    .single();
  if (error || !data) throw mapDeliveryError(error, 'Erro ao atualizar entrega.');
  return data as DeliveryRow;
}

export async function deleteDelivery(deliveryId: string): Promise<void> {
  validateDeliveryId(deliveryId);
  const { error } = await supabase
    .from('deliveries')
    .delete()
    .eq('id', deliveryId);
  if (error) throw mapDeliveryError(error, 'Erro ao excluir entrega.');
}
