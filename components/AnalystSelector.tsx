import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, User, Loader2, Check } from 'lucide-react';
import { User as UserType } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAnalyst } from '../contexts/AnalystContext';

const AnalystSelector: React.FC = () => {
  const { user } = useAuth();
  const { selectedAnalyst, setSelectedAnalyst } = useAnalyst();
  const [analysts, setAnalysts] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAnalysts();
    }
  }, [user]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadAnalysts = async () => {
    try {
      setIsLoading(true);

      // Buscar apenas usuários com qualification='analista' (não incluir administradores que não são analistas)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, name, email, qualification, role')
        .eq('qualification', 'analista')
        .order('name', { ascending: true });

      if (error) {
        console.error('[AnalystSelector] Error loading analysts:', error);
        return;
      }

      if (data) {
        // Mapear campos do banco para a interface User
        const mappedAnalysts: UserType[] = data.map((analyst: any) => ({
          id: analyst.id,
          name: analyst.name,
          email: analyst.email,
          role: analyst.role || 'client',
          qualification: analyst.qualification || 'visitante'
        }));
        
        setAnalysts(mappedAnalysts);
        
        // Se não houver analista selecionado e houver analistas, selecionar o primeiro
        if (!selectedAnalyst && mappedAnalysts.length > 0) {
          setSelectedAnalyst(mappedAnalysts[0]);
        }
        // Se o analista selecionado não estiver mais na lista, limpar seleção
        else if (selectedAnalyst && !mappedAnalysts.find(a => a.id === selectedAnalyst.id)) {
          setSelectedAnalyst(mappedAnalysts.length > 0 ? mappedAnalysts[0] : null);
        }
      }
    } catch (err: any) {
      console.error('[AnalystSelector] Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAnalyst = (analyst: UserType) => {
    setSelectedAnalyst(analyst);
    setIsOpen(false);
  };

  // Não mostrar se não for admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => analysts.length > 0 && setIsOpen(!isOpen)}
        disabled={analysts.length === 0}
        className={`flex items-center gap-2 px-3 py-1.5 bg-ai-surface2 border border-ai-border rounded-md text-sm text-ai-text transition-colors min-w-[200px] ${
          analysts.length > 0 ? 'hover:bg-ai-surface3 cursor-pointer' : 'opacity-60 cursor-not-allowed'
        }`}
        title={analysts.length > 0 ? "Selecionar analista" : "Nenhum analista cadastrado"}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-ai-subtext" />
            <span className="text-xs text-ai-subtext">Carregando...</span>
          </>
        ) : selectedAnalyst ? (
          <>
            <User className="w-4 h-4 text-ai-accent flex-shrink-0" />
            <span className="truncate text-left flex-1">{selectedAnalyst.name}</span>
            <ChevronDown className={`w-4 h-4 text-ai-subtext flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        ) : analysts.length === 0 ? (
          <>
            <User className="w-4 h-4 text-ai-subtext flex-shrink-0" />
            <span className="text-xs text-ai-subtext">Sem analistas</span>
          </>
        ) : (
          <>
            <User className="w-4 h-4 text-ai-subtext flex-shrink-0" />
            <span className="text-xs text-ai-subtext">Selecione um analista</span>
            <ChevronDown className={`w-4 h-4 text-ai-subtext flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-72 bg-white rounded-lg border border-ai-border shadow-lg z-50 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-ai-accent mx-auto" />
              <p className="text-xs text-ai-subtext mt-2">Carregando analistas...</p>
            </div>
          ) : analysts.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-ai-subtext">Nenhum analista cadastrado</p>
            </div>
          ) : (
            <div className="py-1">
              {analysts.map((analyst) => (
                <button
                  key={analyst.id}
                  onClick={() => handleSelectAnalyst(analyst)}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                    selectedAnalyst?.id === analyst.id
                      ? 'bg-ai-accent/10 text-ai-accent'
                      : 'text-ai-text hover:bg-ai-surface2'
                  }`}
                >
                  {selectedAnalyst?.id === analyst.id && (
                    <Check className="w-4 h-4 text-ai-accent flex-shrink-0" />
                  )}
                  <User className={`w-4 h-4 flex-shrink-0 ${selectedAnalyst?.id === analyst.id ? 'text-ai-accent' : 'text-ai-subtext'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{analyst.name}</p>
                    {analyst.email && (
                      <p className="text-xs text-ai-subtext truncate">{analyst.email}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalystSelector;
