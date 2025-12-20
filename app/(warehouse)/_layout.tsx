import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function WarehouseTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary, // Hijau saat aktif
        tabBarInactiveTintColor: '#B0BEC5', // Abu soft saat tidak aktif
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true, // Sembunyikan tab saat keyboard muncul
        
        // Style Tab Bar Modern (Green Pill Design)
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {/* 1. Dashboard Gudang */}
      <Tabs.Screen
        name="overview"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="grid" />
          ),
        }}
      />

      {/* 2. Barang Masuk */}
      <Tabs.Screen
        name="barang-masuk"
        options={{
          title: 'Masuk',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="arrow-down-circle" />
          ),
        }}
      />

      {/* 3. Barang Keluar */}
      <Tabs.Screen
        name="barang-keluar"
        options={{
          title: 'Keluar',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="arrow-up-circle" />
          ),
        }}
      />

      {/* 4. Stok Opname */}
      <Tabs.Screen
        name="stok-opname"
        options={{
          title: 'Opname',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="clipboard" />
          ),
        }}
      />

      {/* 5. Profile & Pengaturan (Logout disini) - PENTING: File ini harus ada */}
      <Tabs.Screen
        name="profile"
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

// Komponen Helper untuk Icon dengan Efek "Green Pill"
// Ini memastikan tampilan 100% konsisten dengan Owner & Karyawan
const TabIcon = ({ focused, color, name }: { focused: boolean; color: string; name: keyof typeof Ionicons.glyphMap }) => {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Ionicons 
        name={focused ? name : (name + '-outline') as any} 
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
    elevation: 10, // Shadow Android
    shadowColor: '#000', // Shadow iOS
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    
    // Tinggi responsif
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 10,
  },
  tabItem: {
    paddingVertical: 4, 
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  
  // Icon Styles (Green Pill Effect)
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    marginBottom: 2,
  },
  iconContainerActive: {
    backgroundColor: '#E8F5E9', // Green Pill Background (Soft Green)
    transform: [{ scale: 1.05 }], 
  },
});