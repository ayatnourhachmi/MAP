import { View, Text } from 'react-native';
import { COLORS } from '../../lib/theme';

// TODO: list eSIM packages and pass products for selected country
export default function PassScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.nearBlack }}>My Pass</Text>
      <Text style={{ fontSize: 14, color: COLORS.grayText, marginTop: 6 }}>Coming soon</Text>
    </View>
  );
}
