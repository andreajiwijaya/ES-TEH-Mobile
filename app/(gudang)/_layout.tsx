import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';

import { spacing } from '../../constants/DesignSystem';
export default function WarehouseTabsLayout() {
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
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarStyle: [styles.tabBar, tabBarInsetStyle],
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {/* 1. Dashboard */}
      <Tabs.Screen
        name="beranda"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="grid" />
          ),
        }}
      />

      {/* 2. Permintaan */}
      <Tabs.Screen
        name="permintaan"
        options={{
          title: 'Permintaan',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="git-pull-request" />
          ),
        }}
      />

      {/* 3. Masuk */}
      <Tabs.Screen
        name="masuk"
        options={{
          title: 'Masuk',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="arrow-down-circle" />
          ),
        }}
      />

      {/* 4. Keluar */}
      <Tabs.Screen
        name="keluar"
        options={{
          title: 'Keluar',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="arrow-up-circle" />
          ),
        }}
      />

      {/* 5. Akun */}
      <Tabs.Screen
        name="akun"
        options={{
          title: 'Akun',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="person" />
          ),
        }}
      />

      {/* --- MENU TERSEMBUNYI --- */}
      <Tabs.Screen name="bahan" options={{ href: null }} />
      <Tabs.Screen name="kategori" options={{ href: null }} />

    </Tabs>
  );
}

const TabIcon = ({ 
  focused, 
  color, 
  name 
}: { 
  focused: boolean; 
  color: string; 
  name: keyof typeof Ionicons.glyphMap 
}) => {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Ionicons 
        name={focused ? name : (`${name}-outline` as any)} 
        size={24} 
        color={color} 
      />
      {focused && <View style={styles.activeIndicator} />}
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
    shadowOpacity: 0.08,
    shadowRadius: 12,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  tabItem: { 
    paddingVertical: 6,
  },
  tabLabel: { 
    fontSize: 11, 
    fontWeight: '700', 
    marginTop: 4,
    letterSpacing: 0.2,
  },
  iconContainer: {
    width: 48, 
    height: 48, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderRadius: 16,
    marginBottom: 2,
    position: 'relative',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 24,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
});