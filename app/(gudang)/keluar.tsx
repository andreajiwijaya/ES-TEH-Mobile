import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Animated,
    FlatList,
    Image,
    Modal,
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
import AlertModal from '../../components/AlertModal';
import { Colors } from '../../constants/Colors';
import { radius, spacing, typography } from '../../constants/DesignSystem';
import { authAPI, gudangAPI } from '../../services/api';
import { BarangKeluar, Outlet, User } from '../../types';

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
    <View style={{ width: width as any, height, borderRadius, backgroundColor: '#E2E8F0', overflow: 'hidden', position: 'relative' as const }}>
      <Animated.View
        style={[
          { position: 'absolute' as const, left: 0, width: '40%', height: '100%', backgroundColor: 'rgba(255,255,255,0.6)' },
          { transform: [{ translateX: shimmerAnim }] },
        ]}
      />
    </View>
  );
};

// ==================== MAIN COMPONENT ====================
export default function BarangKeluarScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [outgoingGoods, setOutgoingGoods] = useState<BarangKeluar[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutlet, setSelectedOutlet] = useState<number | null>(null);
  const [showOutletSheet, setShowOutletSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BarangKeluar | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoToView, setPhotoToView] = useState<string | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

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

  // Helper: Parse UTC date from backend (fixes timezone issue)
  const parseDateLocal = (s: string): Date => {
    if (!s) return new Date();
    const raw = s.toString().trim();
    
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(raw)) {
      const normalized = raw.replace(' ', 'T') + 'Z';
      return new Date(normalized);
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
      return new Date(raw + 'Z');
    }
    return new Date(raw);
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
      const barangKeluarResponse = await gudangAPI.getBarangKeluar();

      if (barangKeluarResponse.data) {
        const raw = barangKeluarResponse.data as any;
        const list: BarangKeluar[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        
        if (Array.isArray(list)) {
          const normalized = list.map((x: any) => ({
            ...x,
            status: ((x?.status || x?.status_permintaan || x?.status_pengiriman || '') as string).toLowerCase(),
          }));
          setOutgoingGoods(normalized.sort((a: any, b: any) => b.id - a.id));
          
          // Extract unique outlets
          const uniqueOutlets: Outlet[] = [];
          const seenIds = new Set<number>();
          normalized.forEach((item: any) => {
            if (item.outlet && item.outlet.id && !seenIds.has(item.outlet.id)) {
              uniqueOutlets.push(item.outlet);
              seenIds.add(item.outlet.id);
            }
          });
          setOutlets(uniqueOutlets.sort((a, b) => a.nama.localeCompare(b.nama)));
        }
      }
    } catch (error: any) {
      console.error('Load data error:', error);
      showAlert('Error', 'Gagal memuat data', 'error');
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

  // Helper functions
  const getItemStatus = (item: BarangKeluar) => {
    const anyItem = item as any;
    const st = (item.status || anyItem?.status_permintaan || anyItem?.status_pengiriman || '').toString().toLowerCase();
    if (st === 'diterima') return 'diterima';
    if (st === 'dikirim') return 'dikirim';
    return st || 'dikirim';
  };

  const getStatusStyle = (status: string) => {
    if (status === 'diterima') return { bg: '#DCFCE7', text: '#16A34A' };
    return { bg: '#FEF3C7', text: '#D97706' };
  };

  const formatDate = (dateString: string) => {
    const date = parseDateLocal(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(date);
  };

  const getRelativeTime = (dateString: string) => {
    const d = parseDateLocal(dateString);
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays === 1) return 'kemarin';
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return formatDate(dateString);
  };

  const formatQuantity = (item: BarangKeluar) => {
    const qty = item.jumlah || 0;
    const satuan = (item.bahan?.satuan || '').toLowerCase();
    const perUnitWeight = item.bahan?.berat_per_isi || item.bahan?.isi_per_satuan;

    if (satuan === 'bungkus' && perUnitWeight && perUnitWeight > 0) {
      const bungkusTotal = qty / perUnitWeight;
      const displayTotal = Number.isInteger(bungkusTotal) ? bungkusTotal : parseFloat(bungkusTotal.toFixed(1));
      return `${displayTotal} Bungkus`;
    }

    return `${qty} ${item.bahan?.satuan || 'unit'}`;
  };

  // Summary Stats (focus on 'diterima' items - completed deliveries)
  const summaryStats = useMemo(() => {
    const received = outgoingGoods.filter(i => getItemStatus(i) === 'diterima');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const receivedToday = received.filter(i => {
      const date = parseDateLocal(i.updated_at || i.tanggal_keluar || '');
      return date >= today;
    }).length;

    const receivedThisMonth = received.filter(i => {
      const date = parseDateLocal(i.updated_at || i.tanggal_keluar || '');
      return date >= thisMonth;
    }).length;

    // Top outlet
    const outletCounts = received.reduce((acc: Record<number, { count: number, nama: string }>, item) => {
      if (item.outlet_id) {
        if (!acc[item.outlet_id]) {
          acc[item.outlet_id] = { count: 0, nama: item.outlet?.nama || `Outlet #${item.outlet_id}` };
        }
        acc[item.outlet_id].count++;
      }
      return acc;
    }, {});
    const topOutlet = Object.values(outletCounts).sort((a, b) => b.count - a.count)[0];

    // Top bahan
    const bahanCounts = received.reduce((acc: Record<number, { count: number, nama: string }>, item) => {
      const bahanId = item.bahan?.id;
      if (bahanId) {
        if (!acc[bahanId]) {
          acc[bahanId] = { count: 0, nama: item.bahan?.nama || `Bahan #${bahanId}` };
        }
        acc[bahanId].count++;
      }
      return acc;
    }, {});
    const topBahan = Object.values(bahanCounts).sort((a, b) => b.count - a.count)[0];

    return {
      receivedToday,
      receivedThisMonth,
      topOutlet: topOutlet?.nama || '—',
      topBahan: topBahan?.nama || '—',
    };
  }, [outgoingGoods]);

  // Filtered Data (only show 'diterima' status - completed deliveries)
  const filteredReceived = useMemo(() => {
    return outgoingGoods.filter(i => {
      const statusMatch = getItemStatus(i) === 'diterima';
      const outletMatch = selectedOutlet === null || i.outlet_id === selectedOutlet;
      const textMatch = (i.bahan?.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.id.toString().includes(searchQuery);
      return statusMatch && outletMatch && textMatch;
    });
  }, [outgoingGoods, searchQuery, selectedOutlet]);

  // Action handlers
  const handleViewDetail = (item: BarangKeluar) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleViewPhoto = (item: BarangKeluar) => {
    const anyItem = item as any;
    const bukti = anyItem?.bukti_foto || anyItem?.bukti_terima || anyItem?.foto_bukti || null;
    if (bukti) {
      const uri = typeof bukti === 'string' ? bukti : bukti?.uri;
      if (uri) {
        setPhotoToView(uri);
        setShowPhotoModal(true);
        return;
      }
    }
    showAlert('Info', 'Tidak ada foto bukti untuk item ini', 'info');
  };

  // Render skeleton loading
  const renderSkeleton = () => (
    <View style={{ paddingBottom: 20 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
            <SkeletonShimmer width="40%" height={16} />
            <SkeletonShimmer width={60} height={24} borderRadius={12} />
          </View>
          <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
            <SkeletonShimmer width="70%" height={14} />
            <SkeletonShimmer width="50%" height={14} />
            <SkeletonShimmer width="60%" height={14} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
            <SkeletonShimmer width={100} height={32} borderRadius={10} />
            <SkeletonShimmer width={100} height={32} borderRadius={10} />
          </View>
        </View>
      ))}
    </View>
  );

  // Render item card
  const renderItem = ({ item }: { item: BarangKeluar }) => {
    const status = getItemStatus(item);
    const statusStyle = getStatusStyle(status);
    const dateStr = item.updated_at || item.tanggal_keluar || '';
    const quantityText = formatQuantity(item);

    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => handleViewDetail(item)}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardId}>#{item.id}</Text>
            <Text style={styles.cardDate}>{getRelativeTime(dateStr)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>
              {status === 'diterima' ? 'DITERIMA' : 'DIKIRIM'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="cube-outline" size={16} color="#64748B" />
            <Text style={styles.infoVal}>{item.bahan?.nama || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#64748B" />
            <Text style={styles.infoVal}>{item.outlet?.nama || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="layers-outline" size={16} color="#64748B" />
            <Text style={styles.infoVal}>{quantityText}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => handleViewPhoto(item)}
          >
            <Ionicons name="image-outline" size={16} color={Colors.primary} />
            <Text style={styles.actionBtnTxt}>Foto</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Barang Keluar</Text>
            <Text style={styles.headerSubtitle}>Riwayat Pengiriman Cabang</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor() }]}>
            <Text style={styles.avatarText}>{getUserInitial()}</Text>
          </View>
        </View>
      </View>

      {/* Content Area */}
      <View style={styles.contentArea}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Cari bahan atau outlet..." 
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="today" size={20} color="#2563EB" />
            </View>
            <Text style={styles.summaryLabel}>Hari Ini</Text>
            <Text style={styles.summaryValue}>{summaryStats.receivedToday}</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="calendar" size={20} color="#059669" />
            </View>
            <Text style={styles.summaryLabel}>Bulan Ini</Text>
            <Text style={styles.summaryValue}>{summaryStats.receivedThisMonth}</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="storefront" size={20} color="#D97706" />
            </View>
            <Text style={styles.summaryLabel}>Outlet Aktif</Text>
            <Text style={styles.summaryText}>{summaryStats.topOutlet}</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#FCE7F3' }]}>
              <Ionicons name="trending-up" size={20} color="#DB2777" />
            </View>
            <Text style={styles.summaryLabel}>Bahan Terlaris</Text>
            <Text style={styles.summaryText}>{summaryStats.topBahan}</Text>
          </View>
        </View>

        {/* Outlet Filter Trigger */}
        {outlets.length > 0 && (
          <TouchableOpacity
            style={styles.outletTrigger}
            activeOpacity={0.8}
            onPress={() => setShowOutletSheet(true)}
          >
            <View style={styles.outletTriggerLeft}>
              <Ionicons name="storefront-outline" size={18} color={Colors.primary} />
              <View>
                <Text style={styles.outletTriggerLabel}>Outlet</Text>
                <Text style={styles.outletTriggerValue}>
                  {selectedOutlet === null
                    ? 'Semua Outlet'
                    : outlets.find(o => o.id === selectedOutlet)?.nama || 'Outlet'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-down" size={18} color="#0F172A" />
          </TouchableOpacity>
        )}

        {/* List */}
        <View style={{ flex: 1 }}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="checkmark-done-circle" size={22} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Riwayat Diterima</Text>
            </View>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{filteredReceived.length}</Text>
            </View>
          </View>

          <FlatList
            data={filteredReceived}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              loading && !refreshing ? (
                renderSkeleton()
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconBg}>
                    <Ionicons name="file-tray-outline" size={48} color="#CBD5E1" />
                  </View>
                  <Text style={styles.emptyTitle}>Tidak Ada Data</Text>
                  <Text style={styles.emptySubtitle}>
                    Belum ada riwayat barang keluar yang diterima
                  </Text>
                </View>
              )
            }
          />
        </View>
      </View>

      {/* MODAL DETAIL */}
      <Modal visible={showDetailModal} transparent animationType="slide" onRequestClose={() => setShowDetailModal(false)}>
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => setShowDetailModal(false)}
        >
          <View style={styles.detailSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.detailSheetHandle} />

            <View style={styles.detailSheetHeader}>
              <Text style={styles.detailSheetTitle}>Detail Pengiriman</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailSheetDivider} />

            {selectedItem && (
              <ScrollView style={styles.detailSheetContent} showsVerticalScrollIndicator={false}>
                <>
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Ionicons name="document-text" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.detailTextBox}>
                      <Text style={styles.detailLabel}>ID Pengiriman</Text>
                      <Text style={styles.detailValue}>#{selectedItem.id}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Ionicons name="cube" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.detailTextBox}>
                      <Text style={styles.detailLabel}>Bahan</Text>
                      <Text style={styles.detailValue}>{selectedItem.bahan?.nama || '—'}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Ionicons name="layers" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.detailTextBox}>
                      <Text style={styles.detailLabel}>Jumlah</Text>
                      <Text style={styles.detailValue}>
                        {formatQuantity(selectedItem)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Ionicons name="storefront" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.detailTextBox}>
                      <Text style={styles.detailLabel}>Outlet Tujuan</Text>
                      <Text style={styles.detailValue}>{selectedItem.outlet?.nama || '—'}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Ionicons name="location" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.detailTextBox}>
                      <Text style={styles.detailLabel}>Alamat Outlet</Text>
                      <Text style={styles.detailValue}>{selectedItem.outlet?.alamat || '—'}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Ionicons name="calendar" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.detailTextBox}>
                      <Text style={styles.detailLabel}>Tanggal Keluar</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedItem.tanggal_keluar || '')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                    </View>
                    <View style={styles.detailTextBox}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: '#16A34A' }]}>
                        {getItemStatus(selectedItem).toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {selectedItem.updated_at && (
                    <View style={styles.detailRow}>
                      <View style={styles.detailIconBox}>
                        <Ionicons name="time" size={20} color={Colors.primary} />
                      </View>
                      <View style={styles.detailTextBox}>
                        <Text style={styles.detailLabel}>Terakhir Diupdate</Text>
                        <Text style={styles.detailValue}>
                          {getRelativeTime(selectedItem.updated_at)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {(selectedItem as any)?.keterangan && (
                    <View style={styles.detailRow}>
                      <View style={styles.detailIconBox}>
                        <Ionicons name="information-circle" size={20} color={Colors.primary} />
                      </View>
                      <View style={styles.detailTextBox}>
                        <Text style={styles.detailLabel}>Keterangan</Text>
                        <Text style={styles.detailValue}>{(selectedItem as any).keterangan}</Text>
                      </View>
                    </View>
                  )}
                </>
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL PHOTO */}
      <Modal visible={showPhotoModal} transparent animationType="fade" onRequestClose={() => setShowPhotoModal(false)}>
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => setShowPhotoModal(false)}
        >
          <View style={styles.photoModal} onStartShouldSetResponder={() => true}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>Bukti Foto</Text>
              <TouchableOpacity onPress={() => setShowPhotoModal(false)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {photoToView ? (
              <Image 
                source={{ uri: photoToView }} 
                style={styles.photoViewImg}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.emptyPhotoContainer}>
                <Ionicons name="image-outline" size={64} color="#CBD5E1" />
                <Text style={styles.emptyPhotoText}>Tidak ada foto</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* OUTLET SELECTOR SHEET */}
      <Modal
        visible={showOutletSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOutletSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowOutletSheet(false)}
        >
          <View style={styles.outletSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.outletSheetHandle} />
            <View style={styles.outletSheetHeader}>
              <Text style={styles.outletSheetTitle}>Pilih Outlet</Text>
              {selectedOutlet !== null && (
                <TouchableOpacity onPress={() => setSelectedOutlet(null)}>
                  <Text style={styles.outletSheetReset}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.outletRow, selectedOutlet === null && styles.outletRowActive]}
                onPress={() => {
                  setSelectedOutlet(null);
                  setShowOutletSheet(false);
                }}
              >
                <View style={[styles.outletRadio, selectedOutlet === null && styles.outletRadioActive]}>
                  {selectedOutlet === null && <View style={styles.outletRadioDot} />}
                </View>
                <Text style={[styles.outletRowText, selectedOutlet === null && styles.outletRowTextActive]}>
                  Semua Outlet
                </Text>
              </TouchableOpacity>

              {outlets.map(outlet => {
                const isActive = selectedOutlet === outlet.id;
                return (
                  <TouchableOpacity
                    key={outlet.id}
                    style={[styles.outletRow, isActive && styles.outletRowActive]}
                    onPress={() => {
                      setSelectedOutlet(outlet.id);
                      setShowOutletSheet(false);
                    }}
                  >
                    <View style={[styles.outletRadio, isActive && styles.outletRadioActive]}>
                      {isActive && <View style={styles.outletRadioDot} />}
                    </View>
                    <Text style={[styles.outletRowText, isActive && styles.outletRowTextActive]}>
                      {outlet.nama}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    backgroundColor: Colors.primary, 
    paddingTop: Platform.OS === 'ios' ? 60 : 50, 
    paddingBottom: 25, 
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
    alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: 'white',
    letterSpacing: -0.5,
  },
  headerSubtitle: { 
    fontSize: typography.body, 
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '600',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: typography.title,
    fontWeight: '900',
    color: 'white',
  },
  contentArea: { 
    flex: 1, 
    paddingHorizontal: spacing.lg, 
    marginTop: -15,
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    borderRadius: radius.lg, 
    paddingHorizontal: spacing.md, 
    height: 48, 
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: { 
    flex: 1, 
    marginLeft: 10, 
    fontWeight: '600', 
    color: '#1E293B',
    fontSize: typography.body,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'white',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: spacing.xs - 2,
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: typography.title,
    fontWeight: '900',
    color: '#1E293B',
  },
  summaryText: {
    fontSize: typography.caption,
    fontWeight: '800',
    color: '#1E293B',
  },
  outletTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  outletTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  outletTriggerLabel: {
    fontSize: typography.caption,
    color: '#94A3B8',
    fontWeight: '700',
  },
  outletTriggerValue: {
    fontSize: typography.bodyStrong,
    color: '#0F172A',
    fontWeight: '800',
  },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: spacing.sm,
  },
  sectionHeaderLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.sm,
  },
  sectionTitle: { 
    fontSize: typography.title, 
    fontWeight: '900', 
    color: '#0F172A',
  },
  sectionBadge: { 
    backgroundColor: '#EEF2FF', 
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  sectionBadgeText: { 
    color: Colors.primary, 
    fontSize: 9,
    fontWeight: '800',
  },
  card: { 
    backgroundColor: 'white', 
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    marginBottom: spacing.sm + 2,
    elevation: 2, 
    borderWidth: 1, 
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  cardId: { 
    fontSize: typography.body,
    fontWeight: '900', 
    color: '#1E293B',
  },
  cardDate: { 
    fontSize: 10,
    color: '#94A3B8', 
    marginTop: 2,
    fontWeight: '600',
  },
  badge: { 
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeText: { 
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  divider: { 
    height: 1, 
    backgroundColor: '#F1F5F9', 
    marginVertical: spacing.sm,
  },
  cardBody: { 
    gap: spacing.xs + 2,
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.xs + 2,
  },
  infoVal: { 
    fontSize: typography.caption,
    color: '#334155', 
    fontWeight: '700',
    flex: 1,
  },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.xs, 
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.md, 
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  actionBtnTxt: { 
    fontSize: 9,
    fontWeight: '800', 
    color: Colors.primary,
  },
  emptyContainer: { 
    alignItems: 'center', 
    paddingVertical: 60, 
    paddingHorizontal: 30,
  },
  emptyIconBg: { 
    width: 100, 
    height: 100, 
    borderRadius: radius.pill, 
    backgroundColor: '#F1F5F9', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: spacing.lg,
  },
  emptyTitle: { 
    fontSize: typography.title, 
    fontWeight: '900', 
    color: '#1E293B', 
    marginBottom: spacing.sm, 
    textAlign: 'center',
  },
  emptySubtitle: { 
    fontSize: typography.body, 
    color: '#94A3B8', 
    textAlign: 'center', 
    lineHeight: 20,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  outletSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    maxHeight: '70%',
  },
  outletSheetHandle: {
    width: 44,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  outletSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  outletSheetTitle: {
    fontSize: typography.title,
    fontWeight: '900',
    color: '#0F172A',
  },
  outletSheetReset: {
    fontSize: typography.caption,
    fontWeight: '800',
    color: '#DC2626',
  },
  outletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  outletRowActive: {
    backgroundColor: '#F8FAFC',
  },
  outletRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  outletRadioActive: {
    borderColor: Colors.primary,
  },
  outletRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  outletRowText: {
    fontSize: typography.body,
    color: '#0F172A',
    fontWeight: '700',
  },
  outletRowTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  detailSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: spacing.lg,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  detailSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  detailSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailSheetTitle: {
    fontSize: typography.headline,
    fontWeight: '900',
    color: '#1E293B',
  },
  detailSheetDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: spacing.lg,
  },
  detailSheetContent: {
    maxHeight: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    gap: 14,
  },
  detailIconBox: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTextBox: {
    flex: 1,
  },
  detailLabel: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: typography.bodyStrong,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 22,
  },
  photoModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  photoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  photoModalTitle: {
    fontSize: typography.title,
    fontWeight: '900',
    color: '#1E293B',
  },
  photoViewImg: {
    width: '100%',
    height: 400,
    borderRadius: radius.lg,
  },
  emptyPhotoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyPhotoText: {
    fontSize: typography.body,
    color: '#94A3B8',
    marginTop: spacing.md,
    fontWeight: '600',
  },
});
