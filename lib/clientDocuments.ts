/**
 * Operações CRUD para documentos de clientes (mentoria)
 * Suporta PDF, WORD (doc, docx), Excel (xls, xlsx)
 */
import { supabase } from './supabase';
import { ClientDocument, DocumentCategory, DocumentFileType, DocumentUploadParams, DocumentFilter } from '../types';

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

/**
 * Faz upload de um documento para o cliente
 */
export async function uploadDocument(params: DocumentUploadParams): Promise<{ success: boolean; document?: ClientDocument; error?: string }> {
  const { clientId, file, category = 'geral', description } = params;

  try {
    // Validar arquivo
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Obter usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    // Gerar caminho no storage
    const storagePath = generateStoragePath(clientId, file.name);

    // Upload para o storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('[uploadDocument] Storage error:', uploadError);
      return { success: false, error: `Erro ao fazer upload: ${uploadError.message}` };
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
        description
      })
      .select()
      .single();

    if (dbError) {
      // Tentar remover arquivo do storage se falhar no DB
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
      console.error('[uploadDocument] DB error:', dbError);
      return { success: false, error: `Erro ao salvar documento: ${dbError.message}` };
    }

    return { 
      success: true, 
      document: mapDocumentFromDatabase(data)
    };

  } catch (error: any) {
    console.error('[uploadDocument] Error:', error);
    return { success: false, error: error.message || 'Erro desconhecido ao fazer upload' };
  }
}

/**
 * Lista documentos de um cliente com filtros opcionais
 */
export async function listDocuments(filter: DocumentFilter = {}): Promise<{ documents: ClientDocument[]; error?: string }> {
  try {
    let query = supabase
      .from('client_documents')
      .select(`
        *,
        clients!inner(name),
        user_profiles:uploaded_by(name)
      `)
      .order('created_at', { ascending: false });

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
    if (filter.searchTerm) {
      query = query.or(`original_name.ilike.%${filter.searchTerm}%,description.ilike.%${filter.searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[listDocuments] Error:', error);
      return { documents: [], error: error.message };
    }

    const documents = (data || []).map((doc: any) => ({
      ...mapDocumentFromDatabase(doc),
      uploaderName: doc.user_profiles?.name || 'Desconhecido',
      clientName: doc.clients?.name || 'Cliente'
    }));

    return { documents };

  } catch (error: any) {
    console.error('[listDocuments] Error:', error);
    return { documents: [], error: error.message };
  }
}

/**
 * Obtém URL de download temporário para um documento
 */
export async function getDocumentUrl(storagePath: string): Promise<{ url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, 3600); // URL válida por 1 hora

    if (error) {
      console.error('[getDocumentUrl] Error:', error);
      return { error: error.message };
    }

    return { url: data.signedUrl };

  } catch (error: any) {
    console.error('[getDocumentUrl] Error:', error);
    return { error: error.message };
  }
}

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

    // Excluir do storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([doc.storage_path]);

    if (storageError) {
      console.error('[deleteDocument] Storage error:', storageError);
      // Continuar mesmo com erro no storage (arquivo pode já ter sido removido)
    }

    // Excluir do banco
    const { error: dbError } = await supabase
      .from('client_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      console.error('[deleteDocument] DB error:', dbError);
      return { success: false, error: dbError.message };
    }

    return { success: true };

  } catch (error: any) {
    console.error('[deleteDocument] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Atualiza metadados de um documento (categoria, descrição)
 */
export async function updateDocument(
  documentId: string, 
  updates: { category?: DocumentCategory; description?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('client_documents')
      .update(updates)
      .eq('id', documentId);

    if (error) {
      console.error('[updateDocument] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };

  } catch (error: any) {
    console.error('[updateDocument] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mapeia documento do formato do banco para o tipo TypeScript
 */
function mapDocumentFromDatabase(doc: any): ClientDocument {
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
    createdAt: doc.created_at,
    updatedAt: doc.updated_at
  };
}

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
  outro: 'Outro'
};
