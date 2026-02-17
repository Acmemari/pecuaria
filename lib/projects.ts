import { supabase } from './supabase';
import { sanitizeText } from './inputSanitizer';

export interface ProjectStakeholderRow {
  name: string;
  activity: string;
}

export interface ProjectRow {
  id: string;
  created_by: string;
  client_id: string | null;
  name: string;
  description: string | null;
  transformations_achievements: string | null;
  success_evidence: string[];
  start_date: string | null;
  end_date: string | null;
  stakeholder_matrix: ProjectStakeholderRow[];
  created_at: string;
  updated_at: string;
}

export interface ProjectPayload {
  name: string;
  description?: string | null;
  client_id?: string | null;
  transformations_achievements?: string | null;
  success_evidence?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
  stakeholder_matrix?: ProjectStakeholderRow[];
}

export interface FetchProjectsFilters {
  clientId?: string;
}

const MAX_NAME_LENGTH = 300;
const MAX_TRANSFORMATIONS_LENGTH = 10000;
const MAX_STAKEHOLDER_ROWS = 50;

function normalizeStakeholderMatrix(raw: unknown): ProjectStakeholderRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_STAKEHOLDER_ROWS).map((row) => {
    if (row && typeof row === 'object' && 'name' in row && 'activity' in row) {
      return {
        name: String((row as { name: unknown }).name ?? '').trim(),
        activity: String((row as { activity: unknown }).activity ?? '').trim(),
      };
    }
    return { name: '', activity: '' };
  }).filter((r) => r.name !== '' || r.activity !== '');
}

function validateUserId(userId: string): void {
  if (!userId?.trim()) throw new Error('ID do usuário é obrigatório.');
}

function validateProjectId(id: string): void {
  if (!id?.trim()) throw new Error('ID do projeto é obrigatório.');
}

function validatePayload(payload: ProjectPayload): void {
  const name = payload.name?.trim() || '';
  if (!name) throw new Error('O nome do projeto é obrigatório.');
  if (name.length > MAX_NAME_LENGTH) throw new Error(`O nome do projeto é muito longo (máx ${MAX_NAME_LENGTH} caracteres).`);
  if ((payload.transformations_achievements || '').length > MAX_TRANSFORMATIONS_LENGTH) throw new Error('A descrição das transformações é muito longa.');
}

export async function fetchProjects(
  createdBy: string,
  filters?: FetchProjectsFilters
): Promise<ProjectRow[]> {
  validateUserId(createdBy);
  let q = supabase
    .from('projects')
    .select('*')
    .eq('created_by', createdBy)
    .order('start_date', { ascending: true, nullsFirst: false });

  if (filters?.clientId?.trim()) {
    q = q.eq('client_id', filters.clientId);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message || 'Erro ao carregar projetos.');
  return (data || []).map((row) => ({
    ...row,
    success_evidence: Array.isArray(row.success_evidence) ? row.success_evidence.filter((s): s is string => typeof s === 'string') : [],
    stakeholder_matrix: normalizeStakeholderMatrix(row.stakeholder_matrix),
  })) as ProjectRow[];
}

export async function createProject(
  createdBy: string,
  payload: ProjectPayload
): Promise<ProjectRow> {
  validateUserId(createdBy);
  validatePayload(payload);
  const stakeholder = Array.isArray(payload.stakeholder_matrix) ? payload.stakeholder_matrix.slice(0, MAX_STAKEHOLDER_ROWS) : [];
  const successEvidence = Array.isArray(payload.success_evidence) ? payload.success_evidence.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim()) : [];
  const { data, error } = await supabase
    .from('projects')
    .insert({
      created_by: createdBy,
      client_id: payload.client_id || null,
      name: sanitizeText(payload.name),
      transformations_achievements: payload.transformations_achievements?.trim() ? sanitizeText(payload.transformations_achievements) : null,
      success_evidence: successEvidence,
      start_date: payload.start_date?.trim() || null,
      end_date: payload.end_date?.trim() || null,
      stakeholder_matrix: stakeholder,
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message || 'Erro ao criar projeto.');
  return {
    ...data,
    success_evidence: Array.isArray(data.success_evidence) ? data.success_evidence : [],
    stakeholder_matrix: normalizeStakeholderMatrix(data.stakeholder_matrix),
  } as ProjectRow;
}

export async function updateProject(
  projectId: string,
  payload: ProjectPayload
): Promise<ProjectRow> {
  validateProjectId(projectId);
  validatePayload(payload);
  const stakeholder = Array.isArray(payload.stakeholder_matrix) ? payload.stakeholder_matrix.slice(0, MAX_STAKEHOLDER_ROWS) : [];
  const successEvidence = Array.isArray(payload.success_evidence) ? payload.success_evidence.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim()) : [];
  const { data, error } = await supabase
    .from('projects')
    .update({
      name: sanitizeText(payload.name),
      transformations_achievements: payload.transformations_achievements?.trim() ? sanitizeText(payload.transformations_achievements) : null,
      success_evidence: successEvidence,
      start_date: payload.start_date?.trim() || null,
      end_date: payload.end_date?.trim() || null,
      stakeholder_matrix: stakeholder,
      client_id: payload.client_id ?? undefined,
    })
    .eq('id', projectId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message || 'Erro ao atualizar projeto.');
  return {
    ...data,
    success_evidence: Array.isArray(data.success_evidence) ? data.success_evidence : [],
    stakeholder_matrix: normalizeStakeholderMatrix(data.stakeholder_matrix),
  } as ProjectRow;
}

export async function deleteProject(projectId: string): Promise<void> {
  validateProjectId(projectId);
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) throw new Error(error.message || 'Erro ao excluir projeto.');
}
