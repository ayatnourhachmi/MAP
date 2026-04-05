import React from 'react';
import { View, Text, StyleProp, ViewStyle, TextStyle, Platform } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { COLORS } from '../../lib/theme';

interface MapLogoProps {
  size?: number;
  showText?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  iconColor?: string;
  wordmarkColor?: string;
}

export default function MapLogo({
  size = 44,
  showText = true,
  style,
  textStyle,
  iconColor = COLORS.gold,
  wordmarkColor = COLORS.gold,
}: MapLogoProps) {
  const iconSize = size;
  const wordmarkSize = Math.max(16, Math.round(size * 0.48));
  const wordmarkFontFamily = Platform.select({
    ios: 'Avenir Next Condensed',
    android: 'sans-serif-condensed',
    default: 'System',
  });

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={iconSize} height={iconSize} viewBox="0 0 72 72">
        <Circle cx="36" cy="36" r="30" stroke={iconColor} strokeWidth="2.5" fill="none" />
        <Line x1="36" y1="8" x2="36" y2="14" stroke={iconColor} strokeWidth="2" strokeLinecap="round" />
        <Line x1="36" y1="58" x2="36" y2="64" stroke={iconColor} strokeWidth="2" strokeLinecap="round" />
        <Line x1="8" y1="36" x2="14" y2="36" stroke={iconColor} strokeWidth="2" strokeLinecap="round" />
        <Line x1="58" y1="36" x2="64" y2="36" stroke={iconColor} strokeWidth="2" strokeLinecap="round" />
        <Path d="M36 18L45 36L36 42L27 36L36 18Z" fill={iconColor} opacity={0.18} />
        <Path d="M36 20L43.5 35.5L36 39L28.5 35.5L36 20Z" fill={iconColor} />
        <Path d="M36 39L43.5 36L36 52L28.5 36L36 39Z" fill={COLORS.nearBlack} opacity={0.92} />
        <Circle cx="36" cy="36" r="3" fill={COLORS.white} stroke={iconColor} strokeWidth="2" />
      </Svg>

      {showText && (
        <Text
          style={[
            {
              marginLeft: 10,
              fontSize: wordmarkSize,
              fontWeight: '900',
              fontFamily: wordmarkFontFamily,
              letterSpacing: size >= 44 ? 3.2 : 2.2,
              color: wordmarkColor,
              textTransform: 'none',
            },
            textStyle,
          ]}
        >
          My Atlas Pass
        </Text>
      )}
    </View>
  );
}
