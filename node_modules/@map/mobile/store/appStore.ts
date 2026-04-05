import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id:        string;
  role:      'user' | 'assistant' | 'system';
  content:   string;
  timestamp: number;
  isError?:  boolean;
  placeSuggestions?: Array<{
    id: string;
    name: string;
    neighborhood?: string;
    rating?: string;
    image?: string;
    isPartner?: boolean;
  }>;
}

export interface AISession {
  countrySlug: string;
  messages:    ChatMessage[];
  createdAt:   number;
}

interface AppState {
  // Onboarding
  onboardingComplete: boolean;

  // Destination (legacy — kept for onboarding compat)
  selectedCountry: string | null;

  // Active location
  activeCountry: string;
  activeCity:    string | null;

  // Localisation
  activeLanguage: string;
  userLocale:     string;

  // Session
  sessionId: string;

  // AI concierge
  aiSession: AISession | null;

  // Actions
  setCountry:            (country: string)          => void;
  setOnboardingComplete: (value: boolean)           => void;
  setLanguage:           (lang: string)             => void;
  setActiveCountry:      (slug: string)             => void;
  setActiveCity:         (slug: string | null)      => void;
  setUserLocale:         (locale: string)           => void;
  startAISession:        (countrySlug: string)      => void;
  addMessage:            (msg: ChatMessage)         => void;
  clearAISession:        ()                         => void;
  reset:                 ()                         => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useAppStore = create<AppState>((set) => ({
  onboardingComplete: false,
  selectedCountry:    null,
  activeCountry:      'morocco',
  activeCity:         null,
  activeLanguage:     'en',
  userLocale:         'en',
  sessionId:          Math.random().toString(36).slice(2, 10),
  aiSession:          null,

  setCountry:            (country) => set({ selectedCountry: country }),
  setOnboardingComplete: (value)   => set({ onboardingComplete: value }),
  setLanguage:           (lang)    => set({ activeLanguage: lang }),
  setActiveCountry:      (slug)    => set({ activeCountry: slug }),
  setActiveCity:         (slug)    => set({ activeCity: slug }),
  setUserLocale:         (locale)  => set({ userLocale: locale }),

  startAISession: (countrySlug) =>
    set({
      aiSession: {
        countrySlug,
        messages:  [],
        createdAt: Date.now(),
      },
    }),

  addMessage: (msg) =>
    set((state) => {
      if (!state.aiSession) return state;
      return {
        aiSession: {
          ...state.aiSession,
          messages: [...state.aiSession.messages, msg],
        },
      };
    }),

  clearAISession: () => set({ aiSession: null }),

  reset: () =>
    set({
      onboardingComplete: false,
      selectedCountry:    null,
      activeCountry:      'morocco',
      activeCity:         null,
      activeLanguage:     'en',
      userLocale:         'en',
      aiSession:          null,
    }),
}));
