import type { Dictionary } from '../types.js';
import dictionaryEn from './dictionary.en.json';
import dictionaryEs from './dictionary.es.json';

const en = dictionaryEn as Dictionary;
const es = dictionaryEs as Dictionary;

export const SUPPORTED_LOCALES = ['en', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DICTIONARIES: Record<Locale, Dictionary> = {
  en,
  es,
};

export { en as dictionaryEn, es as dictionaryEs };
