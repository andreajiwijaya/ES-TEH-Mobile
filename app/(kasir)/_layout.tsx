import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function EmployeeTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary, 
        tabBarInactiveTintColor: '#B0BEC5', 
        tabBarShowLabel: true, 
        tabBarHideOnKeyboard: true, 
        
        // Mengatur animasi perpindahan tab agar lebih smooth
        tabBarVisibilityAnimationConfig: {
            show: { animation: 'spring', config: { stiffness: 1000, damping: 500 } }
        },
        
        // Style Tab Bar Modern konsisten dengan Gudang
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
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

// Komponen Helper untuk Icon dengan Efek "Green Pill"
const TabIcon = ({ focused, color, name }: { focused: boolean; color: string; name: keyof typeof Ionicons.glyphMap }) => {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Ionicons 
        name={focused ? name : (`${name}-outline` as any)} 
        size={20} // Ukuran sedikit diperkecil agar proporsional dalam container
        color={color} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0, 
    elevation: 25, // Shadow Android diperkuat
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    
    // Tinggi yang lebih ergonomis
    height: Platform.OS === 'ios' ? 95 : 75,
    paddingBottom: Platform.OS === 'ios' ? 35 : 15,
    paddingTop: 12,
    borderTopLeftRadius: 25, // Membuat sudut atas tabbar agak melengkung
    borderTopRightRadius: 25,
    position: 'absolute', // Membuat tabbar terlihat melayang jika dikombinasikan dengan margin
  },
  tabItem: {
    paddingVertical: 4, 
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '800', // Font dipertebal agar mudah dibaca
    marginTop: 2,
    textTransform: 'uppercase', // Membuat label terlihat lebih profesional
    letterSpacing: 0.3,
  },
  
  // Icon Styles (Green Pill Effect)
  iconContainer: {
    width: 44,
    height: 32, // Bentuk lonjong (pill) bukan bulat sempurna agar lebih modern
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginBottom: 4,
  },
  iconContainerActive: {
    backgroundColor: '#E8F5E9', 
    transform: [{ scale: 1.15 }], 
  },
});