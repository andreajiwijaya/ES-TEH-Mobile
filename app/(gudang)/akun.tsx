import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { authAPI } from '../../services/api';
import { Outlet, User } from '../../types';

// Skeleton Shimmer Component
const SkeletonShimmer = ({ width, height, borderRadius = 8, style }: any) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E0E0E0',
          opacity,
        },
        style,
      ]}
    />
  );
};

export default function WarehouseProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load profile setiap kali halaman difokuskan
  const loadProfile = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (!showRefreshIndicator) {
        setIsLoading(true);
      }

      // Fetch data dari API menggunakan endpoint /me
      const response = await authAPI.getMe();

      if (response.data?.user) {
        const userData = response.data.user;
        setUser(userData);

        // Update data ke AsyncStorage
        await AsyncStorage.setItem('@user_data', JSON.stringify(userData));

        // Set outlet data - hanya jika data lengkap dengan alamat
        if (userData.outlet && userData.outlet.alamat) {
          setOutlet(userData.outlet);
        }
      } else {
        // Fallback ke data lokal jika API gagal
        const rawUser = await AsyncStorage.getItem('@user_data');
        if (rawUser) {
          const parsedUser: User = JSON.parse(rawUser);
          setUser(parsedUser);

          if (parsedUser.outlet && parsedUser.outlet.alamat) {
            setOutlet(parsedUser.outlet);
          }
        }
      }
    } catch (error) {
      console.error('Gagal memuat profil', error);

      // Fallback ke data lokal
      try {
        const rawUser = await AsyncStorage.getItem('@user_data');
        if (rawUser) {
          const parsedUser: User = JSON.parse(rawUser);
          setUser(parsedUser);

          if (parsedUser.outlet && parsedUser.outlet.alamat) {
            setOutlet(parsedUser.outlet);
          }
        }
      } catch (localError) {
        console.error('Gagal memuat data lokal', localError);
      }
    } finally {
      setIsLoading(false);
      if (showRefreshIndicator) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadProfile(true);
  };

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
              await authAPI.logout();
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

  const getRoleLabel = (role?: string) => {
    const roleMap: { [key: string]: string } = {
      'gudang': 'Staff Gudang',
      'karyawan': 'Kasir',
      'owner': 'Pemilik',
      'supervisor': 'Supervisor',
    };
    return roleMap[role || ''] || 'Staff';
  };

  const getRoleIcon = (role?: string) => {
    const iconMap: { [key: string]: any } = {
      'gudang': 'cube-outline',
      'karyawan': 'card-outline',
      'owner': 'shield-checkmark-outline',
      'supervisor': 'people-outline',
    };
    return iconMap[role || ''] || 'person-outline';
  };

  const getAvatarColor = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
    const username = user?.username || 'Guest';
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const InfoItem = ({ icon, label, value, isLast = false }: { icon: any; label: string; value: string; isLast?: boolean }) => (
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

  const InfoItemSkeleton = ({ isLast = false }: { isLast?: boolean }) => (
    <View style={[styles.infoItem, isLast && styles.infoItemLast]}>
      <SkeletonShimmer width={36} height={36} borderRadius={12} />
      <View style={styles.infoTextContainer}>
        <SkeletonShimmer width={80} height={12} borderRadius={6} style={{ marginBottom: 6 }} />
        <SkeletonShimmer width={120} height={16} borderRadius={6} />
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

        {/* Header Background */}
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
          {/* Skeleton Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <SkeletonShimmer width={80} height={80} borderRadius={40} />
            </View>
            <SkeletonShimmer width={150} height={20} borderRadius={10} style={{ marginBottom: 8, marginTop: 16 }} />
            <SkeletonShimmer width={100} height={28} borderRadius={20} />
          </View>

          {/* Skeleton User Details */}
          <View style={styles.sectionContainer}>
            <SkeletonShimmer width={140} height={12} borderRadius={6} style={{ marginBottom: 12, marginLeft: 4 }} />
            <View style={styles.card}>
              <InfoItemSkeleton />
              <InfoItemSkeleton />
              <InfoItemSkeleton isLast />
            </View>
          </View>

          {/* Skeleton Outlet Details */}
          <View style={styles.sectionContainer}>
            <SkeletonShimmer width={130} height={12} borderRadius={6} style={{ marginBottom: 12, marginLeft: 4 }} />
            <View style={styles.card}>
              <InfoItemSkeleton />
              <InfoItemSkeleton isLast />
            </View>
          </View>

          {/* Skeleton Logout Button */}
          <SkeletonShimmer width="100%" height={54} borderRadius={20} style={{ marginTop: 8, marginBottom: 32 }} />

          {/* Skeleton Footer */}
          <View style={styles.footer}>
            <SkeletonShimmer width={140} height={12} borderRadius={6} style={{ marginBottom: 6 }} />
            <SkeletonShimmer width={110} height={10} borderRadius={6} />
          </View>
        </ScrollView>
      </View>
    );
  }

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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
            progressViewOffset={-20}
          />
        }
      >
        {/* Kartu Profil Utama */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatarCircle, { backgroundColor: getAvatarColor() }]}>
              <Text style={styles.avatarText}>{user?.username?.substring(0, 2).toUpperCase() || 'GD'}</Text>
            </View>
            <View style={styles.statusOnline} />
          </View>
          <Text style={styles.profileName}>{user?.username || 'Staff Gudang'}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name={getRoleIcon(user?.role)} size={14} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.roleText}>{getRoleLabel(user?.role)}</Text>
          </View>
        </View>

        {/* Section: Informasi Akun */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>DETAIL PENGGUNA</Text>
          <View style={styles.card}>
            <InfoItem icon="person-outline" label="Username" value={user?.username || '-'} />
            <InfoItem icon="finger-print-outline" label="User ID" value={`#${user?.id || '-'}`} />
            <InfoItem icon="briefcase-outline" label="Peran" value={getRoleLabel(user?.role)} isLast />
          </View>
        </View>

        {/* Section: Informasi Outlet */}
        {outlet && outlet.alamat && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>LOKASI BERTUGAS</Text>
            <View style={styles.card}>
              <InfoItem icon="storefront-outline" label="Nama Outlet" value={outlet.nama} />
              <InfoItem icon="location-outline" label="Alamat" value={outlet.alamat} isLast />
            </View>
          </View>
        )}

        {/* Tombol Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator color="#E53935" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={22} color="#E53935" />
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
    backgroundColor: '#F5F7FA',
  },
  headerBackground: {
    backgroundColor: Colors.primary,
    height: 200,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    marginTop: -70,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 28,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: 'white',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  statusOnline: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: 'white',
    elevation: 3,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A1A1A',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  roleBadge: {
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    elevation: 2,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#888',
    marginBottom: 12,
    marginLeft: 6,
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  infoItemLast: {
    borderBottomWidth: 0,
  },
  infoIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: '#2C2C2C',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    borderRadius: 24,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 32,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    elevation: 3,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#E53935',
    marginLeft: 10,
    letterSpacing: 0.3,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  versionText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footerSub: {
    color: '#CCC',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});