"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { loadCatalog, type Locale, type Messages, defaultLocale, locales } from "./lingui";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Messages;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: defaultLocale,
  setLocale: () => {},
  messages: {},
});

export function useLocale() {
  return useContext(LocaleContext);
}

interface LinguiProviderProps {
  children: ReactNode;
}

export function LinguiProvider({ children }: LinguiProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<Messages>({});
  const [isLoaded, setIsLoaded] = useState(false);

  const setLocale = useCallback((newLocale: Locale) => {
    loadCatalog(newLocale).then((newMessages) => {
      setMessages(newMessages);
      setLocaleState(newLocale);
      if (typeof window !== "undefined") {
        localStorage.setItem("locale", newLocale);
      }
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null;
    const initialLocale =
      saved && locales.includes(saved) ? saved : defaultLocale;
    loadCatalog(initialLocale).then((loadedMessages) => {
      setMessages(loadedMessages);
      setLocaleState(initialLocale);
      setIsLoaded(true);
    });
  }, []);

  if (!isLoaded) {
    return null;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, messages }}>
      {children}
    </LocaleContext.Provider>
  );
}
