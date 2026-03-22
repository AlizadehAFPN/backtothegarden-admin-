"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import es from "./es.json";
import en from "./en.json";

type Locale = "es" | "en";

const dictionaries: Record<Locale, Record<string, unknown>> = { es, en };

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof current === "string" ? current : path;
}

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "es",
  setLocale: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("es");

  useEffect(() => {
    const saved = localStorage.getItem("btg-admin-locale") as Locale | null;
    if (saved && (saved === "es" || saved === "en")) {
      setLocale(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("btg-admin-locale", locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key: string): string => {
    return getNestedValue(dictionaries[locale], key);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
