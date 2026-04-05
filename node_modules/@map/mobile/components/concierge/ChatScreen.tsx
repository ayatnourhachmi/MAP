import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

// ─── Recording options: force .m4a/AAC on both platforms ─────────────────────
// HIGH_QUALITY preset defaults to .caf on iOS — ElevenLabs prefers .m4a
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension:        '.m4a',
    outputFormat:     Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder:     Audio.AndroidAudioEncoder.AAC,
    sampleRate:       44100,
    numberOfChannels: 1,
    bitRate:          128000,
  },
  ios: {
    extension:            '.m4a',
    outputFormat:         Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality:         Audio.IOSAudioQuality.HIGH,
    sampleRate:           44100,
    numberOfChannels:     1,
    bitRate:              128000,
    linearPCMBitDepth:    16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat:     false,
  },
  web: {
    mimeType:      'audio/webm',
    bitsPerSecond: 128000,
  },
};
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { COLORS } from '../../lib/theme';
import { router } from 'expo-router';
import { loadCountryConcierge, loadCountryPlaces, loadCountryCities, loadCountryFlashPromos, type FlashPromoEntry } from '../../lib/countryLoader';
import { buildMessagesPayload, getGreeting, getSuggestedQuestions, getTagline } from '../../lib/prompts';
import { sendGroqMessage, streamGroqMessage } from '../../lib/groqClient';
import {
  transcribeAudio,
  synthesizeSpeech,
  selectVoiceForLanguage,
  VOICE_DARIJA,
} from '../../lib/elevenLabsClient';
import { useAppStore, type ChatMessage } from '../../store/appStore';
import SarahAvatar from './SarahAvatar';
import TypingIndicator from './TypingIndicator';
import MessageBubble from './MessageBubble';
import ShowTranslation from './ShowTranslation';

// ─── Voice state machine ──────────────────────────────────────────────────────
type VoiceState = 'idle' | 'recording' | 'processing' | 'thinking' | 'speaking' | 'error';

type PlaceSuggestion = {
  id: string;
  name: string;
  neighborhood?: string;
  rating?: string;
  image?: string;
  isPartner?: boolean;
  categorySlug?: string;
  cityId?: string;
};

type GroundingContext = {
  prompt: string;
  suggestions: PlaceSuggestion[];
  runtimeDataContext: string;
};

const HOSPITALITY_SLUGS = new Set(['restaurants', 'hotels', 'accommodation', 'nightlife', 'spas']);
const HOSPITALITY_QUERY_HINTS = ['restaurant', 'food', 'eat', 'hotel', 'riad', 'spa', 'bar', 'nightlife', 'dinner', 'lunch'];
const RAW_CATEGORIES: any[] = require('../../assets/data/global/categories.json') as any[];

type CityLookup = {
  id: string;
  slug: string;
  names: string[];
};

function norm(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function buildCityLookups(raw: any[]): CityLookup[] {
  return raw
    .filter((c: any) => c?.id && c?.slug)
    .map((c: any) => {
      const names = [
        c.slug,
        c.name_en,
        c.name_fr,
        c.name_ar,
        c.name_es,
        c.slug === 'casablanca' ? 'casa' : '',
        c.slug === 'fes' ? 'fez' : '',
        c.slug === 'tanger' ? 'tangier' : '',
      ]
        .filter(Boolean)
        .map((x: string) => norm(x));

      return {
        id: c.id,
        slug: c.slug,
        names: Array.from(new Set(names)),
      };
    });
}

function detectRequestedCity(query: string, cities: CityLookup[]): CityLookup | null {
  const q = norm(query);
  for (const city of cities) {
    if (city.names.some((n) => n && q.includes(n))) {
      return city;
    }
  }
  return null;
}

function parseImages(raw: any): string[] {
  try {
    if (!raw) return [];
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return [];
  }
}

function normalizeFlashPromos(raw: FlashPromoEntry[]): FlashPromoEntry[] {
  const now = Date.now();
  return (raw ?? []).filter((p) => {
    if (!p || !p.city_id || !p.establishment_id || !p.title) return false;
    if (p.is_active === false) return false;
    if (p.deleted_at != null) return false;

    const startsAt = new Date(p.starts_at).getTime();
    const endsAt = new Date(p.ends_at).getTime();
    if (Number.isFinite(startsAt) && startsAt > now) return false;
    if (Number.isFinite(endsAt) && endsAt <= now) return false;

    if (
      typeof p.max_uses === 'number' &&
      typeof p.current_uses === 'number' &&
      p.max_uses > 0 &&
      p.current_uses >= p.max_uses
    ) {
      return false;
    }

    return true;
  });
}

function toRuntimePromo(p: FlashPromoEntry) {
  return {
    id: p.id,
    establishment_id: p.establishment_id,
    establishment_name: p.establishment_name ?? null,
    city_id: p.city_id,
    title: p.title,
    title_fr: p.title_fr ?? null,
    title_en: p.title_en ?? null,
    title_ar: p.title_ar ?? null,
    title_es: p.title_es ?? null,
    description: p.description ?? null,
    description_fr: p.description_fr ?? null,
    description_en: p.description_en ?? null,
    description_ar: p.description_ar ?? null,
    description_es: p.description_es ?? null,
    discount_value: p.discount_value,
    discount_type: p.discount_type,
    starts_at: p.starts_at,
    ends_at: p.ends_at,
    is_exclusive: !!p.is_exclusive,
    target_audience: p.target_audience ?? 'all',
  };
}

function normalizePlaces(raw: any[]): PlaceSuggestion[] {
  const categoryMap = new Map<string, string>(
    (RAW_CATEGORIES as any[]).map((c: any) => [c.id, c.slug]),
  );

  return raw
    .filter((p: any) => p?.deleted_at == null && p?.status !== 'deleted')
    .map((p: any) => {
      const images = parseImages(p.images).filter((u: any) => typeof u === 'string' && u.trim().length > 0);
      return {
        id: p.id,
        name: p.name_en ?? p.name ?? '',
        neighborhood: p.neighborhood ?? '',
        rating: p.rating ?? '0.00',
        image: images[0],
        isPartner: !!p.is_partner,
        categorySlug: categoryMap.get(p.category_id) ?? 'other',
        cityId: p.city_id ?? undefined,
      };
    })
    .filter((p) => !!p.image);
}

function buildGroundingContext(
  query: string,
  places: PlaceSuggestion[],
  cities: CityLookup[],
  flashPromos: FlashPromoEntry[],
): GroundingContext {
  const q = query.toLowerCase().trim();
  const requestedCity = detectRequestedCity(query, cities);
  const cityScopedPlaces = requestedCity
    ? places.filter((p) => p.cityId === requestedCity.id)
    : places;
  const partnerPlaces = cityScopedPlaces.filter((p) => p.isPartner);
  const cityFlashPromos = requestedCity
    ? flashPromos.filter((p) => p.city_id === requestedCity.id)
    : flashPromos;

  if (requestedCity && cityScopedPlaces.length === 0) {
    const runtimeDataContext = JSON.stringify({
      city: requestedCity.slug,
      partnerSuggestions: [],
      flashPromos: [],
    });
    return {
      prompt: `DATA RULES: Use MAP JSON places only. The user asked for ${requestedCity.slug}, but no MAP place data is available for this city. Reply briefly that MAP has no places in ${requestedCity.slug} yet. Do not invent places.`,
      suggestions: [],
      runtimeDataContext,
    };
  }

  const asksHospitality = HOSPITALITY_QUERY_HINTS.some((h) => q.includes(h));
  const tokens = q.split(/[^a-z0-9\u0600-\u06FF]+/i).filter(t => t.length > 2);

  const ranked = partnerPlaces
    .map((p) => {
      const hay = `${p.name} ${p.neighborhood ?? ''}`.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (hay.includes(t)) score += 3;
      }
      if (p.isPartner) score += 1;
      if (!asksHospitality && p.categorySlug && HOSPITALITY_SLUGS.has(p.categorySlug)) score -= 2;
      return { p, score };
    })
    .filter((x) => (tokens.length === 0 ? true : x.score > 0))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);

  const suggestions = ranked.slice(0, 4);
  const catalog = suggestions
    .map((p) => `- ${p.name} | area: ${p.neighborhood || 'n/a'} | rating: ${p.rating || 'n/a'} | category: ${p.categorySlug || 'n/a'}`)
    .join('\n');

  if (suggestions.length === 0) {
    const runtimeDataContext = JSON.stringify({
      city: requestedCity?.slug ?? null,
      partnerSuggestions: [],
      flashPromos: cityFlashPromos.map(toRuntimePromo),
    });
    return {
      prompt: requestedCity
        ? `DATA RULES: Use MAP JSON places only. No matching PARTNER places found in ${requestedCity.slug}. Reply briefly that MAP has no matching partner places in ${requestedCity.slug} right now. Do not invent place names.`
        : 'DATA RULES: Use MAP JSON places only. No matching PARTNER places found in MAP data. Reply briefly that no matching MAP partner places were found. Do not invent place names.',
      suggestions: [],
      runtimeDataContext,
    };
  }

  const runtimeDataContext = JSON.stringify({
    city: requestedCity?.slug ?? null,
    partnerSuggestions: suggestions.map((p) => ({
      id: p.id,
      name: p.name,
      neighborhood: p.neighborhood ?? null,
      rating: p.rating ?? null,
      category: p.categorySlug ?? null,
      isPartner: !!p.isPartner,
    })),
    flashPromos: cityFlashPromos.map(toRuntimePromo),
  });

  return {
    prompt: [
      'DATA RULES: Use only places from CANDIDATE PLACES below. Never invent place names.',
      requestedCity
        ? `User city context: ${requestedCity.slug}.`
        : 'If user asks for unsupported city/data, say no MAP data is available.',
      cityFlashPromos.length > 0
        ? 'Flash promos exist in JSON context. Mention urgent flash promos first, then partner suggestions.'
        : 'If no flash promos are in JSON context, do not invent them.',
      asksHospitality
        ? 'User asked hospitality content, so use candidates directly.'
        : 'Prioritize cultural/sightseeing style suggestions when possible. Avoid restaurants/hotels unless user asked for them.',
      'Keep answer concise (2-4 sentences).',
      'CANDIDATE PLACES:',
      catalog,
    ].join('\n'),
    suggestions,
    runtimeDataContext,
  };
}

// ─── Suggested question chip ──────────────────────────────────────────────────
function SuggestionChip({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor:   'rgba(212,175,55,0.12)',
        borderRadius:      20,
        borderWidth:       1,
        borderColor:       'rgba(212,175,55,0.4)',
        paddingHorizontal: 14,
        paddingVertical:   8,
        marginRight:       8,
        marginBottom:      8,
      }}
    >
      <Text style={{ fontSize: 13, color: COLORS.goldDark, fontWeight: '500' }}>{text}</Text>
    </TouchableOpacity>
  );
}

// ─── Chat / Voice toggle pill ─────────────────────────────────────────────────
function ModeToggle({ mode, onChange }: { mode: 'chat' | 'voice'; onChange: (m: 'chat' | 'voice') => void }) {
  const slideAnim = useRef(new Animated.Value(mode === 'chat' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: mode === 'chat' ? 0 : 1, useNativeDriver: false, tension: 120, friction: 8 }).start();
  }, [mode]);

  const pillLeft = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 46] });

  return (
    <View style={{ width: 92, height: 34, borderRadius: 17, backgroundColor: COLORS.grayLight, flexDirection: 'row', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
      <Animated.View style={{ position: 'absolute', left: pillLeft, width: 44, height: 30, borderRadius: 15, backgroundColor: COLORS.gold }} />
      <TouchableOpacity onPress={() => onChange('chat')} activeOpacity={0.8} style={{ width: 46, height: 34, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={mode === 'chat' ? COLORS.white : COLORS.grayText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onChange('voice')} activeOpacity={0.8} style={{ width: 46, height: 34, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke={mode === 'voice' ? COLORS.white : COLORS.grayText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke={mode === 'voice' ? COLORS.white : COLORS.grayText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </TouchableOpacity>
    </View>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function ChatHeader({ tagline, isTyping, mode, onModeChange, topInset }: {
  tagline: string; isTyping: boolean; mode: 'chat' | 'voice'; onModeChange: (m: 'chat' | 'voice') => void; topInset: number;
}) {
  return (
    <View style={{ paddingTop: topInset + 12, paddingBottom: 14, paddingHorizontal: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.grayBorder, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <SarahAvatar size={44} animate={isTyping} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.nearBlack }}>Sarah</Text>
        <Text style={{ fontSize: 12, color: isTyping ? COLORS.gold : COLORS.grayText, marginTop: 1 }}>{isTyping ? 'Typing…' : tagline}</Text>
      </View>
      <ModeToggle mode={mode} onChange={onModeChange} />
    </View>
  );
}

// ─── Send button ──────────────────────────────────────────────────────────────
function SendButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.8}
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: disabled ? COLORS.grayBorder : COLORS.gold, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={COLORS.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </TouchableOpacity>
  );
}


// ─── WordChip — animated word for realtime transcript ─────────────────────────
function WordChip({ word, isCurrent, isRTL }: { word: string; isCurrent: boolean; isRTL: boolean }) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateY  = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(translateY,  { toValue: 0, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.Text style={{
      opacity:          opacityAnim,
      transform:        [{ translateY }],
      fontSize:         17,
      fontWeight:       isCurrent ? '700' : '500',
      color:            isCurrent ? COLORS.gold : COLORS.nearBlack,
      writingDirection: isRTL ? 'rtl' : 'ltr',
    }}>
      {word}
    </Animated.Text>
  );
}

// ─── VoiceExperienceView — fullscreen immersive voice UI ──────────────────────
function VoiceExperienceView({
  voiceState, voiceError, voiceTranscript, realtimeWords,
  onMicTap, onModeToggle, bottomInset, isRTL,
  forceDarija, onToggleForceDarija,
  onOpenTranslation,
  voiceSuggestions,
  onOpenPlace,
}: {
  voiceState:      VoiceState;
  voiceError:      string;
  voiceTranscript: string;
  realtimeWords:   string[];
  onMicTap:        () => void;
  onModeToggle:    () => void;
  bottomInset:     number;
  isRTL:           boolean;
  forceDarija:     boolean;
  onToggleForceDarija: () => void;
  onOpenTranslation: () => void;
  voiceSuggestions: PlaceSuggestion[];
  onOpenPlace: (id: string) => void;
}) {
  // ── Animation refs ───────────────────────────────────────────────────────────
  const mountOpacity     = useRef(new Animated.Value(0)).current;
  const centerTransition = useRef(new Animated.Value(1)).current;
  const idleBreathRef    = useRef(new Animated.Value(1)).current;
  const ring1ScaleRef    = useRef(new Animated.Value(1)).current;
  const ring1OpacityRef  = useRef(new Animated.Value(0)).current;
  const ring2ScaleRef    = useRef(new Animated.Value(1)).current;
  const ring2OpacityRef  = useRef(new Animated.Value(0)).current;
  const ring3ScaleRef    = useRef(new Animated.Value(1)).current;
  const ring3OpacityRef  = useRef(new Animated.Value(0)).current;
  const spinnerRotateRef = useRef(new Animated.Value(0)).current;
  const dot1Ref          = useRef(new Animated.Value(0)).current;
  const dot2Ref          = useRef(new Animated.Value(0)).current;
  const dot3Ref          = useRef(new Animated.Value(0)).current;
  const bar1Ref          = useRef(new Animated.Value(10)).current;
  const bar2Ref          = useRef(new Animated.Value(10)).current;
  const bar3Ref          = useRef(new Animated.Value(10)).current;
  const bar4Ref          = useRef(new Animated.Value(10)).current;
  const bar5Ref          = useRef(new Animated.Value(10)).current;
  const speakingGlowRef  = useRef(new Animated.Value(1)).current;
  const statusOpacityRef = useRef(new Animated.Value(1)).current;
  const transcriptOpacity = useRef(new Animated.Value(0)).current;
  const errorScaleRef    = useRef(new Animated.Value(0.7)).current;
  const btnScaleRef      = useRef(new Animated.Value(1)).current;

  // ── Fade in on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(mountOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  // ── Animation lifecycle ───────────────────────────────────────────────────────
  useEffect(() => {
    // Stop all before switching
    [idleBreathRef, ring1ScaleRef, ring1OpacityRef, ring2ScaleRef, ring2OpacityRef,
     ring3ScaleRef, ring3OpacityRef, spinnerRotateRef, dot1Ref, dot2Ref, dot3Ref,
     bar1Ref, bar2Ref, bar3Ref, bar4Ref, bar5Ref, speakingGlowRef, statusOpacityRef,
    ].forEach(v => v.stopAnimation());

    // Center flash on state change
    centerTransition.setValue(0.6);
    Animated.timing(centerTransition, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    statusOpacityRef.setValue(1);

    const showTranscript = voiceState === 'recording' || voiceState === 'processing';
    Animated.timing(transcriptOpacity, { toValue: showTranscript ? 1 : 0, duration: 200, useNativeDriver: true }).start();

    if (voiceState === 'idle') {
      Animated.loop(Animated.sequence([
        Animated.timing(idleBreathRef, { toValue: 1.06, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(idleBreathRef, { toValue: 1.0,  duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    }

    if (voiceState === 'recording') {
      Animated.loop(Animated.sequence([
        Animated.timing(statusOpacityRef, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(statusOpacityRef, { toValue: 1.0,  duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();

      ([ [ring1ScaleRef, ring1OpacityRef, 0],
         [ring2ScaleRef, ring2OpacityRef, 400],
         [ring3ScaleRef, ring3OpacityRef, 800],
      ] as [Animated.Value, Animated.Value, number][]).forEach(([sv, ov, delay]) => {
        sv.setValue(1); ov.setValue(0.35);
        Animated.loop(Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(sv, { toValue: 2.2, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(ov, { toValue: 0,   duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          ]),
        ])).start();
      });
    }

    if (voiceState === 'processing') {
      spinnerRotateRef.setValue(0);
      Animated.loop(
        Animated.timing(spinnerRotateRef, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true })
      ).start();
    }

    if (voiceState === 'thinking') {
      ([
        [dot1Ref, 0], [dot2Ref, 180], [dot3Ref, 360],
      ] as [Animated.Value, number][]).forEach(([dv, delay]) => {
        dv.setValue(0);
        Animated.loop(Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dv, { toValue: -14, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(dv, { toValue: 0,   duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])).start();
      });
    }

    if (voiceState === 'speaking') {
      Animated.loop(Animated.sequence([
        Animated.timing(statusOpacityRef, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(statusOpacityRef, { toValue: 1.0,  duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();

      ([
        { v: bar1Ref, peak: 32, delay: 0   },
        { v: bar2Ref, peak: 48, delay: 120 },
        { v: bar3Ref, peak: 56, delay: 60  },
        { v: bar4Ref, peak: 48, delay: 180 },
        { v: bar5Ref, peak: 32, delay: 240 },
      ]).forEach(({ v, peak, delay }) => {
        v.setValue(10);
        Animated.loop(Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: peak, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(v, { toValue: 10,   duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ])).start();
      });

      Animated.loop(Animated.sequence([
        Animated.timing(speakingGlowRef, { toValue: 1.08, duration: 500, useNativeDriver: true }),
        Animated.timing(speakingGlowRef, { toValue: 1.0,  duration: 500, useNativeDriver: true }),
      ])).start();
    }

    if (voiceState === 'error') {
      errorScaleRef.setValue(0.7);
      Animated.spring(errorScaleRef, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }).start();
    }
  }, [voiceState]);

  const spinnerRotate = spinnerRotateRef.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const statusText: Record<VoiceState, string> = {
    idle:       'Tap to speak',
    recording:  'Listening...',
    processing: 'Transcribing...',
    thinking:   'Sarah is thinking...',
    speaking:   'Tap to stop',
    error:      voiceError || 'Something went wrong',
  };
  const statusColor: Record<VoiceState, string> = {
    idle:       '#AAAAAA',
    recording:  COLORS.gold,
    processing: '#AAAAAA',
    thinking:   '#AAAAAA',
    speaking:   COLORS.gold,
    error:      '#EF4444',
  };

  const handlePressIn  = () => Animated.spring(btnScaleRef, { toValue: 0.92, tension: 200, friction: 10, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(btnScaleRef, { toValue: 1.0,  tension: 200, friction: 10, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ flex: 1, backgroundColor: COLORS.white, opacity: mountOpacity }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingBottom: bottomInset + 24, paddingTop: 24 }}>

        {/* ── ZONE 1: Status label ─────────────────────────────────────────── */}
        <Animated.Text style={{
          fontSize: 16, fontWeight: '600', letterSpacing: 0.3,
          color: statusColor[voiceState], textAlign: 'center', marginTop: 16,
          opacity: statusOpacityRef,
        }}>
          {statusText[voiceState]}
        </Animated.Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onToggleForceDarija}
          style={{
            marginTop: 10,
            height: 34,
            borderRadius: 17,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderWidth: 1.5,
            borderColor: forceDarija ? COLORS.gold : COLORS.grayBorder,
            backgroundColor: forceDarija ? 'rgba(212,175,55,0.12)' : COLORS.white,
          }}
        >
          <View style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: forceDarija ? COLORS.gold : COLORS.grayBorder,
          }} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: forceDarija ? COLORS.goldDark : COLORS.grayText }}>
            Force Darija STT
          </Text>
        </TouchableOpacity>

        {/* ── ZONE 2: Center animation ─────────────────────────────────────── */}
        <Animated.View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center', opacity: centerTransition }}>

          {/* IDLE — breathing outer ring + gold mic */}
          {voiceState === 'idle' && (
            <>
              <Animated.View style={{
                position: 'absolute', width: 120, height: 120, borderRadius: 60,
                borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.25)',
                transform: [{ scale: idleBreathRef }],
              }} />
              <TouchableOpacity onPress={onMicTap} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={0.85}>
                <Animated.View style={{
                  width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.gold,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: COLORS.gold, shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.30, shadowRadius: 16, elevation: 8,
                  transform: [{ scale: btnScaleRef }],
                }}>
                  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill="white" />
                    <Path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </Animated.View>
              </TouchableOpacity>
            </>
          )}

          {/* RECORDING — 3 pulse rings + red stop */}
          {voiceState === 'recording' && (
            <>
              {([[ring1ScaleRef, ring1OpacityRef], [ring2ScaleRef, ring2OpacityRef], [ring3ScaleRef, ring3OpacityRef]] as [Animated.Value, Animated.Value][]).map(([sv, ov], i) => (
                <Animated.View key={i} style={{
                  position: 'absolute', width: 80, height: 80, borderRadius: 40,
                  backgroundColor: 'rgba(239,68,68,0.35)',
                  transform: [{ scale: sv }], opacity: ov,
                }} />
              ))}
              <TouchableOpacity onPress={onMicTap} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={0.85}>
                <Animated.View style={{
                  width: 80, height: 80, borderRadius: 40, backgroundColor: '#EF4444',
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: '#EF4444', shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.30, shadowRadius: 16, elevation: 8,
                  transform: [{ scale: btnScaleRef }],
                }}>
                  <Svg width={24} height={24} viewBox="0 0 24 24">
                    <Rect x="4" y="4" width="16" height="16" rx="3" fill="white" />
                  </Svg>
                </Animated.View>
              </TouchableOpacity>
            </>
          )}

          {/* PROCESSING — spinning arc */}
          {voiceState === 'processing' && (
            <>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#F2F2F2' }} />
              <Animated.View style={{ position: 'absolute', width: 80, height: 80, transform: [{ rotate: spinnerRotate }] }}>
                <Svg width={80} height={80} viewBox="0 0 80 80">
                  <Circle cx="40" cy="40" r="34" stroke="#EBEBEB" strokeWidth="4" fill="none" />
                  <Path d="M40 6 A34 34 0 1 1 6.5 53" stroke={COLORS.gold} strokeWidth="4" strokeLinecap="round" fill="none" />
                </Svg>
              </Animated.View>
            </>
          )}

          {/* THINKING — 3 bouncing gold dots */}
          {voiceState === 'thinking' && (
            <>
              <View style={{ position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(212,175,55,0.08)' }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {[dot1Ref, dot2Ref, dot3Ref].map((dv, i) => (
                  <Animated.View key={i} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.gold, transform: [{ translateY: dv }] }} />
                ))}
              </View>
            </>
          )}

          {/* SPEAKING — 5-bar wave + glow + tap-to-stop */}
          {voiceState === 'speaking' && (
            <TouchableOpacity onPress={onMicTap} activeOpacity={0.85} style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View style={{ position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(212,175,55,0.10)', transform: [{ scale: speakingGlowRef }] }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {[bar1Ref, bar2Ref, bar3Ref, bar4Ref, bar5Ref].map((bv, i) => (
                  <Animated.View key={i} style={{ width: 5, height: bv, borderRadius: 3, backgroundColor: COLORS.gold, marginHorizontal: 4 }} />
                ))}
              </View>
            </TouchableOpacity>
          )}

          {/* ERROR — X mark with spring entrance */}
          {voiceState === 'error' && (
            <Animated.View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: '#FCA5A5',
              alignItems: 'center', justifyContent: 'center',
              transform: [{ scale: errorScaleRef }],
            }}>
              <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
                <Path d="M10 10 L22 22" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
                <Path d="M22 10 L10 22" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
              </Svg>
            </Animated.View>
          )}

        </Animated.View>

        {/* ── ZONE 3: Realtime transcript ──────────────────────────────────── */}
        <Animated.View style={{
          width: '100%', minHeight: 80, paddingHorizontal: 32,
          alignItems: 'center', justifyContent: 'center',
          opacity: transcriptOpacity,
        }}>
          {realtimeWords.length > 0 ? (
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
              {realtimeWords.map((word, i) => (
                <WordChip key={`${i}-${word}`} word={word} isCurrent={i === realtimeWords.length - 1} isRTL={isRTL} />
              ))}
            </View>
          ) : voiceState === 'recording' ? (
            <Text style={{ fontSize: 15, color: '#CCCCCC', textAlign: 'center', fontStyle: 'italic' }}>
              Start speaking...
            </Text>
          ) : null}
        </Animated.View>

        {!!voiceSuggestions.length && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ width: '100%', paddingHorizontal: 24, paddingBottom: 8 }}
          >
            {voiceSuggestions.map((p) => (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.85}
                onPress={() => onOpenPlace(p.id)}
                style={{
                  width: 190,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: COLORS.grayBorder,
                  backgroundColor: COLORS.white,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginRight: 8,
                }}
              >
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: COLORS.nearBlack }}>
                  {p.name}
                </Text>
                {!!p.neighborhood && (
                  <Text numberOfLines={1} style={{ fontSize: 11, marginTop: 2, color: COLORS.grayText }}>
                    {p.neighborhood}
                  </Text>
                )}
                <Text style={{ fontSize: 11, marginTop: 6, color: COLORS.goldDark, fontWeight: '700' }}>
                  ★ {p.rating ?? 'N/A'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={{ width: '100%', paddingHorizontal: 24 }}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onOpenTranslation}
            style={{
              height: 48,
              borderRadius: 24,
              borderWidth: 1.8,
              borderColor: COLORS.gold,
              backgroundColor: COLORS.white,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.goldDark }}>
              Open Live Translation
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const insets = useSafeAreaInsets();

  const { activeCountry, activeLanguage, aiSession, startAISession, addMessage, clearAISession } = useAppStore();

  const config      = loadCountryConcierge(activeCountry);
  const countryPlaces = useMemo(
    () => normalizePlaces(loadCountryPlaces(activeCountry)),
    [activeCountry],
  );
  const countryCities = useMemo(
    () => buildCityLookups(loadCountryCities(activeCountry) as any[]),
    [activeCountry],
  );
  const countryFlashPromos = useMemo(
    () => normalizeFlashPromos(loadCountryFlashPromos(activeCountry)),
    [activeCountry],
  );
  const lang        = activeLanguage;
  const tagline     = getTagline(config, lang);
  const greeting    = getGreeting(config, lang);
  const suggestions = getSuggestedQuestions(config, lang);
  const isRTL       = lang === 'ar';

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [inputText, setInputText] = useState('');
  const [isTyping,  setIsTyping]  = useState(false);
  const [abortCtrl, setAbortCtrl] = useState<AbortController | null>(null);
  const [inputMode, setInputMode] = useState<'chat' | 'voice'>('chat');

  // ── Voice state ─────────────────────────────────────────────────────────────
  const [voiceState,      setVoiceState]      = useState<VoiceState>('idle');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError,      setVoiceError]      = useState('');
  const [realtimeWords,   setRealtimeWords]   = useState<string[]>([]);
  const [forceDarijaSTT,  setForceDarijaSTT]  = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [voiceSuggestions, setVoiceSuggestions] = useState<PlaceSuggestion[]>([]);

  const recordingRef   = useRef<Audio.Recording | null>(null);
  const soundRef       = useRef<Audio.Sound | null>(null);
  const voiceAbortRef  = useRef<AbortController | null>(null);

  // TTS sentence queue (parallel generation, ordered playback)
  const ttsPromisesRef = useRef<Promise<string>[]>([]);
  const nextPlayIdxRef = useRef(0);
  const isPlayingRef   = useRef(false);
  const groqDoneRef    = useRef(false);

  const listRef  = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // ── Init session ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!aiSession || aiSession.countrySlug !== activeCountry) {
      startAISession(activeCountry);
    }
  }, [activeCountry]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
      voiceAbortRef.current?.abort();
      ttsPromisesRef.current = [];
    };
  }, []);

  const messages   = aiSession?.messages ?? [];
  const showEmpty  = messages.length === 0;

  // ── Scroll to bottom ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // ── Voice error helper: show for 3s then reset ───────────────────────────────
  const showVoiceError = useCallback((msg: string) => {
    console.error('[Voice] error:', msg);
    setVoiceError(msg);
    setVoiceState('error');
    setTimeout(() => {
      setVoiceState('idle');
      setVoiceError('');
      setVoiceTranscript('');
    }, 3000);
  }, []);

  const getGrounding = useCallback((input: string) => {
    return buildGroundingContext(input, countryPlaces, countryCities, countryFlashPromos);
  }, [countryPlaces, countryCities, countryFlashPromos]);

  // ── Ordered sentence audio queue ──────────────────────────────────────────────
  // Called each time a new TTS promise is pushed, and after each sentence finishes.
  // Fires in parallel with TTS generation; plays sentences in strict order.
  const playFromQueue = useCallback(async () => {
    if (isPlayingRef.current) return;
    if (nextPlayIdxRef.current >= ttsPromisesRef.current.length) return;
    if (voiceAbortRef.current?.signal.aborted) return;

    isPlayingRef.current = true;

    let uri: string;
    try {
      uri = await ttsPromisesRef.current[nextPlayIdxRef.current++];
    } catch {
      // TTS failed for this sentence — skip it and try the next
      isPlayingRef.current = false;
      playFromQueue();
      return;
    }

    if (voiceAbortRef.current?.signal.aborted) { isPlayingRef.current = false; return; }

    setVoiceState('speaking');
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true },
      (status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          soundRef.current  = null;
          isPlayingRef.current = false;
          if (nextPlayIdxRef.current < ttsPromisesRef.current.length) {
            playFromQueue();                         // more sentences queued
          } else if (groqDoneRef.current) {
            setVoiceState('idle');                   // all done
            setVoiceTranscript('');
          }
          // else: Groq still streaming — next sentence push will call playFromQueue
        }
      },
    );
    soundRef.current = sound;
  }, []);

  // ── Stop playback ─────────────────────────────────────────────────────────────
  const stopPlayback = useCallback(async () => {
    ttsPromisesRef.current = [];
    nextPlayIdxRef.current = 0;
    isPlayingRef.current   = false;
    groqDoneRef.current    = false;
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setVoiceState('idle');
  }, []);

  // ── Chat: send text message ───────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const grounding = getGrounding(trimmed);

    setInputText('');
    inputRef.current?.blur();

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: trimmed, timestamp: Date.now() };
    addMessage(userMsg);
    setIsTyping(true);

    const ctrl = new AbortController();
    setAbortCtrl(ctrl);

    try {
      const history = [
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: trimmed },
      ];
      const payload = buildMessagesPayload(config, history, undefined, grounding.runtimeDataContext);
      payload.splice(1, 0, { role: 'system', content: grounding.prompt });

      const response = await sendGroqMessage(payload, ctrl.signal);
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        placeSuggestions: grounding.suggestions,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', content: "Sorry, I couldn't connect right now. Please check your connection and try again.", timestamp: Date.now(), isError: true });
    } finally {
      setIsTyping(false);
      setAbortCtrl(null);
    }
  }, [isTyping, messages, config, addMessage, getGrounding]);

  // ── Voice: streaming STT → Groq (SSE) → TTS per sentence → ordered playback ──
  // Sentences are TTS'd in parallel as Groq streams them; playback is in order.
  // First audio fires as soon as the first sentence (~15 words) is complete.
  const runVoicePipeline = useCallback(async (fileUri: string) => {
    const ctrl = new AbortController();
    voiceAbortRef.current = ctrl;

    // Reset queue state
    ttsPromisesRef.current = [];
    nextPlayIdxRef.current = 0;
    isPlayingRef.current   = false;
    groqDoneRef.current    = false;

    try {
      // 1. STT
      setVoiceState('processing');
      const transcription = await transcribeAudio(
        fileUri,
        ctrl.signal,
        forceDarijaSTT ? 'ar' : undefined,
      );
      const transcript = transcription.text;
      const detectedLangCode = transcription.detectedLangCode;
      const effectiveLangCode = forceDarijaSTT ? 'ar-MA' : detectedLangCode;
      const selectedVoiceId = forceDarijaSTT
        ? VOICE_DARIJA
        : selectVoiceForLanguage(detectedLangCode, transcript);
      const grounding = getGrounding(transcript);
      setVoiceSuggestions(grounding.suggestions);

      console.log(
        `[Voice] STT forced ar: ${forceDarijaSTT ? 'yes' : 'no'} | Detected: ${detectedLangCode} | Effective: ${effectiveLangCode} → Voice: ${selectedVoiceId === VOICE_DARIJA ? 'Darija' : 'Standard'}`,
      );

      setVoiceTranscript(transcript);
      if (!transcript.trim()) { showVoiceError("Couldn't hear you. Please try again."); return; }

      // Simulate realtime word reveal (Scribe v2 REST returns full text at once)
      // TODO: replace with WebSocket stream for true realtime
      // wss://api.elevenlabs.io/v1/speech-to-text/stream
      const words = transcript.split(' ').filter(w => w.length > 0);
      setRealtimeWords([]);
      words.forEach((word, index) => {
        setTimeout(() => { setRealtimeWords(prev => [...prev, word]); }, index * 80);
      });

      // Keep detected speech visible briefly after recording stops,
      // then transition to thinking (which fades transcript out).
      const revealMs = Math.min(1800, Math.max(900, words.length * 70));
      await new Promise(resolve => setTimeout(resolve, revealMs));
      if (ctrl.signal.aborted) return;

      addMessage({ id: Date.now().toString(), role: 'user', content: transcript, timestamp: Date.now() });

      // 2. Groq stream — fire TTS for each sentence as tokens arrive
      setVoiceState('thinking');
      let sentenceBuffer = '';

      const history = [
        ...(aiSession?.messages ?? []).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: transcript },
      ];

      const fullText = await streamGroqMessage(
        (() => {
          const payload = buildMessagesPayload(config, history, effectiveLangCode, grounding.runtimeDataContext);
          payload.splice(1, 0, { role: 'system', content: grounding.prompt });
          return payload;
        })(),
        (token) => {
          sentenceBuffer += token;
          // Extract all complete sentences: ≥15 chars ending in . ! ? … then whitespace
          let match = sentenceBuffer.match(/^([\s\S]{15,}?[.!?…]+)\s+/);
          while (match) {
            const sentence = match[1].trim();
            sentenceBuffer  = sentenceBuffer.slice(match[0].length);
            ttsPromisesRef.current.push(synthesizeSpeech(sentence, selectedVoiceId, ctrl.signal));
            playFromQueue();
            match = sentenceBuffer.match(/^([\s\S]{15,}?[.!?…]+)\s+/);
          }
        },
        ctrl.signal,
      );

      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullText,
        timestamp: Date.now(),
        placeSuggestions: grounding.suggestions,
      });

      // Flush any remaining text that didn't end with punctuation
      if (sentenceBuffer.trim()) {
        ttsPromisesRef.current.push(synthesizeSpeech(sentenceBuffer.trim(), selectedVoiceId, ctrl.signal));
      }

      groqDoneRef.current = true;
      playFromQueue(); // start player if nothing fired yet (e.g. very short response)

      if (ttsPromisesRef.current.length === 0) {
        setVoiceState('idle');
        setVoiceTranscript('');
      }
    } catch (err: any) {
      if (ctrl.signal.aborted || err?.name === 'AbortError') { return; }
      showVoiceError(err?.message ?? 'Something went wrong. Please try again.');
    }
  }, [aiSession, config, addMessage, showVoiceError, playFromQueue, forceDarijaSTT, getGrounding]);

  // ── Voice tap handler ─────────────────────────────────────────────────────────
  const handleVoiceTap = useCallback(async () => {
    console.log('[VoiceTap] state:', voiceState);
    // Speaking → interrupt
    if (voiceState === 'speaking') {
      voiceAbortRef.current?.abort();
      await stopPlayback();
      return;
    }

    // Error or processing/thinking → ignore tap
    if (voiceState === 'processing' || voiceState === 'thinking') return;
    if (voiceState === 'error') { setVoiceState('idle'); setVoiceError(''); setVoiceTranscript(''); return; }

    // Recording → stop + send
    if (voiceState === 'recording') {
      if (!recordingRef.current) { console.warn('[VoiceTap] no recording ref'); return; }
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        console.log('[VoiceTap] recording stopped, uri:', uri);
        recordingRef.current = null;
        if (!uri) { showVoiceError('Recording failed. Please try again.'); return; }
        await runVoicePipeline(uri);
      } catch (e) {
        console.error('[VoiceTap] stop recording error:', e);
        showVoiceError('Could not stop recording.');
      }
      return;
    }

    // Idle → start recording
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      console.log('[VoiceTap] mic permission granted:', granted);
      if (!granted) { showVoiceError('Microphone permission is required.'); return; }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      console.log('[VoiceTap] audio mode set, starting recording...');

      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      console.log('[VoiceTap] recording started');
      recordingRef.current = recording;
      setVoiceTranscript('');
      setVoiceState('recording');
    } catch (e) {
      console.error('[VoiceTap] start recording error:', e);
      showVoiceError('Could not access microphone.');
    }
  }, [voiceState, stopPlayback, runVoicePipeline, showVoiceError]);

  // ── Mode switch: stop everything ──────────────────────────────────────────────
  const handleModeChange = useCallback(async (m: 'chat' | 'voice') => {
    if (voiceState === 'recording') {
      await recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    if (voiceState === 'speaking') {
      voiceAbortRef.current?.abort();
      await stopPlayback();
    }
    setVoiceState('idle');
    setVoiceTranscript('');
    setVoiceError('');
    setRealtimeWords([]);
    setVoiceSuggestions([]);
    setInputMode(m);
  }, [voiceState, stopPlayback]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.white }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ChatHeader tagline={tagline} isTyping={isTyping} mode={inputMode} onModeChange={handleModeChange} topInset={insets.top} />

      {inputMode === 'voice' ? (
        <VoiceExperienceView
          voiceState={voiceState}
          voiceError={voiceError}
          voiceTranscript={voiceTranscript}
          realtimeWords={realtimeWords}
          onMicTap={handleVoiceTap}
          onModeToggle={() => handleModeChange('chat')}
          bottomInset={insets.bottom}
          isRTL={isRTL}
          forceDarija={forceDarijaSTT}
          onToggleForceDarija={() => {
            Haptics.selectionAsync();
            setForceDarijaSTT(v => !v);
          }}
          onOpenTranslation={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowTranslation(true);
          }}
          voiceSuggestions={voiceSuggestions}
          onOpenPlace={(id) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/place/${id}` as any);
          }}
        />
      ) : (
        <>
          {showEmpty ? (
            <EmptyState greeting={greeting} suggestions={suggestions} onSuggestionPress={sendMessage} />
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={m => m.id}
              renderItem={({ item }) => <MessageBubble message={item} isRTL={isRTL} />}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}
              ListFooterComponent={isTyping ? (
                <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}><TypingIndicator /></View>
              ) : null}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              keyboardShouldPersistTaps="handled"
            />
          )}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 10, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.grayBorder }}>
            <TextInput
              ref={inputRef}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask Sarah anything…"
              placeholderTextColor={COLORS.grayText}
              multiline
              maxLength={500}
              returnKeyType="default"
              style={{ flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: COLORS.grayLight, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15, color: COLORS.nearBlack, textAlignVertical: 'top', writingDirection: isRTL ? 'rtl' : 'ltr' }}
              onSubmitEditing={() => sendMessage(inputText)}
            />
            <SendButton onPress={() => sendMessage(inputText)} disabled={!inputText.trim() || isTyping} />
          </View>
        </>
      )}

      <ShowTranslation
        visible={showTranslation}
        onClose={() => setShowTranslation(false)}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Empty / greeting state ───────────────────────────────────────────────────
function EmptyState({ greeting, suggestions, onSuggestionPress }: {
  greeting: string; suggestions: string[]; onSuggestionPress: (text: string) => void;
}) {
  return (
    <ScrollView contentContainerStyle={{ flex: 1, paddingHorizontal: 20, paddingTop: 32, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 28 }}>
        <View style={{ marginRight: 10 }}><SarahAvatar size={44} /></View>
        <View style={{ flex: 1, backgroundColor: COLORS.grayLight, borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text style={{ fontSize: 15, lineHeight: 23, color: COLORS.nearBlack }}>{greeting}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.grayText, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
        Suggested questions
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {suggestions.map((q, i) => (
          <SuggestionChip key={i} text={q} onPress={() => onSuggestionPress(q)} />
        ))}
      </View>
    </ScrollView>
  );
}
