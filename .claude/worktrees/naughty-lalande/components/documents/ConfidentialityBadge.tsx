import React from 'react';
import { Shield, Lock, Eye, Globe } from 'lucide-react';
import type { ConfidentialityLevel } from '../../types';
import { CONFIDENTIALITY_LABELS, CONFIDENTIALITY_COLORS } from '../../lib/clientDocuments';

interface Props {
  level: ConfidentialityLevel;
  size?: 'sm' | 'md';
}

const ICONS: Record<ConfidentialityLevel, React.ElementType> = {
  publico: Globe,
  interno: Eye,
  confidencial: Shield,
  restrito: Lock,
};

const ConfidentialityBadge: React.FC<Props> = ({ level, size = 'sm' }) => {
  const Icon = ICONS[level];
  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${CONFIDENTIALITY_COLORS[level]}`}
    >
      <Icon size={iconSize} />
      {CONFIDENTIALITY_LABELS[level]}
    </span>
  );
};

export default ConfidentialityBadge;
