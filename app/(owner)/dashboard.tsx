import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { PemasukanHarian } from '../../types';
import { ownerAPI, authAPI } from '../../services/api';
import { useRouter } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

export default function OwnerDashboardScreen() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await ownerAPI.getDashboard();
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      if (response.data) {
        setDashboardData(response.data);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal memuat dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

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
            router.replace('/(auth)/login' as any);
          },
        },
      ]
    );
    setShowProfileMenu(false);
  };

  if (loading && !dashboardData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Ionicons name="stats-chart" size={24} color={Colors.backgroundLight} />
              <Text style={styles.headerTitle}>Owner Panel</Text>
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Memuat dashboard...</Text>
        </View>
      </View>
    );
  }

  const todayRevenue = Number(dashboardData?.pendapatan_hari_ini) || 0;
  const totalTransactions = Number(dashboardData?.total_transaksi_hari_ini) || 0;
  const bestSellingProduct = dashboardData?.produk_terlaris?.nama || 'N/A';
  const bestSellingCount = Number(dashboardData?.produk_terlaris?.jumlah) || 0;
  const bestOutlet = dashboardData?.outlet_terbaik || { nama: 'N/A', pendapatan: 0, revenue: 0 };
  
  // Mock sales data for chart (you can replace with real data from API)
  const salesData = [
    { day: 'Sen', value: Number(dashboardData?.pendapatan_mingguan?.[0]) || 1800000 },
    { day: 'Sel', value: Number(dashboardData?.pendapatan_mingguan?.[1]) || 2100000 },
    { day: 'Rab', value: Number(dashboardData?.pendapatan_mingguan?.[2]) || 1950000 },
    { day: 'Kam', value: Number(dashboardData?.pendapatan_mingguan?.[3]) || 2200000 },
    { day: 'Jum', value: Number(dashboardData?.pendapatan_mingguan?.[4]) || 2400000 },
    { day: 'Sab', value: Number(dashboardData?.pendapatan_mingguan?.[5]) || 2800000 },
    { day: 'Min', value: Number(dashboardData?.pendapatan_mingguan?.[6]) || 2700000 },
  ];

  const outletPerformance = dashboardData?.outlet_performance || [];

  const maxSales = Math.max(...salesData.map(d => d.value), 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="stats-chart" size={24} color={Colors.backgroundLight} />
            <Text style={styles.headerTitle}>Owner Panel</Text>
          </View>
          <TouchableOpacity style={styles.userInfo} onPress={() => setShowProfileMenu(true)} activeOpacity={0.7}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>OW</Text>
            </View>
            <View>
              <Text style={styles.userName}>Pak Owner</Text>
              <Text style={styles.userRole}>Pemilik</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={Colors.backgroundLight} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.titleSection}>
          <View>
            <Text style={styles.title}>Ringkasan Bisnis</Text>
            <Text style={styles.subtitle}>
              Data performa hari ini, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>

        <View style={styles.kpiCards}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Pendapatan Hari Ini</Text>
              <Ionicons name="trending-up" size={20} color={Colors.success} />
            </View>
            <Text style={styles.kpiValue}>Rp {Number(todayRevenue).toLocaleString('id-ID')}</Text>
            <Text style={styles.kpiChange}>+12% dari kemarin</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Total Transaksi</Text>
              <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.kpiValue}>{totalTransactions}</Text>
            <Text style={styles.kpiChange}>Pesanan</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Produk Terlaris</Text>
              <Ionicons name="star-outline" size={20} color={Colors.warning} />
            </View>
            <Text style={styles.kpiValue}>{bestSellingProduct}</Text>
            <Text style={styles.kpiChange}>{bestSellingCount} terjual</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Outlet Terbaik</Text>
              <Ionicons name="location-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.kpiValue}>{bestOutlet.nama || bestOutlet.name || 'N/A'}</Text>
            <Text style={styles.kpiChange}>Rp {Number(bestOutlet.pendapatan || bestOutlet.revenue || 0).toLocaleString('id-ID')}</Text>
          </View>
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Grafik Penjualan 7 Hari Terakhir</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chartBars}>
              {salesData.map((data, index) => (
                <View key={index} style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: (data.value / maxSales) * 150,
                        backgroundColor: Colors.primaryLight,
                      },
                    ]}
                  />
                  <Text style={styles.barLabel}>{data.day}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.outletSection}>
          <Text style={styles.sectionTitle}>Performa Outlet</Text>
          {outletPerformance.length > 0 ? outletPerformance.map((outlet: any, index: number) => {
            const percentage = Number(outlet.percentage || outlet.persentase || 0);
            const outletName = outlet.name || outlet.nama || 'Unknown';
            return (
              <View key={index} style={styles.outletCard}>
                <View style={styles.outletHeader}>
                  <Text style={styles.outletName}>{outletName}</Text>
                  <Text style={styles.outletPercentage}>{percentage}%</Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(100, Math.max(0, percentage))}%`,
                        backgroundColor:
                          percentage >= 70
                            ? Colors.success
                            : percentage >= 50
                            ? Colors.warning
                            : Colors.error,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          }) : (
            <Text style={styles.emptyText}>Tidak ada data outlet</Text>
          )}
        </View>
      </ScrollView>

      <Modal visible={showProfileMenu} transparent animationType="fade" onRequestClose={() => setShowProfileMenu(false)}>
        <TouchableOpacity style={styles.profileModalOverlay} activeOpacity={1} onPress={() => setShowProfileMenu(false)}>
          <View style={styles.profileMenu}>
            <View style={styles.profileMenuHeader}>
              <View style={styles.profileMenuAvatar}>
                <Text style={styles.profileMenuAvatarText}>OW</Text>
              </View>
              <View>
                <Text style={styles.profileMenuName}>Pak Owner</Text>
                <Text style={styles.profileMenuRole}>Pemilik</Text>
              </View>
            </View>
            <View style={styles.profileMenuDivider} />
            <TouchableOpacity style={styles.profileMenuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              <Text style={styles.profileMenuItemText}>Keluar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: isSmallScreen ? 15 : 20,
    paddingHorizontal: isSmallScreen ? 15 : 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: Colors.backgroundLight,
    marginLeft: isSmallScreen ? 8 : 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.backgroundLight,
  },
  userRole: {
    fontSize: 12,
    color: Colors.backgroundLight,
    opacity: 0.8,
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'flex-end',
  },
  profileMenu: {
    backgroundColor: Colors.backgroundLight,
    margin: 20,
    borderRadius: 12,
    padding: 16,
  },
  profileMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileMenuAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  profileMenuAvatarText: {
    color: Colors.backgroundLight,
    fontWeight: 'bold',
  },
  profileMenuName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  profileMenuRole: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileMenuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
  },
  content: {
    flex: 1,
    padding: isSmallScreen ? 15 : 20,
  },
  titleSection: {
    marginBottom: isSmallScreen ? 15 : 20,
  },
  title: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: isSmallScreen ? 13 : 14,
    color: Colors.textSecondary,
  },
  kpiCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isSmallScreen ? 10 : 15,
    marginBottom: isSmallScreen ? 20 : 30,
  },
  kpiCard: {
    width: isSmallScreen ? '100%' : '48%',
    backgroundColor: Colors.backgroundLight,
    borderRadius: isSmallScreen ? 10 : 12,
    padding: isSmallScreen ? 15 : 20,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  kpiLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 5,
  },
  kpiChange: {
    fontSize: 12,
    color: Colors.success,
  },
  chartSection: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
  },
  chartContainer: {
    height: 200,
    justifyContent: 'flex-end',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '100%',
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: '80%',
    borderRadius: 4,
    marginBottom: 10,
  },
  barLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  outletSection: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  outletCard: {
    marginBottom: 20,
  },
  outletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  outletName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  outletPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primaryDark,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

