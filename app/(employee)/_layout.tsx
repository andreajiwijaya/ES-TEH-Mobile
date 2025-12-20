import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function EmployeeTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary, // Hijau saat aktif
        tabBarInactiveTintColor: '#B0BEC5', // Abu soft saat tidak aktif
        tabBarShowLabel: true, 
        tabBarHideOnKeyboard: true, // Keyboard tidak menutupi tab
        
        // Style Tab Bar Modern (Sama dengan Owner)
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="transaksi"
        options={{
          title: 'Kasir',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="fast-food" />
          ),
        }}
      />
      <Tabs.Screen
        name="stok"
        options={{
          title: 'Stok',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="cube" />
          ),
        }}
      />
      <Tabs.Screen
        name="riwayat"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="receipt" />
          ),
        }}
      />
      <Tabs.Screen
        name="pengaturan"
        options={{
          title: 'Akun',
          tabBarIcon: ({ color, focused }) => (
            // Menggunakan icon 'person' agar konsisten dengan judul 'Akun'
            // dan sama dengan layout Owner
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
    backgroundColor: '#E8F5E9', // Background Hijau Muda Soft
    transform: [{ scale: 1.05 }], 
  },
});