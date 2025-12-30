import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AlertModal from '../../components/AlertModal';
import { Colors } from '../../constants/Colors';
import { radius, spacing, typography } from '../../constants/DesignSystem';
import { authAPI, ownerAPI } from '../../services/api';
import { User } from '../../types';

// ==================== SKELETON SHIMMER ====================
const SkeletonShimmer = ({ 
  width = '100%', 
  height = 12, 
  borderRadius = 8,
  style
}: { 
  width?: number | string; 
  height?: number; 
  borderRadius?: number;
  style?: any;
}) => {
  const shimmerAnim = useMemo(() => new Animated.Value(-200), []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 200,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const styleObj: any = { width, height, borderRadius };

  return (
    <View style={[styles.skeletonBar, styleObj, style]}>
      <Animated.View
        style={[
          styles.skeletonHighlight,
          { transform: [{ translateX: shimmerAnim }] },
        ]}
      />
    </View>
  );
};

// ==================== MAIN COMPONENT ====================
export default function OwnerDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [dashData, setDashData] = useState<any>(null);
  const [stokDetail, setStokDetail] = useState<any>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<any>(null);
  const [prevMonthRevenue, setPrevMonthRevenue] = useState<any>(null);
  const [userCount, setUserCount] = useState(0);
  const [outletCount, setOutletCount] = useState(0);
  const [showRevenueDetail, setShowRevenueDetail] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  // Avatar helpers
  const getAvatarColor = () => {
    const colors = [Colors.primary, Colors.primaryDark, Colors.success, '#34D399', '#4CAF50'];
    const username = user?.username || 'Owner';
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getUserInitial = () => {
    const username = user?.username || 'O';
    return username.substring(0, 2).toUpperCase();
  };

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  }, []);

  const getCurrentDate = useCallback(() => {
    return new Date().toLocaleDateString('id-ID', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }, []);

  // Load user data
  const loadUserData = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      if (response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Load user error:', error);
    }
  }, []);

  // Load dashboard data
  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      
      // Previous month dates
      const prevMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0);
      const prevMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
      const prevMonthEndStr = prevMonthEnd.toISOString().split('T')[0];

      const [dashRes, stokRes, revenueRes, prevRevenueRes, usersRes, outletsRes] = await Promise.all([
        ownerAPI.getDashboard(),
        ownerAPI.getStokDetail(),
        ownerAPI.getLaporanPendapatan(firstDay, today),
        ownerAPI.getLaporanPendapatan(prevMonthStart, prevMonthEndStr),
        ownerAPI.getUsers(),
        ownerAPI.getOutlets(),
      ]);

      // Process dashboard data
      const dData = (dashRes as any)?.data?.data || (dashRes as any)?.data || dashRes;
      setDashData(dData);

      // Process stock detail
      const sData = (stokRes as any)?.data?.data || (stokRes as any)?.data || stokRes;
      setStokDetail(sData);

      // Process current month revenue
      const rData = (revenueRes as any)?.data || revenueRes;
      setMonthlyRevenue(rData);

      // Process previous month revenue
      const prData = (prevRevenueRes as any)?.data || prevRevenueRes;
      setPrevMonthRevenue(prData);

      // Process users count
      const uData = (usersRes as any)?.data?.data || (usersRes as any)?.data || usersRes;
      setUserCount(Array.isArray(uData) ? uData.length : 0);

      // Process outlets count
      const oData = (outletsRes as any)?.data?.data || (outletsRes as any)?.data || outletsRes;
      setOutletCount(Array.isArray(oData) ? oData.length : 0);

    } catch (error: any) {
      console.error('Load data error:', error);
      showAlert('Error', 'Gagal memuat data dashboard', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      loadData();

      // Start lightweight polling to keep data fresh (near real-time)
      const intervalId = setInterval(() => {
        loadData(true);
      }, 30000); // 30s interval

      return () => clearInterval(intervalId);
    }, [loadUserData, loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  // Format currency
  const formatIDR = (value: any) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(value) || 0);
  };

  const currentDay = useMemo(() => new Date().getDate(), []);

  const todayRevenue = useMemo(() => dashData?.pendapatan_hari_ini || 0, [dashData?.pendapatan_hari_ini]);

  // Calculate daily average (total bulan berjalan ÷ hari berjalan)
  const dailyAverage = useMemo(() => {
    const total = monthlyRevenue?.total_pendapatan || 0;
    return currentDay > 0 ? total / currentDay : 0;
  }, [monthlyRevenue?.total_pendapatan, currentDay]);

  // Calculate progress percentage based on today's revenue vs daily average (capped at 100%)
  const progressPercentage = useMemo(() => {
    if (dailyAverage === 0) return todayRevenue > 0 ? 100 : 0;
    return Math.min(100, Math.round((todayRevenue / dailyAverage) * 100));
  }, [todayRevenue, dailyAverage]);

  const progressLabel = useMemo(() => {
    return `${dailyAverage > 0 ? progressPercentage : '0'}% vs rata-rata harian (total ÷ hari berjalan)`;
  }, [dailyAverage, progressPercentage]);

  const dailyAverageDisplay = useMemo(() => {
    return formatIDR(dailyAverage);
  }, [dailyAverage]);

  const progressDisplay = useMemo(() => {
    return `${progressPercentage}%`;
  }, [progressPercentage]);

  // Calculate revenue trend (comparison with previous month)
  const revenueTrend = useMemo(() => {
    const current = monthlyRevenue?.total_pendapatan || 0;
    const previous = prevMonthRevenue?.total_pendapatan || 0;
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  }, [monthlyRevenue?.total_pendapatan, prevMonthRevenue?.total_pendapatan]);

  // Check urgent actions
  const hasUrgentAction = useMemo(() => {
    return (dashData?.permintaan_pending > 0) || (dashData?.jumlah_stok_kritis > 0);
  }, [dashData]);

  // Stock health percentage
  const stockHealth = useMemo(() => {
    if (!dashData?.stok_gudang?.length) return 0;
    const healthy = dashData.stok_gudang.length - (dashData.jumlah_stok_kritis || 0);
    return Math.round((healthy / dashData.stok_gudang.length) * 100);
  }, [dashData]);

  // Render skeleton loading
  const renderSkeleton = () => (
    <View style={{ paddingVertical: spacing.sm }}>
      <View style={[styles.revenueCard, { height: 200, justifyContent: 'center', gap: 15 }]}>
        <SkeletonShimmer width="50%" height={14} />
        <SkeletonShimmer width="80%" height={32} />
        <SkeletonShimmer width="100%" height={8} borderRadius={4} />
        <SkeletonShimmer width="60%" height={12} />
        <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }}>
          <SkeletonShimmer width="45%" height={40} />
          <SkeletonShimmer width="45%" height={40} />
        </View>
      </View>

      <View style={styles.statsGrid}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.statCard}>
            <SkeletonShimmer width={40} height={24} />
            <SkeletonShimmer width={60} height={12} />
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: 30 }}>
        <View style={{ marginBottom: 15 }}>
          <SkeletonShimmer width="40%" height={20} />
        </View>
        <View style={{ gap: spacing.md }}>
          {[1, 2, 3].map((i) => (
            <SkeletonShimmer key={i} width="100%" height={120} borderRadius={20} />
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.greetingText}>{getGreeting()}, Owner</Text>
            <Text style={styles.headerTitle}>{user?.username || 'Owner'}</Text>
            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={styles.dateText}>{getCurrentDate()}</Text>
            </View>
          </View>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor() }]}>
            <Text style={styles.avatarText}>{getUserInitial()}</Text>
            <View style={[styles.statusDot, { backgroundColor: loading ? '#94A3B8' : '#22C55E' }]} />
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(24, insets.bottom + 24) }
        ]}
      >
        {loading && !refreshing ? (
          renderSkeleton()
        ) : (
          <>
            {/* Quick Actions removed per request */}

            {/* Urgent Alert */}
            {hasUrgentAction && (
              <View style={styles.urgentAlert}>
                <View style={styles.urgentIconBox}>
                  <Ionicons name="alert-circle" size={20} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.urgentTitle}>Perhatian Diperlukan</Text>
                  <Text style={styles.urgentText}>
                    {dashData?.permintaan_pending || 0} Permintaan • {dashData?.jumlah_stok_kritis || 0} Stok Kritis
                  </Text>
                </View>
              </View>
            )}

            {/* Revenue Card */}
            <TouchableOpacity 
              style={styles.revenueCard}
              onPress={() => setShowRevenueDetail(prev => !prev)}
              activeOpacity={0.7}
            >
              <View style={styles.revenueTrendRow}>
                <View>
                  <Text style={styles.revenueLabel}>TOTAL PENDAPATAN BULAN INI</Text>
                  <Text style={styles.revenueValue}>{formatIDR(monthlyRevenue?.total_pendapatan)}</Text>
                </View>
                <View style={[styles.trendBadge, revenueTrend >= 0 ? { backgroundColor: '#D1FAE5' } : { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons 
                    name={revenueTrend >= 0 ? 'trending-up' : 'trending-down'} 
                    size={16} 
                    color={revenueTrend >= 0 ? '#059669' : '#DC2626'} 
                  />
                  <Text style={[styles.trendText, { color: revenueTrend >= 0 ? '#059669' : '#DC2626' }]}>
                    {Math.abs(revenueTrend)}%
                  </Text>
                </View>
              </View>
              
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
              </View>
              <Text style={styles.progressText}>{progressLabel}</Text>

              <View style={styles.revenueDivider} />

              <View style={styles.revenueRow}>
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueItemLabel}>HARI INI</Text>
                  <Text style={styles.revenueItemValue}>{formatIDR(dashData?.pendapatan_hari_ini)}</Text>
                </View>
                <View style={styles.revenueDividerVertical} />
                <View style={styles.revenueItem}>
                  <Text style={styles.revenueItemLabel}>RATA-RATA</Text>
                  <Text style={styles.revenueItemValue}>{dailyAverageDisplay}</Text>
                </View>
              </View>

              {showRevenueDetail && (
                <View style={styles.revenueDetailBox}>
                  <Text style={styles.revenueDetailTitle}>Detail perhitungan</Text>
                  <View style={styles.revenueDetailRow}>
                    <Text style={styles.revenueDetailLabel}>Total bulan ini</Text>
                    <Text style={styles.revenueDetailValue}>{formatIDR(monthlyRevenue?.total_pendapatan || 0)}</Text>
                  </View>
                  <View style={styles.revenueDetailRow}>
                    <Text style={styles.revenueDetailLabel}>Hari berjalan</Text>
                    <Text style={styles.revenueDetailValue}>{currentDay}</Text>
                  </View>
                  <View style={styles.revenueDetailRow}>
                    <Text style={styles.revenueDetailLabel}>Rata-rata harian</Text>
                    <Text style={styles.revenueDetailValue}>{dailyAverageDisplay}</Text>
                  </View>
                  <View style={styles.revenueDetailRow}>
                    <Text style={styles.revenueDetailLabel}>Pendapatan hari ini</Text>
                    <Text style={styles.revenueDetailValue}>{formatIDR(dashData?.pendapatan_hari_ini || 0)}</Text>
                  </View>
                  <View style={styles.revenueDetailRow}>
                    <Text style={styles.revenueDetailLabel}>Progress</Text>
                    <Text style={styles.revenueDetailValue}>{progressDisplay}</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => router.push('/(owner)/cabang')}
                activeOpacity={0.7}
              >
                <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="storefront" size={20} color="#2563EB" />
                </View>
                <Text style={styles.statValue}>{outletCount}</Text>
                <Text style={styles.statLabel}>Outlet</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => router.push('/(owner)/pegawai')}
                activeOpacity={0.7}
              >
                <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="people" size={20} color="#059669" />
                </View>
                <Text style={styles.statValue}>{userCount}</Text>
                <Text style={styles.statLabel}>Karyawan</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => router.push('/(owner)/laporan')}
                activeOpacity={0.7}
              >
                <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="document-text" size={20} color="#D97706" />
                </View>
                <Text style={[styles.statValue, (dashData?.permintaan_pending > 0) && { color: '#F97316' }]}>
                  {dashData?.permintaan_pending || 0}
                </Text>
                <Text style={styles.statLabel}>Pengajuan</Text>
              </TouchableOpacity>
            </View>

            {/* Intelligence Cards */}
            <View style={styles.intelGrid}>
              <View style={styles.intelCard}>
                <View style={[styles.intelIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="people-outline" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.intelLabel}>RASIO STAF</Text>
                  <Text style={styles.intelValue}>
                    {outletCount > 0 ? (userCount / outletCount).toFixed(1) : '0.0'}
                  </Text>
                </View>
              </View>

              <View style={styles.intelCard}>
                <View style={[styles.intelIcon, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.intelLabel}>RASIO STOK</Text>
                  <Text style={[styles.intelValue, { color: stockHealth > 50 ? '#10B981' : '#EF4444' }]}>
                    {stockHealth}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Warehouse Stock Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Monitoring Stok Gudang</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.pulse} />
                  <Text style={styles.liveText}>REAL-TIME</Text>
                </View>
              </View>

              <View style={styles.stockGrid}>
                {(dashData?.stok_gudang || []).slice(0, 9).map((item: any, index: number) => {
                  // Calculate display quantity using the same logic as warehouse
                  const unit = (item.bahan?.satuan || '').toLowerCase();
                  let displayQty = Number(item.stok || 0).toLocaleString('id-ID');
                  let displayUnit = 'Bungkus';
                  
                  if (unit !== 'gr') {
                    const perUnitWeight = (Number(item.bahan?.berat_per_isi) || 0) * (Number(item.bahan?.isi_per_satuan) || 1);
                    if (perUnitWeight > 0) {
                      const packCount = Math.floor(Number(item.stok || 0) / perUnitWeight);
                      displayQty = `${packCount.toLocaleString('id-ID')}`;
                    }
                  }

                  return (
                    <View key={index} style={styles.stockBox}>
                      <Text style={styles.stockName} numberOfLines={1}>{item.bahan?.nama || '—'}</Text>
                      <Text style={[styles.stockQty, item.is_kritis && { color: '#EF4444' }]}>
                        {displayQty}
                      </Text>
                      <Text style={styles.stockUnit}>{displayUnit}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Branch Monitoring Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Monitoring Cabang</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{stokDetail?.stok_outlet?.length || 0}</Text>
                </View>
              </View>

              {(stokDetail?.stok_outlet || []).map((outlet: any, idx: number) => {
                // Estimate operational status based on recent activity
                const outletHealth = outlet.stok?.length > 0 
                  ? (outlet.stok.length - (outlet.stok.filter((s: any) => s.status === 'Kritis').length || 0)) / outlet.stok.length * 100
                  : 0;
                const isOperational = outletHealth > 30 && outlet.jumlah_stok_kritis === 0;

                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.branchCard}
                    onPress={() => router.push('/(owner)/cabang')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.branchHeader}>
                      <View style={styles.branchNameRow}>
                        <View style={[styles.statusIndicator, { 
                          backgroundColor: isOperational ? '#22C55E' : '#EF4444'
                        }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.branchName} numberOfLines={1}>{outlet.nama_outlet}</Text>
                          <Text style={styles.branchStatus}>
                            {isOperational ? '🟢 Operasional' : '🟡 Perlu Perhatian'}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, 
                        isOperational
                          ? { backgroundColor: '#F0FDF4' } 
                          : { backgroundColor: '#FEF2F2' }
                      ]}>
                        <Text style={[styles.statusBadgeText,
                          isOperational
                            ? { color: '#16A34A' } 
                            : { color: '#DC2626' }
                        ]}>
                          {isOperational ? 'Aman' : `${outlet.jumlah_stok_kritis || 'Beberapa'} Kritis`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.branchDivider} />

                    <View style={styles.branchStockRow}>
                      {outlet.stok?.slice(0, 4).map((stock: any, i: number) => {
                        // Cari bahan di dashData berdasarkan bahan_id untuk akses berat_per_isi
                        const bahanInfo = (dashData?.stok_gudang || []).find((g: any) => g.bahan_id === stock.bahan_id)?.bahan;
                        const berat_per_isi = Number(bahanInfo?.berat_per_isi) || 0;
                        
                        let displayQty = `${Number(stock.stok || 0).toLocaleString('id-ID')}`;
                        let displayUnit = '';
                        
                        if (berat_per_isi > 0) {
                          const packCount = Math.floor(Number(stock.stok || 0) / berat_per_isi);
                          displayQty = `${packCount.toLocaleString('id-ID')}`;
                          displayUnit = 'bungkus';
                        }

                        return (
                          <View key={i} style={styles.branchStockItem}>
                            <Text style={styles.branchStockName} numberOfLines={1}>
                              {stock.nama_bahan}
                            </Text>
                            <Text style={[styles.branchStockQty, 
                              stock.status === 'Kritis' && { color: '#EF4444' }
                            ]}>
                              {displayQty}
                            </Text>
                            {displayUnit && <Text style={styles.branchStockUnit}>{displayUnit}</Text>}
                          </View>
                        );
                      })}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 30,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: typography.caption,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greetingText: {
    fontSize: typography.body,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: typography.display,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
  },
  dateText: {
    fontSize: typography.caption,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '700',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
  },
  avatarText: {
    fontSize: typography.title,
    fontWeight: '900',
    color: 'white',
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
  },
  urgentAlert: {
    marginHorizontal: 24,
    marginBottom: spacing.md,
    backgroundColor: '#FEF2F2',
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  urgentIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentTitle: {
    fontSize: typography.body,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 2,
  },
  urgentText: {
    fontSize: typography.caption,
    fontWeight: '600',
    color: '#DC2626',
  },
  revenueCard: {
    marginHorizontal: 24,
    marginBottom: spacing.lg,
    backgroundColor: 'white',
    borderRadius: radius.lg,
    padding: spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  revenueLabel: {
    fontSize: typography.caption,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  revenueValue: {
    fontSize: typography.display,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: radius.sm,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: radius.sm,
  },
  progressText: {
    fontSize: typography.caption,
    color: '#64748B',
    fontWeight: '600',
  },
  revenueDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: spacing.md,
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revenueItem: {
    flex: 1,
    alignItems: 'center',
  },
  revenueItemLabel: {
    fontSize: typography.caption,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  revenueItemValue: {
    fontSize: typography.bodyStrong,
    fontWeight: '800',
    color: '#475569',
  },
  revenueDividerVertical: {
    width: 1,
    height: 30,
    backgroundColor: '#F1F5F9',
  },
  revenueDetailBox: {
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: spacing.sm,
  },
  revenueDetailTitle: {
    fontSize: typography.caption,
    fontWeight: '800',
    color: '#475569',
  },
  revenueDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revenueDetailLabel: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: '#94A3B8',
  },
  revenueDetailValue: {
    fontSize: typography.body,
    fontWeight: '800',
    color: '#1E293B',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.headline,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  intelGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: 30,
  },
  intelCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  intelIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intelLabel: {
    fontSize: typography.caption,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  intelValue: {
    fontSize: typography.title,
    fontWeight: '900',
    color: '#1E293B',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.title,
    fontWeight: '900',
    color: '#1E293B',
  },
  sectionBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  sectionBadgeText: {
    fontSize: typography.caption,
    fontWeight: '800',
    color: Colors.primary,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  pulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  liveText: {
    fontSize: typography.caption,
    fontWeight: '900',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  stockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stockBox: {
    width: '31.3%',
    backgroundColor: 'white',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  stockName: {
    fontSize: typography.caption,
    fontWeight: '500',
    color: '#94A3B8',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  stockQty: {
    fontSize: typography.body,
    fontWeight: '900',
    color: '#1E293B',
  },
  stockUnit: {
    fontSize: typography.caption,
    color: '#94A3B8',
    fontWeight: '600',
  },
  branchCard: {
    backgroundColor: 'white',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  branchNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  branchName: {
    fontSize: typography.bodyStrong,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  statusBadgeText: {
    fontSize: typography.caption,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  branchDivider: {
    height: 1,
    backgroundColor: '#F8FAFC',
    marginVertical: 14,
  },
  branchStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  branchStockItem: {
    width: '23%',
    alignItems: 'center',
  },
  branchStockName: {
    fontSize: typography.caption,
    fontWeight: '500',
    color: '#94A3B8',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  branchStockQty: {
    fontSize: typography.body,
    fontWeight: '800',
    color: '#475569',
  },
  branchStockUnit: {
    fontSize: typography.caption,
    fontWeight: '600',
    color: '#94A3B8',
  },
  skeletonBar: {
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  skeletonHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 30, // Will be adjusted at render time if used
    right: 24,
    width: 60,
    height: 60,
    borderRadius: radius.xl,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  revenueTrendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  trendText: {
    fontSize: typography.caption,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  branchStatus: {
    fontSize: typography.caption,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
});