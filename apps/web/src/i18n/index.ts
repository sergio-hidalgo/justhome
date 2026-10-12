import es from './es.json';
import en from './en.json';

export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

export type MessageKey = keyof typeof es;

const messages: Record<Locale, Record<MessageKey, string>> = { es, en };

export function t(locale: Locale, key: MessageKey): string {
  return messages[locale][key];
}
