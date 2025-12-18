import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  StatusBar
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { ownerAPI, authAPI } from '../../services/api';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OwnerDashboardScreen() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  // Load user data
  useEffect(() => {
    const getUser = async () => {
      const userStr = await AsyncStorage.getItem('@user_data');
      if (userStr) {
        setUserData(JSON.parse(userStr));
      }
    };
    getUser();
  }, []);

  // FIX: Bungkus loadDashboard dengan useCallback
  // Tambahkan parameter isRefetching untuk mengontrol loading state tanpa dependency loop
  const loadDashboard = useCallback(async (isRefetching = false) => {
    try {
      // Jika bukan refresh (load pertama), set loading true
      if (!isRefetching) setLoading(true);
      
      const response = await ownerAPI.getDashboard();
      
      if (response.error) {
        console.error("Dashboard Error:", response.error);
        Alert.alert('Info', 'Gagal memuat data terbaru. Menampilkan data offline jika ada.');
      }
      
      if (response.data) {
        setDashboardData(response.data);
      }
    } catch (error: any) {
      console.error("Dashboard Load Exception:", error);
      Alert.alert('Error', 'Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // FIX: Masukkan loadDashboard ke dependency array
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // FIX: Masukkan loadDashboard ke dependency array
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard(true); // Pass true untuk menandakan ini adalah refresh
  }, [loadDashboard]);

  const handleLogout = async () => {
    Alert.alert(
      'Keluar',
      'Apakah Anda yakin ingin keluar?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            await authAPI.logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
    setShowProfileMenu(false);
  };

  // --- RENDER CONTENT ---

  const formatCurrency = (value: any) => {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const todayRevenue = dashboardData?.pendapatan_hari_ini || 0;
  const totalTransactions = dashboardData?.total_transaksi_hari_ini || 0;
  
  const topProduct = dashboardData?.produk_terlaris; 
  const bestSellingProduct = topProduct?.nama || topProduct?.[0]?.nama || 'Belum ada data';
  const bestSellingCount = topProduct?.jumlah || topProduct?.[0]?.total_terjual || 0;

  const criticalStock = dashboardData?.stok_kritis_gudang || 0;

  const salesData = [
    { day: 'Sen', value: 2500000 },
    { day: 'Sel', value: 3200000 },
    { day: 'Rab', value: 1800000 },
    { day: 'Kam', value: 2900000 },
    { day: 'Jum', value: 4500000 },
    { day: 'Sab', value: 5200000 },
    { day: 'Min', value: 4800000 },
  ];
  const maxSales = Math.max(...salesData.map(d => d.value), 1);

  const outletPerformance = dashboardData?.outlet_performance || [
    { nama: 'Cabang Utama', persentase: 85 },
    { nama: 'Cabang Ahmad Yani', persentase: 60 },
    { nama: 'Cabang Sudirman', persentase: 45 }
  ];

  if (loading && !refreshing && !dashboardData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Menyiapkan data bisnis Anda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.iconBox}>
              <Ionicons name="bar-chart" size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Owner Panel</Text>
              <Text style={styles.headerSubtitle}>Overview Bisnis</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.userInfo} onPress={() => setShowProfileMenu(true)} activeOpacity={0.8}>
            <View>
              <Text style={styles.userName}>{userData?.username || 'Owner'}</Text>
              <Text style={styles.userRole}>Pemilik</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userData?.username ? userData.username.substring(0,2).toUpperCase() : 'OW'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* WELCOME / DATE SECTION */}
        <View style={styles.dateSection}>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {/* KPI CARDS (GRID 2x2) */}
        <View style={styles.kpiContainer}>
          {/* Card 1: Pendapatan */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="wallet" size={22} color="#2E7D32" />
            </View>
            <Text style={styles.kpiLabel}>Omset Hari Ini</Text>
            <Text style={styles.kpiValue}>{formatCurrency(todayRevenue)}</Text>
          </View>

          {/* Card 2: Transaksi */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="receipt" size={22} color="#1565C0" />
            </View>
            <Text style={styles.kpiLabel}>Total Transaksi</Text>
            <Text style={styles.kpiValue}>{totalTransactions} <Text style={{fontSize:12, fontWeight:'normal'}}>Nota</Text></Text>
          </View>

          {/* Card 3: Produk Laris */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="star" size={22} color="#EF6C00" />
            </View>
            <Text style={styles.kpiLabel}>Produk Favorit</Text>
            <Text style={styles.kpiValueSm} numberOfLines={1}>{bestSellingProduct}</Text>
            <Text style={styles.kpiSub}>{bestSellingCount} Terjual</Text>
          </View>

          {/* Card 4: Stok Kritis (Penting buat Owner/Gudang) */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="alert-circle" size={22} color="#C62828" />
            </View>
            <Text style={styles.kpiLabel}>Stok Kritis</Text>
            <Text style={[styles.kpiValue, {color: criticalStock > 0 ? Colors.error : Colors.text}]}>
              {criticalStock} <Text style={{fontSize:12, fontWeight:'normal'}}>Item</Text>
            </Text>
          </View>
        </View>

        {/* CHART SECTION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trend Penjualan (Minggu Ini)</Text>
            <TouchableOpacity>
              <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.chartContainer}>
            {salesData.map((data, index) => (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barTrack}>
                  <View 
                    style={[
                      styles.barFill, 
                      { 
                        height: `${(data.value / maxSales) * 100}%`,
                        backgroundColor: index === new Date().getDay() - 1 ? Colors.primary : '#B0BEC5' // Highlight hari ini
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.barLabel}>{data.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* OUTLET PERFORMANCE SECTION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Outlet Performance</Text>
            <TouchableOpacity>
              <Text style={{color: Colors.primary, fontSize: 12, fontWeight:'600'}}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          {outletPerformance.map((outlet: any, index: number) => (
            <View key={index} style={styles.outletRow}>
              <View style={styles.outletInfo}>
                <Text style={styles.outletName}>{outlet.nama}</Text>
                <View style={styles.progressTrack}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${outlet.persentase}%`,
                        backgroundColor: outlet.persentase > 75 ? Colors.success : (outlet.persentase > 50 ? Colors.warning : Colors.error)
                      }
                    ]} 
                  />
                </View>
              </View>
              <Text style={styles.outletScore}>{outlet.persentase}%</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* PROFILE MODAL (Logout Option) */}
      <Modal visible={showProfileMenu} transparent animationType="fade" onRequestClose={() => setShowProfileMenu(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowProfileMenu(false)}>
          <View style={styles.profileDropdown}>
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatarLarge}>
                <Text style={styles.profileAvatarTextLg}>
                  {userData?.username ? userData.username.substring(0,2).toUpperCase() : 'OW'}
                </Text>
              </View>
              <Text style={styles.profileName}>{userData?.username || 'Owner'}</Text>
              <Text style={styles.profileEmail}>Administrator</Text>
            </View>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <View style={[styles.menuIcon, {backgroundColor: '#FFEBEE'}]}>
                <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              </View>
              <Text style={[styles.menuText, {color: Colors.error}]}>Keluar Aplikasi</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: Colors.textSecondary, fontSize: 14 },

  // HEADER
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 45,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: 'white',
    justifyContent: 'center', alignItems: 'center'
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userName: { fontSize: 14, fontWeight: '600', color: 'white', textAlign: 'right' },
  userRole: { fontSize: 10, color: 'rgba(255,255,255,0.8)', textAlign: 'right' },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: 'white' },

  // CONTENT SCROLL
  content: { flex: 1, marginTop: -10 },
  dateSection: { paddingHorizontal: 20, marginBottom: 15 },
  dateText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },

  // KPI GRID
  kpiContainer: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 20
  },
  kpiCard: {
    width: '48%', // Fixed width for 2 column
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.05, shadowRadius:6
  },
  kpiIcon: {
    width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12
  },
  kpiLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  kpiValueSm: { fontSize: 15, fontWeight: '700', color: Colors.text },
  kpiSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  // SECTIONS
  sectionCard: {
    backgroundColor: 'white', marginHorizontal: 20, marginBottom: 20,
    borderRadius: 16, padding: 20,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  // CHART
  chartContainer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    height: 150, paddingBottom: 5
  },
  barWrapper: { alignItems: 'center', flex: 1 },
  barTrack: {
    width: 8, height: '100%', backgroundColor: '#F5F5F5', borderRadius: 4,
    justifyContent: 'flex-end', overflow: 'hidden'
  },
  barFill: { borderRadius: 4, width: '100%' },
  barLabel: { marginTop: 8, fontSize: 11, color: Colors.textSecondary },

  // OUTLET LIST
  outletRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  outletInfo: { flex: 1, marginRight: 15 },
  outletName: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  progressTrack: { height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  outletScore: { fontSize: 14, fontWeight: 'bold', color: Colors.text },

  // MODAL
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', paddingTop: 60, paddingRight: 20, alignItems: 'flex-end' },
  profileDropdown: {
    width: 220, backgroundColor: 'white', borderRadius: 16, padding: 5,
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10
  },
  profileHeader: { padding: 15, alignItems: 'center' },
  profileAvatarLarge: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10
  },
  profileAvatarTextLg: { fontSize: 20, fontWeight: 'bold', color: Colors.primary },
  profileName: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  profileEmail: { fontSize: 12, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10 },
  menuIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  menuText: { fontSize: 14, fontWeight: '600' },
});