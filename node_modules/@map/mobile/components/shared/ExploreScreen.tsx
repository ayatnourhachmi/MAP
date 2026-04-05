// ─────────────────────────────────────────────────────────────────────────────
// MAP — ExploreScreen.tsx
// ─────────────────────────────────────────────────────────────────────────────

// 1. Imports ──────────────────────────────────────────────────────────────────
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Animated, Modal, FlatList, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { loadCountryCities, loadCountryFlashPromos, loadCountryPlaces } from '../../lib/countryLoader';
import { useAppStore } from '../../store/appStore';

import RAW_CATEGORIES from '../../assets/data/global/categories.json';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 2. Design tokens ────────────────────────────────────────────────────────────
const C = {
  gold:       '#D4AF37',
  goldLight:  '#F0D060',
  goldDark:   '#B8962E',
  white:      '#FFFFFF',
  offWhite:   '#FAF9F6',
  nearBlack:  '#1A1A1A',
  grayText:   '#888888',
  grayLight:  '#F2F2F2',
  grayBorder: '#E0E0E0',
};

const cardShadow = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
};
const goldShadow = {
  shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.30, shadowRadius: 14, elevation: 8,
};

// 3. Country cities ──────────────────────────────────────────────────────────
type City = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  lat?: number;
  lng?: number;
};

const FALLBACK_CITY: City = {
  id: 'casablanca',
  slug: 'casablanca',
  name_en: 'Casablanca',
  name_ar: 'الدار البيضاء',
  lat: 33.5731,
  lng: -7.5898,
};

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'meknes':      { lat: 33.8935,  lng: -5.5473  },
  'el-jadida':   { lat: 33.2549,  lng: -8.5079  },
  'agadir':      { lat: 30.4278,  lng: -9.5981  },
  'al-hoceima':  { lat: 35.2517,  lng: -3.9373  },
  'casablanca':  { lat: 33.5731,  lng: -7.5898  },
  'oujda':       { lat: 34.6814,  lng: -1.9086  },
  'larache':     { lat: 35.1932,  lng: -6.1548  },
  'essaouira':   { lat: 31.5125,  lng: -9.7749  },
  'guelmim':     { lat: 28.9870,  lng: -10.0574 },
  'marrakech':   { lat: 31.6295,  lng: -7.9811  },
  'asilah':      { lat: 35.4651,  lng: -6.0352  },
  'ouarzazate':  { lat: 30.9335,  lng: -6.9370  },
  'fes':         { lat: 34.0181,  lng: -5.0078  },
  'dakhla':      { lat: 23.7136,  lng: -15.9355 },
  'rabat':       { lat: 34.0209,  lng: -6.8416  },
  'mohammedia':  { lat: 33.6866,  lng: -7.3833  },
  'nador':       { lat: 35.1740,  lng: -2.9287  },
  'ifrane':      { lat: 33.5228,  lng: -5.1068  },
  'chefchaouen': { lat: 35.1714,  lng: -5.2690  },
  'tanger':      { lat: 35.7595,  lng: -5.8340  },
  'errachidia':  { lat: 31.9314,  lng: -4.4247  },
  'laayoune':    { lat: 27.1536,  lng: -13.2033 },
  'tetouan':     { lat: 35.5785,  lng: -5.3684  },
  'new-york':    { lat: 40.7128,  lng: -74.0060 },
  'los-angeles': { lat: 34.0522,  lng: -118.2437 },
  'miami':       { lat: 25.7617,  lng: -80.1918 },
  'las-vegas':   { lat: 36.1699,  lng: -115.1398 },
  'chicago':     { lat: 41.8781,  lng: -87.6298 },
  'san-francisco': { lat: 37.7749, lng: -122.4194 },
  'new-orleans': { lat: 29.9511,  lng: -90.0715 },
  'houston':     { lat: 29.7604,  lng: -95.3698 },
  'seattle':     { lat: 47.6062,  lng: -122.3321 },
  'boston':      { lat: 42.3601,  lng: -71.0589 },
};

function normaliseCities(raw: any[]): City[] {
  return raw
    .filter((c: any) => c.is_active !== false)
    .map((c: any) => ({
      id: c.id ?? c.slug,
      slug: c.slug,
      name_en: c.name_en,
      name_ar: c.name_ar,
      lat: typeof c.lat === 'number' ? c.lat : CITY_COORDS[c.slug]?.lat,
      lng: typeof c.lng === 'number' ? c.lng : CITY_COORDS[c.slug]?.lng,
    }))
    .sort((a, b) => a.name_en.localeCompare(b.name_en));
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestCity(cities: City[], lat: number, lng: number): City | null {
  let best: City | null = null;
  let bestDist = Infinity;
  for (const c of cities) {
    const coords = CITY_COORDS[c.slug] ?? (typeof c.lat === 'number' && typeof c.lng === 'number'
      ? { lat: c.lat, lng: c.lng }
      : null);
    if (!coords) continue;
    const d = haversineKm(lat, lng, coords.lat, coords.lng);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
}

// 4. Place type + normaliser ──────────────────────────────────────────────────
type Place = {
  id: string;
  name: string;
  category_id: string;
  category_slug: string;
  city_id: string;
  neighborhood: string;
  rating: string;
  price_level: 'low' | 'medium' | 'high' | 'luxury';
  is_partner: boolean;
  images: string[];
};

type FlashPromo = {
  id: string;
  establishment_id: string;
  establishment_name?: string;
  city_id: string;
  title: string;
  title_en?: string;
  title_fr?: string;
  title_ar?: string;
  title_es?: string;
  description?: string;
  discount_value: number;
  discount_type: 'percentage' | 'fixed';
  image?: string;
  starts_at: string;
  ends_at: string;
  is_exclusive: boolean;
  max_uses?: number;
  current_uses?: number;
  is_active?: boolean;
  deleted_at?: string | null;
};

// category_id → slug — derived from categories.json at module load
const CAT_ID_TO_SLUG: Record<string, string> = Object.fromEntries(
  (RAW_CATEGORIES as any[]).map(c => [c.id, c.slug])
);

function normalisePlaces(raw: any[]): Place[] {
  return raw
    .filter(p => p.deleted_at == null && p.status !== 'deleted')
    .map(p => {
      // images is stored as a JSON string in the file
      let imgs: string[] = [];
      try { imgs = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images ?? []); }
      catch { imgs = []; }

      const cleanImgs = (imgs ?? []).filter((u: any) => typeof u === 'string' && u.trim().length > 0);

      return {
        id:            p.id,
        name:          p.name_en || p.name,
        category_id:   p.category_id,
        category_slug: CAT_ID_TO_SLUG[p.category_id] ?? 'other',
        city_id:       p.city_id,
        neighborhood:  p.neighborhood ?? '',
        rating:        p.rating ?? '0.00',
        price_level:   p.price_level ?? 'medium',
        is_partner:    p.is_partner ?? false,
        images:        cleanImgs,
      };
    })
    .filter((p) => p.images.length > 0);
}

function normaliseFlashPromos(raw: any[]): FlashPromo[] {
  const now = Date.now();
  return (raw as FlashPromo[])
    .filter((p) => {
      if (!p || !p.city_id || !p.establishment_id || !p.title) return false;
      if (p.is_active === false || p.deleted_at != null) return false;

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
    })
    .sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime());
}

// 5. Plans data ───────────────────────────────────────────────────────────────
// TODO: replace with usePassPlans(countryId) hook
type Plan = {
  id: string; name: string; data: number; days: number; price: number;
  description: string; features: string[];
  isMostChosen: boolean; isPremium: boolean;
  gradientColors: string[];
};

const PLANS: Plan[] = [
  {
    id: 'starter', name: 'Starter', data: 10, days: 7, price: 9,
    description: 'Perfect for short trips and weekend getaways.',
    features: ['5G/4G network', 'Instant QR code'],
    isMostChosen: false, isPremium: false,
    gradientColors: ['#FFFFFF', '#FAF9F6'],
  },
  {
    id: 'explorer', name: 'Explorer', data: 25, days: 14, price: 19,
    description: 'Our most popular plan with AI travel planner.',
    features: ['5G/4G network', 'Explorer Pass included', 'AI Planner'],
    isMostChosen: true, isPremium: false,
    gradientColors: ['#D4AF37', '#B8962E', '#96761F'],
  },
  {
    id: 'premium', name: 'Premium', data: 50, days: 30, price: 35,
    description: 'Everything you need for the full MAP experience.',
    features: ['5G/4G network', 'Premium Pass included', 'Souk Mode + Flash Deals'],
    isMostChosen: false, isPremium: true,
    gradientColors: ['#1A1A1A', '#2C2C2C', '#1A1A1A'],
  },
];

// 6. Categories — loaded from assets/data/categories.json ────────────────────
type Category = { id: string; name_en: string; slug: string; icon: string };

// Icons are not stored in the DB yet — map by slug until the backend adds them
const SLUG_TO_ICON: Record<string, string> = {
  'restaurants':   'restaurant',
  'nightlife':     'moon',
  'spas':          'spa',
  'hotels':        'hotel',
  'accommodation': 'bed',
  'shopping':      'bag',
  'car-rental':    'car',
  'immobilier':    'building',
};

const CATEGORIES: Category[] = [
  { id: 'all', name_en: 'All', slug: 'all', icon: 'grid' },
  ...(RAW_CATEGORIES as any[])
    .filter(c => c.is_active && c.show_in_home)
    .sort((a, b) => a.display_order - b.display_order)
    .map(c => ({
      id:      c.id,
      name_en: c.name_en,
      slug:    c.slug,
      icon:    SLUG_TO_ICON[c.slug] ?? 'grid',
    })),
];

// 7. SVG icon helper ──────────────────────────────────────────────────────────
function CategoryIcon({ slug, color }: { slug: string; color: string }) {
  const s = { stroke: color, strokeWidth: 1.5, fill: 'none' as const };
  switch (slug) {
    case 'grid':
      return <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke={color} strokeWidth={1.5} />
        <Rect x="9.5" y="1" width="5.5" height="5.5" rx="1" stroke={color} strokeWidth={1.5} />
        <Rect x="1" y="9.5" width="5.5" height="5.5" rx="1" stroke={color} strokeWidth={1.5} />
        <Rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" stroke={color} strokeWidth={1.5} />
      </Svg>;
    case 'restaurant':
      return <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Line x1="5" y1="1" x2="5" y2="15" {...s} strokeLinecap="round" />
        <Path d="M3 1v5a2 2 0 004 0V1" {...s} strokeLinecap="round" />
        <Line x1="11" y1="1" x2="11" y2="15" {...s} strokeLinecap="round" />
        <Path d="M9 1c0 2.5 4 3.5 4 6H9" {...s} strokeLinejoin="round" />
      </Svg>;
    case 'moon':
      return <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Path d="M13 10A6 6 0 016 3a6 6 0 000 10 6 6 0 007-3z" {...s} strokeLinejoin="round" />
      </Svg>;
    case 'spa':
      return <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Path d="M8 14c0 0-6-4-6-8a6 6 0 0112 0c0 4-6 8-6 8z" {...s} strokeLinejoin="round" />
        <Path d="M8 6v4M6 8h4" {...s} strokeLinecap="round" />
      </Svg>;
    case 'hotel':
      return <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Rect x="1" y="2" width="14" height="12" rx="1" {...s} />
        <Path d="M5 14V9h6v5M6 6h4M8 4v4" {...s} strokeLinecap="round" />
      </Svg>;
    case 'bed':
      return <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Path d="M1 11V7a1 1 0 011-1h12a1 1 0 011 1v4M1 11h14M1 13v-2M15 13v-2M1 6V4a1 1 0 011-1h1v3" {...s} strokeLinecap="round" />
        <Rect x="5" y="4" width="6" height="3" rx="1" {...s} />
      </Svg>;
    case 'bag':
      return <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Path d="M2 5h12l-1.5 9H3.5L2 5z" {...s} strokeLinejoin="round" />
        <Path d="M5 5V4a3 3 0 016 0v1" {...s} strokeLinecap="round" />
      </Svg>;
    case 'car':
      return <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Path d="M1 9l1.5-4h11L15 9v3H1V9z" {...s} strokeLinejoin="round" />
        <Circle cx="4" cy="12" r="1.5" {...s} />
        <Circle cx="12" cy="12" r="1.5" {...s} />
        <Line x1="1" y1="9" x2="15" y2="9" {...s} />
      </Svg>;
    case 'building':
      return <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Rect x="2" y="2" width="12" height="13" rx="1" {...s} />
        <Rect x="5" y="5" width="2" height="2" {...s} />
        <Rect x="9" y="5" width="2" height="2" {...s} />
        <Rect x="5" y="9" width="2" height="2" {...s} />
        <Rect x="9" y="9" width="2" height="2" {...s} />
        <Path d="M6 15v-4h4v4" {...s} strokeLinecap="round" />
      </Svg>;
    default:
      return <Svg width={16} height={16} viewBox="0 0 16 16" />;
  }
}

// ── Star SVG (reused) ──────────────────────────────────────────────────────
function StarIcon({ size = 12 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={C.gold} stroke={C.gold} strokeWidth={1} />
    </Svg>
  );
}

// 8. CategoryPill — extracted so useRef is not inside .map() ──────────────────
function CategoryPill({
  cat, isActive, onPress,
}: { cat: Category; isActive: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    onPress();
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.95, tension: 200, friction: 8, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1,    tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: isActive ? C.gold : C.grayLight,
          borderRadius: 50, paddingHorizontal: 18, paddingVertical: 10, marginEnd: 10,
        }}
      >
        <CategoryIcon slug={cat.icon} color={isActive ? C.white : C.grayText} />
        <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? C.white : C.grayText }}>
          {cat.name_en}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// 9. PlaceCard ─────────────────────────────────────────────────────────────────
function PlaceCard({ place }: { place: Place }) {
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const [saved, setSaved] = useState(false);

  const priceLabel    = place.price_level === 'low' ? '€' : place.price_level === 'medium' ? '€€' : place.price_level === 'high' ? '€€€' : '€€€€';
  const categoryLabel = CATEGORIES.find(c => c.slug === place.category_slug)?.name_en ?? place.category_slug;
  const imageUri      = place.images[0];
  const extraImages   = place.images.length - 1;

  const onPressIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, tension: 200, friction: 10, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1,    tension: 200, friction: 10, useNativeDriver: true }).start();

  const toggleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaved(v => !v);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.35, tension: 220, friction: 6,  useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1,    tension: 220, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const badge = place.is_partner ? 'Featured' : null;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], ...cardShadow, borderRadius: 22, marginEnd: 16 }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={onPressIn} onPressOut={onPressOut}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/place/${place.id}` as any); }}
        style={{ width: 240, borderRadius: 22, overflow: 'hidden', backgroundColor: C.white }}
      >
        {/* ── Image ── */}
        <View style={{ height: 180 }}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <LinearGradient colors={['#2C3E50', '#1A252F']} style={{ width: '100%', height: '100%' }} />
          )}

          {/* Gradient overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.18)', 'transparent', 'rgba(0,0,0,0.62)']}
            style={{ position: 'absolute', inset: 0 } as any}
          />

          {/* Top row */}
          <View style={{ position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {badge ? (
              <View style={{
                backgroundColor: C.gold,
                borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
              }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: C.white, letterSpacing: 0.4 }}>{badge}</Text>
              </View>
            ) : <View />}

            {/* Save button */}
            <TouchableOpacity activeOpacity={0.85} onPress={toggleSave}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: saved ? C.gold : 'rgba(255,255,255,0.92)',
                justifyContent: 'center', alignItems: 'center',
                shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.18, shadowRadius: 6, elevation: 4,
              }}>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Svg width={16} height={16} viewBox="0 0 24 24">
                  <Path d="M12 21C12 21 3 14 3 8a5 5 0 019-3 5 5 0 019 3c0 6-9 13-9 13z"
                    stroke={saved ? C.white : C.gold}
                    strokeWidth={2} fill={saved ? C.white : 'none'} strokeLinejoin="round" />
                </Svg>
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Bottom row — rating + price */}
          <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.52)', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 }}>
              <StarIcon size={11} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.white }}>{place.rating}</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {extraImages > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Svg width={11} height={11} viewBox="0 0 20 20">
                    <Rect x="2" y="5" width="16" height="12" rx="2" stroke="rgba(255,255,255,0.9)" strokeWidth={1.5} fill="none" />
                    <Circle cx="7" cy="10" r="2" fill="rgba(255,255,255,0.9)" />
                    <Path d="M2 14l4-4 4 4 3-3 5 5" stroke="rgba(255,255,255,0.9)" strokeWidth={1.5} fill="none" strokeLinejoin="round" />
                  </Svg>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>+{extraImages}</Text>
                </View>
              )}
              <View style={{ backgroundColor: 'rgba(0,0,0,0.52)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.goldLight }}>{priceLabel}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Info ── */}
        <View style={{ padding: 14, gap: 8 }}>
          {/* Name */}
          <Text style={{ fontSize: 15, fontWeight: '800', color: C.nearBlack, letterSpacing: -0.3 }} numberOfLines={1}>
            {place.name}
          </Text>

          {/* Category + neighborhood */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{
              backgroundColor: 'rgba(212,175,55,0.10)', borderRadius: 7,
              paddingHorizontal: 8, paddingVertical: 3,
              borderWidth: 1, borderColor: 'rgba(212,175,55,0.22)',
            }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: C.goldDark, letterSpacing: 0.2 }}>{categoryLabel}</Text>
            </View>

            {place.neighborhood ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Svg width={10} height={10} viewBox="0 0 16 16">
                  <Path d="M8 1C5.24 1 3 3.24 3 6c0 3.94 5 9 5 9s5-5.06 5-9c0-2.76-2.24-5-5-5z" fill={C.grayText} />
                  <Circle cx="8" cy="6" r="1.8" fill={C.white} />
                </Svg>
                <Text style={{ fontSize: 11, color: C.grayText, flex: 1 }} numberOfLines={1}>{place.neighborhood}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// 10. ListPlaceCard ────────────────────────────────────────────────────────────
function ListPlaceCard({ place }: { place: Place }) {
  const scaleAnim    = useRef(new Animated.Value(1)).current;
  const priceLabel   = place.price_level === 'low' ? '$' : place.price_level === 'luxury' ? '$$$$' : place.price_level === 'high' ? '$$$' : '$$';
  const categoryLabel = CATEGORIES.find(c => c.slug === place.category_slug)?.name_en ?? place.category_slug;

  const onPressIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, tension: 200, friction: 10, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1,    tension: 200, friction: 10, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], ...cardShadow, borderRadius: 16 }}>
      <TouchableOpacity
        activeOpacity={0.85} onPressIn={onPressIn} onPressOut={onPressOut}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/place/${place.id}` as any); }}
        style={{ flexDirection: 'row', backgroundColor: C.white, borderRadius: 16, overflow: 'hidden', height: 100, borderWidth: 1, borderColor: C.grayLight }}
      >
        {place.images[0] ? (
          <Image source={{ uri: place.images[0] }} style={{ width: 100, height: 100 }} contentFit="cover" />
        ) : (
          <LinearGradient colors={['#2980B9', '#1A5276']} style={{ width: 100, height: 100 }} />
        )}
        <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.nearBlack }} numberOfLines={1}>{place.name}</Text>
          <Text style={{ fontSize: 12, color: C.grayText }} numberOfLines={1}>{categoryLabel} · {place.neighborhood}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <StarIcon size={12} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.nearBlack, marginStart: 4 }}>{place.rating}</Text>
            <View style={{ flex: 1 }} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.gold }}>{priceLabel}</Text>
            {place.is_partner && (
              <View style={{ marginStart: 8, backgroundColor: 'rgba(212,175,55,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: C.gold }}>Partner</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function FlashPromoCard({ promo, placeById }: { promo: FlashPromo; placeById: Map<string, Place> }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const place = placeById.get(promo.establishment_id);
  const imageUri = promo.image ?? place?.images?.[0];
  const name = promo.establishment_name ?? place?.name ?? 'MAP Partner';
  const endsLabel = new Date(promo.ends_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const discountLabel = promo.discount_type === 'percentage'
    ? `${promo.discount_value}% OFF`
    : `${promo.discount_value} MAD OFF`;

  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, tension: 200, friction: 10, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], ...goldShadow, borderRadius: 20, marginEnd: 14 }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push(`/(main)/places?promo=${promo.id}` as any);
        }}
        style={{ width: 280, borderRadius: 20, overflow: 'hidden', backgroundColor: C.white }}
      >
        <View style={{ height: 140 }}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <LinearGradient colors={[C.goldDark, C.nearBlack]} style={{ width: '100%', height: '100%' }} />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
            style={{ position: 'absolute', inset: 0 } as any}
          />

          <View style={{ position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(212,175,55,0.95)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: C.white, letterSpacing: 0.4 }}>FLASH PROMO</Text>
            </View>
            {!!promo.is_exclusive && (
              <View style={{ backgroundColor: 'rgba(26,26,26,0.85)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: C.goldLight }}>EXCLUSIVE</Text>
              </View>
            )}
          </View>

          <View style={{ position: 'absolute', bottom: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: C.goldLight }}>{discountLabel}</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: C.nearBlack }}>Ends {endsLabel}</Text>
            </View>
          </View>
        </View>

        <View style={{ padding: 12 }}>
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '800', color: C.nearBlack }}>{promo.title_en ?? promo.title}</Text>
          <Text numberOfLines={1} style={{ fontSize: 12, color: C.grayText, marginTop: 3 }}>{name}</Text>
          {!!promo.description && (
            <Text numberOfLines={2} style={{ fontSize: 12, color: '#555', marginTop: 8 }}>{promo.description}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// 11. PlanCard — premium carousel card ────────────────────────────────────────
const CARD_WIDTH  = SCREEN_WIDTH * 0.72;
const CARD_GAP    = 16;
const SIDE_PAD    = (SCREEN_WIDTH - CARD_WIDTH) / 2;

function PlanCard({ plan, isActive }: { plan: Plan; isActive: boolean }) {
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.93)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue:  isActive ? 1 : 0.93,
      tension:  100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [isActive]);

  const isExplorer = plan.isMostChosen;
  const isPremium  = plan.isPremium;
  const isStarter  = !isExplorer && !isPremium;

  // Per-plan colour tokens
  const nameColor    = isStarter ? '#888888'                : isExplorer ? 'rgba(255,255,255,0.8)' : C.gold;
  const priceColor   = isStarter ? C.nearBlack              : isExplorer ? C.white                 : C.gold;
  const metaColor    = isStarter ? C.grayText               : isExplorer ? 'rgba(255,255,255,0.65)': 'rgba(212,175,55,0.7)';
  const descColor    = isStarter ? '#888888'                : isExplorer ? 'rgba(255,255,255,0.75)': 'rgba(255,255,255,0.6)';
  const dividerColor = isStarter ? C.grayLight              : isExplorer ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)';
  const featLabel    = isStarter ? '#888888'                : isExplorer ? 'rgba(255,255,255,0.6)' : 'rgba(212,175,55,0.7)';
  const featColor    = isStarter ? '#555555'                : isExplorer ? 'rgba(255,255,255,0.88)': 'rgba(255,255,255,0.82)';
  const checkFill    = isStarter ? 'rgba(212,175,55,0.12)'  : isExplorer ? 'rgba(255,255,255,0.2)' : 'rgba(212,175,55,0.2)';
  const checkStroke  = isStarter ? C.gold                   : isExplorer ? C.white                 : C.gold;

  const activeShadow = {
    shadowColor:   isPremium ? '#1A1A1A' : C.gold,
    shadowOffset:  { width: 0, height: 16 },
    shadowOpacity: isPremium ? 0.4 : 0.35,
    shadowRadius:  32,
    elevation:     16,
  };
  const inactiveShadow = {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  };

  return (
    <Animated.View style={{
      transform: [{ scale: scaleAnim }],
      width: CARD_WIDTH,
      marginRight: CARD_GAP,
      borderRadius: 28,
      overflow: 'hidden',
      minHeight: 480,
      ...(isActive ? activeShadow : inactiveShadow),
    }}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(main)/pass' as any); }}
        style={{ flex: 1, borderRadius: 28, overflow: 'hidden',
          borderWidth: isStarter ? 1.5 : isPremium ? 1.5 : 0,
          borderColor: isStarter ? C.grayBorder : isPremium ? 'rgba(212,175,55,0.4)' : 'transparent',
        }}
      >
        <LinearGradient
          colors={plan.gradientColors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }}
          style={{ flex: 1, padding: 28 }}
        >
          {/* "Most chosen" badge */}
          {isExplorer && (
            <View style={{
              position: 'absolute', top: 20, right: 20,
              backgroundColor: 'rgba(255,255,255,0.25)',
              borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.white, letterSpacing: 0.3 }}>
                Most chosen
              </Text>
            </View>
          )}

          {/* Plan name */}
          <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: nameColor }}>
            {plan.name}
          </Text>

          {/* Price block */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: priceColor, alignSelf: 'flex-start', marginTop: 8 }}>€</Text>
            <Text style={{ fontSize: 64, fontWeight: '800', lineHeight: 68, letterSpacing: -2, color: priceColor }}>
              {plan.price}
            </Text>
            <View style={{ alignSelf: 'flex-end', marginBottom: 10, marginStart: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: priceColor }}>{plan.data}GB</Text>
              <Text style={{ fontSize: 12, fontWeight: '400', color: metaColor }}>/ {plan.days} days</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={{ fontSize: 13, lineHeight: 20, color: descColor, marginTop: 12 }}>
            {plan.description}
          </Text>

          {/* CTA button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(main)/pass' as any); }}
            style={{
              marginTop: 24, height: 52, borderRadius: 14,
              justifyContent: 'center', alignItems: 'center',
              backgroundColor: isStarter ? C.nearBlack : isExplorer ? C.white : C.gold,
              shadowColor: isStarter ? '#000' : C.gold,
              shadowOffset: { width: 0, height: isStarter ? 4 : 6 },
              shadowOpacity: isStarter ? 0.15 : 0.30,
              shadowRadius: isStarter ? 10 : 14,
              elevation: isStarter ? 4 : 8,
            }}
          >
            <Text style={{
              fontSize: 15, fontWeight: '700',
              color: isStarter ? C.white : isExplorer ? C.goldDark : C.nearBlack,
            }}>
              Get started
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: dividerColor, marginVertical: 24 }} />

          {/* Features */}
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: featLabel, marginBottom: 14 }}>
            Features
          </Text>
          <View style={{ gap: 12 }}>
            {plan.features.map(f => (
              <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Svg width={20} height={20} viewBox="0 0 20 20">
                  <Circle cx="10" cy="10" r="10" fill={checkFill} />
                  <Path d="M6 10l3 3 5-6" stroke={checkStroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </Svg>
                <Text style={{ fontSize: 13, fontWeight: '500', lineHeight: 18, color: featColor, flex: 1 }}>{f}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// 11b. PlanCarousel — centered snap carousel with dot indicators ───────────────
function PlanCarousel() {
  const scrollRef   = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(1);

  // Animated dot widths
  const dotWidths = useRef(PLANS.map((_, i) => new Animated.Value(i === 1 ? 24 : 8))).current;

  const animateDots = useCallback((idx: number) => {
    PLANS.forEach((_, i) => {
      Animated.spring(dotWidths[i], {
        toValue: i === idx ? 24 : 8,
        tension: 120, friction: 8,
        useNativeDriver: false, // width is not supported by native driver
      }).start();
    });
  }, []);

  useEffect(() => {
    // Scroll to Explorer (index 1) on mount
    const offset = (CARD_WIDTH + CARD_GAP) * 1;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ x: offset, animated: false });
      setActiveIdx(1);
      animateDots(1);
    }, 100);
  }, []);

  const onMomentumScrollEnd = useCallback((e: any) => {
    const offset = e.nativeEvent.contentOffset.x;
    const idx = Math.round(offset / (CARD_WIDTH + CARD_GAP));
    const clamped = Math.max(0, Math.min(idx, PLANS.length - 1));
    setActiveIdx(clamped);
    animateDots(clamped);
  }, []);

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: SIDE_PAD, paddingBottom: 24 }}
        onMomentumScrollEnd={onMomentumScrollEnd}
      >
        {PLANS.map((plan, i) => (
          <PlanCard key={plan.id} plan={plan} isActive={i === activeIdx} />
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4 }}>
        {PLANS.map((_, i) => (
          <Animated.View key={i} style={{
            width: dotWidths[i],
            height: 8, borderRadius: 4,
            backgroundColor: i === activeIdx ? C.gold : C.grayBorder,
          }} />
        ))}
      </View>
    </View>
  );
}

// 12. CityPickerModal ──────────────────────────────────────────────────────────
function CityPickerModal({ visible, activeCity, cities, onSelect, onClose }: {
  visible: boolean; activeCity: City; cities: City[]; onSelect: (c: City) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} />
      <View style={{ backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: '75%', ...cardShadow }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.grayBorder, alignSelf: 'center', marginTop: 12, marginBottom: 8 }} />
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.nearBlack, paddingHorizontal: 24, marginBottom: 8 }}>Select city</Text>
        <FlatList
          data={cities}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const isActive = item.id === activeCity.id;
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => { Haptics.selectionAsync(); onSelect(item); onClose(); }}
                style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 12 }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isActive ? C.gold : 'transparent' }} />
                <Text style={{ fontSize: 16, fontWeight: isActive ? '700' : '400', color: isActive ? C.gold : C.nearBlack, flex: 1 }}>
                  {item.name_en}
                </Text>
                <Text style={{ fontSize: 12, color: C.grayText }}>{item.name_ar}</Text>
                {isActive && (
                  <Svg width={16} height={16} viewBox="0 0 16 16">
                    <Path d="M3 8l4 4 6-7" stroke={C.gold} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </Svg>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

// 13. ExploreScreen ─────────────────────────────────────────────────────────
export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const activeCountry = useAppStore((s) => s.activeCountry);
  const setActiveCity = useAppStore((s) => s.setActiveCity);

  const [city, setCity]                         = useState<City>(FALLBACK_CITY);
  const [cityModalVisible, setCityModal]         = useState(false);
  const [activeCategory, setActiveCategory]      = useState('all');
  const [showLocationBanner, setLocationBanner]  = useState(true);
  const [locationGranted, setLocationGranted]    = useState(false);
  const [passReminderDismissed, setPassDismissed] = useState(false);

  const passBarTranslate = useRef(new Animated.Value(20)).current;
  const passBarOpacity   = useRef(new Animated.Value(0)).current;
  const allowBtnScale    = useRef(new Animated.Value(1)).current;
  const passReminderRef  = useRef(false);
  const gpsCitySlug      = useRef<string | null>(null); // slug of the GPS-detected city

  const countryCities = useMemo(() => normaliseCities(loadCountryCities(activeCountry) as any[]), [activeCountry]);
  const countryPlaces = useMemo(() => normalisePlaces(loadCountryPlaces(activeCountry) as any[]), [activeCountry]);
  const countryPromos = useMemo(() => normaliseFlashPromos(loadCountryFlashPromos(activeCountry)), [activeCountry]);
  const placeById = useMemo(() => new Map<string, Place>(countryPlaces.map((place) => [place.id, place])), [countryPlaces]);

  useEffect(() => {
    const nextCity = activeCountry === 'morocco'
      ? (countryCities.find((city) => city.slug === 'casablanca') ?? countryCities[0] ?? FALLBACK_CITY)
      : (countryCities[0] ?? FALLBACK_CITY);
    setCity(nextCity);
    setActiveCity(nextCity.slug);
    gpsCitySlug.current = null;
    setLocationBanner(true);
    setLocationGranted(false);
  }, [countryCities, activeCountry, setActiveCity]);

  // Filter places by selected city + active category
  // TODO: replace with usePlaces(cityId, categoryId) hook
  const filteredPlaces = useMemo(() => {
    return countryPlaces.filter(p => {
      const cityMatch = p.city_id === city.id;
      const catMatch  = activeCategory === 'all' || p.category_slug === activeCategory;
      return cityMatch && catMatch;
    });
  }, [countryPlaces, city.id, activeCategory]);

  const featuredPlaces = useMemo(() =>
    filteredPlaces.filter(p => p.is_partner).slice(0, 10), [filteredPlaces]);

  const cityFlashPromos = useMemo(() =>
    countryPromos.filter((p) => p.city_id === city.id).slice(0, 10), [countryPromos, city.id]);

  const listPlaces = useMemo(() =>
    filteredPlaces.filter(p => !p.is_partner).slice(0, 20), [filteredPlaces]);

  // Scroll → floating pass bar
  const handleScroll = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y > 400 && !passReminderDismissed && !passReminderRef.current) {
      passReminderRef.current = true;
      Animated.parallel([
        Animated.spring(passBarTranslate, { toValue: 0,  tension: 140, friction: 10, useNativeDriver: true }),
        Animated.timing(passBarOpacity,   { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else if (y < 400 && passReminderRef.current) {
      passReminderRef.current = false;
      Animated.parallel([
        Animated.spring(passBarTranslate, { toValue: 20, tension: 140, friction: 10, useNativeDriver: true }),
        Animated.timing(passBarOpacity,   { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [passReminderDismissed]);

  const requestLocation = async () => {
    Animated.sequence([
      Animated.spring(allowBtnScale, { toValue: 0.96, tension: 200, friction: 10, useNativeDriver: true }),
      Animated.spring(allowBtnScale, { toValue: 1,    tension: 200, friction: 10, useNativeDriver: true }),
    ]).start();
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setLocationGranted(true);
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const nearest = nearestCity(countryCities, loc.coords.latitude, loc.coords.longitude);
        if (nearest) {
          gpsCitySlug.current = nearest.slug;
          setCity(nearest);
          setActiveCity(nearest.slug);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {
        // location fix failed — keep current city
      }
    }
    setLocationBanner(false);
  };

  const SectionHeader = ({ title, action, onAction }: { title: string; action: string; onAction: () => void }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: C.nearBlack }}>{title}</Text>
      <TouchableOpacity activeOpacity={0.85} onPress={onAction} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.gold }}>{action}</Text>
        <Svg width={12} height={12} viewBox="0 0 12 12">
          <Path d="M4 2l4 4-4 4" stroke={C.gold} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>

      {/* ── Sticky header ──────────────────────────────────────────── */}
      <View style={{ backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.grayLight, paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => setCityModal(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: C.nearBlack }}>{city.name_en}</Text>
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path d="M4 6l4 4 4-4" stroke={C.gold} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {/* Search */}
            <TouchableOpacity activeOpacity={0.85}>
              <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
                <Circle cx="10" cy="10" r="7" stroke={C.nearBlack} strokeWidth={1.5} />
                <Line x1="15.5" y1="15.5" x2="20" y2="20" stroke={C.nearBlack} strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
            </TouchableOpacity>

            {/* Location — gold when granted */}
            <TouchableOpacity activeOpacity={0.85} onPress={requestLocation}>
              <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
                <Path d="M11 2C7.69 2 5 4.69 5 8c0 4.88 6 12 6 12s6-7.12 6-12c0-3.31-2.69-6-6-6z"
                  stroke={locationGranted ? C.gold : C.nearBlack}
                  fill={locationGranted ? 'rgba(212,175,55,0.15)' : 'none'}
                  strokeWidth={1.5} strokeLinejoin="round" />
                <Circle cx="11" cy="8" r="2"
                  stroke={locationGranted ? C.gold : C.nearBlack}
                  fill={locationGranted ? C.gold : 'none'}
                  strokeWidth={1.5} />
              </Svg>
            </TouchableOpacity>

            {/* Notifications */}
            <TouchableOpacity activeOpacity={0.85}>
              <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
                <Path d="M11 2a7 7 0 00-7 7v3l-1.5 2.5h17L18 12V9a7 7 0 00-7-7z"
                  stroke={C.nearBlack} strokeWidth={1.5} strokeLinejoin="round" />
                <Path d="M9 18a2 2 0 004 0" stroke={C.nearBlack} strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={{ fontSize: 13, color: C.grayText, marginTop: 2 }}>
          Discover the best of {city.name_en}
        </Text>
      </View>

      {/* ── Scrollable content ─────────────────────────────────────── */}
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        onScroll={handleScroll} scrollEventThrottle={16}>

        {/* Categories */}
        <View style={{ marginTop: 20 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingStart: 24, paddingEnd: 8 }}>
            {CATEGORIES.map(cat => (
              <CategoryPill
                key={cat.id}
                cat={cat}
                isActive={activeCategory === cat.slug}
                onPress={() => { Haptics.selectionAsync(); setActiveCategory(cat.slug); }}
              />
            ))}
          </ScrollView>
        </View>

        {/* Location banner */}
        {showLocationBanner && !locationGranted && (
          <View style={{ marginHorizontal: 24, marginTop: 24, backgroundColor: '#FFF9EC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)', flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: C.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(212,175,55,0.15)', justifyContent: 'center', alignItems: 'center' }}>
              <Svg width={20} height={20} viewBox="0 0 20 20">
                <Path d="M10 2C7.24 2 5 4.24 5 7c0 3.94 5 11 5 11s5-7.06 5-11c0-2.76-2.24-5-5-5z" fill={C.gold} />
                <Circle cx="10" cy="7" r="2" fill={C.white} />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.nearBlack }}>Find places nearby</Text>
              <Text style={{ fontSize: 12, color: C.grayText, marginTop: 2 }}>Share your location for personalized picks</Text>
            </View>
            <Animated.View style={{ transform: [{ scale: allowBtnScale }], ...goldShadow, borderRadius: 20 }}>
              <TouchableOpacity activeOpacity={0.85} onPress={requestLocation}
                style={{ backgroundColor: C.gold, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.white }}>Allow</Text>
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity activeOpacity={0.85} onPress={() => setLocationBanner(false)}
              style={{ position: 'absolute', top: 10, right: 10 }}>
              <Svg width={16} height={16} viewBox="0 0 16 16">
                <Path d="M4 4l8 8M12 4l-8 8" stroke={C.grayText} strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
            </TouchableOpacity>
          </View>
        )}

        {/* Flash promos */}
        <View style={{ marginTop: 32 }}>
          <SectionHeader title="Flash Promos" action="View all" onAction={() => router.push('/(main)/places' as any)} />
          {cityFlashPromos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingStart: 24, paddingEnd: 8, marginTop: 16, paddingBottom: 10 }}
            >
              {cityFlashPromos.map((promo) => (
                <FlashPromoCard key={promo.id} promo={promo} placeById={placeById} />
              ))}
            </ScrollView>
          ) : (
            <View style={{ marginHorizontal: 24, marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)', backgroundColor: '#FFF9EC', padding: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.nearBlack }}>No live flash promos yet</Text>
              <Text style={{ fontSize: 12, color: C.grayText, marginTop: 4 }}>Check back soon for limited-time MAP partner deals in {city.name_en}.</Text>
            </View>
          )}
        </View>

        {/* Featured places */}
        <View style={{ marginTop: 34 }}>
          <SectionHeader title="Featured places" action="See all" onAction={() => router.push('/(main)/places' as any)} />
          {featuredPlaces.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingStart: 24, paddingEnd: 8, marginTop: 16, paddingBottom: 16 }}>
              {featuredPlaces.map(p => <PlaceCard key={p.id} place={p} />)}
            </ScrollView>
          ) : (
            <View style={{ paddingHorizontal: 24, marginTop: 16, paddingVertical: 32, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: C.grayText }}>No places found for this city & category.</Text>
            </View>
          )}
        </View>

        {/* MAP Pass plans */}
        <View style={{ marginTop: 36 }}>
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: C.nearBlack }}>MAP Pass</Text>
                <Text style={{ fontSize: 13, color: C.grayText, marginTop: 2 }}>Stay connected & unlock exclusive deals</Text>
              </View>
              <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(main)/pass' as any)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.gold }}>View all</Text>
                <Svg width={12} height={12} viewBox="0 0 12 12">
                  <Path d="M4 2l4 4-4 4" stroke={C.gold} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </Svg>
              </TouchableOpacity>
            </View>
          </View>
          <PlanCarousel />
        </View>

        {/* More to explore */}
        <View style={{ marginTop: 36 }}>
          <SectionHeader title="More to explore" action="See all places" onAction={() => router.push('/(main)/places' as any)} />
          {listPlaces.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingStart: 24, paddingEnd: 8, marginTop: 16, paddingBottom: 16 }}>
              {listPlaces.map(p => <PlaceCard key={p.id} place={p} />)}
            </ScrollView>
          ) : (
            <View style={{ paddingHorizontal: 24, marginTop: 16, paddingVertical: 32, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: C.grayText }}>No places found for this city & category.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating pass reminder */}
      <Animated.View
        pointerEvents="box-none"
        style={{ position: 'absolute', bottom: (insets.bottom || 16) + 16, left: 24, right: 24, opacity: passBarOpacity, transform: [{ translateY: passBarTranslate }], backgroundColor: C.nearBlack, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.white }}>Unlock exclusive deals</Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Get your MAP Pass from €9</Text>
        </View>
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(main)/pass' as any)}
          style={{ backgroundColor: C.gold, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, ...goldShadow }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.nearBlack }}>Get Pass</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.85}
          onPress={() => {
            setPassDismissed(true);
            Animated.parallel([
              Animated.spring(passBarTranslate, { toValue: 20, tension: 140, friction: 10, useNativeDriver: true }),
              Animated.timing(passBarOpacity,   { toValue: 0, duration: 180, useNativeDriver: true }),
            ]).start(() => { passReminderRef.current = false; });
          }}
          style={{ position: 'absolute', top: 8, right: 8 }}>
          <Svg width={16} height={16} viewBox="0 0 16 16">
            <Path d="M4 4l8 8M12 4l-8 8" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </Animated.View>

      {/* City picker modal */}
      <CityPickerModal
        visible={cityModalVisible}
        activeCity={city}
        cities={countryCities}
        onSelect={c => {
          setCity(c);
          setActiveCity(c.slug);
          if (gpsCitySlug.current && c.slug !== gpsCitySlug.current) {
            setLocationGranted(false);
            setLocationBanner(true);
          }
        }}
        onClose={() => setCityModal(false)}
      />
    </View>
  );
}
