/**
 * Evidências de entrega para marcos de iniciativas
 * - Comentários (notes)
 * - Anexos: imagem, vídeo, planilha, documento
 */
import { supabase } from './supabase';

const BUCKET = 'milestone-evidence';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export type EvidenceFileType = 'image' | 'video' | 'document' | 'spreadsheet';

export interface MilestoneEvidenceRow {
  id: string;
  milestone_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MilestoneEvidenceFileRow {
  id: string;
  evidence_id: string;
  file_name: string;
  storage_path: string;
  file_type: EvidenceFileType;
  file_size: number | null;
  created_at: string;
}

export interface MilestoneEvidenceWithFiles extends MilestoneEvidenceRow {
  files: MilestoneEvidenceFileRow[];
}

const MIME_TO_TYPE: Record<string, EvidenceFileType> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'application/pdf': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
  'application/vnd.ms-excel': 'spreadsheet',
};

function inferFileType(mime: string, fileName: string): EvidenceFileType {
  const mimeType = MIME_TO_TYPE[mime];
  if (mimeType) return mimeType;
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
  if (['mp4', 'webm', 'mov'].includes(ext || '')) return 'video';
  if (['xlsx', 'xls'].includes(ext || '')) return 'spreadsheet';
  return 'document';
}

function generateStoragePath(milestoneId: string, originalName: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';
  const safeName = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .substring(0, 50);
  return `${milestoneId}/${timestamp}_${randomId}_${safeName}.${ext}`;
}

/**
 * Busca ou cria a evidência para um marco, e retorna com os arquivos
 */
export async function fetchOrCreateEvidence(milestoneId: string): Promise<MilestoneEvidenceWithFiles> {
  if (!milestoneId) throw new Error('ID do marco é obrigatório.');

  const { data: existing, error: selErr } = await supabase
    .from('milestone_evidence')
    .select('*')
    .eq('milestone_id', milestoneId)
    .maybeSingle();

  if (selErr) throw new Error(selErr.message || 'Erro ao buscar evidências');

  if (existing) {
    const { data: files, error: filesErr } = await supabase
      .from('milestone_evidence_files')
      .select('*')
      .eq('evidence_id', existing.id)
      .order('created_at', { ascending: false });

    if (filesErr) throw new Error(filesErr.message || 'Erro ao carregar arquivos');

    return {
      ...existing,
      files: (files || []) as MilestoneEvidenceFileRow[],
    } as MilestoneEvidenceWithFiles;
  }

  // Criar evidência vazia (ou refetch se outra sessão criou em paralelo - 409)
  const { data: created, error: insErr } = await supabase
    .from('milestone_evidence')
    .insert({ milestone_id: milestoneId, notes: null })
    .select()
    .single();

  if (insErr) {
    // 409/23505: outra sessão criou em paralelo; buscar a existente
    if (insErr.code === '23505') {
      const { data: existing, error: selErr2 } = await supabase
        .from('milestone_evidence')
        .select('*')
        .eq('milestone_id', milestoneId)
        .maybeSingle();
      if (!selErr2 && existing) {
        const { data: files } = await supabase
          .from('milestone_evidence_files')
          .select('*')
          .eq('evidence_id', existing.id)
          .order('created_at', { ascending: false });
        return { ...existing, files: (files || []) as MilestoneEvidenceFileRow[] } as MilestoneEvidenceWithFiles;
      }
    }
    throw new Error(insErr.message || 'Erro ao criar evidência');
  }
  if (!created) throw new Error('Falha ao criar evidência');

  return {
    ...created,
    files: [],
  } as MilestoneEvidenceWithFiles;
}

/**
 * Atualiza as notas/comentários da evidência (append ou replace)
 */
export async function updateEvidenceNotes(evidenceId: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from('milestone_evidence')
    .update({ notes: notes.trim() || null })
    .eq('id', evidenceId);

  if (error) throw error;
}

/**
 * Faz append de um comentário às notas existentes
 */
export async function appendComment(evidenceId: string, newComment: string): Promise<void> {
  const { data: ev } = await supabase.from('milestone_evidence').select('notes').eq('id', evidenceId).single();

  const current = ev?.notes?.trim() || '';
  const timestamp = new Date().toLocaleString('pt-BR');
  const separator = current ? '\n\n---\n\n' : '';
  const appended = `${current}${separator}[${timestamp}] ${newComment.trim()}`;

  await updateEvidenceNotes(evidenceId, appended);
}

/**
 * Faz upload de um arquivo e registra em milestone_evidence_files
 */
export async function uploadEvidenceFile(
  evidenceId: string,
  milestoneId: string,
  file: File,
): Promise<MilestoneEvidenceFileRow> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const fileType = inferFileType(file.type, file.name);
  const storagePath = generateStoragePath(milestoneId, file.name);

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadErr) throw new Error(`Erro no upload: ${uploadErr.message}`);

  const { data: row, error: dbErr } = await supabase
    .from('milestone_evidence_files')
    .insert({
      evidence_id: evidenceId,
      file_name: file.name,
      storage_path: storagePath,
      file_type: fileType,
      file_size: file.size,
    })
    .select()
    .single();

  if (dbErr) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(`Erro ao registrar arquivo: ${dbErr.message}`);
  }

  return row as MilestoneEvidenceFileRow;
}

/**
 * Gera URL assinada para download/exibição do arquivo
 */
export async function getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresIn);

  if (error) throw new Error(`Erro ao gerar URL: ${error.message}`);
  return data.signedUrl;
}

/**
 * Remove um arquivo de evidência
 */
export async function deleteEvidenceFile(fileId: string): Promise<void> {
  const { data: file } = await supabase
    .from('milestone_evidence_files')
    .select('storage_path')
    .eq('id', fileId)
    .single();

  if (!file) throw new Error('Arquivo não encontrado');

  const { error: delDb } = await supabase.from('milestone_evidence_files').delete().eq('id', fileId);

  if (delDb) throw delDb;

  await supabase.storage.from(BUCKET).remove([file.storage_path]);
}
