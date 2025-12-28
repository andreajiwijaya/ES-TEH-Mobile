import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { spacing, radius, typography } from '../../constants/DesignSystem';
import { authAPI, karyawanAPI } from '../../services/api';
import { Transaksi, TransaksiItem, User } from '../../types';

type NormalizedTransaksiItem = TransaksiItem & { produk_nama: string; subtotal: number };

type TransactionWithItems = Omit<Transaksi, 'items'> & {
  bukti_qris?: string | null;
  items: NormalizedTransaksiItem[];
};

// Skeleton Shimmer Component
const SkeletonShimmer = ({ width, height, borderRadius = 8, style }: any) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E0E0E0',
          opacity,
        },
        style,
      ]}
    />
  );
};

export default function RiwayatScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + spacing.lg;

  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'week' | 'month'>('today');
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionWithItems | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // --- LOAD USER DATA ---
  const loadUserData = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      if (response.data?.user) {
        setUser(response.data.user);
        await AsyncStorage.setItem('@user_data', JSON.stringify(response.data.user));
      } else {
        const rawUser = await AsyncStorage.getItem('@user_data');
        if (rawUser) {
          setUser(JSON.parse(rawUser));
        }
      }
    } catch (error) {
      console.error('Gagal memuat user data', error);
      const rawUser = await AsyncStorage.getItem('@user_data');
      if (rawUser) {
        setUser(JSON.parse(rawUser));
      }
    }
  }, []);

  // --- HELPER PARSING ---
  const parseItems = (tx: any): NormalizedTransaksiItem[] => {
    try {
      const rawItems = (tx as any)?.item_transaksi ?? (tx as any)?.items ?? [];
      let itemsArr: any[] = [];

      if (Array.isArray(rawItems)) {
        itemsArr = rawItems;
      } else if (typeof rawItems === 'string') {
        const parsed = JSON.parse(rawItems);
        itemsArr = Array.isArray(parsed) ? parsed : parsed.items || [];
      }

      return itemsArr.map((item: any) => {
        const produkNama = item?.produk?.nama ?? item?.produk_nama ?? 'Produk';
        return {
          produk_id: Number(item?.produk_id ?? item?.id ?? 0),
          quantity: Number(item?.quantity ?? 0),
          subtotal: Number(item?.subtotal ?? 0),
          produk_nama: produkNama,
          id: item?.id,
          transaksi_id: item?.transaksi_id,
          produk: item?.produk ?? null,
        };
      });
    } catch (e) {
      console.error('Parsing error:', e);
      return [];
    }
  };

  // --- LOAD DATA ---
  const loadTransactions = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      await loadUserData();

      const response = await karyawanAPI.getTransaksi();
      const rawData = response?.data as any;
      const list = Array.isArray(rawData?.data) ? rawData.data : Array.isArray(rawData) ? rawData : [];

      const mappedData: TransactionWithItems[] = list.map((tx: any) => {
        const normalizedItems = parseItems(tx);
        return {
          id: tx.id,
          outlet_id: tx.outlet_id,
          karyawan_id: tx.karyawan_id,
          tanggal: tx.tanggal,
          total: Number(tx.total) || 0,
          metode_bayar: tx.metode_bayar || 'tunai',
          bukti_qris: tx.bukti_qris,
          items: normalizedItems,
        };
      });

      mappedData.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
      setTransactions(mappedData);
    } catch (error) {
      console.error('Load Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadUserData]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions(true);
  };

  // --- DETAIL TRANSAKSI ---
  const handleOpenDetail = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await karyawanAPI.getTransaksiById(id);
      const tx = (res && (res.data ?? res)) as any;
      if (tx) {
        const normalizedItems = parseItems(tx);

        const detailTx: TransactionWithItems = {
          id: tx.id,
          outlet_id: tx.outlet_id,
          karyawan_id: tx.karyawan_id,
          tanggal: tx.tanggal,
          total: Number(tx.total) || 0,
          metode_bayar: tx.metode_bayar || 'tunai',
          bukti_qris: tx.bukti_qris,
          items: normalizedItems,
        };
        setSelectedTx(detailTx);
        setModalVisible(true);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Gagal memuat detail.');
    } finally {
      setActionLoading(false);
    }
  };

  // --- HAPUS TRANSAKSI ---
  const handleVoidTransaction = () => {
    if (!selectedTx) return;
    Alert.alert('Hapus Riwayat', 'Yakin ingin menghapus transaksi ini? Stok akan dikembalikan.', [
      { text: 'Kembali', style: 'cancel' },
      { text: 'Ya, Hapus', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try {
          const res = await karyawanAPI.deleteTransaksi(selectedTx.id);
          if (!res.error) {
            Alert.alert('Sukses', 'Transaksi telah dihapus.');
            setModalVisible(false);
            loadTransactions(true);
          }
        } catch (err) {
          console.error(err);
          Alert.alert('Gagal', 'Gagal menghapus transaksi.');
        } finally { 
          setActionLoading(false); 
        }
      }}
    ]);
  };

  const formatDate = (dateString: string | undefined) => {
    try {
      if (!dateString) return 'Tanggal tidak valid';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Tanggal tidak valid';
      
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Date format error:', error, dateString);
      return 'Tanggal tidak valid';
    }
  };

  const filteredTransactions = transactions.filter((tx: TransactionWithItems) => {
    const now = new Date();
    const txDate = new Date(tx.tanggal);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const txDateStart = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());

    switch (selectedFilter) {
      case 'today': return txDateStart.getTime() === todayStart.getTime();
      case 'week': return txDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month': return txDate >= new Date(now.getFullYear(), now.getMonth(), 1);
      default: return true;
    }
  });

  const totalRevenue = filteredTransactions.reduce((sum: number, tx: TransactionWithItems) => sum + tx.total, 0);
  const avgTransaction = filteredTransactions.length > 0 ? totalRevenue / filteredTransactions.length : 0;

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <SkeletonShimmer width={200} height={28} borderRadius={8} style={{ marginBottom: spacing.sm }} />
              <SkeletonShimmer width={240} height={14} borderRadius={6} />
            </View>
            <SkeletonShimmer width={48} height={48} borderRadius={24} />
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Skeleton Revenue Card */}
          <View style={styles.revenueCard}>
            <SkeletonShimmer width={200} height={12} borderRadius={6} style={{ marginBottom: spacing.md }} />
            <SkeletonShimmer width={280} height={36} borderRadius={8} style={{ marginBottom: spacing.md }} />
            <View style={styles.revStats}>
              <SkeletonShimmer width="48%" height={40} borderRadius={12} />
              <SkeletonShimmer width="48%" height={40} borderRadius={12} />
            </View>
          </View>

          {/* Skeleton Filter */}
          <View style={styles.filterSection}>
            <SkeletonShimmer width="22%" height={38} borderRadius={15} />
            <SkeletonShimmer width="22%" height={38} borderRadius={15} />
            <SkeletonShimmer width="22%" height={38} borderRadius={15} />
            <SkeletonShimmer width="22%" height={38} borderRadius={15} />
          </View>

          {/* Skeleton Cards */}
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.txCard}>
              <SkeletonShimmer width="60%" height={16} borderRadius={6} style={{ marginBottom: spacing.sm }} />
              <SkeletonShimmer width="40%" height={12} borderRadius={6} style={{ marginBottom: spacing.md }} />
              <View style={{ height: 1, backgroundColor: '#F5F5F5', marginVertical: spacing.md }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <SkeletonShimmer width="30%" height={14} borderRadius={6} />
                <SkeletonShimmer width="30%" height={18} borderRadius={6} />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Laporan Penjualan</Text>
            <Text style={styles.headerSubtitle}>Pantau pendapatan dan riwayat transaksi</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.username?.substring(0, 2).toUpperCase() || 'KA'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Revenue Card */}
        <View style={styles.revenueCard}>
          <Text style={styles.revLabel}>Total Pendapatan ({selectedFilter === 'today' ? 'Hari Ini' : selectedFilter === 'week' ? '7 Hari' : selectedFilter === 'month' ? 'Bulan Ini' : 'Semua'})</Text>
          <Text style={styles.revValue}>Rp {totalRevenue.toLocaleString('id-ID')}</Text>
          <View style={styles.revStats}>
            <View style={styles.statItem}>
              <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
              <View>
                <Text style={styles.statLabel}>Transaksi</Text>
                <Text style={styles.statValue}>{filteredTransactions.length}</Text>
              </View>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="trending-up-outline" size={18} color={Colors.primary} />
              <View>
                <Text style={styles.statLabel}>Rata-rata</Text>
                <Text style={styles.statValue}>Rp {avgTransaction.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Filter Section */}
        <View style={styles.filterSection}>
          {['today', 'week', 'month', 'all'].map((f) => (
            <TouchableOpacity 
              key={f} 
              style={[styles.filterPill, selectedFilter === f && styles.filterPillActive]} 
              onPress={() => setSelectedFilter(f as any)}
            >
              <Text style={[styles.filterText, selectedFilter === f && styles.filterTextActive]}>
                {f === 'today' ? 'Hari Ini' : f === 'week' ? '7 Hari' : f === 'month' ? 'Bulan Ini' : 'Semua'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={72} color="#E0E0E0" />
            <Text style={styles.emptyText}>Tidak ada transaksi ditemukan</Text>
            <Text style={styles.emptySubtext}>Mulai proses penjualan untuk mencatat riwayat</Text>
          </View>
        ) : (
          filteredTransactions.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.txCard} 
              onPress={() => handleOpenDetail(Number(item.id))}
            >
              <View style={styles.txHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txId}>TRX-{item.id}</Text>
                  <Text style={styles.txDate}>{formatDate(item.tanggal)}</Text>
                </View>
                <View style={[styles.payBadge, { backgroundColor: item.metode_bayar === 'tunai' ? '#E3F2FD' : '#E8F5E9' }]}>
                  <Ionicons name={item.metode_bayar === 'tunai' ? 'cash-outline' : 'qr-code-outline'} size={13} color={item.metode_bayar === 'tunai' ? '#1976D2' : '#2E7D32'} />
                  <Text style={[styles.payBadgeText, { color: item.metode_bayar === 'tunai' ? '#1976D2' : '#2E7D32' }]}>
                    {item.metode_bayar.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={styles.txDivider} />
              <View style={styles.txFooter}>
                <Text style={styles.txItemCount}>{item.items.length} Item Produk</Text>
                <Text style={styles.txTotal}>Rp {item.total.toLocaleString('id-ID')}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Transaksi #{selectedTx?.id}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Transaction Info */}
              <View style={styles.txInfoSection}>
                <View style={styles.txInfoRow}>
                  <Text style={styles.txInfoLabel}>Tanggal Transaksi</Text>
                  <Text style={styles.txInfoValue}>{formatDate(selectedTx?.tanggal || '')}</Text>
                </View>
                <View style={styles.txInfoRow}>
                  <Text style={styles.txInfoLabel}>Metode Pembayaran</Text>
                  <Text style={[styles.txInfoValue, { textTransform: 'uppercase' }]}>
                    {selectedTx?.metode_bayar === 'tunai' ? 'Tunai' : 'QRIS'}
                  </Text>
                </View>
              </View>

              {/* Items */}
              <View style={styles.itemsSection}>
                <Text style={styles.sectionTitle}>Daftar Produk ({selectedTx?.items.length})</Text>
                {selectedTx?.items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.produk_nama}</Text>
                      <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                    </View>
                    <Text style={styles.itemSub}>Rp {item.subtotal.toLocaleString('id-ID')}</Text>
                  </View>
                ))}
              </View>

              {/* QRIS Proof */}
              {selectedTx?.metode_bayar === 'qris' && (
                <View style={styles.qrisSection}>
                  <Text style={styles.sectionTitle}>Bukti Pembayaran QRIS</Text>
                  {selectedTx.bukti_qris ? (
                    <Image 
                      source={{ uri: selectedTx.bukti_qris }} 
                      style={styles.qrisImage} 
                      resizeMode="contain" 
                    />
                  ) : (
                    <View style={styles.noImage}>
                      <Ionicons name="image-outline" size={40} color="#ccc" />
                      <Text style={styles.noImageText}>Bukti tidak tersedia</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Total */}
              <View style={styles.totalSection}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>GRAND TOTAL</Text>
                  <Text style={styles.totalValue}>Rp {selectedTx?.total.toLocaleString('id-ID')}</Text>
                </View>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actionContainer}>
              <Text style={styles.actionLabel}>Aksi Transaksi</Text>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.btnVoid]} 
                onPress={handleVoidTransaction} 
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={Colors.error} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    <Text style={[styles.actionBtnText, { color: Colors.error }]}>Hapus Riwayat</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F7FA' 
  },
  header: { 
    backgroundColor: Colors.primary, 
    paddingTop: Platform.OS === 'ios' ? 60 : 50, 
    paddingHorizontal: spacing.lg, 
    paddingBottom: 28,
    borderBottomLeftRadius: 32, 
    borderBottomRightRadius: 32,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  headerContent: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  headerTitle: { 
    fontSize: typography.headline, 
    fontWeight: '800', 
    color: 'white',
    marginBottom: spacing.xs,
  },
  headerSubtitle: { 
    fontSize: typography.body, 
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  avatarText: {
    fontSize: typography.title,
    fontWeight: '900',
    color: Colors.primary,
  },
  scrollContent: { 
    padding: spacing.lg, 
    paddingBottom: 40 
  },
  revenueCard: { 
    backgroundColor: Colors.primary, 
    borderRadius: radius.xl, 
    padding: spacing.lg, 
    elevation: 8,
    shadowColor: Colors.primary, 
    shadowOpacity: 0.3, 
    shadowRadius: 10,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  revLabel: { 
    color: 'rgba(255,255,255,0.8)', 
    fontSize: typography.caption, 
    fontWeight: '700', 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  revValue: { 
    color: 'white', 
    fontSize: 36, 
    fontWeight: '900', 
    marginVertical: spacing.md,
    letterSpacing: -0.5,
  },
  revStats: { 
    flexDirection: 'row', 
    gap: spacing.md,
    marginTop: spacing.md,
  },
  statItem: { 
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.md, 
    borderRadius: radius.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statLabel: { 
    color: 'rgba(255,255,255,0.7)', 
    fontSize: typography.caption,
    fontWeight: '600',
  },
  statValue: {
    color: 'white',
    fontSize: typography.body,
    fontWeight: '800',
  },
  filterSection: { 
    flexDirection: 'row', 
    gap: spacing.sm, 
    marginBottom: spacing.lg 
  },
  filterPill: { 
    flex: 1, 
    paddingVertical: 11, 
    borderRadius: radius.lg, 
    backgroundColor: 'white', 
    alignItems: 'center', 
    borderWidth: 1.5, 
    borderColor: '#E8E8E8',
    elevation: 2,
  },
  filterPillActive: { 
    backgroundColor: Colors.primary, 
    borderColor: Colors.primary,
  },
  filterText: { 
    fontSize: typography.caption, 
    fontWeight: '700', 
    color: '#666' 
  },
  filterTextActive: { 
    color: 'white' 
  },
  txCard: { 
    backgroundColor: 'white', 
    borderRadius: radius.lg, 
    padding: spacing.md, 
    marginBottom: spacing.md, 
    elevation: 3,
    borderWidth: 1, 
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  txHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  txId: { 
    fontSize: typography.bodyStrong, 
    fontWeight: '800', 
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },
  txDate: { 
    fontSize: typography.caption, 
    color: '#999', 
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  payBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 11, 
    paddingVertical: 6, 
    borderRadius: radius.md, 
    gap: 5,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  payBadgeText: { 
    fontSize: typography.caption, 
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  txDivider: { 
    height: 1, 
    backgroundColor: '#F5F5F5', 
    marginVertical: 14 
  },
  txFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  txItemCount: { 
    color: '#666', 
    fontSize: typography.body, 
    fontWeight: '600' 
  },
  txTotal: { 
    fontSize: typography.title, 
    fontWeight: '900', 
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  emptyContainer: { 
    alignItems: 'center', 
    marginTop: 80,
    paddingHorizontal: spacing.lg,
  },
  emptyText: { 
    marginTop: spacing.md, 
    color: '#999', 
    fontSize: typography.bodyStrong, 
    fontWeight: '700',
  },
  emptySubtext: {
    marginTop: spacing.sm,
    color: '#BBB',
    fontSize: typography.body,
    fontWeight: '500',
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.65)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: 'white', 
    borderTopLeftRadius: 36, 
    borderTopRightRadius: 36, 
    padding: spacing.xl, 
    maxHeight: '92%',
    elevation: 20,
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 28,
  },
  modalTitle: { 
    fontSize: typography.title, 
    fontWeight: '800',
    color: '#1A1A1A',
  },
  modalBody: { 
    marginBottom: spacing.lg,
  },
  txInfoSection: {
    backgroundColor: '#F5F7FA',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  txInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  txInfoLabel: {
    fontSize: typography.body,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  txInfoValue: {
    fontSize: typography.body,
    fontWeight: '700',
    color: '#333',
  },
  itemsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.body,
    fontWeight: '800',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  itemRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    marginBottom: spacing.sm,
  },
  itemName: { 
    fontWeight: '700', 
    fontSize: typography.body, 
    color: '#333',
  },
  itemQty: { 
    color: '#888', 
    fontSize: typography.caption, 
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  itemSub: { 
    fontWeight: '800', 
    color: Colors.primary,
    fontSize: typography.body,
  },
  totalSection: {
    backgroundColor: '#F5F7FA',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  totalRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  totalLabel: { 
    fontSize: typography.body, 
    fontWeight: '800', 
    color: '#999',
    textTransform: 'uppercase',
  },
  totalValue: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  actionContainer: { 
    borderTopWidth: 1, 
    borderTopColor: '#F0F0F0', 
    paddingTop: 20 
  },
  actionLabel: { 
    fontSize: typography.caption, 
    fontWeight: '700', 
    color: '#999', 
    marginBottom: spacing.md, 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: spacing.md, 
    borderRadius: radius.lg, 
    backgroundColor: '#F8F9FA', 
    borderWidth: 1.5, 
    borderColor: '#EEE', 
    gap: spacing.sm 
  },
  btnVoid: { 
    borderColor: '#FFCDD2', 
    backgroundColor: '#FFF9F9' 
  },
  actionBtnText: { 
    fontWeight: '800', 
    fontSize: typography.body,
  },
  qrisSection: { 
    marginBottom: spacing.lg,
  },
  qrisImage: { 
    width: '100%', 
    height: 320, 
    borderRadius: radius.lg, 
    backgroundColor: '#f0f0f0',
    marginTop: spacing.md,
  },
  noImage: { 
    width: '100%', 
    height: 120, 
    backgroundColor: '#f9f9f9', 
    borderRadius: radius.lg, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderStyle: 'dashed', 
    borderWidth: 1.5, 
    borderColor: '#E0E0E0',
    marginTop: spacing.md,
  },
  noImageText: {
    color: '#BBB',
    fontSize: typography.body,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
});
