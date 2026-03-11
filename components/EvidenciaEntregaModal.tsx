import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle,
  MessageSquarePlus,
  ImageIcon,
  Video,
  FileSpreadsheet,
  FileText,
  Loader2,
  FileIcon,
  Trash2,
} from 'lucide-react';
import {
  fetchOrCreateEvidence,
  appendComment,
  uploadEvidenceFile,
  getSignedUrl,
  deleteEvidenceFile,
  type MilestoneEvidenceWithFiles,
  type EvidenceFileType,
} from '../lib/milestoneEvidence';
import { toggleMilestoneCompleted } from '../lib/initiatives';
import type { InitiativeMilestoneRow } from '../lib/initiatives';

const FILE_TYPE_CONFIG: { type: EvidenceFileType; label: string; icon: React.ElementType; accept: string }[] = [
  { type: 'image', label: 'Imagem', icon: ImageIcon, accept: 'image/*' },
  { type: 'video', label: 'Vídeo', icon: Video, accept: 'video/*' },
  { type: 'spreadsheet', label: 'Planilha', icon: FileSpreadsheet, accept: '.xlsx,.xls,.csv' },
  { type: 'document', label: 'Documento', icon: FileText, accept: '.pdf,.doc,.docx' },
];

interface EvidenciaEntregaModalProps {
  milestone: InitiativeMilestoneRow;
  initiativeName: string;
  onClose: () => void;
  onSaved?: () => void;
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const EvidenciaEntregaModal: React.FC<EvidenciaEntregaModalProps> = ({
  milestone,
  initiativeName,
  onClose,
  onSaved,
  onToast,
}) => {
  const [evidence, setEvidence] = useState<MilestoneEvidenceWithFiles | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [uploadingType, setUploadingType] = useState<EvidenceFileType | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const fileInputRefs = useRef<Record<EvidenceFileType, HTMLInputElement | null>>({
    image: null,
    video: null,
    document: null,
    spreadsheet: null,
  });

  const statusLabel = milestone.completed ? 'Concluído' : 'Não concluído';
  const statusColor = milestone.completed
    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
    : 'bg-ai-surface2 text-ai-subtext';

  const loadEvidence = async () => {
    setLoading(true);
    try {
      const data = await fetchOrCreateEvidence(milestone.id);
      setEvidence(data);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: string }).message)
          : 'Erro ao carregar evidências';
      onToast?.(msg, 'error');
      console.error('[EvidenciaEntrega] loadEvidence:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvidence();
  }, [milestone.id]);

  // Fechar modal com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleAddComment = async () => {
    if (!commentText.trim() || !evidence) return;
    setAddingComment(true);
    try {
      await appendComment(evidence.id, commentText.trim());
      setCommentText('');
      await loadEvidence();
      onToast?.('Comentário adicionado.', 'success');
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao adicionar comentário', 'error');
    } finally {
      setAddingComment(false);
    }
  };

  const handleFileSelect = async (type: EvidenceFileType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !evidence) return;
    e.target.value = '';

    setUploadingType(type);
    try {
      const row = await uploadEvidenceFile(evidence.id, milestone.id, file);
      setEvidence(prev => (prev ? { ...prev, files: [row, ...(prev.files || [])] } : prev));
      onToast?.(`Arquivo "${file.name}" anexado.`, 'success');
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : 'Erro ao anexar arquivo', 'error');
    } finally {
      setUploadingType(null);
    }
  };

  const handleToggleStatus = async () => {
    setTogglingStatus(true);
    try {
      await toggleMilestoneCompleted(milestone.id);
      onSaved?.();
      onToast?.('Status do marco atualizado.', 'success');
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao atualizar status', 'error');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleSaveAll = async () => {
    if (!evidence) return;
    setSaving(true);
    try {
      if (commentText.trim()) {
        await appendComment(evidence.id, commentText.trim());
        setCommentText('');
      }
      await loadEvidence();
      onSaved?.();
      onToast?.('Evidências salvas.', 'success');
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Remover o arquivo "${fileName}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteEvidenceFile(fileId);
      await loadEvidence();
      onToast?.('Arquivo removido.', 'success');
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao remover', 'error');
    }
  };

  const handleDownloadFile = async (path: string, name: string) => {
    try {
      const url = await getSignedUrl(path);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.target = '_blank';
      a.rel = 'noopener';
      a.click();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : 'Erro ao baixar', 'error');
    }
  };

  const hasNotes = evidence?.notes?.trim();
  const hasFiles = (evidence?.files?.length ?? 0) > 0;
  const hasEvidence = hasNotes || hasFiles;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-ai-bg border border-ai-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-ai-border px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-ai-subtext uppercase tracking-wider mb-1">EVIDÊNCIA DE ENTREGA</p>
            <h2 className="text-xl font-bold text-ai-text">{milestone.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-ai-subtext hover:text-ai-text rounded-lg hover:bg-ai-surface2"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-ai-accent" />
            </div>
          ) : (
            <>
              {/* Status do Marco – card roxo claro com check verde / botão Concluído */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                <div className="flex items-center gap-3">
                  {milestone.completed ? (
                    <CheckCircle size={28} className="text-green-600 shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full border-2 border-ai-border shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-ai-text">Status do Marco</p>
                    <p className="text-xs text-ai-subtext mt-0.5">Representa {milestone.percent}% da iniciativa</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  disabled={togglingStatus}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${statusColor} hover:opacity-90 disabled:opacity-50 flex items-center gap-2`}
                >
                  {togglingStatus ? <Loader2 size={16} className="animate-spin" /> : null}
                  {statusLabel}
                </button>
              </div>

              {/* Adicionar Entregável – textarea + Adicionar Comentário (azul) + botões de anexo à direita */}
              <div>
                <p className="text-sm font-semibold text-ai-text mb-3 uppercase tracking-wide">Adicionar Entregável</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 min-w-0">
                    <textarea
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="Escreva uma nota ou comentário..."
                      rows={4}
                      className="w-full px-4 py-3 border border-ai-border rounded-lg bg-ai-surface text-ai-text text-sm resize-none placeholder:text-ai-subtext"
                    />
                    <button
                      type="button"
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || addingComment}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A73E8] text-white text-sm font-medium hover:bg-[#1558B0] disabled:opacity-50"
                    >
                      {addingComment ? <Loader2 size={18} className="animate-spin" /> : <MessageSquarePlus size={18} />}
                      Adicionar Comentário
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 sm:min-w-[140px]">
                    {FILE_TYPE_CONFIG.map(({ type, label, icon: Icon, accept }) => (
                      <React.Fragment key={type}>
                        <input
                          ref={el => {
                            fileInputRefs.current[type] = el;
                          }}
                          type="file"
                          accept={accept}
                          className="hidden"
                          onChange={e => handleFileSelect(type, e)}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[type]?.click()}
                          disabled={uploadingType !== null}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-ai-border bg-ai-surface hover:bg-ai-surface2 text-ai-text text-sm disabled:opacity-50"
                        >
                          {uploadingType === type ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Icon size={18} className="text-ai-subtext" />
                          )}
                          {label}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              {/* Histórico de Evidências */}
              <div>
                <p className="text-sm font-semibold text-ai-text mb-3 uppercase tracking-wide">
                  Histórico de Evidências
                </p>
                {!hasEvidence ? (
                  <div className="py-10 rounded-lg border-2 border-dashed border-ai-border bg-ai-surface/20 flex flex-col items-center justify-center text-center">
                    <p className="text-sm text-ai-subtext">Nenhuma evidência anexada ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hasNotes && (
                      <div className="p-4 rounded-lg bg-ai-surface border border-ai-border">
                        <p className="text-xs text-ai-subtext uppercase tracking-wider mb-2">Comentários</p>
                        <p className="text-sm text-ai-text whitespace-pre-wrap">{evidence!.notes}</p>
                      </div>
                    )}
                    {(evidence?.files || []).map(f => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between gap-4 p-4 rounded-lg bg-ai-surface border border-ai-border"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileIcon size={20} className="text-ai-subtext shrink-0" />
                          <span className="text-sm text-ai-text truncate">{f.file_name}</span>
                          <span className="text-xs text-ai-subtext shrink-0">{f.file_type}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(f.storage_path, f.file_name)}
                            className="px-3 py-1.5 text-xs font-medium text-ai-accent hover:bg-ai-accent/10 rounded"
                          >
                            Baixar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(f.id, f.file_name)}
                            className="p-1.5 text-ai-subtext hover:text-red-500 rounded"
                            title="Remover"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer – Fechar (cinza) | Salvar Evidências (roxo) */}
        <div className="shrink-0 border-t border-ai-border px-6 py-4 flex justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-ai-border bg-ai-surface2/50 text-ai-subtext hover:bg-ai-surface2 text-sm font-medium"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || loading}
            className="px-5 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : null}
            Salvar Evidências
          </button>
        </div>
      </div>
    </div>
  );
};
