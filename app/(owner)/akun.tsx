import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../services/api';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const data = await AsyncStorage.getItem('@user_data');
    if (data) setUser(JSON.parse(data));
  };

  const handleLogout = () => {
    Alert.alert('Konfirmasi', 'Yakin ingin keluar aplikasi?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await authAPI.logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* HEADER GREEN DNA */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profil Saya</Text>
          <Text style={styles.headerSubtitle}>Informasi Akun Pengguna</Text>
        </View>
        <View style={styles.headerIconBg}>
          <Ionicons name="person" size={28} color={Colors.primary} />
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* PROFILE CARD (Modern Card Style) */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {user?.username ? user.username.substring(0, 2).toUpperCase() : 'OW'}
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            </View>
          </View>
          
          <Text style={styles.userName}>{user?.username || 'Owner'}</Text>
          <Text style={styles.userRole}>Administrator / Pemilik</Text>
          
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Akun Aktif</Text>
          </View>
        </View>

        {/* INFO SECTION */}
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>Detail Informasi</Text>
        </View>

        <View style={styles.infoCard}>
          {/* Row 1: Username */}
          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="person-outline" size={22} color="#1565C0" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{user?.username || '-'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Row 2: Role */}
          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#2E7D32" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Hak Akses</Text>
              <Text style={styles.infoValue}>Owner (Full Access)</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Row 3: App Version */}
          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="information-circle-outline" size={22} color="#EF6C00" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Versi Aplikasi</Text>
              <Text style={styles.infoValue}>v1.0.0 (Stable)</Text>
            </View>
          </View>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={22} color="#D32F2F" />
          <Text style={styles.logoutText}>Keluar Aplikasi</Text>
        </TouchableOpacity>

        <Text style={styles.copyrightText}>© 2025 Es Teh Indonesia Management</Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },

  // HEADER (Sama dengan Laporan.tsx)
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 25,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: 'white', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  headerIconBg: { 
    width: 48, height: 48, borderRadius: 16, backgroundColor: 'white', 
    justifyContent: 'center', alignItems: 'center' 
  },

  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },

  // PROFILE CARD
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,
    borderWidth: 1, borderColor: '#F0F0F0'
  },
  avatarSection: { position: 'relative', marginBottom: 16 },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#F1F8E9', // Light Green
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: 'white',
    elevation: 4, shadowColor: Colors.primary, shadowOpacity: 0.2, shadowRadius: 8
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: Colors.primary },
  verifiedBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: 'white', borderRadius: 12, padding: 2
  },
  userName: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  userRole: { fontSize: 14, color: Colors.textSecondary, marginBottom: 12 },
  
  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#2E7D32' },

  // INFO CARD
  sectionTitleContainer: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 8,
    marginBottom: 24,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 16
  },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: Colors.text },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 76 },

  // BUTTONS & FOOTER
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFEBEE', paddingVertical: 16, borderRadius: 16,
    gap: 8, marginBottom: 24,
    borderWidth: 1, borderColor: '#FFCDD2'
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#D32F2F' },
  
  copyrightText: { textAlign: 'center', fontSize: 12, color: '#BDBDBD', marginBottom: 20 }
});