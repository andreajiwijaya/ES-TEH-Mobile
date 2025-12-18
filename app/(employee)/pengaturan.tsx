import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { User, Outlet } from '../../types';
import { authAPI } from '../../services/api'; 

export default function PengaturanScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // 1. Ambil data user dari penyimpanan lokal
      const rawUser = await AsyncStorage.getItem('@user_data');
      if (rawUser) {
        const parsedUser: User = JSON.parse(rawUser);
        setUser(parsedUser);

        // REVISI: Ambil data outlet langsung dari object user (local storage).
        // Tidak perlu call API getOutlet lagi karena bisa kena "403 Forbidden" untuk role Karyawan.
        if (parsedUser.outlet) {
            setOutlet(parsedUser.outlet);
        } else if (parsedUser.outlet_id) {
            // Jika di user object cuma ada ID, kita set dummy object sementara agar UI tidak kosong
            setOutlet({
                id: parsedUser.outlet_id,
                nama: `Outlet #${parsedUser.outlet_id}`,
                alamat: '-',
                is_active: true
            });
        }
      }
    } catch (error) {
      console.error('Gagal memuat profil', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin mengakhiri sesi ini?',
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              // Hapus token di server (opsional)
              await authAPI.logout();
            } catch (error) {
              console.log('Logout API error (ignored):', error);
            } finally {
              // Hapus data lokal & redirect
              await AsyncStorage.multiRemove(['@auth_token', '@user_data']);
              // Gunakan replace agar user tidak bisa back ke halaman ini
              router.replace('/(auth)/login');
            }
          },
        },
      ]
    );
  };

  // Komponen Helper untuk Baris Info
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
      {/* Header Background */}
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Pengaturan Akun</Text>
            <Text style={styles.headerSubtitle}>Kelola profil dan sesi anda</Text>
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
            <Text style={styles.avatarText}>
              {user?.username?.substring(0, 2).toUpperCase() || 'KS'}
            </Text>
          </View>
          <Text style={styles.profileName}>{user?.username || 'Pengguna'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Karyawan'}
            </Text>
          </View>
        </View>

        {/* Section: Informasi Akun */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>INFORMASI PRIBADI</Text>
          <View style={styles.card}>
            <InfoItem 
                icon="person-outline" 
                label="Username" 
                value={user?.username || '-'} 
            />
            <InfoItem 
                icon="id-card-outline" 
                label="User ID" 
                value={user?.id?.toString() || '-'} 
            />
            <InfoItem 
                icon="shield-checkmark-outline" 
                label="Role Akses" 
                value={user?.role?.toUpperCase() || '-'} 
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
                label="Alamat" 
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
                    <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                    <Text style={styles.logoutText}>Keluar Aplikasi</Text>
                </>
            )}
        </TouchableOpacity>

        <Text style={styles.versionText}>Es Teh POS App v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBackground: {
    backgroundColor: Colors.primary,
    height: 180,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.backgroundLight,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scrollView: {
    flex: 1,
    marginTop: -60,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 4,
    borderColor: Colors.backgroundLight,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 10,
    marginLeft: 5,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoItemLast: {
    borderBottomWidth: 0,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FFF0F0',
    borderRadius: 16,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFDbdB',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.error,
    marginLeft: 10,
  },
  versionText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 20,
  },
});