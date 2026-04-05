import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, FlatList } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { COLORS, SPACING } from '../../lib/theme';
import { loadCountries } from '../../lib/countryLoader';
import { useAppStore } from '../../store/appStore';

// ─── Row item ─────────────────────────────────────────────────────────────────
function Row({
  icon,
  label,
  sublabel,
  onPress,
  danger,
}: {
  icon:      React.ReactNode;
  label:     string;
  sublabel?: string;
  onPress?:  () => void;
  danger?:   boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        flexDirection:  'row',
        alignItems:     'center',
        paddingVertical: 14,
        paddingHorizontal: SPACING.screenPadding,
        backgroundColor: COLORS.white,
      }}
    >
      <View
        style={{
          width:           40,
          height:          40,
          borderRadius:    12,
          backgroundColor: COLORS.grayLight,
          justifyContent:  'center',
          alignItems:      'center',
          marginEnd:       14,
        }}
      >
        {icon}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: danger ? '#E74C3C' : COLORS.nearBlack }}>
          {label}
        </Text>
        {sublabel && (
          <Text style={{ fontSize: 12, color: COLORS.grayText, marginTop: 2 }}>{sublabel}</Text>
        )}
      </View>

      {/* Chevron */}
      <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Path d="M6 4 L10 8 L6 12" stroke={COLORS.grayBorder} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: COLORS.grayLight, marginStart: SPACING.screenPadding + 54 }} />;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize:      11,
        fontWeight:    '600',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color:         COLORS.grayText,
        paddingHorizontal: SPACING.screenPadding,
        paddingTop:    24,
        paddingBottom: 8,
      }}
    >
      {title}
    </Text>
  );
}

type CountryOption = ReturnType<typeof loadCountries>[number];

function CountrySheet({
  visible,
  countries,
  activeCountry,
  onSelect,
  onClose,
}: {
  visible: boolean;
  countries: CountryOption[];
  activeCountry: string;
  onSelect: (country: CountryOption) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} />
      <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '78%', paddingBottom: 34 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.grayBorder, alignSelf: 'center', marginTop: 12, marginBottom: 10 }} />
        <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.nearBlack, paddingHorizontal: SPACING.screenPadding, marginBottom: 8 }}>
          Choose country
        </Text>
        <FlatList
          data={countries}
          keyExtractor={(item) => item.slug}
          renderItem={({ item }) => {
            const selected = item.slug === activeCountry;
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: SPACING.screenPadding,
                  paddingVertical: 14,
                }}
              >
                <Text style={{ fontSize: 20, marginEnd: 12 }}>{item.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: selected ? '700' : '600', color: selected ? COLORS.gold : COLORS.nearBlack }}>
                    {item.name_en}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.grayText, marginTop: 2 }}>
                    {item.name_fr}
                  </Text>
                </View>
                {selected && <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.gold }}>Active</Text>}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const ic = (node: React.ReactNode) => node;

export default function MoreScreen() {
  const [countrySheetVisible, setCountrySheetVisible] = useState(false);
  const countries = useMemo(() => loadCountries().filter((country) => country.is_active).sort((a, b) => a.display_order - b.display_order), []);
  const activeCountry = useAppStore((s) => s.activeCountry);
  const setActiveCountry = useAppStore((s) => s.setActiveCountry);
  const setCountry = useAppStore((s) => s.setCountry);
  const setActiveCity = useAppStore((s) => s.setActiveCity);
  const currentCountry = countries.find((country) => country.slug === activeCountry) ?? countries[0];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.grayLight }}>
      {/* Header */}
      <View
        style={{
          paddingTop:    52,
          paddingBottom: 16,
          paddingHorizontal: SPACING.screenPadding,
          backgroundColor: COLORS.white,
        }}
      >
        <Text style={{ fontSize: 26, fontWeight: '800', color: COLORS.nearBlack }}>More</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Account ── */}
        <SectionHeader title="Account" />
        <View style={{ backgroundColor: COLORS.white, borderRadius: 16, marginHorizontal: 16, overflow: 'hidden' }}>
          <Row
            label="Profile"
            sublabel="Name, photo, travel preferences"
            icon={
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Circle cx="10" cy="7" r="3.5" stroke={COLORS.nearBlack} strokeWidth={1.5} />
                <Path d="M3 17c0-3.31 3.13-6 7-6s7 2.69 7 6" stroke={COLORS.nearBlack} strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
            }
          />
          <Divider />
          <Row
            label="Language"
            sublabel="English"
            icon={
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Circle cx="10" cy="10" r="7.5" stroke={COLORS.nearBlack} strokeWidth={1.5} />
                <Path d="M10 2.5C10 2.5 7 6 7 10s3 7.5 3 7.5M10 2.5C10 2.5 13 6 13 10s-3 7.5-3 7.5M2.5 10h15" stroke={COLORS.nearBlack} strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
            }
          />
          <Divider />
          <Row
            label="Notifications"
            icon={
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Path d="M10 2a6 6 0 00-6 6v3l-1.5 2.5h15L16 11V8a6 6 0 00-6-6z" stroke={COLORS.nearBlack} strokeWidth={1.5} strokeLinejoin="round" />
                <Path d="M8.5 15.5a1.5 1.5 0 003 0" stroke={COLORS.nearBlack} strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
            }
          />
        </View>

        {/* ── App settings ── */}
        <SectionHeader title="App Settings" />
        <View style={{ backgroundColor: COLORS.white, borderRadius: 16, marginHorizontal: 16, overflow: 'hidden' }}>
          <Row
            label="Change Country"
            sublabel={currentCountry ? `${currentCountry.flag} ${currentCountry.name_en}` : 'Select your destination country'}
            onPress={() => setCountrySheetVisible(true)}
            icon={
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Path d="M3 8h14M3 12h14M5 4h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={COLORS.nearBlack} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            }
          />
          <Divider />
          <Row
            label="Appearance"
            sublabel="Light mode"
            icon={
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Circle cx="10" cy="10" r="3.5" stroke={COLORS.nearBlack} strokeWidth={1.5} />
                <Line x1="10" y1="1.5" x2="10" y2="3.5" stroke={COLORS.nearBlack} strokeWidth={1.5} strokeLinecap="round" />
                <Line x1="10" y1="16.5" x2="10" y2="18.5" stroke={COLORS.nearBlack} strokeWidth={1.5} strokeLinecap="round" />
                <Line x1="1.5" y1="10" x2="3.5" y2="10" stroke={COLORS.nearBlack} strokeWidth={1.5} strokeLinecap="round" />
                <Line x1="16.5" y1="10" x2="18.5" y2="10" stroke={COLORS.nearBlack} strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
            }
          />
          <Divider />
          <Row
            label="Currency"
            sublabel="USD — US Dollar"
            icon={
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Circle cx="10" cy="10" r="7.5" stroke={COLORS.nearBlack} strokeWidth={1.5} />
                <Path d="M10 5.5v9M7.5 7.5h3.75a1.75 1.75 0 010 3.5H8.75a1.75 1.75 0 000 3.5H13" stroke={COLORS.nearBlack} strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
            }
          />
          <Divider />
          <Row
            label="Offline Maps"
            icon={
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Path d="M2 5l6-2 4 2 6-2v12l-6 2-4-2-6 2V5z" stroke={COLORS.nearBlack} strokeWidth={1.5} strokeLinejoin="round" />
                <Line x1="8" y1="3" x2="8" y2="17" stroke={COLORS.nearBlack} strokeWidth={1.5} />
                <Line x1="12" y1="5" x2="12" y2="17" stroke={COLORS.nearBlack} strokeWidth={1.5} />
              </Svg>
            }
          />
        </View>

        {/* ── Legal & support ── */}
        <SectionHeader title="Support & Legal" />
        <View style={{ backgroundColor: COLORS.white, borderRadius: 16, marginHorizontal: 16, overflow: 'hidden' }}>
          <Row
            label="Help Center"
            icon={
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Circle cx="10" cy="10" r="7.5" stroke={COLORS.nearBlack} strokeWidth={1.5} />
                <Path d="M10 14v-1M10 10.5a2 2 0 10-2-2" stroke={COLORS.nearBlack} strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
            }
          />
          <Divider />
          <Row
            label="Privacy Policy"
            icon={
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Path d="M10 2L3.5 5v5c0 4.1 2.8 7.9 6.5 9 3.7-1.1 6.5-4.9 6.5-9V5L10 2z" stroke={COLORS.nearBlack} strokeWidth={1.5} strokeLinejoin="round" />
              </Svg>
            }
          />
          <Divider />
          <Row
            label="Terms of Service"
            icon={
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Path d="M5 3h10a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" stroke={COLORS.nearBlack} strokeWidth={1.5} />
                <Line x1="7" y1="8"  x2="13" y2="8"  stroke={COLORS.nearBlack} strokeWidth={1.5} strokeLinecap="round" />
                <Line x1="7" y1="11" x2="13" y2="11" stroke={COLORS.nearBlack} strokeWidth={1.5} strokeLinecap="round" />
                <Line x1="7" y1="14" x2="10" y2="14" stroke={COLORS.nearBlack} strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
            }
          />
          <Divider />
          <Row
            label="About MAP"
            sublabel="Version 1.0.0"
            icon={
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Circle cx="10" cy="10" r="7.5" stroke={COLORS.nearBlack} strokeWidth={1.5} />
                <Line x1="10" y1="9" x2="10" y2="14" stroke={COLORS.nearBlack} strokeWidth={1.5} strokeLinecap="round" />
                <Circle cx="10" cy="6.5" r="0.75" fill={COLORS.nearBlack} />
              </Svg>
            }
          />
        </View>

        {/* ── Sign out ── */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 16, marginHorizontal: 16, marginTop: 24, overflow: 'hidden' }}>
          <Row
            label="Sign Out"
            danger
            icon={
              <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                <Path d="M8 17H4a1 1 0 01-1-1V4a1 1 0 011-1h4" stroke="#E74C3C" strokeWidth={1.5} strokeLinecap="round" />
                <Path d="M13 14l4-4-4-4M17 10H8" stroke="#E74C3C" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            }
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <CountrySheet
        visible={countrySheetVisible}
        countries={countries}
        activeCountry={activeCountry}
        onSelect={(country) => {
          setActiveCountry(country.slug);
          setCountry(country.name_en);
          setActiveCity(null);
        }}
        onClose={() => setCountrySheetVisible(false)}
      />
    </View>
  );
}
