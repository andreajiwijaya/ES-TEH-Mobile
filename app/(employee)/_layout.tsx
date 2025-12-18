import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function EmployeeTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Header di-handle oleh masing-masing screen
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#9CA3AF', // Abu-abu soft
        tabBarHideOnKeyboard: true, // PENTING: Sembunyikan tab saat keyboard muncul
        tabBarStyle: {
          backgroundColor: Colors.backgroundLight,
          borderTopWidth: 0, // Hilangkan garis border kasar
          elevation: 10, // Shadow untuk Android
          shadowColor: '#000', // Shadow untuk iOS
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          height: Platform.OS === 'ios' ? 85 : 65, // Sedikit lebih tinggi agar nyaman disentuh
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: Platform.OS === 'android' ? 5 : 0,
        },
      }}
    >
      {/* Tab 1: Transaksi (Kasir) */}
      <Tabs.Screen
        name="transaksi"
        options={{
          title: 'Kasir',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "fast-food" : "fast-food-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />

      {/* Tab 2: Stok Bahan */}
      <Tabs.Screen
        name="stok"
        options={{
          title: 'Stok',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "cube" : "cube-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />

      {/* Tab 3: Riwayat Penjualan */}
      <Tabs.Screen
        name="riwayat"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "receipt" : "receipt-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />

      {/* Tab 4: Pengaturan Akun */}
      <Tabs.Screen
        name="pengaturan"
        options={{
          title: 'Akun',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "settings" : "settings-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}