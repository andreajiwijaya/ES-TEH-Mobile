import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  StatusBar,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { authAPI, gudangAPI } from '../../services/api';
import { PermintaanStok, UpdatePermintaanStokPayload, User } from '../../types';
import { useFocusEffect } from 'expo-router';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

// ==================== SKELETON SHIMMER ====================
const SkeletonShimmer = ({ 
  width = '100%', 
  height = 12, 
  borderRadius = 8 
}: { 
  width?: number | string; 
  height?: number; 
  borderRadius?: number;
}) => {
  const shimmerAnim = React.useMemo(() => new Animated.Value(-200), []);

  React.useEffect(() => {
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

  return (
    <View style={[styles.skeletonBar, { width, height, borderRadius }]}>
      <Animated.View
        style={[
          styles.skeletonHighlight,
          { transform: [{ translateX: shimmerAnim }] },
        ]}
      />
    </View>
  );
};

// ==================== SWIPEABLE CARD ====================
interface SwipeableCardProps {
  item: PermintaanStok;
  onSwipeComplete: () => void;
  badge: { bg: string; text: string; label: string };
  onPress: () => void;
  formatDate: (iso?: string) => string;
  getRelativeTime: (iso?: string) => string;
}

const SwipeableCard = ({ 
  item, 
  onSwipeComplete, 
  badge, 
  onPress,
  formatDate,
  getRelativeTime,
}: SwipeableCardProps) => {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const [swiping, setSwiping] = useState(false);

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const handleStateChange = ({ nativeEvent }: any) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      const threshold = 120;
      
      if (nativeEvent.translationX > threshold) {
        // Swipe completed
        Animated.timing(translateX, {
          toValue: 400,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          onSwipeComplete();
          translateX.setValue(0);
        });
      } else {
        // Return to original position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 40,
          friction: 7,
        }).start();
      }
      setSwiping(false);
    } else if (nativeEvent.state === State.BEGAN) {
      setSwiping(true);
    }
  };

  const opacity = translateX.interpolate({
    inputRange: [0, 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.swipeContainer}>
      {/* Background Action */}
      <Animated.View style={[styles.swipeBackground, { opacity }]}>
        <Ionicons name="send" size={24} color="white" />
        <Text style={styles.swipeBackgroundText}>Kirim</Text>
      </Animated.View>

      {/* Card */}
      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={handleStateChange}
        enabled={item.status === 'disetujui'}
      >
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.outletRow}>
                <Ionicons name="storefront" size={16} color="#334155" />
                <Text style={styles.outletName}>{item.outlet?.nama || `Outlet #${item.outlet_id}`}</Text>
              </View>
              <Text style={styles.timeText}>{getRelativeTime(item.created_at)}</Text>
            </View>

            {/* Item Row */}
            <View style={styles.itemRow}>
              <View style={styles.itemIcon}>
                <Ionicons name="cube" size={22} color={Colors.primary} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.bahan?.nama || 'Bahan'}</Text>
                <Text style={styles.itemQty}>
                  {item.jumlah} {item.bahan?.satuan || 'pcs'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.statusText, { color: badge.text }]}>
                  {badge.label}
                </Text>
              </View>
            </View>

            {/* Swipe Hint */}
            {item.status === 'disetujui' && !swiping && (
              <View style={styles.swipeHint}>
                <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
                <Text style={styles.swipeHintText}>Geser ke kanan untuk kirim</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

// ==================== MAIN COMPONENT ====================
export default function PermintaanScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<PermintaanStok[]>([]);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'dikirim' | 'diterima' | 'ditolak' | 'semua'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PermintaanStok | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Avatar helpers
  const getAvatarColor = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
    const username = user?.username || 'Guest';
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getUserInitial = () => {
    const username = user?.username || 'G';
    return username.charAt(0).toUpperCase();
  };

  // Load Data
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

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await gudangAPI.getPermintaanStok();
      
      if (response.data && Array.isArray(response.data)) {
        const normalized = response.data.map((r: any) => ({
          ...r,
          status: (r.status || '').toString().toLowerCase(),
        }));
        setRequests(normalized.sort((a: any, b: any) => b.id - a.id));
      }
    } catch (error: any) {
      console.error('Load data error:', error);
      Alert.alert('Error', 'Gagal memuat data permintaan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      loadData();
    }, [loadUserData, loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  // Filtered Data
  const filteredData = useMemo(() => {
    return requests.filter(item => {
      // Status filter
      if (statusFilter === 'pending') {
        const isPending = item.status === 'diajukan' || item.status === 'disetujui';
        if (!isPending) return false;
      } else if (statusFilter !== 'semua') {
        if (item.status !== statusFilter) return false;
      }

      // Search filter
      if (searchQuery) {
        const bahanNama = (item.bahan?.nama || '').toLowerCase();
        const outletNama = (item.outlet?.nama || '').toLowerCase();
        const q = searchQuery.toLowerCase();
        if (!bahanNama.includes(q) && !outletNama.includes(q)) return false;
      }

      return true;
    });
  }, [requests, statusFilter, searchQuery]);

  // Status Counts
  const statusCounts = useMemo(() => {
    return requests.reduce(
      (acc, r) => {
        const st = (r.status || '').toString().toLowerCase();
        if (st === 'diajukan' || st === 'disetujui') acc.pengajuan += 1;
        else if (st === 'dikirim') acc.dikirim += 1;
        else if (st === 'diterima') acc.diterima += 1;
        else if (st === 'ditolak') acc.ditolak += 1;
        acc.semua += 1;
        return acc;
      },
      { pengajuan: 0, dikirim: 0, diterima: 0, ditolak: 0, semua: 0 }
    );
  }, [requests]);

  // Actions
  const updateStatus = async (
    id: number, 
    status: UpdatePermintaanStokPayload['status'], 
    successMsg: string
  ) => {
    setProcessing(true);
    try {
      const res = await gudangAPI.updatePermintaanStok(id, { status });
      if (res.error) throw new Error(res.error);
      Alert.alert('Sukses', successMsg);
      loadData(true);
      setDetailVisible(false);
    } catch (error: any) {
      Alert.alert('Gagal', error.message || 'Tidak dapat memperbarui status');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = (item: PermintaanStok) => {
    Alert.alert(
      'Setujui Permintaan',
      `Yakin menyetujui permintaan ${item.bahan?.nama || 'item'} sebanyak ${item.jumlah} ${item.bahan?.satuan || 'pcs'}?`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Setujui', onPress: () => updateStatus(item.id, 'disetujui', 'Permintaan disetujui') }
      ]
    );
  };

  const handleReject = (item: PermintaanStok) => {
    Alert.alert(
      'Tolak Permintaan',
      `Yakin menolak permintaan ${item.bahan?.nama || 'item'}?`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Tolak', style: 'destructive', onPress: () => updateStatus(item.id, 'ditolak', 'Permintaan ditolak') }
      ]
    );
  };

  const handleSend = (item: PermintaanStok) => {
    updateStatus(item.id, 'dikirim', 'Barang berhasil dikirim');
  };

  // Helpers
  const getRelativeTime = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const m = Math.floor(diffMs / 60000);
    if (m < 1) return 'baru saja';
    if (m < 60) return `${m} menit lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    const days = Math.floor(h / 24);
    return `${days} hari lalu`;
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(d);
  };

  const getStatusBadge = (status: string) => {
    const st = (status || '').toString().toLowerCase();
    switch(st) {
      case 'diajukan': return { bg: '#FFF8E1', text: '#FF8F00', label: 'DIAJUKAN' };
      case 'disetujui': return { bg: '#E3F2FD', text: '#1565C0', label: 'DISETUJUI' };
      case 'ditolak': return { bg: '#FBE9E7', text: '#D84315', label: 'DITOLAK' };
      case 'dikirim': return { bg: '#E8F5E9', text: '#2E7D32', label: 'DIKIRIM' };
      case 'diterima': return { bg: '#E8F5E9', text: '#2E7D32', label: 'DITERIMA' };
      default: return { bg: '#F5F5F5', text: '#757575', label: st.toUpperCase() };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Manajemen Permintaan</Text>
            <Text style={styles.headerTitle}>Distribusi Stok</Text>
          </View>
          <View style={[styles.avatarCircle, { backgroundColor: getAvatarColor() }]}>
            <Text style={styles.avatarText}>{getUserInitial()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari bahan atau outlet..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.summaryCard, statusFilter === 'pending' && styles.summaryCardActive]}
            onPress={() => setStatusFilter('pending')}
          >
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(255,143,0,0.15)' }]}>
              <Ionicons name="document-text" size={20} color="#FF8F00" />
            </View>
            <Text style={styles.summaryValue}>{statusCounts.pengajuan}</Text>
            <Text style={styles.summaryLabel}>Pengajuan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.summaryCard, statusFilter === 'dikirim' && styles.summaryCardActive]}
            onPress={() => setStatusFilter('dikirim')}
          >
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(46,125,50,0.15)' }]}>
              <Ionicons name="send" size={20} color="#2E7D32" />
            </View>
            <Text style={styles.summaryValue}>{statusCounts.dikirim}</Text>
            <Text style={styles.summaryLabel}>Dikirim</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.summaryCard, statusFilter === 'diterima' && styles.summaryCardActive]}
            onPress={() => setStatusFilter('diterima')}
          >
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(46,125,50,0.15)' }]}>
              <Ionicons name="checkmark-done" size={20} color="#2E7D32" />
            </View>
            <Text style={styles.summaryValue}>{statusCounts.diterima}</Text>
            <Text style={styles.summaryLabel}>Diterima</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.summaryCard, statusFilter === 'ditolak' && styles.summaryCardActive]}
            onPress={() => setStatusFilter('ditolak')}
          >
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(216,67,21,0.15)' }]}>
              <Ionicons name="close-circle" size={20} color="#D84315" />
            </View>
            <Text style={styles.summaryValue}>{statusCounts.ditolak}</Text>
            <Text style={styles.summaryLabel}>Ditolak</Text>
          </TouchableOpacity>
        </View>

        {/* List */}
        {loading && !refreshing ? (
          <View>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={`skeleton-${i}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <SkeletonShimmer width={120} height={14} borderRadius={8} />
                  <SkeletonShimmer width={60} height={12} borderRadius={6} />
                </View>
                <View style={styles.itemRow}>
                  <SkeletonShimmer width={48} height={48} borderRadius={12} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <SkeletonShimmer width="70%" height={16} borderRadius={8} />
                    <SkeletonShimmer width="40%" height={14} borderRadius={6} />
                  </View>
                  <SkeletonShimmer width={80} height={24} borderRadius={8} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={item => item.id.toString()}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                colors={[Colors.primary]} 
              />
            }
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="file-tray-outline" size={64} color="#E2E8F0" />
                <Text style={styles.emptyText}>Tidak ada permintaan</Text>
                <Text style={styles.emptySubText}>
                  {statusFilter === 'pending' 
                    ? 'Belum ada permintaan aktif' 
                    : `Belum ada riwayat ${statusFilter}`}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const badge = getStatusBadge(item.status);
              
              return (
                <SwipeableCard
                  item={item}
                  badge={badge}
                  formatDate={formatDate}
                  getRelativeTime={getRelativeTime}
                  onPress={() => {
                    setSelectedRequest(item);
                    setDetailVisible(true);
                  }}
                  onSwipeComplete={() => handleSend(item)}
                />
              );
            }}
          />
        )}
      </View>

      {/* Detail Modal */}
      <Modal 
        visible={detailVisible} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setDetailVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setDetailVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Permintaan</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="storefront" size={20} color="#6366F1" />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Outlet</Text>
                  <Text style={styles.detailValue}>
                    {selectedRequest?.outlet?.nama || `Outlet #${selectedRequest?.outlet_id}`}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="cube" size={20} color="#6366F1" />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Bahan</Text>
                  <Text style={styles.detailValue}>{selectedRequest?.bahan?.nama || '—'}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="layers" size={20} color="#6366F1" />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Jumlah</Text>
                  <Text style={styles.detailValue}>
                    {selectedRequest?.jumlah} {selectedRequest?.bahan?.satuan || 'pcs'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="information-circle" size={20} color="#6366F1" />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Status</Text>
                  {selectedRequest && (
                    <View style={[
                      styles.statusBadge, 
                      { backgroundColor: getStatusBadge(selectedRequest.status).bg, alignSelf: 'flex-start' }
                    ]}>
                      <Text style={[
                        styles.statusText, 
                        { color: getStatusBadge(selectedRequest.status).text }
                      ]}>
                        {getStatusBadge(selectedRequest.status).label}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="calendar" size={20} color="#6366F1" />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Tanggal Dibuat</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedRequest?.created_at)}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.divider} />

            {/* Actions */}
            {selectedRequest && (
              <View style={styles.modalActions}>
                {selectedRequest.status === 'diajukan' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleReject(selectedRequest)}
                      disabled={processing}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                      <Text style={styles.rejectBtnText}>Tolak</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleApprove(selectedRequest)}
                      disabled={processing}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                      <Text style={styles.approveBtnText}>Setujui</Text>
                    </TouchableOpacity>
                  </>
                )}
                {selectedRequest.status === 'disetujui' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.sendBtn]}
                    onPress={() => handleSend(selectedRequest)}
                    disabled={processing}
                  >
                    <Ionicons name="send" size={20} color="white" />
                    <Text style={styles.sendBtnText}>Kirim Barang</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 24,
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
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flexBasis: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  summaryCardActive: {
    borderColor: Colors.primary,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  swipeContainer: {
    marginBottom: 15,
    position: 'relative',
  },
  swipeBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 24,
    gap: 12,
  },
  swipeBackgroundText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  outletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  outletName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  itemQty: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  swipeHintText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  skeletonBar: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  skeletonHighlight: {
    position: 'absolute',
    left: 0,
    width: '40%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700',
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 24,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 20,
  },
  modalBody: {
    maxHeight: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 14,
  },
  detailIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTextBox: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  rejectBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  rejectBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '800',
  },
  approveBtn: {
    backgroundColor: Colors.primary,
  },
  approveBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
  sendBtn: {
    backgroundColor: Colors.primary,
  },
  sendBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
});
