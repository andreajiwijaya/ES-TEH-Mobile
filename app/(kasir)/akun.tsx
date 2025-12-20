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
  StatusBar
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
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await authAPI.logout();
            } catch (error) {
              console.log('Logout API error (ignored):', error);
            } finally {
              await AsyncStorage.multiRemove(['@auth_token', '@user_data']);
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
    backgroundColor: '#F8F9FA',
  },
  headerBackground: {
    backgroundColor: Colors.primary,
    height: 180,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.backgroundLight,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
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
    backgroundColor: Colors.backgroundLight,
    borderRadius: 24,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: Colors.backgroundLight,
    elevation: 2,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
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
    color: Colors.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoItemLast: {
    borderBottomWidth: 0,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D32F2F',
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.6,
    marginBottom: 20,
  },
});