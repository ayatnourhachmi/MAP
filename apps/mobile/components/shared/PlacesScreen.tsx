// ─────────────────────────────────────────────────────────────────────────────
// MAP — PlacesScreen.tsx
// ─────────────────────────────────────────────────────────────────────────────

// 1. Imports ──────────────────────────────────────────────────────────────────
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  TextInput, Modal, Animated, Platform,
  Dimensions, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
// TODO: add custom gold-accent MapView style JSON via customMapStyle prop
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import RAW_CATEGORIES from '../../assets/data/global/categories.json';
import { loadCountryCities, loadCountryPlaces } from '../../lib/countryLoader';
import { useAppStore } from '../../store/appStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 2. Colors ───────────────────────────────────────────────────────────────────
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
  shadowColor:   '#000',
  shadowOffset:  { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius:  16,
  elevation:     6,
};

// 3. City Centers ─────────────────────────────────────────────────────────────
const CITY_CENTERS: Record<string, {
  latitude: number; longitude: number;
  latitudeDelta: number; longitudeDelta: number;
}> = {
  'casablanca':    { latitude: 33.5731, longitude: -7.5898, latitudeDelta: 0.08, longitudeDelta: 0.08 },
  'marrakech':     { latitude: 31.6295, longitude: -7.9811, latitudeDelta: 0.08, longitudeDelta: 0.08 },
  'rabat':         { latitude: 34.0209, longitude: -6.8416, latitudeDelta: 0.08, longitudeDelta: 0.08 },
  'fes':           { latitude: 34.0181, longitude: -5.0078, latitudeDelta: 0.08, longitudeDelta: 0.08 },
  'tanger':        { latitude: 35.7595, longitude: -5.8340, latitudeDelta: 0.08, longitudeDelta: 0.08 },
  'agadir':        { latitude: 30.4278, longitude: -9.5981, latitudeDelta: 0.08, longitudeDelta: 0.08 },
  'essaouira':     { latitude: 31.5085, longitude: -9.7595, latitudeDelta: 0.08, longitudeDelta: 0.08 },
  'new-york':      { latitude: 40.7128, longitude: -74.0060, latitudeDelta: 0.08, longitudeDelta: 0.08 },
  'los-angeles':   { latitude: 34.0522, longitude: -118.2437, latitudeDelta: 0.08, longitudeDelta: 0.08 },
  'miami':         { latitude: 25.7617, longitude: -80.1918, latitudeDelta: 0.08, longitudeDelta: 0.08 },
  'las-vegas':     { latitude: 36.1699, longitude: -115.1398, latitudeDelta: 0.08, longitudeDelta: 0.08 },
  'chicago':       { latitude: 41.8781, longitude: -87.6298, latitudeDelta: 0.08, longitudeDelta: 0.08 },
  'san-francisco': { latitude: 37.7749, longitude: -122.4194, latitudeDelta: 0.08, longitudeDelta: 0.08 },
  'new-orleans':   { latitude: 29.9511, longitude: -90.0715, latitudeDelta: 0.08, longitudeDelta: 0.08 },
  'houston':       { latitude: 29.7604, longitude: -95.3698, latitudeDelta: 0.08, longitudeDelta: 0.08 },
  'seattle':       { latitude: 47.6062, longitude: -122.3321, latitudeDelta: 0.08, longitudeDelta: 0.08 },
  'boston':        { latitude: 42.3601, longitude: -71.0589, latitudeDelta: 0.08, longitudeDelta: 0.08 },
};

type City = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  latitude?: number;
  longitude?: number;
};

function normaliseCities(raw: any[]): City[] {
  return raw
    .filter((city: any) => city.is_active !== false)
    .map((city: any) => ({
      id: city.id ?? city.slug,
      slug: city.slug,
      name_en: city.name_en,
      name_ar: city.name_ar,
      latitude: typeof city.lat === 'number' ? city.lat : CITY_CENTERS[city.slug]?.latitude,
      longitude: typeof city.lng === 'number' ? city.lng : CITY_CENTERS[city.slug]?.longitude,
    }))
    .sort((a, b) => a.name_en.localeCompare(b.name_en));
}

// 4. Types ────────────────────────────────────────────────────────────────────
type Place = {
  id: string;
  name: string;
  city_id?: string;
  category_id: string;
  neighborhood: string;
  rating: string;
  price_level: string;
  images: string[];
  is_partner: boolean;
  lat?: number | null;
  lng?: number | null;
  description?: string;
  opening_hours?: any;
  deleted_at?: any;
  status?: string;
};

type Category = {
  id: string;
  slug: string;
  name_en: string;
  show_in_home: boolean;
  display_order: number;
  is_active: boolean;
};

// 4. Helpers ──────────────────────────────────────────────────────────────────
function parseOpeningHours(raw: any): { open_now?: boolean } | null {
  try {
    if (raw == null) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

function getCategoryGradient(categoryId: string): [string, string] {
  const map: Record<string, [string, string]> = {
    'b8379863-efcf-4e0d-b94f-2deea48f0a6f': ['#C94B0E', '#8B2500'],  // restaurants
    '880a7916-61ca-4335-8e99-cb11c3933020': ['#1B3A6B', '#0D2144'],  // hotels
    'e1539e19-7527-4205-b0b8-4b8afda69ea9': ['#2D6A1F', '#1A4011'],  // spas
    'c6991671-c661-438a-bae3-e9e76266a9c3': ['#4A0E6B', '#2C0040'],  // nightlife
    '4efae3f1-be2f-4967-ae01-40b29494b34e': ['#1B3A6B', '#0D2144'],  // accommodation
    'ab150f7b-ff5a-43bb-8896-aef067c4c948': ['#8B2500', '#5C1800'],  // shopping
    '1910f295-b7ba-4566-862f-ffecff11fa6a': ['#1A4B5E', '#0D2C3B'],  // car-rental
    'b7ae6074-1ccc-465c-8988-b125f94a5c4c': ['#2C3E50', '#1A252F'],  // immobilier
  };
  return map[categoryId] ?? ['#888888', '#555555'];
}

// Normalise raw JSON places
// TODO: replace PLACES with usePlaces(cityId, filters)
function normalisePlaces(raw: any[]): Place[] {
  return raw
    .filter(p => p.deleted_at == null && p.status !== 'deleted')
    .map(p => {
      let imgs: string[] = [];
      try { imgs = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images ?? []); }
      catch { imgs = []; }
      const cleanImgs = (imgs ?? []).filter((u: any) => typeof u === 'string' && u.trim().length > 0);
      return {
        id:            p.id,
        name:          p.name_en ?? p.name ?? '',
        city_id:       p.city_id ?? undefined,
        category_id:   p.category_id,
        neighborhood:  p.neighborhood ?? '',
        rating:        p.rating ?? '0.00',
        price_level:   p.price_level ?? 'medium',
        images:        cleanImgs,
        is_partner:    p.is_partner  ?? false,
        lat:           p.lat  != null ? parseFloat(p.lat)  : null,
        lng:           p.lng  != null ? parseFloat(p.lng)  : null,
        description:   p.description_en ?? p.description ?? '',
        opening_hours: p.opening_hours  ?? null,
        deleted_at:    p.deleted_at,
        status:        p.status,
      };
    })
    .filter((p) => p.images.length > 0);
}

const ALL_CATEGORIES: Category[] = (RAW_CATEGORIES as any[])
  .filter((c: any) => c.is_active)
  .sort((a: any, b: any) => a.display_order - b.display_order);

const CARD_WIDTH = (SCREEN_WIDTH - 44) / 2;

// 5. PlaceCard ─────────────────────────────────────────────────────────────────
function PlaceCard({
  place, savedIds, onToggleSave,
}: {
  place: Place;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const saveScale = useRef(new Animated.Value(1)).current;
  const saved     = savedIds.has(place.id);
  const hours     = parseOpeningHours(place.opening_hours);
  const gradient  = getCategoryGradient(place.category_id);
  const price     = place.price_level === 'low' ? '$' : place.price_level === 'medium' ? '$$' : place.price_level === 'high' ? '$$$' : '$$$$';

  const onPressIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, tension: 200, friction: 10, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1,    tension: 200, friction: 10, useNativeDriver: true }).start();

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggleSave(place.id);
    Animated.sequence([
      Animated.spring(saveScale, { toValue: 1.3, tension: 220, friction: 6,  useNativeDriver: true }),
      Animated.spring(saveScale, { toValue: 1,   tension: 220, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], ...cardShadow, borderRadius: 20, width: CARD_WIDTH, backgroundColor: C.white }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPressIn={onPressIn} onPressOut={onPressOut}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/place/${place.id}` as any); }}
        style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: C.white }}
      >
        {/* Image */}
        <View style={{ height: 130 }}>
          {place.images[0] ? (
            <Image source={{ uri: place.images[0] }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <LinearGradient colors={gradient} style={{ width: '100%', height: '100%' }} />
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.45)']}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 }} />

          {/* Badge */}
          {place.is_partner && (
            <View style={{
              position: 'absolute', top: 8, left: 8,
              backgroundColor: C.gold,
              borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
            }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: C.white }}>Featured</Text>
            </View>
          )}

          {/* Save */}
          <TouchableOpacity activeOpacity={0.85} onPress={handleSave}
            style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View style={{ transform: [{ scale: saveScale }] }}>
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
                  stroke={saved ? C.gold : '#888'}
                  strokeWidth={1.8} fill={saved ? C.gold : 'none'}
                  strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Animated.View>
          </TouchableOpacity>

          {/* Rating */}
          <View style={{ position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3,
            backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 }}>
            <Svg width={10} height={10} viewBox="0 0 24 24">
              <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={C.gold} stroke={C.gold} strokeWidth={1} />
            </Svg>
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.white }}>{place.rating}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={{ padding: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.nearBlack }} numberOfLines={1}>
            {place.name}
          </Text>
          {!!place.neighborhood && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 }}>
              <Svg width={10} height={10} viewBox="0 0 16 16">
                <Path d="M8 1C5.24 1 3 3.24 3 6c0 3.94 5 9 5 9s5-5.06 5-9c0-2.76-2.24-5-5-5z" fill={C.grayText} />
                <Circle cx="8" cy="6" r="1.8" fill={C.white} />
              </Svg>
              <Text style={{ fontSize: 11, color: C.grayText, flex: 1 }} numberOfLines={1}>
                {place.neighborhood}
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.gold }}>{price}</Text>
            {hours?.open_now != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3,
                  backgroundColor: hours.open_now ? '#22C55E' : '#EF4444' }} />
                <Text style={{ fontSize: 10, fontWeight: '600',
                  color: hours.open_now ? '#22C55E' : '#EF4444' }}>
                  {hours.open_now ? 'Open' : 'Closed'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// 6. SelectedPlaceCard ─────────────────────────────────────────────────────────
function SelectedPlaceCard({
  place, onClose,
}: {
  place: Place;
  onClose: () => void;
}) {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const hours      = parseOpeningHours(place.opening_hours);
  const price      = place.price_level === 'low' ? '€' : place.price_level === 'medium' ? '€€' : place.price_level === 'high' ? '€€€' : '€€€€';
  const gradient   = getCategoryGradient(place.category_id);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0,  tension: 100, friction: 10, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 1,  duration: 200,              useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', bottom: 90, left: 16, right: 16,
      opacity, transform: [{ translateY }],
      backgroundColor: C.white, borderRadius: 20, padding: 14,
      flexDirection: 'row', gap: 12,
      shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
    }}>
      {/* Thumbnail */}
      {place.images[0] ? (
        <Image source={{ uri: place.images[0] }}
          style={{ width: 80, height: 80, borderRadius: 14 }} contentFit="cover" />
      ) : (
        <LinearGradient colors={gradient}
          style={{ width: 80, height: 80, borderRadius: 14 }} />
      )}

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: C.nearBlack }} numberOfLines={1}>
          {place.name}
        </Text>
        {!!place.neighborhood && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Svg width={10} height={10} viewBox="0 0 16 16">
              <Path d="M8 1C5.24 1 3 3.24 3 6c0 3.94 5 9 5 9s5-5.06 5-9c0-2.76-2.24-5-5-5z" fill={C.grayText} />
              <Circle cx="8" cy="6" r="1.8" fill={C.white} />
            </Svg>
            <Text style={{ fontSize: 12, color: C.grayText }} numberOfLines={1}>{place.neighborhood}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Svg width={11} height={11} viewBox="0 0 24 24">
              <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={C.gold} stroke={C.gold} strokeWidth={1} />
            </Svg>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.nearBlack }}>{place.rating}</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.gold }}>{price}</Text>
          {hours?.open_now != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3,
                backgroundColor: hours.open_now ? '#22C55E' : '#EF4444' }} />
              <Text style={{ fontSize: 11, fontWeight: '600',
                color: hours.open_now ? '#22C55E' : '#EF4444' }}>
                {hours.open_now ? 'Open' : 'Closed'}
              </Text>
            </View>
          )}
        </View>
        {place.is_partner && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6,
            backgroundColor: 'rgba(212,175,55,0.12)', borderRadius: 6,
            paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.gold }}>Featured</Text>
          </View>
        )}
      </View>

      {/* Navigate arrow */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/place/${place.id}` as any); }}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.gold,
          justifyContent: 'center', alignItems: 'center', alignSelf: 'center',
          shadowColor: C.gold, shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
      >
        <Svg width={16} height={16} viewBox="0 0 16 16">
          <Path d="M6 4l4 4-4 4" stroke={C.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </TouchableOpacity>

      {/* Close */}
      <TouchableOpacity activeOpacity={0.85} onPress={onClose}
        style={{ position: 'absolute', top: 10, right: 10 }}>
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path d="M4 4l10 10M14 4L4 14" stroke={C.grayText} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
      </TouchableOpacity>
    </Animated.View>
  );
}

// 7. SortSheet ─────────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'rating',     label: 'Highest rated'       },
  { value: 'name',       label: 'Name A–Z'            },
  { value: 'price_asc',  label: 'Price: low to high'  },
  { value: 'price_desc', label: 'Price: high to low'  },
  { value: 'partners',   label: 'Featured first'      },
];

function SortSheet({ visible, sortBy, onSelect, onClose }: {
  visible: boolean; sortBy: string;
  onSelect: (v: string) => void; onClose: () => void;
}) {
  const insets     = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue:  visible ? 0 : SCREEN_HEIGHT,
      tension:  80, friction: 10,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} />
      <Animated.View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        transform: [{ translateY }],
        backgroundColor: C.white,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingTop: 20, paddingHorizontal: 24,
        paddingBottom: insets.bottom + 16,
      }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.grayBorder, alignSelf: 'center', marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '800', color: C.nearBlack, marginBottom: 8 }}>Sort by</Text>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity key={opt.value} activeOpacity={0.85}
            onPress={() => { Haptics.selectionAsync(); onSelect(opt.value); onClose(); }}
            style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 15, fontWeight: sortBy === opt.value ? '700' : '500',
              color: sortBy === opt.value ? C.nearBlack : '#555' }}>
              {opt.label}
            </Text>
            {sortBy === opt.value && (
              <Svg width={18} height={18} viewBox="0 0 18 18">
                <Path d="M3 9l5 5 7-8" stroke={C.gold} strokeWidth={2.2}
                  strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
            )}
          </TouchableOpacity>
        ))}
      </Animated.View>
    </Modal>
  );
}

// 8. PriceSheet ────────────────────────────────────────────────────────────────
const PRICE_OPTIONS = [
  { label: '$  Budget',     value: 'low'    },
  { label: '$$  Mid-range', value: 'medium' },
  { label: '$$$  Premium',  value: 'high'   },
];

function PriceSheet({ visible, priceFilter, onApply, onClose }: {
  visible: boolean; priceFilter: string | null;
  onApply: (v: string | null) => void; onClose: () => void;
}) {
  const insets     = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [selected, setSelected] = useState<string | null>(priceFilter);

  useEffect(() => { setSelected(priceFilter); }, [priceFilter, visible]);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue:  visible ? 0 : SCREEN_HEIGHT,
      tension:  80, friction: 10,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} />
      <Animated.View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        transform: [{ translateY }],
        backgroundColor: C.white,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingTop: 20, paddingHorizontal: 24,
        paddingBottom: insets.bottom + 16,
      }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.grayBorder, alignSelf: 'center', marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '800', color: C.nearBlack, marginBottom: 16 }}>Filter by price</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {PRICE_OPTIONS.map(opt => {
            const active = selected === opt.value;
            return (
              <TouchableOpacity key={opt.value} activeOpacity={0.85}
                onPress={() => { setSelected(active ? null : opt.value); Haptics.selectionAsync(); }}
                style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5,
                  justifyContent: 'center', alignItems: 'center',
                  borderColor: active ? C.gold : C.grayBorder,
                  backgroundColor: active ? 'rgba(212,175,55,0.08)' : C.white }}>
                <Text style={{ fontSize: 13, fontWeight: active ? '700' : '600',
                  color: active ? C.gold : C.grayText }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity activeOpacity={0.85}
          onPress={() => { onApply(selected); onClose(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={{ marginTop: 24, height: 52, borderRadius: 14, backgroundColor: C.gold,
            justifyContent: 'center', alignItems: 'center',
            shadowColor: C.gold, shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.nearBlack }}>Apply filter</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.85}
          onPress={() => { onApply(null); setSelected(null); onClose(); }}
          style={{ marginTop: 12, alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ fontSize: 14, color: C.grayText, fontWeight: '500' }}>Remove filter</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// 8b. EmptyState ───────────────────────────────────────────────────────────────
function EmptyState({ onClear }: { onClear: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{ flex: 1, alignItems: 'center', paddingTop: 80, opacity }}>
      <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
        <Circle cx="40" cy="40" r="38" stroke={C.grayBorder} strokeWidth={1} />
        <Path d="M40 20c-8.8 0-16 7.2-16 16 0 12 16 24 16 24s16-12 16-24c0-8.8-7.2-16-16-16z"
          stroke={C.grayBorder} strokeWidth={1} fill="none" />
        <Circle cx="40" cy="36" r="5" stroke={C.grayBorder} strokeWidth={1} fill="none" />
      </Svg>
      <Text style={{ fontSize: 18, fontWeight: '700', color: C.nearBlack, marginTop: 16 }}>No places found</Text>
      <Text style={{ fontSize: 14, color: C.grayText, marginTop: 6 }}>Try adjusting your filters</Text>
      <TouchableOpacity activeOpacity={0.85} onPress={onClear}
        style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12,
          backgroundColor: C.gold, borderRadius: 25,
          shadowColor: C.gold, shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: C.nearBlack }}>Clear filters</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// 8b-ii. MapMarker — tracksViewChanges flip pattern for Android ──────────────
function MapMarker({ place, isSelected, onPress }: {
  place: Place;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const [tracks, setTracks] = useState(true); // start true so snapshot is captured

  // After first paint, stop tracking (performance)
  useEffect(() => {
    const t = setTimeout(() => setTracks(false), 500);
    return () => clearTimeout(t);
  }, []);

  // Re-enable tracking briefly whenever selection changes so Android re-snapshots
  useEffect(() => {
    setTracks(true);
    Animated.spring(scale, {
      toValue: isSelected ? 1.3 : 1,
      tension: 120, friction: 8,
      useNativeDriver: true,
    }).start();
    const t = setTimeout(() => setTracks(false), 500);
    return () => clearTimeout(t);
  }, [isSelected]);

  return (
    <Marker
      coordinate={{ latitude: place.lat!, longitude: place.lng! }}
      onPress={onPress}
      tracksViewChanges={tracks}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {place.is_partner ? (
          <View style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: C.gold,
            borderWidth: 2,
            borderColor: isSelected ? '#96761F' : C.goldDark,
            justifyContent: 'center', alignItems: 'center',
            shadowColor: C.gold,
            shadowOffset: { width: 0, height: isSelected ? 6 : 4 },
            shadowOpacity: isSelected ? 0.5 : 0.4,
            shadowRadius: isSelected ? 10 : 8,
            elevation: isSelected ? 8 : 6,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: C.white }}>M</Text>
          </View>
        ) : (
          <View style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: C.white,
            borderWidth: 1.5,
            borderColor: isSelected ? C.gold : C.grayBorder,
            justifyContent: 'center', alignItems: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
          }}>
            <View style={{ width: 8, height: 8, borderRadius: 4,
              backgroundColor: isSelected ? C.gold : '#888' }} />
          </View>
        )}
      </Animated.View>
    </Marker>
  );
}

// 8c. CategoryPillItem — extracted so useRef isn't inside .map() ──────────────
function CategoryPillItem({ item, isActive, onPress }: {
  item: { id: string; slug: string; name_en: string };
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    onPress();
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.95, tension: 200, friction: 8, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1,    tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
  };
  return (
    <Animated.View style={{ transform: [{ scale }], marginEnd: 8 }}>
      <TouchableOpacity activeOpacity={0.85} onPress={handlePress}
        style={{
          height: 36, borderRadius: 50, paddingHorizontal: 16,
          justifyContent: 'center', alignItems: 'center',
          backgroundColor: isActive ? C.gold : C.grayLight,
          ...(isActive ? {
            shadowColor: C.gold, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
          } : {}),
        }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: isActive ? C.white : C.grayText }}>
          {item.name_en}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// 8d. FilterChip ──────────────────────────────────────────────────────────────
function FilterChip({ active, onPress, onClear, label, icon }: {
  active: boolean;
  onPress: () => void;
  onClear?: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    onPress();
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.97, tension: 200, friction: 10, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1,    tension: 200, friction: 10, useNativeDriver: true }),
    ]).start();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity activeOpacity={0.85} onPress={handlePress}
        style={{
          height: 32, borderRadius: 16, paddingHorizontal: 14,
          flexDirection: 'row', alignItems: 'center', gap: 6,
          borderWidth: 1.5,
          borderColor: active ? C.gold : C.grayBorder,
          backgroundColor: active ? 'rgba(212,175,55,0.08)' : C.white,
        }}>
        {icon}
        <Text style={{ fontSize: 12, fontWeight: active ? '700' : '600',
          color: active ? C.gold : C.grayText }}>
          {label}
        </Text>
        {active && onClear && (
          <TouchableOpacity onPress={onClear}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
            <Svg width={12} height={12} viewBox="0 0 12 12">
              <Path d="M2 2l8 8M10 2L2 10" stroke={C.gold} strokeWidth={1.8} strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// 9. PlacesScreen ─────────────────────────────────────────────────────────────
export default function PlacesScreen() {
  const insets = useSafeAreaInsets();
  const activeCountry = useAppStore(s => s.activeCountry);
  const activeCity = useAppStore(s => s.activeCity);
  const setActiveCity = useAppStore(s => s.setActiveCity);

  const countryCities = useMemo(() => normaliseCities(loadCountryCities(activeCountry) as any[]), [activeCountry]);

  const [viewMode, setViewMode]             = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery]       = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [priceFilter, setPriceFilter]       = useState<string | null>(null);
  const [partnersOnly, setPartnersOnly]     = useState(false);
  const [sortBy, setSortBy]                 = useState('rating');
  const [showSort, setShowSort]             = useState(false);
  const [showPriceSheet, setShowPriceSheet] = useState(false);
  const [savedIds, setSavedIds]             = useState<Set<string>>(new Set());
  const [selectedPlace, setSelectedPlace]   = useState<Place | null>(null);
  const [locationMode, setLocationMode]     = useState<'city' | 'user'>('city');

  const mapRef        = useRef<MapView>(null);
  const toggleBtnAnim = useRef(new Animated.Value(0)).current;

  const ALL_PLACES = useMemo(
    () => normalisePlaces(loadCountryPlaces(activeCountry)),
    [activeCountry],
  );

  const defaultCitySlug = useMemo(() => {
    return activeCountry === 'morocco'
      ? (countryCities.find((city) => city.slug === 'casablanca')?.slug ?? countryCities[0]?.slug ?? '')
      : (countryCities[0]?.slug ?? '');
  }, [countryCities, activeCountry]);

  const selectedCitySlug = useMemo(() => {
    const hasStoredActiveCity = !!activeCity && countryCities.some((city) => city.slug === activeCity);
    return hasStoredActiveCity ? (activeCity as string) : defaultCitySlug;
  }, [activeCity, countryCities, defaultCitySlug]);

  const selectedCityData = useMemo(() => {
    return countryCities.find((city) => city.slug === selectedCitySlug) ?? countryCities[0] ?? null;
  }, [countryCities, selectedCitySlug]);

  const cityRegion = useMemo(() => {
    if (selectedCityData?.latitude != null && selectedCityData?.longitude != null) {
      return {
        latitude: selectedCityData.latitude,
        longitude: selectedCityData.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }
    return CITY_CENTERS[selectedCityData?.slug ?? 'casablanca'] ?? CITY_CENTERS['casablanca'];
  }, [selectedCityData]);

  useEffect(() => {
    if (selectedCitySlug && activeCity !== selectedCitySlug) {
      setActiveCity(selectedCitySlug);
    }
  }, [selectedCitySlug, activeCity, setActiveCity]);

  // Animate toggle button background
  useEffect(() => {
    Animated.spring(toggleBtnAnim, {
      toValue: viewMode === 'map' ? 1 : 0,
      tension: 120, friction: 8,
      useNativeDriver: false,
    }).start();
  }, [viewMode]);

  // Re-center map when city changes
  useEffect(() => {
    const target = selectedCityData?.latitude != null && selectedCityData?.longitude != null
      ? {
          latitude: selectedCityData.latitude,
          longitude: selectedCityData.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }
      : CITY_CENTERS[selectedCityData?.slug ?? 'casablanca'] ?? CITY_CENTERS['casablanca'];
    mapRef.current?.animateToRegion(target, 600);
    setLocationMode('city');
  }, [selectedCityData]);

  // When switching from list -> map, force one recenter to the current active city.
  useEffect(() => {
    if (viewMode !== 'map') return;
    const timer = setTimeout(() => {
      mapRef.current?.animateToRegion(cityRegion, 450);
    }, 50);
    return () => clearTimeout(timer);
  }, [viewMode, cityRegion]);

  // Filtering + sorting
  // TODO: replace ALL_PLACES with usePlaces(cityId, filters)
  const filteredPlaces = useMemo(() => {
    return ALL_PLACES
      .filter(place => {
        if (selectedCityData) {
          const cityMatchesById = !!place.city_id && place.city_id === selectedCityData.id;
          const cityMatchesBySlug = !!place.city_id && place.city_id === selectedCityData.slug;
          if (!cityMatchesById && !cityMatchesBySlug) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (
            !place.name?.toLowerCase().includes(q) &&
            !place.neighborhood?.toLowerCase().includes(q) &&
            !place.description?.toLowerCase().includes(q)
          ) return false;
        }
        if (activeCategory !== 'all') {
          const cat = ALL_CATEGORIES.find(c => c.slug === activeCategory);
          if (cat && place.category_id !== cat.id) return false;
        }
        if (priceFilter && place.price_level !== priceFilter) return false;
        if (partnersOnly && !place.is_partner)  return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating')
          return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
        if (sortBy === 'name')
          return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'price_asc') {
          const o: Record<string, number> = { low: 1, medium: 2, high: 3 };
          return (o[a.price_level] || 2) - (o[b.price_level] || 2);
        }
        if (sortBy === 'price_desc') {
          const o: Record<string, number> = { low: 1, medium: 2, high: 3 };
          return (o[b.price_level] || 2) - (o[a.price_level] || 2);
        }
        if (sortBy === 'partners')
          return (b.is_partner ? 1 : 0) - (a.is_partner ? 1 : 0);
        return 0;
      });
  }, [selectedCityData, searchQuery, activeCategory, priceFilter, partnersOnly, sortBy]);

  const filteredCount  = filteredPlaces.length;
  const mappablePlaces = useMemo(() =>
    filteredPlaces.filter(p => p.lat && p.lng), [filteredPlaces]);

  const hasActiveFilters = !!(priceFilter || partnersOnly);

  const clearAllFilters = useCallback(() => {
    setPriceFilter(null);
    setPartnersOnly(false);
    setSearchQuery('');
    setActiveCategory('all');
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectMarker = (place: Place) => {
    setSelectedPlace(place);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mapRef.current?.animateToRegion({
      latitude:      (place.lat ?? 0) - 0.008,
      longitude:     place.lng ?? 0,
      latitudeDelta:  0.03,
      longitudeDelta: 0.03,
    }, 400);
  };

  const deselectPlace = () => setSelectedPlace(null);

  const handleUseMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location access denied', `Showing ${selectedCityData?.name_en ?? 'this city'} instead.`);
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocationMode('user');
      mapRef.current?.animateToRegion({
        latitude:       loc.coords.latitude,
        longitude:      loc.coords.longitude,
        latitudeDelta:  0.015,
        longitudeDelta: 0.015,
      }, 800);
    } catch {
      Alert.alert('Error', 'Could not get your location.');
    }
  };

  const resetToCity = () => {
    setLocationMode('city');
    const target = selectedCityData?.latitude != null && selectedCityData?.longitude != null
      ? {
          latitude: selectedCityData.latitude,
          longitude: selectedCityData.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }
      : CITY_CENTERS[selectedCityData?.slug ?? 'casablanca'] ?? CITY_CENTERS['casablanca'];
    mapRef.current?.animateToRegion(target, 600);
  };

  const toggleBtnBg = toggleBtnAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [C.grayLight, C.nearBlack],
  });

  const PILL_CATEGORIES = [
    { id: 'all', slug: 'all', name_en: 'All', show_in_home: true, display_order: 0, is_active: true },
    ...ALL_CATEGORIES.filter(c => c.show_in_home),
  ];

  const priceChipLabel = priceFilter === 'low' ? '$  Budget'
    : priceFilter === 'medium' ? '$$  Mid-range'
    : priceFilter === 'high'   ? '$$$  Premium'
    : 'Price';

  // ── Header (shared between list and map views) ────────────────────────────
  const renderHeader = () => (
    <View style={{ backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.grayLight }}>
      {/* Row 1 — Search + Toggle */}
      <View style={{
        paddingTop: insets.top + 8, paddingHorizontal: 16,
        flexDirection: 'row', gap: 10, alignItems: 'center',
      }}>
        {/* Search */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center',
          backgroundColor: C.grayLight, borderRadius: 50, height: 46,
          paddingHorizontal: 16, gap: 10 }}>
          <Svg width={18} height={18} viewBox="0 0 22 22" fill="none">
            <Circle cx="10" cy="10" r="7" stroke={C.grayText} strokeWidth={1.5} />
            <Line x1="15.5" y1="15.5" x2="20" y2="20"
              stroke={C.grayText} strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
          <TextInput
            style={{ flex: 1, fontSize: 15, color: C.nearBlack }}
            placeholder="Search places..."
            placeholderTextColor={C.grayText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity activeOpacity={0.85} onPress={() => setSearchQuery('')}>
              <Svg width={14} height={14} viewBox="0 0 14 14">
                <Path d="M2 2l10 10M12 2L2 12" stroke={C.grayText} strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </TouchableOpacity>
          )}
        </View>

        {/* Toggle */}
        <Animated.View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: toggleBtnBg,
          justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setViewMode(v => v === 'list' ? 'map' : 'list');
              setSelectedPlace(null);
            }}
            style={{ width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' }}>
            {viewMode === 'list' ? (
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Path d="M10 2C6.69 2 4 4.69 4 8c0 4.88 6 10 6 10s6-5.12 6-10c0-3.31-2.69-6-6-6z"
                  stroke={C.grayText} strokeWidth={1.5} strokeLinejoin="round" />
                <Circle cx="10" cy="8" r="2.5" stroke={C.grayText} strokeWidth={1.5} />
              </Svg>
            ) : (
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Path d="M3 5h14M3 10h14M3 15h14"
                  stroke={C.white} strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Row 2 — Count + Sort (list only) */}
      {viewMode === 'list' && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 10, marginBottom: 8, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.nearBlack }}>Places</Text>
            <Text style={{ fontSize: 13, color: C.grayText, marginStart: 8 }}>
              ({filteredCount} results)
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.85} onPress={() => setShowSort(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.nearBlack }}>Sort by</Text>
            <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <Path d="M3 5l4 4 4-4" stroke={C.nearBlack} strokeWidth={1.5}
                strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter bar */}
      <View style={{ paddingBottom: 12 }}>
        {/* Category pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, marginTop: 10, gap: 0 }}>
          {PILL_CATEGORIES.map(item => (
            <CategoryPillItem
              key={item.slug}
              item={item}
              isActive={activeCategory === item.slug}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveCategory(item.slug);
              }}
            />
          ))}
        </ScrollView>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, marginTop: 8, gap: 8, flexDirection: 'row', alignItems: 'center' }}>
          {/* Price */}
          <FilterChip
            active={!!priceFilter}
            label={priceFilter ? priceChipLabel.split('  ')[0] : 'Price'}
            onPress={() => setShowPriceSheet(true)}
            onClear={() => setPriceFilter(null)}
            icon={
              <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                <Circle cx="7" cy="7" r="6" stroke={priceFilter ? C.gold : C.grayText} strokeWidth={1.4} />
                <Path d="M7 3.5v7M5 5.5c0-1.1.9-2 2-2s2 .9 2 2-2 1.5-2 1.5-2 .4-2 1.5.9 2 2 2 2-.9 2-2"
                  stroke={priceFilter ? C.gold : C.grayText} strokeWidth={1.3} strokeLinecap="round" />
              </Svg>
            }
          />

          {/* Partners */}
          <FilterChip
            active={partnersOnly}
            label="Partners"
            onPress={() => { setPartnersOnly(v => !v); Haptics.selectionAsync(); }}
            icon={
              <Svg width={14} height={14} viewBox="0 0 24 24">
                <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill={partnersOnly ? C.gold : 'none'}
                  stroke={partnersOnly ? C.gold : C.grayText}
                  strokeWidth={1.5} />
              </Svg>
            }
          />

          {hasActiveFilters && (
            <TouchableOpacity activeOpacity={0.85} onPress={clearAllFilters}
              style={{ paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: C.gold }}>Clear all</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>
      {renderHeader()}

      {viewMode === 'list' ? (
        /* ── LIST VIEW ─────────────────────────────────────────────────── */
        <FlatList
          data={filteredPlaces}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 16, gap: 12, marginBottom: 12 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
          windowSize={10}
          maxToRenderPerBatch={10}
          getItemLayout={(_data, index) => ({
            length: 240,
            offset: 240 * Math.floor(index / 2),
            index,
          })}
          ListEmptyComponent={<EmptyState onClear={clearAllFilters} />}
          renderItem={({ item }) => (
            <PlaceCard place={item} savedIds={savedIds} onToggleSave={toggleSave} />
          )}
        />
      ) : (
        /* ── MAP VIEW ──────────────────────────────────────────────────── */
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={cityRegion}
            region={locationMode === 'city' ? cityRegion : undefined}
            showsUserLocation={locationMode === 'user'}
            showsMyLocationButton={false}
            onPress={deselectPlace}
          >
            {mappablePlaces.map(place => (
              <MapMarker
                key={place.id}
                place={place}
                isSelected={selectedPlace?.id === place.id}
                onPress={() => selectMarker(place)}
              />
            ))}
          </MapView>

          {/* Use my location pill */}
          <View style={{ position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center' }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={locationMode === 'user' ? resetToCity : handleUseMyLocation}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: locationMode === 'user' ? C.gold : C.white,
                borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9,
                shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
              }}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="4"
                  stroke={locationMode === 'user' ? C.white : C.gold} strokeWidth={1.5} />
                <Path d="M12 2v3M12 19v3M2 12h3M19 12h3"
                  stroke={locationMode === 'user' ? C.white : C.gold}
                  strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
              <Text style={{ fontSize: 13, fontWeight: '600',
                color: locationMode === 'user' ? C.white : C.nearBlack }}>
                {locationMode === 'user' ? 'My location' : 'Use my location'}
              </Text>
              {locationMode === 'user' && (
                <TouchableOpacity onPress={resetToCity}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                  <Svg width={14} height={14} viewBox="0 0 14 14">
                    <Path d="M2 2l10 10M12 2L2 12"
                      stroke={C.white} strokeWidth={1.8} strokeLinecap="round" />
                  </Svg>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          {/* Selected place card */}
          {selectedPlace && (
            <SelectedPlaceCard place={selectedPlace} onClose={deselectPlace} />
          )}

          {/* Floating "View list" button */}
          <View style={{ position: 'absolute', bottom: insets.bottom + 28, left: 0, right: 0, alignItems: 'center' }}>
            <TouchableOpacity activeOpacity={0.85}
              onPress={() => { setViewMode('list'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: C.white, borderRadius: 25,
                paddingHorizontal: 20, paddingVertical: 12,
                shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
              }}>
              <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                <Path d="M2 4h12M2 8h12M2 12h12"
                  stroke={C.nearBlack} strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.nearBlack }}>View list</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <SortSheet
        visible={showSort}
        sortBy={sortBy}
        onSelect={(v) => setSortBy(v)}
        onClose={() => setShowSort(false)}
      />

      <PriceSheet
        visible={showPriceSheet}
        priceFilter={priceFilter}
        onApply={(v) => setPriceFilter(v)}
        onClose={() => setShowPriceSheet(false)}
      />
    </View>
  );
}
