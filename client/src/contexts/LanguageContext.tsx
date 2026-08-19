import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Language = "ar" | "en";

type LanguageContextValue = {
  language: Language;
  isArabic: boolean;
  direction: "rtl" | "ltr";
  toggleLanguage: () => void;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "ar";
    return window.localStorage.getItem("clinic-language") === "en" ? "en" : "ar";
  });

  const setLanguage = (next: Language) => setLanguageState(next);
  const toggleLanguage = () => setLanguageState(current => (current === "ar" ? "en" : "ar"));

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    window.localStorage.setItem("clinic-language", language);
  }, [language]);

  const value = useMemo(() => ({
    language,
    isArabic: language === "ar",
    direction: language === "ar" ? "rtl" as const : "ltr" as const,
    toggleLanguage,
    setLanguage,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
