import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { router } from 'expo-router';
import { COLORS, SPACING, SHADOWS } from '../../lib/theme';
import MapLogo from '../../components/shared/MapLogo';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function WelcomeScreen() {
  const heroHeight  = SCREEN_HEIGHT * 0.58;
  const btnScale    = useRef(new Animated.Value(0.92)).current;
  const btnPressVal = useRef(new Animated.Value(1)).current;
  const videoRef    = useRef<Video | null>(null);

  useEffect(() => {
    Animated.spring(btnScale, {
      toValue: 1,
      tension: 120,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const onPressIn = () =>
    Animated.spring(btnPressVal, { toValue: 0.97, tension: 200, friction: 10, useNativeDriver: true }).start();

  const onPressOut = () =>
    Animated.spring(btnPressVal, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0)', 'rgba(232,201,122,0.14)', 'rgba(214,175,55,0.28)', 'rgba(139,69,19,0.38)']}
        locations={[0, 0.5, 0.8, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: SCREEN_HEIGHT * 0.42 }}
      />
      <StatusBar barStyle="light-content" />

      {/* ── Hero area ───────────────────────────────────────────────── */}
      <View style={{ height: heroHeight, overflow: 'hidden', backgroundColor: COLORS.white }}>

        {/* Frosted-glass pill badge */}
        <View
          style={{
            position: 'absolute',
            top: 44,
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 2,
          }}
        >
          <MapLogo size={38} showText textStyle={{ marginTop: 4, marginBottom: 14 }} />
        </View>

        {/* Avatar video card */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => videoRef.current?.replayAsync().catch(() => {})}
          style={{
            position: 'absolute',
            left: SPACING.screenPadding - 4,
            right: SPACING.screenPadding - 4,
            top: 106,
            height: heroHeight * 0.69,
            borderRadius: 30,
            backgroundColor: COLORS.white,
            borderWidth: 0,
            overflow: 'hidden',
            ...SHADOWS.card,
          }}
        >
          <Video
            ref={videoRef}
            source={require('../../assets/videos/welcome.mp4')}
            style={{ width: '100%', height: '100%', backgroundColor: COLORS.white }}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping={false}
            isMuted={false}
          />
        </TouchableOpacity>

      </View>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: SPACING.screenPadding, flex: 1, backgroundColor: 'transparent' }}>
        <Text style={{ fontSize: 30, fontWeight: '800', color: COLORS.nearBlack, lineHeight: 36, marginTop: 8 }}>
          Your next adventure
        </Text>
        <Text style={{ fontSize: 30, fontWeight: '800', color: COLORS.nearBlack, lineHeight: 36 }}>
          starts here
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.grayText, marginTop: 10, lineHeight: 22 }}>
          AI-powered concierge. Local knowledge. 6 languages.
        </Text>

        {/* CTA button */}
        <Animated.View
          style={{
            marginTop: 24,
            borderRadius: 12,
            transform: [{ scale: Animated.multiply(btnScale, btnPressVal) }],
            ...SHADOWS.button,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={() => router.push('/onboarding/country-select')}
            style={{
              height: 56,
              backgroundColor: COLORS.gold,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.white }}>
              Get started
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Sign-in row */}
        <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: COLORS.grayText }}>Already have an account? </Text>
          <TouchableOpacity activeOpacity={0.8}>
            <Text style={{ fontSize: 14, color: COLORS.gold, textDecorationLine: 'underline' }}>
              Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
