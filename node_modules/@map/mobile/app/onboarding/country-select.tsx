import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { COLORS, SPACING, SHADOWS } from '../../lib/theme';
import { useAppStore } from '../../store/appStore';
import DestinationCard from '../../components/shared/DestinationCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Destination data ─────────────────────────────────────────────────────────
// `image` accepts:
//   • Remote URL  → { uri: 'https://...' }           (used here, no install needed)
//   • Local asset → require('../../assets/morocco.jpg') (replace when you have own photos)
//
// Unsplash free-tier URLs — append ?w=400&q=80 for optimized delivery.
// Attribution required in production: https://unsplash.com/license

type Destination = {
  slug:    string;
  name:     string;
  flag:     string;
  gradient: [string, string];
  image:    { uri: string };
};

const POPULAR: Destination[] = [
  {
    slug: 'morocco',
    name: 'Morocco', flag: '🇲🇦', gradient: ['#C94B0E', '#8B2500'],
    image: { uri: 'https://images.unsplash.com/photo-1489493585363-d69421e0edd3?w=400&q=80' },
  },
  {
    slug: 'usa',
    name: 'USA', flag: '🇺🇸', gradient: ['#1B3A6B', '#C0392B'],
    image: { uri: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&q=80' },
  },
  {
    slug: 'canada',
    name: 'Canada', flag: '🇨🇦', gradient: ['#1A472A', '#C0392B'],
    image: { uri: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=400&q=80' },
  },
  {
    slug: 'mexico',
    name: 'Mexico', flag: '🇲🇽', gradient: ['#2D6A1F', '#B8860B'],
    image: { uri: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=400&q=80' },
  },
];

const MORE: Destination[] = [
  {
    slug: 'italy',
    name: 'Italy', flag: '🇮🇹', gradient: ['#2980B9', '#1A5276'],
    image: { uri: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&q=80' },
  },
  {
    slug: 'portugal',
    name: 'Portugal', flag: '🇵🇹', gradient: ['#16A085', '#1ABC9C'],
    image: { uri: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&q=80' },
  },
  {
    slug: 'uae',
    name: 'UAE', flag: '🇦🇪', gradient: ['#7D3C98', '#2C3E50'],
    image: { uri: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80' },
  },
  {
    slug: 'france',
    name: 'France', flag: '🇫🇷', gradient: ['#2471A3', '#C0392B'],
    image: { uri: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=80' },
  },
];

export default function ChooseDestinationScreen() {
  const setCountry            = useAppStore((s) => s.setCountry);
  const setActiveCountry      = useAppStore((s) => s.setActiveCountry);
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);

  const [selected, setSelected] = useState<string | null>(null);

  const dotWidth     = useRef(new Animated.Value(8)).current;
  const btnScale     = useRef(new Animated.Value(1)).current;
  const firstSelect  = useRef(true);

  // Active step-dot morphs circle → pill on mount
  useEffect(() => {
    Animated.spring(dotWidth, { toValue: 20, tension: 180, friction: 8, useNativeDriver: false }).start();
  }, []);

  const handleSelect = useCallback((name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(name);

    if (firstSelect.current) {
      firstSelect.current = false;
      Animated.sequence([
        Animated.timing(btnScale, { toValue: 0.95, duration: 0,   useNativeDriver: true }),
        Animated.spring(btnScale,  { toValue: 1,    tension: 160, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, []);

  const handleContinue = () => {
    if (!selected) return;
    setCountry(selected);
    const selectedSlug = [...POPULAR, ...MORE].find((dest) => dest.name === selected)?.slug;
    if (selectedSlug) setActiveCountry(selectedSlug);
    setOnboardingComplete(true);
    router.replace('/(main)/explore');
  };

  // Split MORE into 2-column rows
  const moreRows: typeof MORE[] = [];
  for (let i = 0; i < MORE.length; i += 2) moreRows.push(MORE.slice(i, i + 2));

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* ── Top bar (static) ─────────────────────────────────────── */}
      <View
        style={{
          paddingHorizontal: SPACING.screenPadding,
          paddingTop:        52,
          paddingBottom:     12,
          flexDirection:     'row',
          justifyContent:    'space-between',
          alignItems:        'center',
          backgroundColor:   COLORS.white,
        }}
      >
        {/* Back */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()}>
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path
              d="M15 18 L9 12 L15 6"
              stroke={COLORS.nearBlack}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </TouchableOpacity>

        {/* Step dots */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Animated.View style={{ width: dotWidth, height: 8, borderRadius: 4, backgroundColor: COLORS.gold }} />
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.grayBorder }} />
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.grayBorder }} />
        </View>

        {/* Skip */}
        <TouchableOpacity activeOpacity={0.8} onPress={handleContinue}>
          <Text style={{ fontSize: 14, color: COLORS.grayText }}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* ── Scrollable content ──────────────────────────────────── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Heading */}
        <View style={{ paddingHorizontal: SPACING.screenPadding, marginTop: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: COLORS.nearBlack, lineHeight: 36 }}>
            What's your next
          </Text>
          <Text style={{ fontSize: 34, fontWeight: '800', color: COLORS.gold, lineHeight: 42 }}>
            destination?
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.grayText, marginTop: 6 }}>
            We'll personalize your experience
          </Text>
        </View>

        {/* Search bar */}
        <View style={{ paddingHorizontal: SPACING.screenPadding, marginTop: 20 }}>
          <View
            style={{
              flexDirection:    'row',
              alignItems:       'center',
              backgroundColor:  COLORS.grayLight,
              borderRadius:     50,
              height:           48,
              paddingHorizontal: 20,
              ...SHADOWS.searchBar,
            }}
          >
            <Svg width={18} height={18} viewBox="0 0 18 18">
              <Circle cx="8" cy="8" r="5.5" stroke={COLORS.grayText} strokeWidth={1.5} fill="none" />
              <Line x1="12.5" y1="12.5" x2="16" y2="16" stroke={COLORS.grayText} strokeWidth={1.5} strokeLinecap="round" />
            </Svg>
            <TextInput
              placeholder="Search a country..."
              placeholderTextColor={COLORS.grayText}
              style={{
                fontSize:        15,
                color:           COLORS.nearBlack,
                flex:            1,
                marginStart:     8,
                backgroundColor: 'transparent',
              }}
            />
          </View>
        </View>

        {/* Section 1 — Popular */}
        <View style={{ marginTop: SPACING.sectionGap }}>
          <Text
            style={{
              fontSize:        11,
              fontWeight:      '600',
              letterSpacing:   1.2,
              textTransform:   'uppercase',
              color:           COLORS.gold,
              marginBottom:    14,
              paddingHorizontal: SPACING.screenPadding,
            }}
          >
            Popular Destinations
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: SPACING.screenPadding }}
          >
            {POPULAR.map((dest) => (
              <DestinationCard
                key={dest.name}
                {...dest}
                selected={selected === dest.name}
                onPress={() => handleSelect(dest.name)}
                isLandscape={false}
              />
            ))}
          </ScrollView>
        </View>

        {/* Section 2 — More (2-column grid) */}
        <View style={{ marginTop: SPACING.sectionGap, paddingHorizontal: SPACING.screenPadding }}>
          <Text
            style={{
              fontSize:      11,
              fontWeight:    '600',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color:         COLORS.grayText,
              marginBottom:  14,
            }}
          >
            More Destinations
          </Text>
          {moreRows.map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
              {row.map((dest) => (
                <DestinationCard
                  key={dest.name}
                  {...dest}
                  selected={selected === dest.name}
                  onPress={() => handleSelect(dest.name)}
                  isLandscape
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── Sticky Continue button ──────────────────────────────── */}
      <View
        style={{
          position:         'absolute',
          bottom:           0,
          width:            '100%',
          backgroundColor:  COLORS.white,
          paddingHorizontal: SPACING.screenPadding,
          paddingTop:       12,
          paddingBottom:    34,
          borderTopWidth:   1,
          borderTopColor:   COLORS.grayLight,
        }}
      >
        <Animated.View
          style={{
            borderRadius: 12,
            transform:    [{ scale: btnScale }],
            ...(selected ? SHADOWS.button : {}),
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={!selected}
            onPress={handleContinue}
            style={{
              height:          56,
              borderRadius:    12,
              backgroundColor: selected ? COLORS.gold : COLORS.grayBorder,
              justifyContent:  'center',
              alignItems:      'center',
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: selected ? COLORS.white : COLORS.grayText }}>
              Continue
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}
