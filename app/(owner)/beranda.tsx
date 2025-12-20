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
  StatusBar
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { ownerAPI } from '../../services/api';
import { useRouter } from 'expo-router';

export default function OwnerDashboardScreen() {
  const router = useRouter(); 
  
  const [dashboardData, setDashboardData] = useState<any>(null);
  // State baru untuk menyimpan jumlah real hasil hitung manual
  const [realCounts, setRealCounts] = useState({ outlets: 0, employees: 0 });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (isRefetching = false) => {
    try {
      if (!isRefetching) setLoading(true);
      
      // FIX: Panggil 3 API sekaligus (Dashboard + Outlets + Users)
      // Tujuannya agar kita bisa hitung sendiri jumlah outlet & user yang aktif
      const [dashRes, outletRes, userRes] = await Promise.all([
        ownerAPI.getDashboard(),
        ownerAPI.getOutlets(),
        ownerAPI.getUsers()
      ]);
      
      // 1. Set Data Statistik (Omset, dll)
      if (dashRes.data) {
        setDashboardData(dashRes.data);
      }

      // 2. Hitung Manual Jumlah Outlet (Agar sinkron dengan tab Outlet)
      let countOutlet = 0;
      if (outletRes.data) {
        const rawOutlet = Array.isArray(outletRes.data) ? outletRes.data : (outletRes.data as any).data || [];
        if (Array.isArray(rawOutlet)) countOutlet = rawOutlet.length;
      }

      // 3. Hitung Manual Jumlah Karyawan (Agar sinkron dengan tab Karyawan)
      let countUser = 0;
      if (userRes.data) {
        const rawUser = Array.isArray(userRes.data) ? userRes.data : (userRes.data as any).data || [];
        if (Array.isArray(rawUser)) countUser = rawUser.length;
      }

      // Update State Count
      setRealCounts({ outlets: countOutlet, employees: countUser });

    } catch (error: any) {
      console.error("Dashboard Load Error:", error);
      Alert.alert('Error', 'Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard(true);
  }, [loadDashboard]);

  // --- ACTIONS ---
  
  const handleSeeAllOutlets = () => {
    router.push('/(owner)/outlet');
  };

  // --- RENDER HELPERS ---

  const formatCurrency = (value: any) => {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  // Data Extraction
  const todayRevenue = dashboardData?.pendapatan_hari_ini || 0;
  const totalTransactions = dashboardData?.total_transaksi_hari_ini || 0;
  
  const topProduct = dashboardData?.produk_terlaris; 
  const bestSellingProduct = topProduct?.nama || topProduct?.[0]?.nama || 'Belum ada data';
  const bestSellingCount = topProduct?.jumlah || topProduct?.[0]?.total_terjual || 0;
  const criticalStock = dashboardData?.stok_kritis_gudang || 0;

  const outletPerformance = dashboardData?.outlet_performance || [];

  // Dummy Chart Data
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
      
      {/* HEADER GREEN DNA */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.textContainer}>
            <Text style={styles.headerTitle}>Dashboard Owner</Text>
            <Text style={styles.headerSubtitle}>Pantau performa bisnis real-time</Text>
          </View>
          <View style={styles.headerIconBg}>
            <Ionicons name="stats-chart" size={24} color={Colors.primary} />
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* DATE PILL */}
        <View style={styles.dateContainer}>
          <View style={styles.datePill}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* --- BUSINESS OVERVIEW (Data Real dari Count Manual) --- */}
        <View style={styles.summaryGrid}>
          {/* Card Outlet (Tidak bisa diklik, hanya display) */}
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#E0F2F1' }]}>
              <Ionicons name="storefront" size={22} color="#00695C" />
            </View>
            <View>
              {/* Menggunakan state realCounts hasil hitungan manual */}
              <Text style={styles.summaryValue}>{realCounts.outlets}</Text>
              <Text style={styles.summaryLabel}>Total Outlet</Text>
            </View>
          </View>

          {/* Card Tim (Tidak bisa diklik, hanya display) */}
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#FFF8E1' }]}>
              <Ionicons name="people" size={22} color="#FF8F00" />
            </View>
            <View>
              {/* Menggunakan state realCounts hasil hitungan manual */}
              <Text style={styles.summaryValue}>{realCounts.employees}</Text>
              <Text style={styles.summaryLabel}>Total Tim</Text>
            </View>
          </View>
        </View>

        {/* DAILY STATS & HIGHLIGHTS */}
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitleText}>Statistik Hari Ini</Text>
        </View>

        <View style={styles.kpiContainer}>
          {/* Card 1: Pendapatan */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconWrapper}>
                <View style={[styles.kpiIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="wallet" size={20} color="#2E7D32" />
                </View>
            </View>
            <Text style={styles.kpiValue}>{formatCurrency(todayRevenue)}</Text>
            <Text style={styles.kpiLabel}>Omset Masuk</Text>
          </View>

          {/* Card 2: Transaksi */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconWrapper}>
                <View style={[styles.kpiIcon, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="receipt" size={20} color="#1565C0" />
                </View>
            </View>
            <Text style={styles.kpiValue}>{totalTransactions} <Text style={styles.kpiUnit}>Nota</Text></Text>
            <Text style={styles.kpiLabel}>Transaksi</Text>
          </View>

          {/* Card 3: Produk Laris */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconWrapper}>
                <View style={[styles.kpiIcon, { backgroundColor: '#FFF3E0' }]}>
                    <Ionicons name="star" size={20} color="#EF6C00" />
                </View>
            </View>
            <Text style={styles.kpiValueSm} numberOfLines={1}>{bestSellingProduct}</Text>
            <Text style={styles.kpiLabel}>Terlaris ({bestSellingCount} pcs)</Text>
          </View>

          {/* Card 4: Stok Kritis */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconWrapper}>
                <View style={[styles.kpiIcon, { backgroundColor: '#FFEBEE' }]}>
                    <Ionicons name="alert-circle" size={20} color="#C62828" />
                </View>
            </View>
            <Text style={[styles.kpiValue, {color: criticalStock > 0 ? '#D32F2F' : Colors.text}]}>
              {criticalStock} <Text style={styles.kpiUnit}>Item</Text>
            </Text>
            <Text style={styles.kpiLabel}>Stok Kritis</Text>
          </View>
        </View>

        {/* CHART SECTION */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIcon, {backgroundColor: '#E8F5E9'}]}>
                  <Ionicons name="bar-chart" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.cardTitle}>Trend Penjualan</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Minggu Ini</Text>
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
                        backgroundColor: index === new Date().getDay() - 1 ? Colors.primary : '#ECEFF1' 
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
            <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIcon, {backgroundColor: '#FFF3E0'}]}>
                  <Ionicons name="ribbon" size={18} color={Colors.warning} />
                </View>
                <Text style={styles.cardTitle}>Performa Outlet</Text>
            </View>
            
            <TouchableOpacity onPress={handleSeeAllOutlets} style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>Detail</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.outletListContainer}>
            {outletPerformance.length === 0 ? (
                <Text style={{color: Colors.textSecondary, fontStyle:'italic'}}>Belum ada data performa.</Text>
            ) : (
                outletPerformance.map((outlet: any, index: number) => (
                    <View key={index} style={styles.outletRow}>
                    <View style={styles.outletInfo}>
                        <Text style={styles.outletName}>{outlet.nama}</Text>
                        <View style={styles.progressTrack}>
                            <View 
                                style={[
                                styles.progressFill, 
                                { 
                                    width: `${outlet.persentase}%`,
                                    backgroundColor: outlet.persentase > 75 ? Colors.success : (outlet.persentase > 50 ? Colors.warning : '#EF9A9A')
                                }
                                ]} 
                            />
                        </View>
                    </View>
                    <Text style={styles.outletScore}>{outlet.persentase}%</Text>
                    </View>
                ))
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: Colors.textSecondary, fontSize: 14 },

  // HEADER GREEN DNA
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 25,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1 },
  textContainer: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: 'white', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  headerIconBg: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },

  content: { flex: 1, marginTop: 10, paddingHorizontal: 24 },

  // DATE PILL
  dateContainer: { marginBottom: 20 },
  datePill: { 
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#EEE', gap: 6
  },
  dateText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  // SUMMARY GRID (Business Overview)
  summaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: '#F0F0F0', elevation: 1
  },
  summaryIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary },

  // SECTION TITLES
  sectionTitleContainer: { marginBottom: 12 },
  sectionTitleText: { fontSize: 16, fontWeight: '700', color: Colors.text },

  // KPI GRID (2x2)
  kpiContainer: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    marginBottom: 20
  },
  kpiCard: {
    width: '48%', 
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.03, shadowRadius:4,
    borderWidth: 1, borderColor: '#F0F0F0'
  },
  kpiIconWrapper: { marginBottom: 12 },
  kpiIcon: {
    width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center'
  },
  kpiLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  kpiValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  kpiValueSm: { fontSize: 15, fontWeight: '700', color: Colors.text },
  kpiUnit: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },

  // BIG SECTIONS (Chart & Outlet)
  sectionCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 20,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4,
    borderWidth: 1, borderColor: '#F0F0F0'
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  sectionSubtitle: { fontSize: 12, color: Colors.textSecondary },
  
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, padding: 4 },
  seeAllText: { color: Colors.primary, fontSize: 12, fontWeight:'700' },

  // CHART
  chartContainer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    height: 140, paddingBottom: 5, paddingHorizontal: 5
  },
  barWrapper: { alignItems: 'center', flex: 1 },
  barTrack: {
    width: 8, height: '100%', backgroundColor: '#F5F5F5', borderRadius: 6,
    justifyContent: 'flex-end', overflow: 'hidden'
  },
  barFill: { borderRadius: 6, width: '100%' },
  barLabel: { marginTop: 8, fontSize: 11, fontWeight: '600', color: Colors.textSecondary },

  // OUTLET LIST
  outletListContainer: { gap: 16 },
  outletRow: { flexDirection: 'row', alignItems: 'center' },
  outletInfo: { flex: 1, marginRight: 15 },
  outletName: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  progressTrack: { height: 8, backgroundColor: '#F5F5F5', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  outletScore: { fontSize: 14, fontWeight: '800', color: Colors.text },
});