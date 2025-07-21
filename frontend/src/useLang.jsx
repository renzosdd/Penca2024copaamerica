import { createContext, useContext, useEffect, useState } from 'react';
import strings from './strings';

const LangContext = createContext({
  lang: 'es',
  t: (k) => strings.es[k] || k,
  toggleLang: () => {}
});

export function LangProvider({ children }) {
  const [lang, setLang] = useState('es');

  useEffect(() => {
    const stored = localStorage.getItem('lang');
    if (stored === 'es' || stored === 'en') {
      setLang(stored);
    }
  }, []);

  const toggleLang = () => {
    const next = lang === 'es' ? 'en' : 'es';
    setLang(next);
    localStorage.setItem('lang', next);
  };

  const t = (key) => strings[lang][key] || key;

  return (
    <LangContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export default function useLang() {
  return useContext(LangContext);
}
