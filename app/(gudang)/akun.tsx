import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router'; // FIX: Tambahkan useFocusEffect
import React, { useState, useCallback } from 'react';
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

export default function WarehouseProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [assignment, setAssignment] = useState<Outlet | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // FIX: Menggunakan useFocusEffect agar data profil selalu refresh saat tab dibuka
  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        try {
          const rawUser = await AsyncStorage.getItem('@user_data');
          if (rawUser) {
            const parsedUser: User = JSON.parse(rawUser);
            setUser(parsedUser);

            if (parsedUser.outlet) {
                setAssignment(parsedUser.outlet);
            } else if (parsedUser.outlet_id) {
                setAssignment({
                    id: parsedUser.outlet_id,
                    nama: `Gudang #${parsedUser.outlet_id}`,
                    alamat: '-',
                    is_active: true
                });
            }
          }
        } catch (error) {
          console.error('Gagal memuat profil', error);
        }
      };
      loadProfile();
    }, [])
  );

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

  // Helper UI Component
  const InfoItem = ({ icon, label, value, isLast = false }: { icon: any, label: string, value: string, isLast?: boolean }) => (
    <View style={[styles.infoItem, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.infoIconBg}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil Staff</Text>
        <Text style={styles.headerSubtitle}>Kelola akun dan informasi gudang</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE CARD */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.username?.substring(0, 2).toUpperCase() || 'GD'}
            </Text>
          </View>
          <Text style={styles.profileName}>{user?.username || 'Staff Gudang'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role?.replace('_', ' ').toUpperCase() || 'STAFF'}</Text>
          </View>
        </View>

        {/* ACCOUNT INFO SECTION */}
        <Text style={styles.sectionTitle}>Detail Informasi</Text>
        <View style={styles.card}>
          <InfoItem icon="person-outline" label="Username" value={user?.username || '-'} />
          <InfoItem icon="id-card-outline" label="ID Staff" value={`ID-${user?.id || '000'}`} />
          <InfoItem icon="business-outline" label="Penempatan" value={assignment?.nama || 'Gudang Pusat'} isLast />
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={handleLogout}
            disabled={isLoggingOut}
        >
            {isLoggingOut ? (
                <ActivityIndicator color="#D32F2F" />
            ) : (
                <>
                    <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
                    <Text style={styles.logoutText}>Keluar Aplikasi</Text>
                </>
            )}
        </TouchableOpacity>

        <Text style={styles.versionText}>Es Teh POS • v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  content: { flex: 1, marginTop: -40, paddingHorizontal: 24 },
  profileCard: {
    backgroundColor: 'white', borderRadius: 24, padding: 24, alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10,
    marginBottom: 25
  },
  avatarContainer: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center', marginBottom: 15,
    borderWidth: 3, borderColor: '#F8F9FA'
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  profileName: { fontSize: 18, fontWeight: '800', color: '#333', marginBottom: 6 },
  roleBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  roleText: { fontSize: 10, fontWeight: '800', color: Colors.primary, letterSpacing: 1 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#AAA', marginBottom: 10, marginLeft: 5, textTransform: 'uppercase' },
  card: { backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0' },
  infoItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8F9FA' },
  infoIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoLabel: { fontSize: 10, color: '#999', fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#444', fontWeight: '700' },
  logoutBtn: { 
    flexDirection: 'row', backgroundColor: '#FFEBEE', borderRadius: 18, padding: 16, 
    justifyContent: 'center', alignItems: 'center', marginTop: 25, borderWidth: 1, borderColor: '#FFCDD2' 
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#D32F2F', marginLeft: 8 },
  versionText: { textAlign: 'center', color: '#CCC', fontSize: 11, marginTop: 20, fontWeight: '600' },
});