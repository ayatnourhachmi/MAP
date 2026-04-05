import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../../lib/theme';
import MapLogo from '../../components/shared/MapLogo';

export default function SplashScreen() {
  const progressAnim  = useRef(new Animated.Value(0)).current;
  const compassRot    = useRef(new Animated.Value(0)).current;
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const logoTranslate = useRef(new Animated.Value(20)).current;
  const tagOpacity    = useRef(new Animated.Value(0)).current;
  const tagTranslate  = useRef(new Animated.Value(20)).current;
  const subOpacity    = useRef(new Animated.Value(0)).current;
  const subTranslate  = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Staggered entrance: logo → tagline → subtitle
    Animated.stagger(180, [
      Animated.parallel([
        Animated.timing(logoOpacity,   { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(logoTranslate, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(tagOpacity,   { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(tagTranslate, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(subOpacity,   { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(subTranslate, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    // Compass pendulum loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(compassRot, { toValue: -1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(compassRot, { toValue: 1,  duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(compassRot, { toValue: 0,  duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Progress bar fill over 2 s
    Animated.timing(progressAnim, {
      toValue: 140,
      duration: 2000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    // Navigate after 2.5 s
    const timer = setTimeout(() => router.replace('/onboarding/welcome'), 2500);
    return () => clearTimeout(timer);
  }, []);

  const compassRotDeg = compassRot.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <Animated.View style={{ transform: [{ rotate: compassRotDeg }] }}>
        <MapLogo size={56} showText />
      </Animated.View>

      {/* MAP wordmark */}
      <Animated.Text
        style={{
          fontSize: 80,
          fontWeight: '900',
          color: COLORS.nearBlack,
          letterSpacing: -4,
          marginTop: 16,
          opacity: logoOpacity,
          transform: [{ translateY: logoTranslate }],
        }}
      >
        MAP
      </Animated.Text>

      {/* My Atlas Pass */}
      <Animated.Text
        style={{
          fontSize: 18,
          fontWeight: '500',
          color: COLORS.gold,
          letterSpacing: 4,
          marginTop: 4,
          opacity: tagOpacity,
          transform: [{ translateY: tagTranslate }],
        }}
      >
        My Atlas Pass
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text
        style={{
          fontSize: 14,
          color: COLORS.grayText,
          marginTop: 8,
          opacity: subOpacity,
          transform: [{ translateY: subTranslate }],
        }}
      >
        Your intelligent travel companion
      </Animated.Text>

      {/* Progress bar */}
      <View style={{ marginTop: 60, alignItems: 'center' }}>
        <View style={{ width: 200, height: 3, backgroundColor: COLORS.grayBorder, borderRadius: 2, overflow: 'hidden' }}>
          <Animated.View
            style={{ height: 3, borderRadius: 2, backgroundColor: COLORS.gold, width: progressAnim }}
          />
        </View>
        <Text style={{ fontSize: 11, color: COLORS.grayText, letterSpacing: 2, marginTop: 8 }}>
          LOADING...
        </Text>
      </View>
    </View>
  );
}
