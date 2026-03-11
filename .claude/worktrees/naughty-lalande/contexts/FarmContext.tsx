import React from 'react';
import { Farm } from '../types';
import { useHierarchy } from './HierarchyContext';

interface FarmContextType {
  selectedFarm: Farm | null;
  setSelectedFarm: (farm: Farm | null) => void;
  clearFarm: () => void;
}

export const FarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

export const useFarm = (): FarmContextType => {
  const { selectedFarm, setSelectedFarm, clearFarm } = useHierarchy();
  return { selectedFarm, setSelectedFarm, clearFarm };
};
