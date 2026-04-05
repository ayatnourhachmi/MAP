import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { COLORS } from '../../lib/theme';
import type { ChatMessage } from '../../store/appStore';
import SarahAvatar from './SarahAvatar';

interface Props {
  message: ChatMessage;
  isRTL?:  boolean;
}

export default function MessageBubble({ message, isRTL = false }: Props) {
  const isUser    = message.role === 'user';
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  if (isUser) {
    return (
      <Animated.View
        style={{
          opacity:      fadeAnim,
          transform:    [{ translateY: slideAnim }],
          alignSelf:    'flex-end',
          maxWidth:     '80%',
          marginBottom: 10,
          marginLeft:   40,
        }}
      >
        <View
          style={{
            backgroundColor:         COLORS.gold,
            borderRadius:            18,
            borderBottomRightRadius: 4,
            paddingHorizontal:       14,
            paddingVertical:         10,
          }}
        >
          <Text
            style={{
              fontSize:   15,
              lineHeight: 22,
              color:      COLORS.white,
              textAlign:  isRTL ? 'right' : 'left',
            }}
          >
            {message.content}
          </Text>
        </View>
        <Text
          style={{
            fontSize:  11,
            color:     COLORS.grayText,
            marginTop:  4,
            textAlign: 'right',
          }}
        >
          {formatTime(message.timestamp)}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={{
        opacity:       fadeAnim,
        transform:     [{ translateY: slideAnim }],
        flexDirection: 'row',
        alignItems:    'flex-end',
        alignSelf:     'flex-start',
        maxWidth:      '82%',
        marginBottom:  10,
        marginRight:   40,
      }}
    >
      <View style={{ marginRight: 8, marginBottom: 18 }}>
        <SarahAvatar size={30} />
      </View>

      <View style={{ flex: 1 }}>
        <View
          style={{
            backgroundColor:        message.isError ? '#FFF0F0' : COLORS.grayLight,
            borderRadius:           18,
            borderBottomLeftRadius: 4,
            paddingHorizontal:      14,
            paddingVertical:        10,
            borderWidth:            message.isError ? 1 : 0,
            borderColor:            message.isError ? '#FFCDD2' : undefined,
          }}
        >
          <Text
            style={{
              fontSize:   15,
              lineHeight: 22,
              color:      message.isError ? '#C62828' : COLORS.nearBlack,
              textAlign:  isRTL ? 'right' : 'left',
            }}
          >
            {message.content}
          </Text>
        </View>
        <Text
          style={{
            fontSize:  11,
            color:     COLORS.grayText,
            marginTop:  4,
            textAlign: 'left',
          }}
        >
          Sarah · {formatTime(message.timestamp)}
        </Text>

        {!!message.placeSuggestions?.length && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ marginTop: 8, paddingBottom: 2 }}
          >
            {message.placeSuggestions.map((p) => (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.85}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/place/${p.id}` as any);
                }}
                style={{
                  width: 180,
                  backgroundColor: COLORS.white,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: COLORS.grayBorder,
                  marginRight: 8,
                  overflow: 'hidden',
                }}
              >
                {p.image ? (
                  <Image source={{ uri: p.image }} style={{ width: '100%', height: 90 }} contentFit="cover" />
                ) : (
                  <View style={{ width: '100%', height: 90, backgroundColor: COLORS.grayLight }} />
                )}
                <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                  <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: COLORS.nearBlack }}>
                    {p.name}
                  </Text>
                  {!!p.neighborhood && (
                    <Text numberOfLines={1} style={{ fontSize: 11, color: COLORS.grayText, marginTop: 2 }}>
                      {p.neighborhood}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.goldDark }}>
                      ★ {p.rating ?? 'N/A'}
                    </Text>
                    {p.isPartner && (
                      <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.gold }}>MAP Partner</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Animated.View>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
