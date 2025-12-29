import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { radius, spacing, typography } from '../../constants/DesignSystem';
import { authAPI, gudangAPI } from '../../services/api';
import { Bahan, User } from '../../types';


// Skeleton Shimmer Component
const SkeletonShimmer = ({ width = '100%', height = 12, borderRadius = 8 }: { width?: string | number; height?: number; borderRadius?: number }) => {
  const shimmerAnim = React.useMemo(() => new Animated.Value(-200), []);
  
  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 200, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: -200, duration: 0, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const skeletonStyle: any = { 
    width, 
    height, 
    borderRadius, 
    backgroundColor: '#E0E0E0', 
    overflow: 'hidden' 
  };

  return (
    <View style={skeletonStyle}>
      <Animated.View
        style={[
          {
            width: '30%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
          },
          { transform: [{ translateX: shimmerAnim }] },
        ]}
      />
    </View>
  );
};

interface StockItem {
  id: string;
  bahan_id: number;
  stok: number;
  bahan: Bahan;
  status: 'Aman' | 'Menipis' | 'Kritis';
}

interface ActivityItem {
  id: string;
  type: 'masuk' | 'keluar' | 'permintaan';
  icon: string;
  color: string;
  title: string;
  description: string;
  time: string;
  amount: string;
}

export default function WarehouseOverviewScreen() {
  const router = useRouter();

  // State Management
  const [user, setUser] = useState<User | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [todayIncoming, setTodayIncoming] = useState(0);
  const [todayOutgoing, setTodayOutgoing] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [totalSKU, setTotalSKU] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);

  // Load User Data
  const loadUserData = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      if (response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Gagal memuat data user:', error);
    }
  }, []);

  // Load All Data from APIs
  const loadAllData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      await loadUserData();

      const [stokRes, masukRes, keluarRes, permintaanRes] = await Promise.all([
        gudangAPI.getStok(),
        gudangAPI.getBarangMasuk(),
        gudangAPI.getBarangKeluar(),
        gudangAPI.getPermintaanStok(),
      ]);

      // Process Stock Items
      const mappedStocks: StockItem[] = [];
      if (stokRes.data && Array.isArray(stokRes.data)) {
        stokRes.data.forEach((item: any) => {
          const stok = Number(item.stok) || 0;
          const minStok = Number(item.bahan?.stok_minimum_gudang) || 0;

          let status: 'Aman' | 'Menipis' | 'Kritis' = 'Aman';
          if (stok <= 0) {
            status = 'Kritis';
          } else if (stok <= minStok * 0.3) {
            status = 'Kritis';
          } else if (stok <= minStok) {
            status = 'Menipis';
          }

          mappedStocks.push({
            id: `stok-${item.bahan_id}`,
            bahan_id: Number(item.bahan_id),
            stok: stok,
            bahan: item.bahan || {
              id: Number(item.bahan_id),
              nama: 'Bahan Tidak Diketahui',
              satuan: 'Unit',
              stok_minimum_gudang: minStok,
              stok_minimum_outlet: 0,
            },
            status: status,
          });
        });
      }
      setStockItems(mappedStocks);
      setTotalSKU(mappedStocks.length);
      setLowStockCount(mappedStocks.filter((s) => s.status === 'Menipis').length);
      setCriticalCount(mappedStocks.filter((s) => s.status === 'Kritis').length);

      // Process Today's Counts
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let incomingCount = 0;
      if (masukRes.data && Array.isArray(masukRes.data)) {
        incomingCount = masukRes.data.filter((item: any) => {
          const itemDate = new Date(item.tanggal || item.created_at);
          itemDate.setHours(0, 0, 0, 0);
          return itemDate.getTime() === today.getTime();
        }).length;
      }

      let outgoingCount = 0;
      if (keluarRes.data && Array.isArray(keluarRes.data)) {
        outgoingCount = keluarRes.data.filter((item: any) => {
          const itemDate = new Date(item.tanggal_keluar || item.created_at);
          itemDate.setHours(0, 0, 0, 0);
          return itemDate.getTime() === today.getTime();
        }).length;
      }

      let pendingCount = 0;
      if (permintaanRes.data && Array.isArray(permintaanRes.data)) {
        pendingCount = permintaanRes.data.filter((item: any) => {
          const status = (item.status || '').toLowerCase();
          return status === 'diajukan' || status === 'disetujui';
        }).length;
      }

      setTodayIncoming(incomingCount);
      setTodayOutgoing(outgoingCount);
      setPendingRequests(pendingCount);

      // Process Recent Activities
      const activities: ActivityItem[] = [];

      if (masukRes.data && Array.isArray(masukRes.data)) {
        masukRes.data.slice(0, 3).forEach((item: any) => {
          activities.push({
            id: `masuk-${item.id}`,
            type: 'masuk',
            icon: 'arrow-down-circle',
            color: '#22C55E',
            title: 'Barang Masuk',
            description: `${item.bahan?.nama || 'Bahan'} dari ${item.supplier || 'Supplier'}`,
            time: item.tanggal || item.created_at,
            amount: `${item.jumlah || 0} ${item.bahan?.satuan || 'gr'}`,
          });
        });
      }

      if (keluarRes.data && Array.isArray(keluarRes.data)) {
        keluarRes.data.slice(0, 2).forEach((item: any) => {
          activities.push({
            id: `keluar-${item.id}`,
            type: 'keluar',
            icon: 'arrow-up-circle',
            color: '#3B82F6',
            title: 'Barang Keluar',
            description: `${item.bahan?.nama || 'Bahan'} ke ${item.outlet?.nama || 'Outlet'}`,
            time: item.tanggal_keluar || item.created_at,
            amount: `${item.jumlah || 0} ${item.bahan?.satuan || 'gr'}`,
          });
        });
      }

      if (permintaanRes.data && Array.isArray(permintaanRes.data)) {
        permintaanRes.data.slice(0, 2).forEach((item: any) => {
          activities.push({
            id: `permintaan-${item.id}`,
            type: 'permintaan',
            icon: 'document-text',
            color: '#F59E0B',
            title: 'Permintaan Stok',
            description: `${item.bahan?.nama || 'Bahan'} dari ${item.outlet?.nama || 'Outlet'}`,
            time: item.created_at,
            amount: `${item.jumlah || 0} ${item.bahan?.satuan || 'gr'}`,
          });
        });
      }

      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRecentActivities(activities.slice(0, 5));
    } catch (error) {
      console.error('Gagal memuat data:', error);
      Alert.alert('Gagal Memuat', 'Terjadi kesalahan saat mengambil data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadUserData]);

  // Auto Load on Focus
  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [loadAllData])
  );

  // Helper Functions
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Pagi';
    if (hour >= 11 && hour < 15) return 'Siang';
    if (hour >= 15 && hour < 18) return 'Sore';
    return 'Malam';
  }, []);

  const parseDateLocal = useCallback((s: string): Date => {
    if (!s) return new Date();
    const raw = s.toString().trim();
    
    // Backend mengirim waktu dalam UTC
    // Format: "YYYY-MM-DD HH:mm:ss" atau "YYYY-MM-DDTHH:mm:ss.000000Z"
    
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(raw)) {
      // Format "YYYY-MM-DD HH:mm:ss" dari backend (UTC tanpa marker)
      // Tambahkan Z untuk parse sebagai UTC
      const normalized = raw.replace(' ', 'T') + 'Z';
      return new Date(normalized);
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
      // Format ISO tanpa timezone, assume UTC
      return new Date(raw + 'Z');
    }
    
    // Format lainnya (sudah ada Z atau timezone), parse langsung
    return new Date(raw);
  }, []);

  const getUserInitial = useCallback(() => {
    const username = user?.username || 'G';
    return username.substring(0, 2).toUpperCase();
  }, [user]);

  const getAvatarColor = useCallback(() => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
    const username = user?.username || 'Guest';
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  }, [user]);

  const getRelativeTime = useCallback((iso?: string) => {
    if (!iso) return '—';
    try {
      const now = new Date();
      const targetDate = parseDateLocal(iso);
      
      // Check if valid date
      if (isNaN(targetDate.getTime())) return '—';
      
      const diffMs = now.getTime() - targetDate.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffSeconds < 60) return 'baru saja';
      if (diffMinutes < 60) return `${diffMinutes}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      return `${Math.floor(diffDays / 7)}w`;
    } catch {
      return '—';
    }
  }, [parseDateLocal]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'Aman':
        return Colors.success;
      case 'Menipis':
        return '#F59E0B';
      case 'Kritis':
        return '#EF4444';
      default:
        return '#999';
    }
  }, []);

  // Filtered Stocks (useMemo for performance)
  const filteredStocks = useMemo(
    () =>
      stockItems.filter((item) =>
        item.bahan.nama.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [stockItems, searchQuery]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData(true);
  }, [loadAllData]);

  // JSX Render
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>
              {user?.username ? `Selamat ${getGreeting()}, ${user.username}` : `Selamat ${getGreeting()}`}
            </Text>
            <Text style={styles.headerTitle}>Inventory Gudang</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor() }]}>
            <Text style={styles.avatarText}>{getUserInitial()}</Text>
          </View>
        </View>

        {/* Search Box */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari bahan baku..."
            placeholderTextColor="#AAA"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stats Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringkasan Hari Ini</Text>
          {loading ? (
            <View style={styles.statsGrid}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View key={`skeleton-stat-${i}`} style={styles.statCard}>
                  <SkeletonShimmer width={40} height={24} borderRadius={6} />
                  <SkeletonShimmer width={60} height={10} borderRadius={4} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#1E293B' }]}>{totalSKU}</Text>
                <Text style={styles.statLabel}>Total SKU</Text>
              </View>

              <View style={[styles.statCard, styles.statCardGreen]}>
                <Text style={[styles.statValue, { color: '#22C55E' }]}>
                  {todayIncoming}
                </Text>
                <Text style={styles.statLabel}>Masuk Hari Ini</Text>
              </View>

              <View style={[styles.statCard, styles.statCardBlue]}>
                <Text style={[styles.statValue, { color: '#3B82F6' }]}>
                  {todayOutgoing}
                </Text>
                <Text style={styles.statLabel}>Keluar Hari Ini</Text>
              </View>

              <View style={[styles.statCard, styles.statCardOrange]}>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                  {pendingRequests}
                </Text>
                <Text style={styles.statLabel}>Permintaan</Text>
              </View>

              <View style={[styles.statCard, styles.statCardWarning]}>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                  {lowStockCount}
                </Text>
                <Text style={styles.statLabel}>Menipis</Text>
              </View>

              <View style={[styles.statCard, styles.statCardCritical]}>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>
                  {criticalCount}
                </Text>
                <Text style={styles.statLabel}>Kritis</Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick Access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Akses Cepat</Text>
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity
              style={styles.quickAccessBtn}
              onPress={() => router.push('/(gudang)/masuk')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="arrow-down-circle" size={24} color="#22C55E" />
              </View>
              <Text style={styles.quickAccessText}>Barang Masuk</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessBtn}
              onPress={() => router.push('/(gudang)/keluar')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="arrow-up-circle" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.quickAccessText}>Barang Keluar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessBtn}
              onPress={() => router.push('/(gudang)/permintaan')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="document-text" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.quickAccessText}>Permintaan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessBtn}
              onPress={() => router.push('/(gudang)/bahan')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="cube" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.quickAccessText}>Kelola Bahan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessBtn}
              onPress={() => router.push('/(gudang)/kategori')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="pricetags" size={24} color="#7B1FA2" />
              </View>
              <Text style={styles.quickAccessText}>Kelola Kategori</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
            {!loading && recentActivities.length > 0 && (
              <Text style={styles.sectionCount}>({recentActivities.length})</Text>
            )}
          </View>
          {loading ? (
            <View>
              {[1, 2, 3].map((i) => (
                <View key={`skeleton-activity-${i}`} style={styles.activityCard}>
                  <SkeletonShimmer width={40} height={40} borderRadius={10} />
                  <View style={{ flex: 1, gap: spacing.xs, marginLeft: 12 }}>
                    <SkeletonShimmer width="60%" height={12} borderRadius={4} />
                    <SkeletonShimmer width="80%" height={10} borderRadius={4} />
                  </View>
                </View>
              ))}
            </View>
          ) : recentActivities.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color="#E0E0E0" />
              <Text style={styles.emptyText}>Belum ada aktivitas</Text>
            </View>
          ) : (
            <View>
              {recentActivities.map((activity, index) => (
                <View key={activity.id}>
                  <View style={styles.activityListItem}>
                    <View
                      style={[
                        styles.activityBadge,
                        { backgroundColor: `${activity.color}20` },
                      ]}
                    >
                      <Ionicons
                        name={activity.icon as any}
                        size={20}
                        color={activity.color}
                      />
                    </View>
                    <View style={styles.activityListContent}>
                      <Text style={styles.activityListTitle}>{activity.title}</Text>
                      <Text style={styles.activityListDesc} numberOfLines={1}>
                        {activity.description}
                      </Text>
                    </View>
                    <View style={styles.activityListRight}>
                      <Text style={styles.activityListAmount}>{activity.amount}</Text>
                      <Text style={styles.activityListTime}>
                        {getRelativeTime(activity.time)}
                      </Text>
                    </View>
                  </View>
                  {index < recentActivities.length - 1 && (
                    <View style={styles.activityDivider} />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Stock Status List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>Status Stok Terkini</Text>
              {!loading && filteredStocks.length > 0 && (
                <Text style={styles.sectionCount}>({filteredStocks.length})</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => loadAllData()}>
              <Ionicons name="refresh-circle" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View>
              {[1, 2, 3].map((i) => (
                <View key={`skeleton-stock-${i}`} style={styles.stockCard}>
                  <View style={{ gap: spacing.xs }}>
                    <SkeletonShimmer width={120} height={14} borderRadius={4} />
                    <SkeletonShimmer width={80} height={10} borderRadius={4} />
                  </View>
                  <SkeletonShimmer width={50} height={24} borderRadius={8} />
                </View>
              ))}
            </View>
          ) : filteredStocks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#E0E0E0" />
              <Text style={styles.emptyText}>Data tidak ditemukan</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.stockListScroll}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <View style={styles.stockListWrapper}>
                {filteredStocks.map((stock, index) => (
                  <View key={stock.id}>
                    <View style={styles.stockListItem}>
                    <View style={styles.stockListInfo}>
                      <Text style={styles.stockListName} numberOfLines={1}>
                        {stock.bahan.nama}
                      </Text>
                      <Text style={styles.stockListMinimum}>
                        Min: {stock.bahan.stok_minimum_gudang.toLocaleString('id-ID')} {stock.bahan.satuan}
                      </Text>
                    </View>
                    <View style={styles.stockListQtyBadge}>
                      {(() => {
                        const unit = (stock.bahan.satuan || '').toLowerCase();
                        let displayQty = `${stock.stok.toLocaleString('id-ID')} ${stock.bahan.satuan}`;
                        if (unit !== 'gr') {
                          const perUnitWeight = (Number(stock.bahan.berat_per_isi) || 0) * (Number(stock.bahan.isi_per_satuan) || 1);
                          if (perUnitWeight > 0) {
                            const packCount = Math.floor(Number(stock.stok) / perUnitWeight);
                            const remainder = Number(stock.stok) - (packCount * perUnitWeight);
                            if (packCount > 0 && remainder > 0) {
                              displayQty = `${packCount.toLocaleString('id-ID')} ${stock.bahan.satuan} + sisa ${Math.round(remainder).toLocaleString('id-ID')} gr`;
                            } else if (packCount > 0) {
                              displayQty = `${packCount.toLocaleString('id-ID')} ${stock.bahan.satuan}`;
                            } else {
                              displayQty = `${Math.round(remainder).toLocaleString('id-ID')} gr`;
                            }
                          }
                        }
                        return <Text style={styles.stockListQty}>{displayQty}</Text>;
                      })()}
                    </View>
                    <View
                      style={[
                        styles.stockStatusBadge,
                        {
                          backgroundColor: getStatusColor(stock.status),
                        },
                      ]}
                    >
                      <Text style={styles.stockStatusText}>{stock.status}</Text>
                    </View>
                  </View>
                  {index < filteredStocks.length - 1 && (
                    <View style={styles.stockListDivider} />
                  )}
                </View>
              ))}
              </View>
            </ScrollView>
          )}
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
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: spacing.lg,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: typography.body,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: typography.title,
    fontWeight: '800',
    color: 'white',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: typography.body,
    fontWeight: '500',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 24,
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.bodyStrong,
    fontWeight: '700',
    color: '#333',
    marginBottom: spacing.md,
  },
  sectionCount: {
    fontSize: typography.body,
    fontWeight: '600',
    color: '#999',
    marginLeft: 6,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    flexBasis: '48%',
    backgroundColor: 'white',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statCardPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  statCardGreen: {
    borderColor: '#D1FAE5',
  },
  statCardBlue: {
    borderColor: '#DBEAFE',
  },
  statCardOrange: {
    borderColor: '#FEF3C7',
  },
  statCardWarning: {
    borderColor: '#FFE0B2',
  },
  statCardCritical: {
    borderColor: '#FFCDD2',
  },
  statValueWhite: {
    fontSize: typography.headline,
    fontWeight: '800',
    color: 'white',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.headline,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.caption,
    fontWeight: '600',
    color: '#777',
    textAlign: 'center',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickAccessBtn: {
    flexBasis: '48%',
    backgroundColor: 'white',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  quickAccessIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  quickAccessText: {
    fontSize: typography.body,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  activityScrollContent: {
    paddingRight: 24,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  activityListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  activityBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  activityListContent: {
    flex: 1,
  },
  activityListTitle: {
    fontSize: typography.bodyStrong,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  activityListDesc: {
    fontSize: typography.caption,
    color: '#64748B',
    fontWeight: '500',
  },
  activityListRight: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 0,
  },
  activityListAmount: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: '#1E293B',
  },
  activityListTime: {
    fontSize: typography.caption,
    color: '#94A3B8',
    fontWeight: '600',
  },
  activityDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  activityCardHorizontal: {
    flexDirection: 'column',
    backgroundColor: 'white',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginRight: 12,
    width: 240,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  activityDesc: {
    fontSize: typography.caption,
    color: '#777',
    marginBottom: 2,
  },
  activityRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  activityAmount: {
    fontSize: typography.caption,
    fontWeight: '600',
    color: '#999',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: typography.caption,
    color: '#AAA',
    fontWeight: '600',
  },
  stockScrollView: {
    maxHeight: 400,
  },
  stockListScroll: {
    maxHeight: 450,
    borderRadius: radius.lg,
  },
  stockCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  stockListWrapper: {
    backgroundColor: 'white',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  stockListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  stockListInfo: {
    flex: 1,
  },
  stockListName: {
    fontSize: typography.bodyStrong,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  stockListMinimum: {
    fontSize: typography.caption,
    color: '#64748B',
    fontWeight: '500',
  },
  stockListQtyBadge: {
    flexShrink: 0,
  },
  stockListQty: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'right',
  },
  stockStatusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.sm,
    flexShrink: 0,
  },
  stockStatusText: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
  },
  stockListDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: spacing.md,
  },
  stockLeft: {
    flex: 1,
  },
  stockName: {
    fontSize: typography.bodyStrong,
    fontWeight: '700',
    color: '#333',
    marginBottom: spacing.xs,
  },
  stockMinimum: {
    fontSize: typography.caption,
    color: '#999',
  },
  stockRight: {
    alignItems: 'flex-end',
  },
  stockQty: {
    fontSize: typography.bodyStrong,
    fontWeight: '800',
    color: '#333',
    marginBottom: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  statusText: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: typography.body,
    color: '#AAA',
    fontWeight: '600',
  },
});