import { Tabs } from 'expo-router';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { COLORS } from '../../lib/theme';

// ─── Tab icons ────────────────────────────────────────────────────────────────

function ExploreIcon({ color }: { color: string }) {
  // Compass rose
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.5} />
      <Path
        d="M12 12 L15 7 L13 11 Z"
        fill={color}
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <Path
        d="M12 12 L9 17 L11 13 Z"
        fill={color}
        fillOpacity={0.35}
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="1.2" fill={color} />
    </Svg>
  );
}

function PlacesIcon({ color }: { color: string }) {
  // Map pin with dot
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="9" r="2.5" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function PassIcon({ color }: { color: string }) {
  // QR code
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {/* Top-left finder square */}
      <Rect x="3"  y="3"  width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
      <Rect x="5"  y="5"  width="3" height="3" fill={color} />
      {/* Top-right finder square */}
      <Rect x="14" y="3"  width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
      <Rect x="16" y="5"  width="3" height="3" fill={color} />
      {/* Bottom-left finder square */}
      <Rect x="3"  y="14" width="7" height="7" rx="1" stroke={color} strokeWidth={1.5} />
      <Rect x="5"  y="16" width="3" height="3" fill={color} />
      {/* Bottom-right data dots */}
      <Rect x="14" y="14" width="3" height="3" rx="0.5" fill={color} />
      <Rect x="18" y="14" width="3" height="3" rx="0.5" fill={color} />
      <Rect x="14" y="18" width="3" height="3" rx="0.5" fill={color} />
      <Rect x="18" y="18" width="3" height="3" rx="0.5" fill={color} />
    </Svg>
  );
}

function ConciergeIcon({ color }: { color: string }) {
  // AI chatbot — rounded speech bubble with 3 animated-style dots
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {/* Bubble body */}
      <Path
        d="M20 2H4a2 2 0 00-2 2v12a2 2 0 002 2h4l4 4 4-4h4a2 2 0 002-2V4a2 2 0 00-2-2z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Three dots inside */}
      <Circle cx="8"  cy="10" r="1.2" fill={color} />
      <Circle cx="12" cy="10" r="1.2" fill={color} />
      <Circle cx="16" cy="10" r="1.2" fill={color} />
    </Svg>
  );
}

function MoreIcon({ color }: { color: string }) {
  // Grid of 4 dots (2×2)
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x="4"  y="4"  width="6" height="6" rx="2" stroke={color} strokeWidth={1.5} />
      <Rect x="14" y="4"  width="6" height="6" rx="2" stroke={color} strokeWidth={1.5} />
      <Rect x="4"  y="14" width="6" height="6" rx="2" stroke={color} strokeWidth={1.5} />
      <Rect x="14" y="14" width="6" height="6" rx="2" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:             false,
        tabBarActiveTintColor:   COLORS.gold,
        tabBarInactiveTintColor: COLORS.grayText,
        tabBarStyle: {
          borderTopColor:  COLORS.grayBorder,
          backgroundColor: COLORS.white,
          height:          64,
          paddingBottom:   10,
          paddingTop:      4,
        },
        tabBarLabelStyle: {
          fontSize:      10,
          fontWeight:    '600',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <ExploreIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="places"
        options={{
          title: 'Places',
          tabBarIcon: ({ color }) => <PlacesIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="pass"
        options={{
          title: 'My Pass',
          tabBarIcon: ({ color }) => <PassIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="concierge"
        options={{
          title: 'Concierge',
          tabBarIcon: ({ color }) => <ConciergeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <MoreIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
