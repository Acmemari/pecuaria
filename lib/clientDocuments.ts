/**
 * Operações CRUD para documentos de clientes (mentoria)
 * Suporta PDF, WORD (doc, docx), Excel (xls, xlsx)
 * v2: confidencialidade, versionamento, auditoria, tags
 */
import { supabase } from './supabase';
import {
  ClientDocument,
  ConfidentialityLevel,
  DocumentCategory,
  DocumentFileType,
  DocumentUploadParams,
  DocumentFilter,
  DocumentAuditAction,
} from '../types';
import { logger } from './logger';

const log = logger.withContext({ component: 'clientDocuments' });

const BUCKET_NAME = 'client-documents';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Tipos de arquivo permitidos
const ALLOWED_MIME_TYPES: Record<string, DocumentFileType> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
};

const ALLOWED_EXTENSIONS: DocumentFileType[] = ['pdf', 'docx', 'doc', 'xlsx', 'xls'];

/** Expiração de URL assinada por nível de confidencialidade (em segundos) */
const SIGNED_URL_EXPIRY: Record<ConfidentialityLevel, number> = {
  publico: 3600, // 1 hora
  interno: 1800, // 30 minutos
  confidencial: 300, // 5 minutos
  restrito: 120, // 2 minutos
};

/**
 * Valida o arquivo antes do upload
 */
export function validateFile(file: File): { valid: boolean; error?: string; fileType?: DocumentFileType } {
  // Validar tamanho
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `Arquivo muito grande. Máximo permitido: ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  // Validar tipo MIME
  const fileType = ALLOWED_MIME_TYPES[file.type];
  if (!fileType) {
    // Tentar pela extensão
    const ext = file.name.split('.').pop()?.toLowerCase() as DocumentFileType;
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: 'Tipo de arquivo não permitido. Use PDF, DOCX, DOC, XLSX ou XLS.' };
    }
    return { valid: true, fileType: ext };
  }

  return { valid: true, fileType };
}

/**
 * Gera nome único para o arquivo no storage
 */
function generateStoragePath(clientId: string, originalName: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';
  const safeName = originalName
    .replace(/\.[^/.]+$/, '') // remove extensão
    .replace(/[^a-zA-Z0-9-_]/g, '_') // caracteres especiais
    .substring(0, 50); // limita tamanho

  return `${clientId}/${timestamp}_${randomId}_${safeName}.${ext}`;
}

// ---------------------------------------------------------------------------
// Audit logging
// ---------------------------------------------------------------------------

/**
 * Registra ação no log de auditoria imutável
 */
export async function logDocumentAction(
  documentId: string,
  action: DocumentAuditAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('document_audit_log').insert({
      document_id: documentId,
      user_id: user.id,
      action,
      metadata: metadata || {},
    });
  } catch (err) {
    // Audit log failures should not block the main operation
    log.warn('logDocumentAction failed', {
      action,
      documentId,
    });
  }
}

/**
 * Lista entradas de auditoria de um documento
 */
export async function getDocumentAuditLog(
  documentId: string,
): Promise<{ entries: Array<{ id: string; userId: string; action: DocumentAuditAction; metadata: Record<string, unknown>; createdAt: string }>; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('document_audit_log')
      .select('id, user_id, action, metadata, created_at')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return { entries: [], error: error.message };
    }

    return {
      entries: (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        action: row.action,
        metadata: row.metadata,
        createdAt: row.created_at,
      })),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao buscar auditoria';
    return { entries: [], error: msg };
  }
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

/**
 * Faz upload de um documento para o cliente
 */
export async function uploadDocument(
  params: DocumentUploadParams,
): Promise<{ success: boolean; document?: ClientDocument; error?: string }> {
  const {
    clientId,
    file,
    category = 'geral',
    description,
    confidentiality = 'interno',
    tags = [],
    versionGroupId,
  } = params;

  try {
    // Validar arquivo
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Obter usuário atual
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    // Gerar caminho no storage
    const storagePath = generateStoragePath(clientId, file.name);

    // Upload para o storage
    const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      log.error('uploadDocument storage error', new Error(uploadError.message));
      return { success: false, error: `Erro ao fazer upload: ${uploadError.message}` };
    }

    // Determinar versão
    let version = 1;
    let finalVersionGroupId = versionGroupId;

    if (versionGroupId) {
      // Nova versão de documento existente: marcar versão anterior como não-corrente
      const { data: prevVersions } = await supabase
        .from('client_documents')
        .select('version')
        .eq('version_group_id', versionGroupId)
        .order('version', { ascending: false })
        .limit(1);

      if (prevVersions && prevVersions.length > 0) {
        version = prevVersions[0].version + 1;
        await supabase
          .from('client_documents')
          .update({ is_current_version: false })
          .eq('version_group_id', versionGroupId);
      }
    }

    // Inserir metadados na tabela
    const { data, error: dbError } = await supabase
      .from('client_documents')
      .insert({
        client_id: clientId,
        uploaded_by: user.id,
        file_name: storagePath.split('/').pop(),
        original_name: file.name,
        file_type: validation.fileType,
        file_size: file.size,
        storage_path: storagePath,
        category,
        description,
        confidentiality,
        version,
        version_group_id: finalVersionGroupId || undefined, // DB trigger/default will handle null
        is_current_version: true,
        tags,
      })
      .select()
      .single();

    if (dbError) {
      // Tentar remover arquivo do storage se falhar no DB
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
      log.error('uploadDocument DB error', new Error(dbError.message));
      return { success: false, error: `Erro ao salvar documento: ${dbError.message}` };
    }

    // Se não havia version_group_id, setar para o próprio id (auto-referência)
    if (!finalVersionGroupId) {
      await supabase
        .from('client_documents')
        .update({ version_group_id: data.id })
        .eq('id', data.id);
      data.version_group_id = data.id;
    }

    const document = mapDocumentFromDatabase(data);

    // Audit log
    await logDocumentAction(document.id, versionGroupId ? 'new_version' : 'upload', {
      file_name: file.name,
      file_size: file.size,
      version,
      confidentiality,
    });

    return { success: true, document };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido ao fazer upload';
    log.error('uploadDocument error', error instanceof Error ? error : new Error(msg));
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// List / Query
// ---------------------------------------------------------------------------

/**
 * Lista documentos de um cliente com filtros opcionais
 */
export async function listDocuments(
  filter: DocumentFilter = {},
): Promise<{ documents: ClientDocument[]; error?: string }> {
  try {
    let query = supabase
      .from('client_documents')
      .select(
        `
        *,
        clients(name),
        contract_details(id, status, end_date, contract_value)
      `,
      )
      .order('created_at', { ascending: false });

    // Por padrão, mostrar apenas versão corrente
    if (filter.onlyCurrentVersion !== false) {
      query = query.eq('is_current_version', true);
    }

    // Aplicar filtros
    if (filter.clientId) {
      query = query.eq('client_id', filter.clientId);
    }
    if (filter.category) {
      query = query.eq('category', filter.category);
    }
    if (filter.fileType) {
      query = query.eq('file_type', filter.fileType);
    }
    if (filter.confidentiality) {
      query = query.eq('confidentiality', filter.confidentiality);
    }
    if (filter.searchTerm) {
      query = query.or(`original_name.ilike.%${filter.searchTerm}%,description.ilike.%${filter.searchTerm}%`);
    }
    if (filter.tags && filter.tags.length > 0) {
      query = query.contains('tags', filter.tags);
    }

    const { data, error } = await query;

    if (error) {
      log.error('listDocuments query error', new Error(error.message));
      return { documents: [], error: error.message };
    }

    const documents = (data || []).map((doc: any) => {
      const mapped = mapDocumentFromDatabase(doc as DatabaseDocument);
      return {
        ...mapped,
        uploaderName: '—',
        clientName: doc.clients?.name || 'Cliente',
        contractDetails: doc.contract_details?.[0]
          ? {
              id: doc.contract_details[0].id,
              documentId: mapped.id,
              status: doc.contract_details[0].status,
              endDate: doc.contract_details[0].end_date,
              contractValue: doc.contract_details[0].contract_value,
              currency: 'BRL',
              parties: [],
              autoRenew: false,
              renewalReminderDays: 30,
              relatedDocumentIds: [],
              createdAt: '',
              updatedAt: '',
            }
          : undefined,
      };
    });

    return { documents };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao listar documentos';
    log.error('listDocuments error', error instanceof Error ? error : new Error(msg));
    return { documents: [], error: msg };
  }
}

/**
 * Lista versões de um documento (pelo version_group_id)
 */
export async function getDocumentVersions(
  versionGroupId: string,
): Promise<{ versions: ClientDocument[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('client_documents')
      .select('*')
      .eq('version_group_id', versionGroupId)
      .order('version', { ascending: false });

    if (error) {
      return { versions: [], error: error.message };
    }

    return {
      versions: (data || []).map((doc: any) => mapDocumentFromDatabase(doc as DatabaseDocument)),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao buscar versões';
    return { versions: [], error: msg };
  }
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/**
 * Obtém URL de download temporário para um documento
 * Expiração varia conforme nível de confidencialidade
 */
export async function getDocumentUrl(
  storagePath: string,
  confidentiality: ConfidentialityLevel = 'interno',
): Promise<{ url?: string; error?: string }> {
  try {
    const expirySeconds = SIGNED_URL_EXPIRY[confidentiality];
    const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(storagePath, expirySeconds);

    if (error) {
      log.error('getDocumentUrl error', new Error(error.message));
      return { error: error.message };
    }

    return { url: data.signedUrl };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao obter URL do documento';
    log.error('getDocumentUrl error', error instanceof Error ? error : new Error(msg));
    return { error: msg };
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * Exclui um documento (apenas analistas e admins)
 */
export async function deleteDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Primeiro, buscar o documento para obter o storage_path
    const { data: doc, error: fetchError } = await supabase
      .from('client_documents')
      .select('storage_path')
      .eq('id', documentId)
      .single();

    if (fetchError || !doc) {
      return { success: false, error: 'Documento não encontrado' };
    }

    // Audit log antes de excluir
    await logDocumentAction(documentId, 'delete', {
      storage_path: doc.storage_path,
    });

    // Excluir do storage
    const { error: storageError } = await supabase.storage.from(BUCKET_NAME).remove([doc.storage_path]);

    if (storageError) {
      log.warn('deleteDocument storage error (file may already be removed)');
    }

    // Excluir do banco
    const { error: dbError } = await supabase.from('client_documents').delete().eq('id', documentId);

    if (dbError) {
      log.error('deleteDocument DB error', new Error(dbError.message));
      return { success: false, error: dbError.message };
    }

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao excluir documento';
    log.error('deleteDocument error', error instanceof Error ? error : new Error(msg));
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateDocument(
  documentId: string,
  updates: {
    category?: DocumentCategory;
    description?: string;
    confidentiality?: ConfidentialityLevel;
    tags?: string[];
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    const oldDoc = await supabase
      .from('client_documents')
      .select('confidentiality')
      .eq('id', documentId)
      .single();

    const { error } = await supabase.from('client_documents').update(updates).eq('id', documentId);

    if (error) {
      log.error('updateDocument error', new Error(error.message));
      return { success: false, error: error.message };
    }

    // Audit log
    const metadata: Record<string, unknown> = { ...updates };
    if (updates.confidentiality && oldDoc.data?.confidentiality !== updates.confidentiality) {
      await logDocumentAction(documentId, 'confidentiality_change', {
        from: oldDoc.data?.confidentiality,
        to: updates.confidentiality,
      });
    } else {
      await logDocumentAction(documentId, 'update_metadata', metadata);
    }

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao atualizar documento';
    log.error('updateDocument error', error instanceof Error ? error : new Error(msg));
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Database mapping
// ---------------------------------------------------------------------------

interface DatabaseDocument {
  id: string;
  client_id: string;
  uploaded_by: string;
  file_name: string;
  original_name: string;
  file_type: DocumentFileType;
  file_size: number;
  storage_path: string;
  category: DocumentCategory;
  description?: string;
  confidentiality: ConfidentialityLevel;
  version: number;
  version_group_id: string;
  is_current_version: boolean;
  tags: string[];
  checksum?: string;
  created_at: string;
  updated_at: string;
}

function mapDocumentFromDatabase(doc: DatabaseDocument): ClientDocument {
  return {
    id: doc.id,
    clientId: doc.client_id,
    uploadedBy: doc.uploaded_by,
    fileName: doc.file_name,
    originalName: doc.original_name,
    fileType: doc.file_type,
    fileSize: doc.file_size,
    storagePath: doc.storage_path,
    category: doc.category,
    description: doc.description,
    confidentiality: doc.confidentiality || 'interno',
    version: doc.version || 1,
    versionGroupId: doc.version_group_id || doc.id,
    isCurrentVersion: doc.is_current_version ?? true,
    tags: doc.tags || [],
    checksum: doc.checksum,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Helpers / Labels
// ---------------------------------------------------------------------------

/**
 * Formata o tamanho do arquivo para exibição
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Retorna ícone baseado no tipo de arquivo
 */
export function getFileTypeIcon(fileType: DocumentFileType): string {
  switch (fileType) {
    case 'pdf':
      return '📄';
    case 'docx':
    case 'doc':
      return '📝';
    case 'xlsx':
    case 'xls':
      return '📊';
    default:
      return '📁';
  }
}

/**
 * Retorna cor baseada no tipo de arquivo
 */
export function getFileTypeColor(fileType: DocumentFileType): string {
  switch (fileType) {
    case 'pdf':
      return 'text-red-500';
    case 'docx':
    case 'doc':
      return 'text-blue-500';
    case 'xlsx':
    case 'xls':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * Labels para categorias
 */
export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  geral: 'Geral',
  contrato: 'Contrato',
  relatorio: 'Relatório',
  financeiro: 'Financeiro',
  tecnico: 'Técnico',
  outro: 'Outro',
};

/**
 * Labels para níveis de confidencialidade
 */
export const CONFIDENTIALITY_LABELS: Record<ConfidentialityLevel, string> = {
  publico: 'Público',
  interno: 'Interno',
  confidencial: 'Confidencial',
  restrito: 'Restrito',
};

/**
 * Cores para badges de confidencialidade
 */
export const CONFIDENTIALITY_COLORS: Record<ConfidentialityLevel, string> = {
  publico: 'bg-green-100 text-green-800',
  interno: 'bg-blue-100 text-blue-800',
  confidencial: 'bg-orange-100 text-orange-800',
  restrito: 'bg-red-100 text-red-800',
};
