/**
 * Gerenciamento de Documentos de Cliente (Mentoria)
 * v2: confidencialidade, versionamento, workflow de contratos,
 *     auditoria, preview, tags, dashboard
 */
import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import {
  Upload,
  Download,
  Trash2,
  Search,
  FileText,
  FileSpreadsheet,
  File,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  FolderOpen,
  Calendar,
  User,
  Tag,
  Eye,
  GitBranch,
  LayoutDashboard,
  List,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useClient } from '../contexts/ClientContext';
import {
  Client,
  ClientDocument,
  ConfidentialityLevel,
  DocumentCategory,
  DocumentFileType,
} from '../types';
import { supabase } from '../lib/supabase';
import {
  uploadDocument,
  listDocuments,
  deleteDocument,
  getDocumentUrl,
  updateDocument,
  formatFileSize,
  getFileTypeColor,
  CATEGORY_LABELS,
  CONFIDENTIALITY_LABELS,
  validateFile,
  logDocumentAction,
  getDocumentVersions,
} from '../lib/clientDocuments';
import ConfidentialityBadge from '../components/documents/ConfidentialityBadge';
import ContractStatusBadge from '../components/documents/ContractStatusBadge';
import TagInput from '../components/documents/TagInput';

// Lazy-load heavier components
const DocumentPreview = lazy(() => import('../components/documents/DocumentPreview'));
const DocumentActivityTimeline = lazy(() => import('../components/documents/DocumentActivityTimeline'));
const ContractWorkflowActions = lazy(() => import('../components/documents/ContractWorkflowActions'));
const ContractDetailForm = lazy(() => import('../components/documents/ContractDetailForm'));
const ContractDashboard = lazy(() => import('../components/documents/ContractDashboard'));

interface ClientDocumentsProps {
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

type ViewMode = 'list' | 'dashboard';

const ClientDocuments: React.FC<ClientDocumentsProps> = ({ onToast }) => {
  const { user } = useAuth();
  const { selectedClient } = useClient();

  // States
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | ''>('');
  const [filterClient, setFilterClient] = useState<string>('');
  const [filterConfidentiality, setFilterConfidentiality] = useState<ConfidentialityLevel | ''>('');

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('geral');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadConfidentiality, setUploadConfidentiality] = useState<ConfidentialityLevel>('interno');
  const [uploadTags, setUploadTags] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadVersionGroupId, setUploadVersionGroupId] = useState<string | undefined>();

  // Detail panel
  const [selectedDocument, setSelectedDocument] = useState<ClientDocument | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<ClientDocument[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificar se é analista ou admin
  const isAnalystOrAdmin = user?.role === 'admin' || user?.qualification === 'analista';
  const canDelete = isAnalystOrAdmin;

  // Carregar clientes (para filtro e seleção)
  const loadClients = useCallback(async () => {
    if (!user) return;
    try {
      let query = supabase.from('clients').select('*');
      if (user.qualification === 'analista' && user.role !== 'admin') {
        query = query.eq('analyst_id', user.id);
      }
      const { data, error } = await query.order('name');
      if (error) throw error;
      setClients(
        data?.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          analystId: c.analyst_id,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        })) || [],
      );
    } catch (err: any) {
      console.error('[loadClients]', err);
    }
  }, [user]);

  // Carregar documentos
  const loadDocuments = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setError(null);
      const { documents: docs, error: loadError } = await listDocuments({
        clientId: filterClient || selectedClient?.id || undefined,
        category: filterCategory || undefined,
        confidentiality: filterConfidentiality || undefined,
        searchTerm: searchTerm || undefined,
      });
      if (loadError) {
        setError(loadError);
        return;
      }
      setDocuments(docs);
    } catch (err: any) {
      console.error('[loadDocuments]', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, filterClient, filterCategory, filterConfidentiality, searchTerm, selectedClient]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (selectedClient && !filterClient) {
      setFilterClient(selectedClient.id);
    }
  }, [selectedClient]);

  // Handlers de drag & drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      onToast?.(validation.error!, 'error');
      return;
    }
    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Upload de documento
  const handleUpload = async () => {
    if (!selectedFile) {
      onToast?.('Selecione um arquivo', 'error');
      return;
    }
    const clientId = filterClient || selectedClient?.id;
    if (!clientId) {
      onToast?.('Selecione um cliente', 'error');
      return;
    }
    setIsUploading(true);
    try {
      const { success, error } = await uploadDocument({
        clientId,
        file: selectedFile,
        category: uploadCategory,
        description: uploadDescription || undefined,
        confidentiality: uploadConfidentiality,
        tags: uploadTags,
        versionGroupId: uploadVersionGroupId,
      });
      if (!success) {
        onToast?.(error || 'Erro ao fazer upload', 'error');
        return;
      }
      onToast?.(
        uploadVersionGroupId ? 'Nova versão enviada com sucesso!' : 'Documento enviado com sucesso!',
        'success',
      );
      setShowUploadModal(false);
      resetUploadForm();
      loadDocuments();
    } catch (err: any) {
      console.error('[handleUpload]', err);
      onToast?.(err.message || 'Erro ao fazer upload', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setUploadCategory('geral');
    setUploadDescription('');
    setUploadConfidentiality('interno');
    setUploadTags([]);
    setUploadVersionGroupId(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Download de documento (com audit log)
  const handleDownload = async (doc: ClientDocument) => {
    try {
      await logDocumentAction(doc.id, 'download', { file_name: doc.originalName });
      const { url, error } = await getDocumentUrl(doc.storagePath, doc.confidentiality);
      if (error || !url) {
        onToast?.(error || 'Erro ao gerar link', 'error');
        return;
      }
      window.open(url, '_blank');
    } catch (err: any) {
      console.error('[handleDownload]', err);
      onToast?.('Erro ao baixar documento', 'error');
    }
  };

  // Excluir documento
  const handleDelete = async (doc: ClientDocument) => {
    if (!canDelete) {
      onToast?.('Apenas analistas podem excluir documentos', 'error');
      return;
    }
    if (!confirm(`Excluir "${doc.originalName}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(doc.id);
    try {
      const { success, error } = await deleteDocument(doc.id);
      if (!success) {
        onToast?.(error || 'Erro ao excluir', 'error');
        return;
      }
      onToast?.('Documento excluído', 'success');
      if (selectedDocument?.id === doc.id) setSelectedDocument(null);
      loadDocuments();
    } catch (err: any) {
      console.error('[handleDelete]', err);
      onToast?.('Erro ao excluir documento', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Upload nova versão
  const handleNewVersion = (doc: ClientDocument) => {
    setUploadVersionGroupId(doc.versionGroupId);
    setUploadCategory(doc.category);
    setUploadConfidentiality(doc.confidentiality);
    setUploadTags(doc.tags);
    setShowUploadModal(true);
  };

  // Carregar versões
  const handleShowVersions = async (doc: ClientDocument) => {
    const { versions: v } = await getDocumentVersions(doc.versionGroupId);
    setVersions(v);
    setShowVersions(true);
  };

  // Ícone do tipo de arquivo
  const FileIcon = ({ type }: { type: DocumentFileType }) => {
    const colorClass = getFileTypeColor(type);
    switch (type) {
      case 'pdf':
        return <FileText className={colorClass} size={20} />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className={colorClass} size={20} />;
      default:
        return <File className={colorClass} size={20} />;
    }
  };

  const currentClientId = filterClient || selectedClient?.id;
  const currentClientName = clients.find(c => c.id === currentClientId)?.name || selectedClient?.name;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full text-ai-subtext">
        <AlertCircle className="mr-2" size={20} />
        Faça login para acessar os documentos
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-ai-bg p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-ai-text mb-1">Documentos da Mentoria</h1>
          <p className="text-sm text-ai-subtext">Gerencie documentos, contratos e relatórios dos clientes.</p>
        </div>
        {/* View toggle */}
        <div className="flex bg-ai-surface rounded-lg p-0.5 border border-ai-border">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'list' ? 'bg-white text-ai-text shadow-sm' : 'text-ai-subtext hover:text-ai-text'
            }`}
          >
            <List size={14} /> Documentos
          </button>
          <button
            onClick={() => setViewMode('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'dashboard' ? 'bg-white text-ai-text shadow-sm' : 'text-ai-subtext hover:text-ai-text'
            }`}
          >
            <LayoutDashboard size={14} /> Contratos
          </button>
        </div>
      </div>

      {/* Dashboard View */}
      {viewMode === 'dashboard' ? (
        <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="animate-spin text-ai-accent" size={32} /></div>}>
          <ContractDashboard
            onSelectDocument={docId => {
              const doc = documents.find(d => d.id === docId);
              if (doc) {
                setSelectedDocument(doc);
                setViewMode('list');
              }
            }}
          />
        </Suspense>
      ) : (
        <>
          {/* Filtros e Ações */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1 md:max-w-xs">
              <select
                value={filterClient}
                onChange={e => setFilterClient(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-ai-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ai-accent"
              >
                <option value="">Todos os clientes</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 md:max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ai-subtext" size={16} />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-ai-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ai-accent"
              />
            </div>

            <div className="md:w-36">
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value as DocumentCategory | '')}
                className="w-full px-3 py-2 bg-white border border-ai-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ai-accent"
              >
                <option value="">Categorias</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="md:w-36">
              <select
                value={filterConfidentiality}
                onChange={e => setFilterConfidentiality(e.target.value as ConfidentialityLevel | '')}
                className="w-full px-3 py-2 bg-white border border-ai-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ai-accent"
              >
                <option value="">Confidencial.</option>
                {Object.entries(CONFIDENTIALITY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                if (!currentClientId) {
                  onToast?.('Selecione um cliente primeiro', 'warning');
                  return;
                }
                setShowUploadModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-ai-accent text-white rounded-lg hover:bg-ai-accent/90 transition-colors text-sm font-medium"
            >
              <Upload size={16} />
              Enviar Documento
            </button>
          </div>

          {/* Cliente atual */}
          {currentClientName && (
            <div className="mb-4 px-3 py-2 bg-ai-surface rounded-lg border border-ai-border">
              <span className="text-sm text-ai-subtext">Cliente: </span>
              <span className="text-sm font-medium text-ai-text">{currentClientName}</span>
            </div>
          )}

          {/* Layout: Lista + Painel de detalhes */}
          <div className="flex-1 flex gap-4 overflow-hidden">
            {/* Lista de Documentos */}
            <div className={`flex-1 overflow-auto ${selectedDocument ? 'hidden md:block' : ''}`}>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-ai-accent" size={32} />
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12 text-red-500">
                  <AlertCircle className="mr-2" size={20} />
                  {error}
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-ai-subtext">
                  <FolderOpen size={48} className="mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">Nenhum documento encontrado</p>
                  <p className="text-sm">
                    {currentClientId
                      ? 'Envie o primeiro documento clicando no botão acima.'
                      : 'Selecione um cliente para ver seus documentos.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {documents.map(doc => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocument(doc)}
                      className={`flex items-center gap-4 p-4 bg-white border rounded-lg hover:shadow-md transition-all cursor-pointer ${
                        selectedDocument?.id === doc.id
                          ? 'border-ai-accent ring-1 ring-ai-accent/30'
                          : 'border-ai-border'
                      }`}
                    >
                      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-ai-surface rounded-lg">
                        <FileIcon type={doc.fileType} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-ai-text truncate" title={doc.originalName}>
                          {doc.originalName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-ai-subtext flex items-center gap-1">
                            <Tag size={11} />
                            {CATEGORY_LABELS[doc.category]}
                          </span>
                          <ConfidentialityBadge level={doc.confidentiality} />
                          {doc.contractDetails?.status && (
                            <ContractStatusBadge status={doc.contractDetails.status} />
                          )}
                          {doc.version > 1 && (
                            <span className="text-xs text-purple-600 font-medium">v{doc.version}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-ai-subtext">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                          {doc.tags.length > 0 && (
                            <span className="truncate max-w-[150px]">{doc.tags.join(', ')}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {doc.fileType === 'pdf' && (
                          <button
                            onClick={() => {
                              setSelectedDocument(doc);
                              setShowPreview(true);
                            }}
                            className="p-2 text-ai-subtext hover:text-ai-accent hover:bg-ai-surface rounded-lg"
                            title="Preview"
                          >
                            <Eye size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-2 text-ai-subtext hover:text-ai-accent hover:bg-ai-surface rounded-lg"
                          title="Baixar"
                        >
                          <Download size={18} />
                        </button>
                        {isAnalystOrAdmin && (
                          <button
                            onClick={() => handleNewVersion(doc)}
                            className="p-2 text-ai-subtext hover:text-purple-500 hover:bg-purple-50 rounded-lg"
                            title="Nova versão"
                          >
                            <GitBranch size={18} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(doc)}
                            disabled={deletingId === doc.id}
                            className="p-2 text-ai-subtext hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                            title="Excluir"
                          >
                            {deletingId === doc.id ? (
                              <Loader2 className="animate-spin" size={18} />
                            ) : (
                              <Trash2 size={18} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detail Panel */}
            {selectedDocument && (
              <div className="w-full md:w-96 bg-white border border-ai-border rounded-xl overflow-auto flex-shrink-0">
                <div className="p-4 border-b border-ai-border flex items-center justify-between">
                  <h3 className="font-bold text-ai-text truncate flex-1">{selectedDocument.originalName}</h3>
                  <button
                    onClick={() => setSelectedDocument(null)}
                    className="p-1 text-ai-subtext hover:text-ai-text rounded md:hidden"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ai-subtext">Categoria</span>
                      <span className="text-ai-text font-medium">{CATEGORY_LABELS[selectedDocument.category]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ai-subtext">Confidencialidade</span>
                      <ConfidentialityBadge level={selectedDocument.confidentiality} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ai-subtext">Versão</span>
                      <button
                        onClick={() => handleShowVersions(selectedDocument)}
                        className="text-ai-accent hover:underline font-medium"
                      >
                        v{selectedDocument.version}
                      </button>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ai-subtext">Tamanho</span>
                      <span className="text-ai-text">{formatFileSize(selectedDocument.fileSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ai-subtext">Data</span>
                      <span className="text-ai-text">
                        {new Date(selectedDocument.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {selectedDocument.description && (
                      <div>
                        <span className="text-ai-subtext block mb-1">Descrição</span>
                        <p className="text-ai-text text-xs">{selectedDocument.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {selectedDocument.tags.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-ai-subtext block mb-1">Tags</span>
                      <TagInput tags={selectedDocument.tags} onChange={() => {}} disabled />
                    </div>
                  )}

                  {/* Contract section */}
                  {selectedDocument.category === 'contrato' && (
                    <div className="border-t border-ai-border pt-4">
                      <h4 className="text-sm font-bold text-ai-text mb-3">Contrato</h4>
                      {selectedDocument.contractDetails?.status && (
                        <div className="mb-3">
                          <ContractStatusBadge status={selectedDocument.contractDetails.status} size="md" />
                          <div className="mt-2">
                            <Suspense fallback={null}>
                              <ContractWorkflowActions
                                documentId={selectedDocument.id}
                                currentStatus={selectedDocument.contractDetails.status}
                                onStatusChanged={loadDocuments}
                                onToast={onToast}
                              />
                            </Suspense>
                          </div>
                        </div>
                      )}
                      <Suspense fallback={<Loader2 className="animate-spin" size={16} />}>
                        <ContractDetailForm
                          documentId={selectedDocument.id}
                          onSaved={loadDocuments}
                          onToast={onToast}
                        />
                      </Suspense>
                    </div>
                  )}

                  {/* Activity timeline */}
                  <div className="border-t border-ai-border pt-4">
                    <h4 className="text-sm font-bold text-ai-text mb-3">Atividade</h4>
                    <Suspense fallback={<Loader2 className="animate-spin" size={16} />}>
                      <DocumentActivityTimeline documentId={selectedDocument.id} />
                    </Suspense>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-ai-border">
              <h2 className="text-lg font-bold text-ai-text">
                {uploadVersionGroupId ? 'Enviar Nova Versão' : 'Enviar Documento'}
              </h2>
              <button
                onClick={() => { setShowUploadModal(false); resetUploadForm(); }}
                className="p-1 text-ai-subtext hover:text-ai-text rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="px-3 py-2 bg-ai-surface rounded-lg">
                <span className="text-sm text-ai-subtext">Cliente: </span>
                <span className="text-sm font-medium text-ai-text">{currentClientName}</span>
              </div>

              {/* Drop area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${dragActive ? 'border-ai-accent bg-ai-accent/5' : 'border-ai-border hover:border-ai-accent/50'}
                  ${selectedFile ? 'bg-green-50 border-green-300' : ''}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle2 className="text-green-500" size={24} />
                    <div className="text-left">
                      <p className="font-medium text-ai-text">{selectedFile.name}</p>
                      <p className="text-sm text-ai-subtext">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1 text-ai-subtext hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto mb-3 text-ai-subtext" size={32} />
                    <p className="text-ai-text font-medium mb-1">Arraste um arquivo ou clique para selecionar</p>
                    <p className="text-sm text-ai-subtext">PDF, DOCX, DOC, XLSX, XLS (máx. 10MB)</p>
                  </>
                )}
              </div>

              {/* Category */}
              {!uploadVersionGroupId && (
                <div>
                  <label className="block text-sm font-medium text-ai-text mb-1">Categoria</label>
                  <select
                    value={uploadCategory}
                    onChange={e => setUploadCategory(e.target.value as DocumentCategory)}
                    className="w-full px-3 py-2 border border-ai-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ai-accent"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Confidentiality */}
              <div>
                <label className="block text-sm font-medium text-ai-text mb-1">Confidencialidade</label>
                <select
                  value={uploadConfidentiality}
                  onChange={e => setUploadConfidentiality(e.target.value as ConfidentialityLevel)}
                  className="w-full px-3 py-2 border border-ai-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ai-accent"
                >
                  {Object.entries(CONFIDENTIALITY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-ai-text mb-1">Tags</label>
                <TagInput tags={uploadTags} onChange={setUploadTags} />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-ai-text mb-1">Descrição (opcional)</label>
                <textarea
                  value={uploadDescription}
                  onChange={e => setUploadDescription(e.target.value)}
                  placeholder="Adicione uma descrição para o documento..."
                  rows={2}
                  className="w-full px-3 py-2 border border-ai-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ai-accent resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-ai-border">
              <button
                onClick={() => { setShowUploadModal(false); resetUploadForm(); }}
                className="px-4 py-2 text-ai-subtext hover:text-ai-text transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-ai-accent text-white rounded-lg hover:bg-ai-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <><Loader2 className="animate-spin" size={16} /> Enviando...</>
                ) : (
                  <><Upload size={16} /> Enviar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedDocument && (
        <Suspense fallback={null}>
          <DocumentPreview
            document={selectedDocument}
            onClose={() => setShowPreview(false)}
          />
        </Suspense>
      )}

      {/* Versions Modal */}
      {showVersions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-ai-border">
              <h2 className="text-lg font-bold text-ai-text">Histórico de Versões</h2>
              <button onClick={() => setShowVersions(false)} className="p-1 text-ai-subtext hover:text-ai-text rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-auto">
              {versions.map(v => (
                <div
                  key={v.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    v.isCurrentVersion ? 'border-ai-accent bg-ai-accent/5' : 'border-ai-border'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-ai-text">
                      v{v.version} {v.isCurrentVersion && <span className="text-ai-accent">(atual)</span>}
                    </p>
                    <p className="text-xs text-ai-subtext">
                      {new Date(v.createdAt).toLocaleDateString('pt-BR')} — {formatFileSize(v.fileSize)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload(v)}
                    className="p-2 text-ai-subtext hover:text-ai-accent"
                    title="Baixar esta versão"
                  >
                    <Download size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDocuments;
