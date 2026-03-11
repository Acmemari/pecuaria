import React, { useEffect, useState } from 'react';
import {
  Upload,
  Download,
  Eye,
  Edit3,
  Trash2,
  GitBranch,
  ArrowRightLeft,
  Shield,
  Share2,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import type { DocumentAuditAction } from '../../types';
import { getDocumentAuditLog } from '../../lib/clientDocuments';

interface Props {
  documentId: string;
}

const ACTION_CONFIG: Record<
  DocumentAuditAction,
  { icon: React.ElementType; label: string; color: string }
> = {
  upload: { icon: Upload, label: 'Upload', color: 'text-green-600' },
  download: { icon: Download, label: 'Download', color: 'text-blue-600' },
  view: { icon: Eye, label: 'Visualizou', color: 'text-gray-600' },
  update_metadata: { icon: Edit3, label: 'Editou metadados', color: 'text-yellow-600' },
  new_version: { icon: GitBranch, label: 'Nova versão', color: 'text-purple-600' },
  delete: { icon: Trash2, label: 'Excluiu', color: 'text-red-600' },
  restore: { icon: RotateCcw, label: 'Restaurou', color: 'text-green-600' },
  status_change: { icon: ArrowRightLeft, label: 'Alterou status', color: 'text-orange-600' },
  share: { icon: Share2, label: 'Compartilhou', color: 'text-blue-600' },
  confidentiality_change: { icon: Shield, label: 'Alterou confidencialidade', color: 'text-red-600' },
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHrs < 24) return `${diffHrs}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString('pt-BR');
}

function formatMetadata(action: DocumentAuditAction, metadata: Record<string, unknown>): string | null {
  if (action === 'status_change' && metadata.from && metadata.to) {
    return `${metadata.from} → ${metadata.to}`;
  }
  if (action === 'confidentiality_change' && metadata.from && metadata.to) {
    return `${metadata.from} → ${metadata.to}`;
  }
  if (action === 'new_version' && metadata.version) {
    return `Versão ${metadata.version}`;
  }
  return null;
}

const DocumentActivityTimeline: React.FC<Props> = ({ documentId }) => {
  const [entries, setEntries] = useState<
    Array<{ id: string; userId: string; action: DocumentAuditAction; metadata: Record<string, unknown>; createdAt: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    getDocumentAuditLog(documentId).then(({ entries: data }) => {
      if (mounted) {
        setEntries(data);
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [documentId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="animate-spin text-ai-accent" size={20} />
      </div>
    );
  }

  if (entries.length === 0) {
    return <p className="text-xs text-ai-subtext text-center py-4">Nenhuma atividade registrada.</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map(entry => {
        const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.view;
        const Icon = config.icon;
        const detail = formatMetadata(entry.action, entry.metadata);

        return (
          <div key={entry.id} className="flex items-start gap-3">
            <div className={`flex-shrink-0 mt-0.5 ${config.color}`}>
              <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-ai-text font-medium">{config.label}</p>
              {detail && <p className="text-xs text-ai-subtext">{detail}</p>}
            </div>
            <span className="text-xs text-ai-subtext whitespace-nowrap">
              {formatRelativeTime(entry.createdAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default DocumentActivityTimeline;
