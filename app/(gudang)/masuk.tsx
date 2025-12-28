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

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { spacing, radius, typography } from '../../constants/DesignSystem';
import { authAPI, gudangAPI } from '../../services/api';
import { BarangMasuk, Bahan, User } from '../../types';
import { useFocusEffect } from 'expo-router';

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

// ==================== MAIN COMPONENT ====================
export default function BarangMasukScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + spacing.lg;

  const [user, setUser] = useState<User | null>(null);
  const [incomingGoods, setIncomingGoods] = useState<BarangMasuk[]>([]);
  const [bahanList, setBahanList] = useState<Bahan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Modal Create/Update
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BarangMasuk | null>(null);
  const [showBahanModal, setShowBahanModal] = useState(false);
  const [selectedBahan, setSelectedBahan] = useState<Bahan | null>(null);
  const [jumlah, setJumlah] = useState('');
  const [supplier, setSupplier] = useState('');

  // Modal Detail
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState<BarangMasuk | null>(null);

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
      const [barangMasukResponse, bahanResponse] = await Promise.all([
        gudangAPI.getBarangMasuk(),
        gudangAPI.getBahan(),
      ]);

      if (barangMasukResponse.data && Array.isArray(barangMasukResponse.data)) {
        const sortedData = barangMasukResponse.data.sort((a: any, b: any) => 
          new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
        );
        setIncomingGoods(sortedData);
      }

      if (bahanResponse.data && Array.isArray(bahanResponse.data)) {
        setBahanList(bahanResponse.data);
      }
    } catch (error: any) {
      console.error('Load data error:', error);
      Alert.alert('Error', 'Gagal memuat data');
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
    if (!searchQuery) return incomingGoods;
    
    const q = searchQuery.toLowerCase();
    return incomingGoods.filter(item => {
      const bahanNama = (item.bahan?.nama || '').toLowerCase();
      const supplierNama = (item.supplier || '').toLowerCase();
      return bahanNama.includes(q) || supplierNama.includes(q);
    });
  }, [incomingGoods, searchQuery]);
  // Helper: Parse UTC date from backend
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


  // Summary Stats
  const summaryStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayCount = incomingGoods.filter(item => {
      const d = parseDateLocal(item.tanggal);
      return d >= today;
    }).length;

    const monthCount = incomingGoods.filter(item => {
      const d = parseDateLocal(item.tanggal);
      return d >= thisMonth;
    }).length;

    const totalItems = incomingGoods.reduce((sum, item) => sum + (item.jumlah || 0), 0);

    // Supplier terbanyak
    const supplierCounts = incomingGoods.reduce((acc: Record<string, number>, item) => {
      const sup = (item.supplier || '').trim();
      if (sup) acc[sup] = (acc[sup] || 0) + 1;
      return acc;
    }, {});
    const topSupplier = Object.entries(supplierCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    return { todayCount, monthCount, totalItems, topSupplier };
  }, [incomingGoods]);

  // Actions
  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedItem(null);
    setSelectedBahan(null);
    setJumlah('');
    setSupplier('');
    setShowModal(true);
  };

  const openEditModal = (item: BarangMasuk) => {
    setIsEditMode(true);
    setSelectedItem(item);
    setSelectedBahan(item.bahan || null);
    setJumlah(item.jumlah.toString());
    setSupplier(item.supplier || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedBahan || !jumlah || !supplier) {
      Alert.alert('Validasi', 'Mohon lengkapi semua data');
      return;
    }

    const qty = parseFloat(jumlah);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Validasi', 'Jumlah harus angka lebih dari 0');
      return;
    }

    setProcessing(true);
    try {
      if (isEditMode && selectedItem) {
        const response = await gudangAPI.updateBarangMasuk(selectedItem.id, {
          bahan_id: selectedBahan.id,
          jumlah: qty,
          supplier,
        });
        if (response.error) throw new Error(response.error);
        Alert.alert('Sukses', 'Data berhasil diperbarui');
      } else {
        const response = await gudangAPI.createBarangMasuk({
          bahan_id: selectedBahan.id,
          jumlah: qty,
          supplier,
        });
        if (response.error) throw new Error(response.error);
        Alert.alert('Sukses', 'Barang masuk berhasil dicatat');
      }
      
      setShowModal(false);
      loadData(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal menyimpan data');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = (item: BarangMasuk) => {
    Alert.alert(
      'Hapus Data',
      `Yakin ingin menghapus data ${item.bahan?.nama || 'item'} ini?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await gudangAPI.deleteBarangMasuk(item.id);
              if (res.error) throw new Error(res.error);
              Alert.alert('Sukses', 'Data berhasil dihapus');
              loadData(true);
            } catch (error: any) {
              Alert.alert('Gagal', error.message || 'Tidak dapat menghapus data');
            }
          },
        },
      ]
    );
  };

  const openDetailModal = (item: BarangMasuk) => {
    setDetailItem(item);
    setShowDetailModal(true);
  };

  // Helpers
  const formatDate = (dateString: string) => {
    const date = parseDateLocal(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(date);
  };

  const getRelativeTime = (dateString: string) => {
    const d = parseDateLocal(dateString);
    const diffMs = Date.now() - d.getTime();
    const m = Math.floor(diffMs / 60000);
    if (m < 1) return 'baru saja';
    if (m < 60) return `${m} menit lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    const days = Math.floor(h / 24);
    return `${days} hari lalu`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Manajemen Barang</Text>
            <Text style={styles.headerTitle}>Stok Masuk</Text>
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
            placeholder="Cari bahan atau supplier..."
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
        {loading && !refreshing ? (
          <View style={styles.summaryGrid}>
            {[1, 2, 3, 4].map((i) => (
              <View key={`skeleton-summary-${i}`} style={styles.summaryCard}>
                <SkeletonShimmer width={40} height={40} borderRadius={20} />
                <SkeletonShimmer width={50} height={24} borderRadius={8} />
                <SkeletonShimmer width={70} height={14} borderRadius={6} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(255,143,0,0.15)' }]}>
                <Ionicons name="calendar-outline" size={22} color="#FF8F00" />
              </View>
              <Text style={styles.summaryValue}>{summaryStats.todayCount}</Text>
              <Text style={styles.summaryLabel}>Hari Ini</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(46,125,50,0.15)' }]}>
                <Ionicons name="bar-chart-outline" size={22} color="#2E7D32" />
              </View>
              <Text style={styles.summaryValue}>{summaryStats.monthCount}</Text>
              <Text style={styles.summaryLabel}>Bulan Ini</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(21,101,192,0.15)' }]}>
                <Ionicons name="cube-outline" size={22} color="#1565C0" />
              </View>
              <Text style={styles.summaryValue}>{summaryStats.totalItems}</Text>
              <Text style={styles.summaryLabel}>Total Item</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(156,39,176,0.15)' }]}>
                <Ionicons name="business-outline" size={22} color="#9C27B0" />
              </View>
              <Text style={styles.summaryValue} numberOfLines={1}>{summaryStats.topSupplier}</Text>
              <Text style={styles.summaryLabel}>Top Supplier</Text>
            </View>
          </View>
        )}

        {/* List */}
        {loading && !refreshing ? (
          <View>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={`skeleton-${i}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <SkeletonShimmer width={120} height={16} borderRadius={8} />
                  <SkeletonShimmer width={80} height={14} borderRadius={6} />
                </View>
                <View style={styles.divider} />
                <View style={styles.itemRow}>
                  <SkeletonShimmer width={48} height={48} borderRadius={12} />
                  <View style={{ flex: 1, gap: spacing.sm }}>
                    <SkeletonShimmer width="70%" height={16} borderRadius={8} />
                    <SkeletonShimmer width="50%" height={14} borderRadius={6} />
                  </View>
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
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={64} color="#E2E8F0" />
                <Text style={styles.emptyText}>Belum ada barang masuk</Text>
                <Text style={styles.emptySubText}>
                  {searchQuery ? 'Tidak ada hasil pencarian' : 'Tambah barang masuk baru dengan tombol + di bawah'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.card} 
                activeOpacity={0.7}
                onPress={() => openDetailModal(item)}
              >
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{item.bahan?.nama || 'Bahan Dihapus'}</Text>
                    <Text style={styles.cardTime}>{getRelativeTime(item.tanggal)}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
                    <Text style={styles.statusText}>MASUK</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Item Info */}
                <View style={styles.itemRow}>
                  <View style={styles.itemIcon}>
                    <Ionicons name="cube" size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemLabel}>Jumlah</Text>
                    <Text style={styles.itemValue}>
                      {item.jumlah} {item.bahan?.satuan || 'pcs'}
                    </Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemLabel}>Supplier</Text>
                    <Text style={styles.itemValue} numberOfLines={1}>
                      {item.supplier || '—'}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openEditModal(item)}
                  >
                    <Ionicons name="create-outline" size={18} color="#1565C0" />
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtnBg]}
                    onPress={() => handleDelete(item)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Modal Create/Edit */}
      <Modal 
        visible={showModal} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditMode ? 'Edit Barang Masuk' : 'Tambah Barang Masuk'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Bahan */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Bahan Baku *</Text>
                <TouchableOpacity 
                  style={styles.selectButton}
                  onPress={() => setShowBahanModal(true)}
                >
                  <Text style={[styles.selectButtonText, !selectedBahan && { color: '#999' }]}>
                    {selectedBahan?.nama || 'Pilih bahan baku...'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#999" />
                </TouchableOpacity>
              </View>

              {/* Jumlah */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Jumlah *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan jumlah..."
                  keyboardType="numeric"
                  value={jumlah}
                  onChangeText={setJumlah}
                />
                {selectedBahan && (
                  <Text style={styles.helperText}>Satuan: {selectedBahan.satuan}</Text>
                )}
              </View>

              {/* Supplier */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Supplier *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nama supplier..."
                  value={supplier}
                  onChangeText={setSupplier}
                />
              </View>

              <Text style={styles.helperText}>* Wajib diisi</Text>
            </ScrollView>

            <View style={styles.divider} />

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => setShowModal(false)}
                disabled={processing}
              >
                <Ionicons name="close-circle" size={20} color="#64748B" />
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.saveBtn]}
                onPress={handleSave}
                disabled={processing}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.saveBtnText}>
                  {processing ? 'Menyimpan...' : isEditMode ? 'Update' : 'Simpan'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Pilih Bahan */}
      <Modal 
        visible={showBahanModal} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setShowBahanModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowBahanModal(false)}
        >
          <View style={[styles.modalContent, { maxHeight: '70%' }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Bahan Baku</Text>
              <TouchableOpacity onPress={() => setShowBahanModal(false)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <ScrollView showsVerticalScrollIndicator={false}>
              {bahanList.map((bahan) => (
                <TouchableOpacity
                  key={bahan.id}
                  style={[
                    styles.bahanOption,
                    selectedBahan?.id === bahan.id && styles.bahanOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedBahan(bahan);
                    setShowBahanModal(false);
                  }}
                >
                  <View style={styles.bahanInfo}>
                    <Text style={styles.bahanName}>{bahan.nama}</Text>
                    <Text style={styles.bahanSatuan}>Satuan: {bahan.satuan}</Text>
                  </View>
                  {selectedBahan?.id === bahan.id && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Detail */}
      <Modal 
        visible={showDetailModal} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setShowDetailModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowDetailModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Barang Masuk</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="cube" size={20} color="#6366F1" />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Bahan</Text>
                  <Text style={styles.detailValue}>{detailItem?.bahan?.nama || '—'}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="layers" size={20} color="#6366F1" />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Jumlah</Text>
                  <Text style={styles.detailValue}>
                    {detailItem?.jumlah} {detailItem?.bahan?.satuan || 'pcs'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="business" size={20} color="#6366F1" />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Supplier</Text>
                  <Text style={styles.detailValue}>{detailItem?.supplier || '—'}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="calendar" size={20} color="#6366F1" />
                </View>
                <View style={styles.detailTextBox}>
                  <Text style={styles.detailLabel}>Tanggal Masuk</Text>
                  <Text style={styles.detailValue}>
                    {detailItem?.tanggal ? formatDate(detailItem.tanggal) : '—'}
                  </Text>
                </View>
              </View>

              {detailItem?.bahan?.isi_per_satuan && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIconBox}>
                    <Ionicons name="information-circle" size={20} color="#6366F1" />
                  </View>
                  <View style={styles.detailTextBox}>
                    <Text style={styles.detailLabel}>Isi per Satuan</Text>
                    <Text style={styles.detailValue}>{detailItem.bahan.isi_per_satuan}</Text>
                  </View>
                </View>
              )}

              {detailItem?.bahan?.berat_per_isi && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIconBox}>
                    <Ionicons name="scale" size={20} color="#6366F1" />
                  </View>
                  <View style={styles.detailTextBox}>
                    <Text style={styles.detailLabel}>Berat per Isi</Text>
                    <Text style={styles.detailValue}>{detailItem.bahan.berat_per_isi} gram</Text>
                  </View>
                </View>
              )}
            </ScrollView>
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
    fontSize: typography.title,
    fontWeight: '800',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    marginBottom: spacing.lg,
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flexBasis: '48%',
    backgroundColor: 'white',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryValue: {
    fontSize: typography.headline,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: typography.caption,
    color: '#64748B',
    fontWeight: '700',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: radius.lg,
    padding: spacing.md,
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
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.bodyStrong,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: spacing.xs,
  },
  cardTime: {
    fontSize: typography.caption,
    color: '#94A3B8',
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  statusText: {
    fontSize: typography.caption,
    fontWeight: '900',
    color: '#2E7D32',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemLabel: {
    fontSize: typography.caption,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
  },
  itemValue: {
    fontSize: typography.body,
    color: '#1E293B',
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
    backgroundColor: '#F5F7FA',
  },
  actionBtnText: {
    fontSize: typography.body,
    fontWeight: '800',
    color: '#1565C0',
  },
  deleteBtnBg: {
    backgroundColor: '#FEE2E2',
  },
  skeletonBar: {
    backgroundColor: '#E2E8F0',
    borderRadius: radius.sm,
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
    marginTop: spacing.md,
    fontSize: typography.bodyStrong,
    color: '#94A3B8',
    fontWeight: '700',
  },
  emptySubText: {
    marginTop: spacing.sm,
    fontSize: typography.body,
    color: '#CBD5E1',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
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
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.headline,
    fontWeight: '900',
    color: '#1E293B',
  },
  modalBody: {
    maxHeight: '100%',
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.body,
    fontWeight: '700',
    color: '#555',
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.bodyStrong,
    backgroundColor: '#F9FAFB',
    color: '#333',
    fontWeight: '500',
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: '#F9FAFB',
  },
  selectButtonText: {
    fontSize: typography.bodyStrong,
    color: '#333',
    fontWeight: '500',
  },
  helperText: {
    fontSize: typography.caption,
    color: '#999',
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    backgroundColor: '#F5F7FA',
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: typography.bodyStrong,
    fontWeight: '800',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    color: 'white',
    fontSize: typography.bodyStrong,
    fontWeight: '800',
  },
  bahanOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  bahanOptionActive: {
    backgroundColor: '#F0FDF4',
  },
  bahanInfo: {
    flex: 1,
  },
  bahanName: {
    fontSize: typography.bodyStrong,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  bahanSatuan: {
    fontSize: typography.caption,
    color: '#94A3B8',
    fontWeight: '600',
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
});
