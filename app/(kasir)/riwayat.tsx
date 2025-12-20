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
  StatusBar
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
        const mappedData: TransactionWithItems[] = response.data.map((tx: any) => ({
          id: tx.id,
          outlet_id: tx.outlet_id,
          karyawan_id: tx.karyawan_id,
          tanggal: tx.tanggal,
          total: Number(tx.total) || 0,
          metode_bayar: tx.metode_bayar || 'tunai',
          items: Array.isArray(tx.items) 
            ? tx.items.map((item: any) => ({
                produk_nama: item.produk?.nama || 'Produk dihapus',
                quantity: Number(item.quantity),
                subtotal: Number(item.subtotal)
              }))
            : []
        }));

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
    // Dummy items payload (Backend butuh items walau cuma update payment)
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
      loadTransactions(true); 
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
              loadTransactions(true); 
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

  const getPaymentIcon = (method: string) => method === 'tunai' ? 'wallet' : 'qr-code';
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
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* HEADER GREEN DNA */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Riwayat Penjualan</Text>
            <Text style={styles.headerSubtitle}>Laporan transaksi harian</Text>
          </View>
          <View style={styles.headerIconBg}>
            <Ionicons name="receipt" size={24} color={Colors.primary} />
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={{paddingBottom: 100}}
      >
        {/* Summary Cards (Modern Grid) */}
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="receipt" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.summaryValue}>{totalCount}</Text>
            <Text style={styles.summaryLabel}>Total Transaksi</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="wallet" size={20} color={Colors.success} />
            </View>
            <Text style={[styles.summaryValue, {color: Colors.success}]}>
                Rp {(totalRevenue / 1000).toFixed(0)}k
            </Text>
            <Text style={styles.summaryLabel}>Total Omset</Text>
          </View>
        </View>

        {/* Filter Tabs (Pill Style) */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Periode Laporan:</Text>
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
              <Ionicons name="documents-outline" size={48} color="#ccc" />
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
                      <Ionicons name={getPaymentIcon(item.metode_bayar)} size={12} color={Colors.textSecondary} />
                      <Text style={styles.paymentMethodText}>
                        {getPaymentLabel(item.metode_bayar)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.transactionItems}>
                  {item.items.slice(0, 2).map((orderItem, index) => (
                    <View key={index} style={styles.transactionItem}>
                      <Text style={styles.transactionItemName}>
                        {orderItem.produk_nama} <Text style={{fontWeight:'700', color: Colors.primary}}>x{orderItem.quantity}</Text>
                      </Text>
                      <Text style={styles.transactionItemPrice}>
                        Rp {orderItem.subtotal.toLocaleString('id-ID')}
                      </Text>
                    </View>
                  ))}
                  {item.items.length > 2 && (
                    <Text style={{fontSize: 12, color: Colors.textSecondary, marginTop: 6, fontStyle:'italic'}}>
                      + {item.items.length - 2} item lainnya...
                    </Text>
                  )}
                </View>

                <View style={styles.detailButton}>
                  <Text style={styles.detailButtonText}>Lihat Detail</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* --- MODAL DETAIL & AKSI --- */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Transaksi #{selectedTx?.id}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {actionLoading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{marginVertical: 40}} />
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
                      <Ionicons name={getPaymentIcon(selectedTx?.metode_bayar || 'tunai')} size={14} color="white" />
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  
  // HEADER GREEN DNA
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 25,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: 'white', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  headerIconBg: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },

  content: { flex: 1, marginTop: 10, paddingHorizontal: 24 },

  // Summary Cards
  summaryCards: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCard: {
    flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  summaryValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  
  // Filter Tabs
  filterContainer: { marginBottom: 20 },
  filterLabel: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  filterScrollView: { paddingBottom: 4 },
  filterButtons: { flexDirection: 'row', gap: 10 },
  filterButton: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'white', borderWidth: 1, borderColor: '#E0E0E0'
  },
  filterButtonActive: { backgroundColor: '#E8F5E9', borderColor: Colors.primary },
  filterButtonText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  filterButtonTextActive: { color: Colors.primary, fontWeight: '700' },
  
  // List Styles
  listContainer: { paddingBottom: 100 }, 
  loadingContainer: { paddingVertical: 50, alignItems: 'center' },
  loadingText: { marginTop: 10, color: Colors.textSecondary, fontSize: 14 },
  emptyContainer: { paddingVertical: 50, alignItems: 'center' },
  emptyText: { color: Colors.textSecondary, fontSize: 14, marginTop: 10 },
  
  // Card
  transactionCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 15,
    borderWidth: 1, borderColor: '#F0F0F0',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4
  },
  transactionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 12
  },
  transactionId: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  transactionDate: { fontSize: 12, color: Colors.textSecondary },
  transactionTotal: { alignItems: 'flex-end' },
  transactionTotalText: { fontSize: 16, fontWeight: '800', color: Colors.primary, marginBottom: 4 },
  paymentMethod: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  paymentMethodText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  
  divider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 12 },

  transactionItems: { marginBottom: 12 },
  transactionItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  transactionItemName: { fontSize: 13, color: Colors.text },
  transactionItemPrice: { fontSize: 13, fontWeight: '600', color: Colors.text },
  
  detailButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 8, borderRadius: 8, backgroundColor: '#F5F7FA', gap: 4, marginTop: 4
  },
  detailButtonText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, elevation: 20
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  modalBody: { maxHeight: 400, marginBottom: 20 },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 13, color: Colors.textSecondary },
  value: { fontSize: 14, fontWeight: '600', color: Colors.text },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10, color: Colors.text },
  
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemName: { fontSize: 13, flex: 1, color: Colors.text },
  itemQty: { fontWeight: '700', color: Colors.primary },
  itemPrice: { fontSize: 13, fontWeight: '600', color: Colors.text },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  totalBig: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  
  paymentInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  paymentTag: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6
  },
  paymentTagText: { color: 'white', fontWeight: '700', fontSize: 11, marginLeft: 5 },
  
  modalActions: { padding: 16, backgroundColor: '#FAFAFA', borderRadius: 16 },
  actionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10, textTransform: 'uppercase' },
  actionGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 12 },
  
  btnOutline: { borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: 'white', gap: 6 },
  btnOutlineText: { color: Colors.primary, fontWeight: '700', fontSize: 12 },
  
  btnDelete: { backgroundColor: '#FFEBEE', gap: 6 },
  btnDeleteText: { color: '#D32F2F', fontWeight: '700', fontSize: 13 },
});