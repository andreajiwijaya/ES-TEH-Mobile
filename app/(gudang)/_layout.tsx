import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function WarehouseTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#B0BEC5',
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        // FIX: unmountOnBlur dihapus dari sini karena menyebabkan error TS2353
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

      {/* 2. Permintaan (Inbox Approval) */}
      <Tabs.Screen
        name="permintaan"
        options={{
          title: 'Request',
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
      <Tabs.Screen name="opname" options={{ href: null }} />
      <Tabs.Screen name="bahan" options={{ href: null }} />

    </Tabs>
  );
}

const TabIcon = ({ focused, color, name }: { focused: boolean; color: string; name: keyof typeof Ionicons.glyphMap }) => {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Ionicons 
        name={focused ? name : (`${name}-outline` as any)} 
        size={22} 
        color={color} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0, 
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    height: Platform.OS === 'ios' ? 90 : 70,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    paddingTop: 10,
  },
  tabItem: { paddingVertical: 4 },
  tabLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  iconContainer: {
    width: 42, height: 42, alignItems: 'center', justifyContent: 'center',
    borderRadius: 21, marginBottom: 2,
  },
  iconContainerActive: {
    backgroundColor: '#E8F5E9',
    transform: [{ scale: 1.1 }],
  },
});