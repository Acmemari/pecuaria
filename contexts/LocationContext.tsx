import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type Country = 'BR' | 'PY';

interface LocationContextType {
  country: Country;
  setCountry: (country: Country) => void;
  currency: string;
  currencySymbol: string;
  paraguayEnabled: boolean;
  refreshSettings: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [paraguayEnabled, setParaguayEnabled] = useState(false);
  const [country, setCountry] = useState<Country>(() => {
    const saved = localStorage.getItem('selectedCountry');
    return (saved === 'PY' ? 'PY' : 'BR') as Country;
  });

  const fetchParaguayEnabled = useCallback(async () => {
    if (!user) {
      setParaguayEnabled(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'paraguay_enabled')
        .single();
      if (!error && data?.value === true) {
        setParaguayEnabled(true);
      } else {
        setParaguayEnabled(false);
      }
    } catch {
      setParaguayEnabled(false);
    }
  }, [user]);

  useEffect(() => {
    fetchParaguayEnabled();
  }, [fetchParaguayEnabled]);

  // Force BR when Paraguay is disabled and user had PY selected
  useEffect(() => {
    if (!paraguayEnabled && country === 'PY') {
      setCountry('BR');
    }
  }, [paraguayEnabled, country]);

  useEffect(() => {
    localStorage.setItem('selectedCountry', country);
  }, [country]);

  const currency = country === 'PY' ? 'PYG' : 'BRL';
  const currencySymbol = country === 'PY' ? 'G$' : 'R$';

  return (
    <LocationContext.Provider
      value={{ country, setCountry, currency, currencySymbol, paraguayEnabled, refreshSettings: fetchParaguayEnabled }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
