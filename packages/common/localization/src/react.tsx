import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createTranslator, type Messages, type Translate } from './translator';

const TranslateContext = createContext<Translate>(createTranslator({}));

export interface LocalizationProviderProps {
  locale: string;
  /** Fetches the server's translations for a locale. */
  loadMessages: (locale: string) => Promise<Messages>;
  /** Called when the server translations cannot be loaded; the bundled fallback stays in use. */
  onError: (error: unknown) => void;
  children: ReactNode;
}

export function LocalizationProvider({
  locale,
  loadMessages,
  onError,
  children,
}: Readonly<LocalizationProviderProps>) {
  const [messages, setMessages] = useState<Messages>({});

  useEffect(() => {
    let active = true;
    loadMessages(locale)
      .then((loaded) => {
        if (active) {
          setMessages(loaded);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          onError(error);
        }
      });
    return () => {
      active = false;
    };
  }, [locale, loadMessages, onError]);

  const translate = useMemo(() => createTranslator(messages), [messages]);

  return <TranslateContext.Provider value={translate}>{children}</TranslateContext.Provider>;
}

/** Returns the translate function. Without a provider it serves the bundled fallback text. */
export function useTranslate(): Translate {
  return useContext(TranslateContext);
}
