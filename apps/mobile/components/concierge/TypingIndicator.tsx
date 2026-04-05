import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { COLORS } from '../../lib/theme';

const DOT_SIZE  = 7;
const DOT_COLOR = COLORS.grayText;
const DELAY_MS  = 180;

function Dot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1,   duration: 350, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 350, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={{
        width:           DOT_SIZE,
        height:          DOT_SIZE,
        borderRadius:    DOT_SIZE / 2,
        backgroundColor: DOT_COLOR,
        opacity,
        marginHorizontal: 2,
      }}
    />
  );
}

export default function TypingIndicator() {
  return (
    <View
      style={{
        flexDirection:   'row',
        alignItems:      'center',
        backgroundColor: COLORS.grayLight,
        borderRadius:    18,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 14,
        paddingVertical:    10,
        alignSelf:       'flex-start',
      }}
    >
      <Dot delay={0} />
      <Dot delay={DELAY_MS} />
      <Dot delay={DELAY_MS * 2} />
    </View>
  );
}
