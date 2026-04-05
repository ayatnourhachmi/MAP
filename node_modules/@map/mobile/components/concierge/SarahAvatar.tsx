import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { COLORS } from '../../lib/theme';

interface Props {
  size?:      number;
  animate?:   boolean;  // pulse while typing
}

export default function SarahAvatar({ size = 40, animate = false }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animate) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate]);

  return (
    <Animated.View
      style={{
        width:     size,
        height:    size,
        transform: [{ scale: pulse }],
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Defs>
          <RadialGradient id="bg" cx="50%" cy="40%" r="60%">
            <Stop offset="0%"   stopColor={COLORS.goldLight} />
            <Stop offset="100%" stopColor={COLORS.goldDark}  />
          </RadialGradient>
        </Defs>

        {/* Background circle */}
        <Circle cx="20" cy="20" r="20" fill="url(#bg)" />

        {/* Subtle inner ring */}
        <Circle cx="20" cy="20" r="18" fill="none" stroke={COLORS.gold} strokeWidth="0.5" strokeOpacity="0.4" />

        {/* Head */}
        <Circle cx="20" cy="15" r="6.5" fill={COLORS.white} fillOpacity="0.92" />

        {/* Shoulders / body silhouette */}
        <Path
          d="M8 34 C8 26 12 23 20 23 C28 23 32 26 32 34"
          fill={COLORS.white}
          fillOpacity="0.92"
        />
      </Svg>

      {/* Gold dot indicator */}
      <View
        style={{
          position:        'absolute',
          bottom:          1,
          right:           1,
          width:           size * 0.275,
          height:          size * 0.275,
          borderRadius:    size * 0.15,
          backgroundColor: '#22C55E',   // green = online
          borderWidth:     1.5,
          borderColor:     COLORS.white,
        }}
      />
    </Animated.View>
  );
}
