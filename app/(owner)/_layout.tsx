import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';

import { spacing } from '../../constants/DesignSystem';
export default function OwnerTabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + spacing.lg;

  const insets = useSafeAreaInsets();
  const baseHeight = Platform.OS === 'ios' ? 88 : 68;
  const basePadBottom = Platform.OS === 'ios' ? 28 : 10;
  const tabBarInsetStyle = {
    height: baseHeight + insets.bottom,
    paddingBottom: basePadBottom + insets.bottom,
  } as const;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarShowLabel: true,
        tabBarStyle: [styles.tabBar, tabBarInsetStyle],
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="beranda"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="stats-chart" />
          ),
        }}
      />
      <Tabs.Screen
        name="cabang"
        options={{
          title: 'Outlet',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="storefront" />
          ),
        }}
      />
      <Tabs.Screen
        name="pegawai"
        options={{
          title: 'Karyawan',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="people" />
          ),
        }}
      />
      <Tabs.Screen
        name="laporan"
        options={{
          title: 'Laporan',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="document-text" />
          ),
        }}
      />
      <Tabs.Screen
        name="akun"
        options={{
          title: 'Akun',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="person" />
          ),
        }}
      />
    </Tabs>
  );
}

// Komponen Helper untuk Icon dengan Efek Active
const TabIcon = ({ focused, color, name }: { focused: boolean; color: string; name: keyof typeof Ionicons.glyphMap }) => {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Ionicons 
        name={focused ? name : (name + '-outline') as any} 
        size={24} 
        color={color} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 8,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginBottom: 0,
  },
  iconContainerActive: {
    backgroundColor: '#E8F5E9',
    transform: [{ scale: 1.08 }],
  },
});