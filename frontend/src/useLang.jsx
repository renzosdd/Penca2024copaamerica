import { createContext, useContext, useEffect, useState } from 'react';
import strings from './strings';

const interpolate = (template, vars) => {
  if (!template || !vars) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
  });
};

const LangContext = createContext({
  lang: 'es',
  t: (k, vars) => interpolate(strings.es[k] || k, vars),
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

  const t = (key, vars) => {
    const template = strings[lang]?.[key] ?? key;
    return typeof template === 'string' ? interpolate(template, vars) : template;
  };

  return (
    <LangContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export default function useLang() {
  return useContext(LangContext);
}
