import React, { useEffect, useRef } from 'react';
import {
  Animated,
  TouchableOpacity,
  Text,
  Dimensions,
  ImageBackground,
  ImageSourcePropType,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { COLORS, SHADOWS, SPACING } from '../../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DestinationCardProps {
  name:         string;
  flag:         string;
  gradient:     [string, string, ...string[]];
  selected:     boolean;
  onPress:      () => void;
  isLandscape?: boolean;
  // Optional: pass a local require() or { uri: '...' } to show a real photo.
  // Falls back to gradient when omitted.
  image?:       ImageSourcePropType;
}

export default function DestinationCard({
  name,
  flag,
  gradient,
  selected,
  onPress,
  isLandscape = false,
  image,
}: DestinationCardProps) {
  const scaleAnim    = useRef(new Animated.Value(1)).current;
  const checkScale   = useRef(new Animated.Value(0)).current;
  const prevSelected = useRef(false);

  useEffect(() => {
    if (selected && !prevSelected.current) {
      Animated.spring(checkScale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start();
    } else if (!selected && prevSelected.current) {
      Animated.spring(checkScale, { toValue: 0, tension: 200, friction: 10, useNativeDriver: true }).start();
    }
    prevSelected.current = selected;
  }, [selected]);

  const onPressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.96, tension: 200, friction: 10, useNativeDriver: true }).start();

  const onPressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start();

  const cardWidth  = isLandscape
    ? (SCREEN_WIDTH - SPACING.screenPadding * 2 - 12) / 2
    : 120;
  const cardHeight = isLandscape ? 110 : 170;

  // ── Shared overlay + labels (rendered on top of photo OR gradient) ──
  const Overlays = () => (
    <>
      {/* 3-stop dark overlay — makes text readable over any photo */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.72)']}
        locations={[0, 0.4, 1]}
        style={{ position: 'absolute', bottom: 0, width: '100%', height: 90 }}
      />

      {/* Flag */}
      <Text style={{ position: 'absolute', top: 10, right: 10, fontSize: 20 }}>
        {flag}
      </Text>

      {/* Country name */}
      <Text
        style={{
          position:         'absolute',
          bottom:           10,
          left:             10,
          fontSize:         13,
          fontWeight:       '700',
          color:            COLORS.white,
          textShadowColor:  'rgba(0,0,0,0.4)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 4,
        }}
      >
        {name}
      </Text>

      {/* Gold checkmark — spring-in on select */}
      {selected && (
        <Animated.View
          style={{
            position:        'absolute',
            top:             8,
            left:            8,
            width:           22,
            height:          22,
            borderRadius:    11,
            backgroundColor: COLORS.gold,
            justifyContent:  'center',
            alignItems:      'center',
            transform:       [{ scale: checkScale }],
          }}
        >
          <Svg width={12} height={12} viewBox="0 0 12 12">
            <Path
              d="M2 6 L5 9 L10 3"
              stroke={COLORS.white}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Animated.View>
      )}
    </>
  );

  return (
    <Animated.View
      style={{
        transform:    [{ scale: scaleAnim }],
        borderWidth:  selected ? 2 : 0,
        borderColor:  COLORS.gold,
        borderRadius: 18,
        marginEnd:    isLandscape ? 0 : 12,
        marginBottom: isLandscape ? 12 : 0,
        ...SHADOWS.card,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{ width: cardWidth, height: cardHeight, borderRadius: 16, overflow: 'hidden' }}
      >
        {image ? (
          // ── Real photo ──────────────────────────────────────────────
          <ImageBackground
            source={image}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            // Show gradient while image loads
            defaultSource={undefined}
          >
            {/* Tint gradient on top of photo so gradient colours still hint the country */}
            <LinearGradient
              colors={[`${gradient[0]}33`, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
            <Overlays />
          </ImageBackground>
        ) : (
          // ── Gradient fallback (no photo provided) ───────────────────
          <View style={{ width: '100%', height: '100%' }}>
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: '100%', height: '100%' }}
            />
            <Overlays />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
