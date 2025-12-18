import { Ionicons } from '@expo/vector-icons';
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
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Transaksi } from '../../types';
import { karyawanAPI } from '../../services/api';

// Interface Lokal untuk UI
interface TransactionWithItems extends Omit<Transaksi, 'items'> {
  items: {
    produk_nama: string;
    quantity: number;
    subtotal: number;
  }[];
}

export default function RiwayatScreen() {
  // --- STATE ---
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'week' | 'month'>('today');
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State Modal Detail & Aksi
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionWithItems | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // --- 1. LOAD DATA (API 42: GET /transaksi) ---
  const loadTransactions = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await karyawanAPI.getTransaksi();
      
      if (response.data && Array.isArray(response.data)) {
        // Mapping data agar aman
        const mappedData: TransactionWithItems[] = response.data.map((tx: any) => ({
          id: tx.id,
          outlet_id: tx.outlet_id,
          karyawan_id: tx.karyawan_id,
          tanggal: tx.tanggal,
          total: Number(tx.total) || 0,
          metode_bayar: tx.metode_bayar || 'tunai',
          // Handle items jika ada, jika tidak kosongkan array
          items: Array.isArray(tx.items) 
            ? tx.items.map((item: any) => ({
                produk_nama: item.produk?.nama || 'Produk dihapus',
                quantity: Number(item.quantity),
                subtotal: Number(item.subtotal)
              }))
            : []
        }));

        // Sort dari yang terbaru
        mappedData.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
        setTransactions(mappedData);
      }
    } catch (error) {
      console.error('Load Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions(true);
  };

  // --- 2. DETAIL TRANSAKSI (API 43: GET /transaksi/{id}) ---
  const handleOpenDetail = async (id: number) => {
    setActionLoading(true);
    const res = await karyawanAPI.getTransaksiById(id);
    setActionLoading(false);

    if (res.data) {
      // Cast ke any dulu untuk akses properti dengan aman
      const tx = res.data as any;
      
      const detailTx: TransactionWithItems = {
        id: tx.id,
        outlet_id: tx.outlet_id,
        karyawan_id: tx.karyawan_id,
        tanggal: tx.tanggal,
        total: Number(tx.total),
        metode_bayar: tx.metode_bayar || 'tunai',
        items: Array.isArray(tx.items) 
            ? tx.items.map((item: any) => ({
                produk_nama: item.produk?.nama || 'Produk dihapus',
                quantity: Number(item.quantity),
                subtotal: Number(item.subtotal)
              }))
            : []
      };
      
      setSelectedTx(detailTx);
      setModalVisible(true);
    } else {
      Alert.alert('Error', 'Gagal memuat detail transaksi.');
    }
  };

  // --- 3. EDIT PEMBAYARAN (API 45: PUT /transaksi/{id}) ---
  const handleUpdatePayment = async (newMethod: 'tunai' | 'qris') => {
    if (!selectedTx) return;
    if (selectedTx.metode_bayar === newMethod) {
      Alert.alert('Info', `Metode pembayaran sudah ${newMethod.toUpperCase()}`);
      return;
    }

    setActionLoading(true);
    // Dummy items payload
    const dummyItemsPayload = selectedTx.items.map(() => ({ produk_id: 1, quantity: 1 })); 

    const res = await karyawanAPI.updateTransaksi(selectedTx.id, {
      tanggal: selectedTx.tanggal,
      metode_bayar: newMethod,
      items: dummyItemsPayload 
    });
    setActionLoading(false);

    if (res.error) {
      Alert.alert('Gagal Update', 'Gagal mengubah metode pembayaran.');
    } else {
      Alert.alert('Sukses', `Pembayaran diubah menjadi ${newMethod.toUpperCase()}`);
      setModalVisible(false);
      loadTransactions(true); // Refresh list
    }
  };

  // --- 4. VOID / HAPUS TRANSAKSI (API 46: DELETE /transaksi/{id}) ---
  const handleVoidTransaction = () => {
    if (!selectedTx) return;

    Alert.alert(
      'VOID Transaksi',
      'Apakah Anda yakin ingin membatalkan transaksi ini? Stok produk akan dikembalikan otomatis.',
      [
        { text: 'Kembali', style: 'cancel' },
        {
          text: 'Ya, VOID',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const res = await karyawanAPI.deleteTransaksi(selectedTx.id);
            setActionLoading(false);

            if (res.error) {
              Alert.alert('Gagal VOID', res.error);
            } else {
              Alert.alert('Sukses', 'Transaksi berhasil dibatalkan (VOID).');
              setModalVisible(false);
              loadTransactions(true); // Refresh list
            }
          }
        }
      ]
    );
  };

  // --- HELPER LOGIC ---
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  const getPaymentIcon = (method: string) => method === 'tunai' ? 'wallet-outline' : 'qr-code-outline';
  
  const getPaymentLabel = (method: string) => method === 'tunai' ? 'Tunai' : 'QRIS';

  // Filter Logic
  const filteredTransactions = transactions.filter(tx => {
    const now = new Date();
    const txDate = new Date(tx.tanggal);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const txDateStart = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());

    switch (selectedFilter) {
      case 'today': return txDateStart.getTime() === todayStart.getTime();
      case 'week': 
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return txDate >= weekAgo;
      case 'month': 
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
        return txDate >= monthAgo;
      default: return true;
    }
  });

  const totalRevenue = filteredTransactions.reduce((sum, tx) => sum + tx.total, 0);
  const totalCount = filteredTransactions.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Riwayat Penjualan</Text>
          <View style={styles.userInfo}>
            <View style={styles.avatar}><Text style={styles.avatarText}>KS</Text></View>
            <View>
              <Text style={styles.userName}>Kasir Outlet</Text>
              <Text style={styles.userRole}>Sedang Bertugas</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{paddingBottom: 100}}
      >
        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Ionicons name="receipt-outline" size={24} color={Colors.primary} />
            <Text style={styles.summaryLabel}>Total Transaksi</Text>
            <Text style={styles.summaryValue}>{totalCount}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="cash-outline" size={24} color={Colors.success} />
            <Text style={styles.summaryLabel}>Total Pendapatan</Text>
            <Text style={styles.summaryValue}>Rp {totalRevenue.toLocaleString('id-ID')}</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter Periode:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
            <View style={styles.filterButtons}>
              {['today', 'week', 'month', 'all'].map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterButton, selectedFilter === filter && styles.filterButtonActive]}
                  onPress={() => setSelectedFilter(filter as any)}
                >
                  <Text style={[styles.filterButtonText, selectedFilter === filter && styles.filterButtonTextActive]}>
                    {filter === 'today' ? 'Hari Ini' : filter === 'week' ? '7 Hari' : filter === 'month' ? 'Bulan Ini' : 'Semua'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Transaction List */}
        <View style={styles.listContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Memuat riwayat...</Text>
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Tidak ada transaksi pada periode ini.</Text>
            </View>
          ) : (
            filteredTransactions.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.transactionCard}
                onPress={() => handleOpenDetail(Number(item.id))}
              >
                <View style={styles.transactionHeader}>
                  <View>
                    <Text style={styles.transactionId}>#{item.id}</Text>
                    <Text style={styles.transactionDate}>{formatDate(item.tanggal)}</Text>
                  </View>
                  <View style={styles.transactionTotal}>
                    <Text style={styles.transactionTotalText}>
                      Rp {item.total.toLocaleString('id-ID')}
                    </Text>
                    <View style={styles.paymentMethod}>
                      <Ionicons name={getPaymentIcon(item.metode_bayar)} size={14} color={Colors.textSecondary} />
                      <Text style={styles.paymentMethodText}>
                        {getPaymentLabel(item.metode_bayar)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.transactionItems}>
                  {item.items.slice(0, 2).map((orderItem, index) => (
                    <View key={index} style={styles.transactionItem}>
                      <Text style={styles.transactionItemName}>
                        {orderItem.produk_nama} <Text style={{fontWeight:'bold'}}>x{orderItem.quantity}</Text>
                      </Text>
                      <Text style={styles.transactionItemPrice}>
                        Rp {orderItem.subtotal.toLocaleString('id-ID')}
                      </Text>
                    </View>
                  ))}
                  {item.items.length > 2 && (
                    <Text style={{fontSize: 12, color: Colors.textSecondary, marginTop: 4}}>
                      + {item.items.length - 2} item lainnya...
                    </Text>
                  )}
                </View>

                {/* Tombol Visual (Agar user tau bisa diklik) */}
                <View style={styles.detailButton}>
                  <Text style={styles.detailButtonText}>Lihat Detail & Aksi</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* --- MODAL DETAIL & AKSI --- */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Transaksi #{selectedTx?.id}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {actionLoading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{marginVertical: 20}} />
            ) : (
              <>
                <ScrollView style={styles.modalBody}>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Tanggal:</Text>
                    <Text style={styles.value}>{selectedTx && formatDate(selectedTx.tanggal)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Kasir ID:</Text>
                    <Text style={styles.value}>{selectedTx?.karyawan_id}</Text>
                  </View>

                  <View style={styles.divider} />

                  <Text style={styles.sectionTitle}>Item Pesanan:</Text>
                  {selectedTx?.items.map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                      <Text style={styles.itemName}>{item.produk_nama} <Text style={styles.itemQty}>x{item.quantity}</Text></Text>
                      <Text style={styles.itemPrice}>Rp {item.subtotal.toLocaleString('id-ID')}</Text>
                    </View>
                  ))}

                  <View style={[styles.divider, {marginTop: 10}]} />

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL BAYAR</Text>
                    <Text style={styles.totalBig}>Rp {selectedTx?.total.toLocaleString('id-ID')}</Text>
                  </View>

                  <View style={styles.paymentInfo}>
                    <Text style={styles.label}>Metode Pembayaran:</Text>
                    <View style={styles.paymentTag}>
                      <Ionicons name={getPaymentIcon(selectedTx?.metode_bayar || 'tunai')} size={16} color="white" />
                      <Text style={styles.paymentTagText}>
                        {getPaymentLabel(selectedTx?.metode_bayar || 'tunai').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                {/* AREA TOMBOL AKSI */}
                <View style={styles.modalActions}>
                  <Text style={styles.actionTitle}>Tindakan:</Text>
                  <View style={styles.actionGrid}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.btnOutline]} 
                      onPress={() => handleUpdatePayment('tunai')}
                    >
                      <Ionicons name="wallet-outline" size={18} color={Colors.primary} />
                      <Text style={styles.btnOutlineText}>Ubah Tunai</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.btnOutline]} 
                      onPress={() => handleUpdatePayment('qris')}
                    >
                      <Ionicons name="qr-code-outline" size={18} color={Colors.primary} />
                      <Text style={styles.btnOutlineText}>Ubah QRIS</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.btnDelete]} 
                    onPress={handleVoidTransaction}
                  >
                    <Ionicons name="trash-outline" size={20} color="white" />
                    <Text style={styles.btnDeleteText}>VOID / Batalkan Transaksi</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.backgroundLight },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.backgroundLight,
    justifyContent: 'center', alignItems: 'center', marginRight: 10
  },
  avatarText: { fontSize: 14, fontWeight: 'bold', color: Colors.primary },
  userName: { fontSize: 14, fontWeight: '600', color: Colors.backgroundLight },
  userRole: { fontSize: 12, color: Colors.backgroundLight, opacity: 0.8 },
  
  content: { flex: 1, padding: 20 },
  summaryCards: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  summaryCard: {
    flex: 1, backgroundColor: Colors.backgroundLight, borderRadius: 12, padding: 15,
    alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.1, shadowRadius:4
  },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 10, marginBottom: 5 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  
  filterContainer: { marginBottom: 20 },
  filterLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 10 },
  filterScrollView: { paddingBottom: 4 },
  filterButtons: { flexDirection: 'row', gap: 10 },
  filterButton: {
    paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.backgroundLight, borderWidth: 1, borderColor: Colors.border
  },
  filterButtonActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  filterButtonText: { fontSize: 12, color: Colors.textSecondary },
  filterButtonTextActive: { color: Colors.primaryDark, fontWeight: '600' },
  
  // List Styles
  listContainer: { paddingBottom: 100 }, 
  loadingContainer: { paddingVertical: 50, alignItems: 'center' },
  loadingText: { marginTop: 10, color: Colors.textSecondary, fontSize: 14 },
  emptyContainer: { paddingVertical: 50, alignItems: 'center' },
  emptyText: { color: Colors.textSecondary, fontSize: 16 },
  
  // Card
  transactionCard: {
    backgroundColor: Colors.backgroundLight, borderRadius: 12, padding: 15, marginBottom: 15,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2
  },
  transactionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: Colors.border
  },
  transactionId: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  transactionDate: { fontSize: 12, color: Colors.textSecondary },
  transactionTotal: { alignItems: 'flex-end' },
  transactionTotalText: { fontSize: 18, fontWeight: 'bold', color: Colors.primaryDark, marginBottom: 4 },
  paymentMethod: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  paymentMethodText: { fontSize: 12, color: Colors.textSecondary },
  
  transactionItems: { marginBottom: 15 },
  transactionItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  transactionItemName: { fontSize: 14, color: Colors.text },
  transactionItemPrice: { fontSize: 14, fontWeight: '600', color: Colors.text },
  
  detailButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary, gap: 8
  },
  detailButtonText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.backgroundLight, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, elevation: 20
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  modalBody: { maxHeight: 400, marginBottom: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 14, color: Colors.textSecondary },
  value: { fontSize: 14, fontWeight: '600', color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemName: { fontSize: 14, flex: 1 },
  itemQty: { fontWeight: 'bold' },
  itemPrice: { fontSize: 14, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  totalLabel: { fontSize: 16, fontWeight: 'bold' },
  totalBig: { fontSize: 20, fontWeight: 'bold', color: Colors.primary },
  paymentInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  paymentTag: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6
  },
  paymentTagText: { color: 'white', fontWeight: 'bold', fontSize: 12, marginLeft: 5 },
  
  modalActions: { padding: 20, backgroundColor: '#F9F9F9', borderRadius: 16 },
  actionTitle: { fontSize: 12, fontWeight: 'bold', color: Colors.textSecondary, marginBottom: 10, textTransform: 'uppercase' },
  actionGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 8 },
  btnOutline: { borderWidth: 1, borderColor: Colors.primary, backgroundColor: 'white', gap: 6 },
  btnOutlineText: { color: Colors.primary, fontWeight: 'bold', fontSize: 12 },
  btnDelete: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2', gap: 6 },
  btnDeleteText: { color: Colors.error, fontWeight: 'bold', fontSize: 13 },
});