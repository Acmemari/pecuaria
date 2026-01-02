import React, { createContext, useContext, useState, useEffect } from 'react';

type Country = 'BR' | 'PY';

interface LocationContextType {
  country: Country;
  setCountry: (country: Country) => void;
  currency: string;
  currencySymbol: string;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [country, setCountry] = useState<Country>(() => {
    // Carregar do localStorage se existir
    const saved = localStorage.getItem('selectedCountry');
    return (saved === 'PY' ? 'PY' : 'BR') as Country;
  });

  useEffect(() => {
    // Salvar no localStorage quando mudar
    localStorage.setItem('selectedCountry', country);
  }, [country]);

  const currency = country === 'PY' ? 'PYG' : 'BRL';
  const currencySymbol = country === 'PY' ? 'G$' : 'R$';

  return (
    <LocationContext.Provider value={{ country, setCountry, currency, currencySymbol }}>
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

