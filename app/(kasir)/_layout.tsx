import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';

import { spacing } from '../../constants/DesignSystem';
export default function EmployeeTabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + spacing.lg;

  const insets = useSafeAreaInsets();
  const baseHeight = Platform.OS === 'ios' ? 90 : 70;
  const basePadBottom = Platform.OS === 'ios' ? 32 : 12;
  const tabBarInsetStyle = {
    height: baseHeight + insets.bottom,
    paddingBottom: basePadBottom + insets.bottom,
  } as const;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        // Modern Tab Bar Style
        tabBarStyle: [styles.tabBar, tabBarInsetStyle],
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIconStyle: styles.tabIcon,
      }}
    >
      {/* 1. Kasir / POS */}
      <Tabs.Screen
        name="transaksi"
        options={{
          title: 'Kasir',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="calculator" />
          ),
        }}
      />

      {/* 2. Manajemen Produk */}
      <Tabs.Screen
        name="produk"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="fast-food" />
          ),
        }}
      />

      {/* 3. Manajemen Stok & Penerimaan Barang */}
      <Tabs.Screen
        name="stok"
        options={{
          title: 'Stok',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="cube" />
          ),
        }}
      />

      {/* 4. Riwayat Penjualan */}
      <Tabs.Screen
        name="riwayat"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="receipt" />
          ),
        }}
      />

      {/* 5. Akun & Profil */}
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

// Modern Tab Icon Component
const TabIcon = React.memo(function TabIcon({
  focused,
  color,
  name,
}: {
  focused: boolean;
  color: string;
  name: React.ComponentProps<typeof Ionicons>['name'];
}) {
  const outlineName = `${name}-outline`;
  const iconName = (focused ? name : (outlineName as React.ComponentProps<typeof Ionicons>['name']));

  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
      <Ionicons name={iconName} size={22} color={color} />
    </View>
  );
});

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    
    // Tinggi yang ergonomis
    height: Platform.OS === 'ios' ? 90 : 70,
    paddingBottom: Platform.OS === 'ios' ? 32 : 12,
    paddingTop: 10,
    paddingHorizontal: 12,
    
    // Modern rounded corners
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    position: 'absolute',
  },

  tabItem: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },

  tabLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: 0.4,
  },

  // Icon Styles
  tabIcon: {
    marginBottom: 2,
  },

  iconWrapper: {
    width: 48,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    marginBottom: 2,
  },

  iconWrapperActive: {
    backgroundColor: '#E8F5E9',
  },
});