import React, { useState, useEffect } from 'react';
import { Loader2, ExternalLink, Download, X } from 'lucide-react';
import type { ClientDocument } from '../../types';
import { getDocumentUrl } from '../../lib/clientDocuments';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  document: ClientDocument;
  onClose: () => void;
}

const DocumentPreview: React.FC<Props> = ({ document: doc, onClose }) => {
  const { user } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPdf = doc.fileType === 'pdf';
  const isRestricted = doc.confidentiality === 'restrito' || doc.confidentiality === 'confidencial';

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    getDocumentUrl(doc.storagePath, doc.confidentiality).then(({ url, error: err }) => {
      if (!mounted) return;
      if (err) {
        setError(err);
      } else {
        setPreviewUrl(url || null);
      }
      setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [doc.storagePath, doc.confidentiality]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ai-border">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-ai-text truncate">{doc.originalName}</h2>
            <p className="text-xs text-ai-subtext">
              Versão {doc.version}
              {isRestricted && ' — Documento confidencial'}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {previewUrl && !isRestricted && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-ai-subtext hover:text-ai-accent hover:bg-ai-surface rounded-lg"
                title="Abrir em nova aba"
              >
                <ExternalLink size={18} />
              </a>
            )}
            {previewUrl && (
              <a
                href={previewUrl}
                download={doc.originalName}
                className="p-2 text-ai-subtext hover:text-ai-accent hover:bg-ai-surface rounded-lg"
                title="Baixar"
              >
                <Download size={18} />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-ai-subtext hover:text-ai-text rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-ai-accent" size={32} />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-500 text-sm">
              {error}
            </div>
          ) : isPdf && previewUrl ? (
            <div className="relative h-full">
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title={doc.originalName}
              />
              {/* Watermark overlay for confidential docs */}
              {isRestricted && user && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="text-4xl font-bold text-black/[0.06] rotate-[-30deg] select-none whitespace-nowrap">
                    {user.name} — {new Date().toLocaleDateString('pt-BR')}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-ai-subtext">
              <p className="text-lg font-medium mb-2">Preview não disponível</p>
              <p className="text-sm mb-4">
                Arquivos {doc.fileType.toUpperCase()} não suportam preview no navegador.
              </p>
              {previewUrl && (
                <a
                  href={previewUrl}
                  download={doc.originalName}
                  className="flex items-center gap-2 px-4 py-2 bg-ai-accent text-white rounded-lg hover:bg-ai-accent/90 text-sm"
                >
                  <Download size={16} />
                  Baixar arquivo
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
