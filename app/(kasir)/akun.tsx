import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { User, Outlet } from '../../types';
import { authAPI } from '../../services/api';

export default function AkunScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load profile setiap kali halaman difokuskan
  const loadProfile = useCallback(async () => {
    try {
      const rawUser = await AsyncStorage.getItem('@user_data');
      if (rawUser) {
        const parsedUser: User = JSON.parse(rawUser);
        setUser(parsedUser);

        if (parsedUser.outlet) {
          setOutlet(parsedUser.outlet);
        } else if (parsedUser.outlet_id) {
          setOutlet({
            id: parsedUser.outlet_id,
            nama: `Outlet #${parsedUser.outlet_id}`,
            alamat: '-',
            is_active: true,
          });
        }
      }
    } catch (error) {
      console.error('Gagal memuat profil', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleLogout = async () => {
    Alert.alert(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin mengakhiri sesi ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar Sekarang',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await authAPI.logout(); // Endpoint 3: Logout
            } catch (error) {
              console.log('Logout API error:', error);
            } finally {
              await AsyncStorage.multiRemove(['@auth_token', '@user_data']);
              setIsLoggingOut(false);
              router.replace('/(auth)/login');
            }
          },
        },
      ]
    );
  };

  const InfoItem = ({ icon, label, value, isLast = false }: { icon: any, label: string, value: string, isLast?: boolean }) => (
    <View style={[styles.infoItem, isLast && styles.infoItemLast]}>
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
      </View>
      <View style={styles.infoTextContainer}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* Header Background Modern */}
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Profil Saya</Text>
            <Text style={styles.headerSubtitle}>Kelola informasi akun dan sesi</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Kartu Profil Utama */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {user?.username?.substring(0, 2).toUpperCase() || 'KS'}
                </Text>
            </View>
            <View style={styles.statusOnline} />
          </View>
          <Text style={styles.profileName}>{user?.username || 'Pengguna'}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color={Colors.primary} style={{marginRight: 6}} />
            <Text style={styles.roleText}>
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Karyawan'}
            </Text>
          </View>
        </View>

        {/* Section: Informasi Akun */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>DETAIL PENGGUNA</Text>
          <View style={styles.card}>
            <InfoItem 
                icon="person-outline" 
                label="Username" 
                value={user?.username || '-'} 
            />
            <InfoItem 
                icon="finger-print-outline" 
                label="User ID" 
                value={`#${user?.id || '-'}`} 
            />
            <InfoItem 
                icon="briefcase-outline" 
                label="Status Karyawan" 
                value="Aktif" 
                isLast
            />
          </View>
        </View>

        {/* Section: Informasi Outlet */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>LOKASI BERTUGAS</Text>
          <View style={styles.card}>
            <InfoItem 
                icon="storefront-outline" 
                label="Nama Outlet" 
                value={outlet?.nama || '-'} 
            />
            <InfoItem 
                icon="location-outline" 
                label="Alamat Penempatan" 
                value={outlet?.alamat || '-'} 
                isLast
            />
          </View>
        </View>

        {/* Tombol Logout */}
        <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            disabled={isLoggingOut}
        >
            {isLoggingOut ? (
                <ActivityIndicator color={Colors.error} />
            ) : (
                <>
                    <Ionicons name="log-out-outline" size={22} color={Colors.error} />
                    <Text style={styles.logoutText}>Keluar dari Aplikasi</Text>
                </>
            )}
        </TouchableOpacity>

        <View style={styles.footer}>
            <Text style={styles.versionText}>Es Teh POS App v1.0.0</Text>
            <Text style={styles.footerSub}>Pekanbaru, Indonesia</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerBackground: {
    backgroundColor: Colors.primary,
    height: 180,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scrollView: {
    flex: 1,
    marginTop: -60,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
    elevation: 3,
  },
  statusOnline: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#999',
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  infoItemLast: {
    borderBottomWidth: 0,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    borderRadius: 20,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#FFEBEB',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#E53935',
    marginLeft: 10,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  versionText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '700',
  },
  footerSub: {
    color: '#CCC',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  }
});