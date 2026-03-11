import React from 'react';
import { User } from '../types';
import { useHierarchy } from './HierarchyContext';

interface AnalystContextType {
  selectedAnalyst: User | null;
  setSelectedAnalyst: (analyst: User | null) => void;
}

export const AnalystProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

export const useAnalyst = (): AnalystContextType => {
  const { selectedAnalyst, setSelectedAnalyst } = useHierarchy();
  return { selectedAnalyst, setSelectedAnalyst };
};
