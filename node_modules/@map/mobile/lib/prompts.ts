import type { GroqMessage } from './groqClient';
import type { ConciergeConfig } from './countryLoader';

// ─── Build the system message for a given country concierge ──────────────────
export function buildSystemMessage(
  config: ConciergeConfig,
  detectedLangCode?: string,
  runtimeDataContext?: string,
): GroqMessage {
  const responseLanguage = detectedLangCode
    ? getLanguageNameFromCode(detectedLangCode)
    : 'English';

  const languageInstruction = detectedLangCode
    ? `\n\nLANGUAGE POLICY:\n- Start in English by default.\n- If user message/voice is clearly another language, switch to that language.\n- For this turn, respond in ${responseLanguage}.\n- Match the user's spoken dialect.\n- If Moroccan Arabic (Darija) is detected, respond in casual Darija.\n- If Standard Arabic is detected, respond in formal MSA.`
    : `\n\nLANGUAGE POLICY:\n- Start in English by default.\n- If user writes in French, Arabic, Spanish, or another language, switch immediately and keep the same language.`;

  const conciergePolicy = `\n\nCONCIERGE POLICY:\n- You are Sarah, MAP (MyAtlasPass) concierge.\n- Keep answers warm, concise, and practical.\n- Distinguish clearly between:\n  1) FLASH PROMOS: urgent, expiring offers (time-sensitive).\n  2) PARTNER OFFERS/SUGGESTIONS: regular partner recommendations.\n- Never invent places or promotions not present in provided JSON context.\n- If data for requested city/topic is missing, say so clearly and briefly.`;

  const runtimeContext = runtimeDataContext
    ? `\n\nRUNTIME JSON CONTEXT:\n${runtimeDataContext}`
    : '';

  return {
    role:    'system',
    content: `${config.system_context.en}${languageInstruction}${conciergePolicy}${runtimeContext}`,
  };
}

export function getLanguageNameFromCode(code: string): string {
  const normalized = (code ?? '').trim().toLowerCase().replace('_', '-');
  if (!normalized) return 'English';

  const map: Record<string, string> = {
    fr: 'French',
    fra: 'French',
    en: 'English',
    eng: 'English',
    ar: 'Standard Arabic (MSA)',
    ara: 'Standard Arabic (MSA)',
    'ar-MA': 'Moroccan Arabic (Darija)',
    'ar-ma': 'Moroccan Arabic (Darija)',
    ary: 'Moroccan Arabic (Darija)',
    es: 'Spanish',
    spa: 'Spanish',
    pt: 'Portuguese',
    por: 'Portuguese',
    it: 'Italian',
    ita: 'Italian',
    de: 'German',
    deu: 'German',
    ger: 'German',
    zh: 'Chinese',
    zho: 'Chinese',
    cmn: 'Chinese',
    ja: 'Japanese',
    jpn: 'Japanese',
  };

  return map[normalized] ?? map[normalized.split('-')[0]] ?? 'English';
}

// ─── Localised greeting for the active language ───────────────────────────────
export function getGreeting(config: ConciergeConfig, lang: string): string {
  const key = lang as keyof typeof config.greeting;
  return config.greeting[key] ?? config.greeting.en;
}

// ─── Localised suggested questions ────────────────────────────────────────────
export function getSuggestedQuestions(
  config: ConciergeConfig,
  lang:   string,
): string[] {
  const key = lang as keyof typeof config.suggested_questions;
  return config.suggested_questions[key] ?? config.suggested_questions.en;
}

// ─── Localised Sarah tagline ──────────────────────────────────────────────────
export function getTagline(config: ConciergeConfig, lang: string): string {
  switch (lang) {
    case 'fr': return config.persona.tagline_fr;
    case 'ar': return config.persona.tagline_ar;
    case 'es': return config.persona.tagline_es;
    default:   return config.persona.tagline_en;
  }
}

// ─── Build a full messages array from chat history ───────────────────────────
export function buildMessagesPayload(
  config:   ConciergeConfig,
  history:  Array<{ role: 'user' | 'assistant'; content: string }>,
  detectedLangCode?: string,
  runtimeDataContext?: string,
): GroqMessage[] {
  return [
    buildSystemMessage(config, detectedLangCode, runtimeDataContext),
    ...history.map(m => ({ role: m.role, content: m.content })),
  ];
}
