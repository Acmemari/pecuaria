import { supabase } from './supabase';
import { sanitizeText } from './inputSanitizer';

export interface DeliveryStakeholderRow {
  name: string;
  activity: string;
}

export interface DeliveryRow {
  id: string;
  created_by: string;
  client_id: string | null;
  project_id: string | null;
  name: string;
  description: string | null;
  transformations_achievements: string | null;
  start_date: string | null;
  end_date: string | null;
  due_date: string | null;
  stakeholder_matrix: DeliveryStakeholderRow[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryPayload {
  name: string;
  description?: string;
  client_id?: string | null;
  project_id?: string | null;
}

export interface FetchDeliveriesFilters {
  clientId?: string;
}

const MAX_NAME_LENGTH = 300;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_STAKEHOLDER_ROWS = 50;

function normalizeStakeholderMatrix(raw: unknown): DeliveryStakeholderRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_STAKEHOLDER_ROWS)
    .map(row => {
      if (row && typeof row === 'object' && 'name' in row && 'activity' in row) {
        return {
          name: String((row as { name: unknown }).name ?? '').trim(),
          activity: String((row as { activity: unknown }).activity ?? '').trim(),
        };
      }
      return { name: '', activity: '' };
    })
    .filter(r => r.name !== '' || r.activity !== '');
}

function mapDeliveryRow(data: any): DeliveryRow {
  return {
    ...data,
    client_id: data.client_id ?? null,
    project_id: data.project_id ?? null,
    transformations_achievements: data.transformations_achievements ?? null,
    start_date: data.start_date ?? null,
    end_date: data.end_date ?? null,
    due_date: data.due_date ?? null,
    stakeholder_matrix: normalizeStakeholderMatrix(data.stakeholder_matrix),
    sort_order: Number.isFinite(data.sort_order) ? Number(data.sort_order) : 0,
  } as DeliveryRow;
}

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
    (normalized.includes('relation') && normalized.includes('deliveries') && normalized.includes('does not exist'))
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

export async function fetchDeliveries(createdBy: string, filters?: FetchDeliveriesFilters): Promise<DeliveryRow[]> {
  validateUserId(createdBy);
  let q = supabase
    .from('deliveries')
    .select('*')
    .eq('created_by', createdBy)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (filters?.clientId?.trim()) {
    q = q.eq('client_id', filters.clientId);
  }

  const { data, error } = await q;
  if (error) throw mapDeliveryError(error, 'Erro ao carregar entregas.');
  return (data || []).map(mapDeliveryRow);
}

export async function fetchDeliveriesByProject(projectId: string): Promise<DeliveryRow[]> {
  validateDeliveryId(projectId);
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw mapDeliveryError(error, 'Erro ao carregar entregas do projeto.');
  return (data || []).map(mapDeliveryRow);
}

export async function createDelivery(createdBy: string, payload: DeliveryPayload): Promise<DeliveryRow> {
  validateUserId(createdBy);
  validatePayload(payload);

  const { data, error } = await supabase
    .from('deliveries')
    .insert({
      created_by: createdBy,
      name: sanitizeText(payload.name),
      description: payload.description?.trim() ? sanitizeText(payload.description) : null,
      client_id: payload.client_id || null,
      project_id: payload.project_id || null,
    })
    .select('*')
    .single();
  if (error || !data) throw mapDeliveryError(error, 'Erro ao criar entrega.');
  return mapDeliveryRow(data);
}

export async function updateDelivery(deliveryId: string, payload: DeliveryPayload): Promise<DeliveryRow> {
  validateDeliveryId(deliveryId);
  validatePayload(payload);

  const { data, error } = await supabase
    .from('deliveries')
    .update({
      name: sanitizeText(payload.name),
      description: payload.description?.trim() ? sanitizeText(payload.description) : null,
      client_id: payload.client_id ?? undefined,
      project_id: payload.project_id ?? undefined,
    })
    .eq('id', deliveryId)
    .select('*')
    .single();
  if (error || !data) throw mapDeliveryError(error, 'Erro ao atualizar entrega.');
  return mapDeliveryRow(data);
}

export async function deleteDelivery(deliveryId: string): Promise<void> {
  validateDeliveryId(deliveryId);
  const { error } = await supabase.from('deliveries').delete().eq('id', deliveryId);
  if (error) throw mapDeliveryError(error, 'Erro ao excluir entrega.');
}
