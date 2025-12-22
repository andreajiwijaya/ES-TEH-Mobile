import { Ionicons } from '@expo/vector-icons';
import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Transaksi } from '../../types';
import { karyawanAPI } from '../../services/api';

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

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionWithItems | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // --- 1. LOAD DATA ---
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

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions(true);
  };

  // --- 2. DETAIL TRANSAKSI ---
  const handleOpenDetail = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await karyawanAPI.getTransaksiById(id);
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
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Gagal memuat detail.');
    } finally {
      setActionLoading(false);
    }
  };

  // --- 3. EDIT PEMBAYARAN ---
  const handleUpdatePayment = async (newMethod: 'tunai' | 'qris') => {
    if (!selectedTx) return;
    Alert.alert('Konfirmasi', `Ubah pembayaran ke ${newMethod.toUpperCase()}?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ya, Ubah', onPress: async () => {
        setActionLoading(true);
        try {
          const res = await karyawanAPI.updateTransaksi(selectedTx.id, {
            tanggal: selectedTx.tanggal,
            metode_bayar: newMethod,
            items: selectedTx.items 
          });
          if (!res.error) {
            Alert.alert('Sukses', 'Pembayaran berhasil diubah');
            setModalVisible(false);
            loadTransactions(true);
          }
        } catch (err) {
          console.error(err);
          Alert.alert('Gagal', 'Gagal update pembayaran');
        } finally {
          setActionLoading(false);
        }
      }}
    ]);
  };

  // --- 4. VOID TRANSAKSI ---
  const handleVoidTransaction = () => {
    if (!selectedTx) return;
    Alert.alert(
      'VOID Transaksi',
      'Yakin ingin membatalkan transaksi ini?',
      [
        { text: 'Kembali', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await karyawanAPI.deleteTransaksi(selectedTx.id);
              if (!res.error) {
                Alert.alert('Sukses', 'Transaksi telah di-VOID.');
                setModalVisible(false);
                loadTransactions(true);
              }
            } catch (err) {
              console.error(err);
              Alert.alert('Gagal', 'Gagal membatalkan transaksi.');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  // --- HELPERS ---
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  const filteredTransactions = transactions.filter(tx => {
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

  const totalRevenue = filteredTransactions.reduce((sum, tx) => sum + tx.total, 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Laporan Penjualan</Text>
            <Text style={styles.headerSubtitle}>Monitor pendapatan outlet anda</Text>
          </View>
          <View style={styles.headerIconBg}>
            <Ionicons name="stats-chart" size={24} color={Colors.primary} />
          </View>
        </View>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.revenueCard}>
          <Text style={styles.revLabel}>Total Pendapatan ({selectedFilter === 'today' ? 'Hari Ini' : 'Periode Terpilih'})</Text>
          <Text style={styles.revValue}>Rp {totalRevenue.toLocaleString('id-ID')}</Text>
          <View style={styles.revStats}>
             <View style={styles.statItem}>
                <Ionicons name="receipt-outline" size={16} color="white" />
                <Text style={styles.statText}>{filteredTransactions.length} Transaksi</Text>
             </View>
          </View>
        </View>

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

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 50}} />
        ) : filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Tidak ada transaksi ditemukan</Text>
          </View>
        ) : (
          filteredTransactions.map((item) => (
            <TouchableOpacity key={item.id} style={styles.txCard} onPress={() => handleOpenDetail(Number(item.id))}>
              <View style={styles.txHeader}>
                <View>
                  <Text style={styles.txId}>TRX-{item.id}</Text>
                  <Text style={styles.txDate}>{formatDate(item.tanggal)}</Text>
                </View>
                <View style={[styles.payBadge, { backgroundColor: item.metode_bayar === 'tunai' ? '#E3F2FD' : '#E8F5E9' }]}>
                  <Ionicons name={item.metode_bayar === 'tunai' ? 'cash-outline' : 'qr-code-outline'} size={12} color={item.metode_bayar === 'tunai' ? '#1976D2' : '#2E7D32'} />
                  <Text style={[styles.payBadgeText, { color: item.metode_bayar === 'tunai' ? '#1976D2' : '#2E7D32' }]}>{item.metode_bayar.toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.txDivider} />
              <View style={styles.txFooter}>
                <Text style={styles.txItemCount}>{item.items.length} Item</Text>
                <Text style={styles.txTotal}>Rp {item.total.toLocaleString('id-ID')}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Transaksi #{selectedTx?.id}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={26} color="#333" /></TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedTx?.items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={{flex:1}}>
                    <Text style={styles.itemName}>{item.produk_nama}</Text>
                    <Text style={styles.itemQty}>Jumlah: {item.quantity}</Text>
                  </View>
                  <Text style={styles.itemSub}>Rp {item.subtotal.toLocaleString('id-ID')}</Text>
                </View>
              ))}
              <View style={styles.modalDivider} />
              <View style={styles.modalTotalRow}>
                 <Text style={styles.modalTotalLabel}>GRAND TOTAL</Text>
                 <Text style={styles.modalTotalValue}>Rp {selectedTx?.total.toLocaleString('id-ID')}</Text>
              </View>
            </ScrollView>

            <View style={styles.actionContainer}>
               <Text style={styles.actionLabel}>Aksi Cepat:</Text>
               <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => handleUpdatePayment(selectedTx?.metode_bayar === 'tunai' ? 'qris' : 'tunai')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : (
                      <>
                        <Ionicons name="swap-horizontal" size={18} color={Colors.primary} />
                        <Text style={styles.actionBtnText}>Ubah Bayar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.btnVoid]} 
                    onPress={handleVoidTransaction}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <ActivityIndicator size="small" color={Colors.error} /> : (
                      <>
                        <Ionicons name="trash-outline" size={18} color={Colors.error} />
                        <Text style={[styles.actionBtnText, {color: Colors.error}]}>VOID</Text>
                      </>
                    )}
                  </TouchableOpacity>
               </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: Colors.primary, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingHorizontal: 24, paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  headerIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  revenueCard: { backgroundColor: Colors.primary, borderRadius: 24, padding: 24, elevation: 8, shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 10, marginBottom: 25 },
  revLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  revValue: { color: 'white', fontSize: 32, fontWeight: '900', marginVertical: 8 },
  revStats: { flexDirection: 'row', marginTop: 5 },
  statItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statText: { color: 'white', fontSize: 12, fontWeight: '700', marginLeft: 6 },
  filterSection: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  filterPill: { flex: 1, paddingVertical: 10, borderRadius: 15, backgroundColor: 'white', alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  filterPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, fontWeight: '700', color: '#666' },
  filterTextActive: { color: 'white' },
  txCard: { backgroundColor: 'white', borderRadius: 20, padding: 18, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
  txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  txId: { fontSize: 14, fontWeight: '800', color: '#333' },
  txDate: { fontSize: 12, color: '#999', marginTop: 2 },
  payBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 5 },
  payBadgeText: { fontSize: 10, fontWeight: '800' },
  txDivider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 15 },
  txFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txItemCount: { color: '#666', fontSize: 13, fontWeight: '600' },
  txTotal: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 15, color: '#999', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalBody: { marginBottom: 20 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  itemName: { fontWeight: '700', fontSize: 15, color: '#333' },
  itemQty: { color: '#888', fontSize: 13, marginTop: 2 },
  itemSub: { fontWeight: '700', color: '#333' },
  modalDivider: { height: 1, backgroundColor: '#EEE', marginVertical: 15 },
  modalTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTotalLabel: { fontSize: 14, fontWeight: '800', color: '#666' },
  modalTotalValue: { fontSize: 24, fontWeight: '900', color: Colors.primary },
  actionContainer: { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 20 },
  actionLabel: { fontSize: 13, fontWeight: '700', color: '#999', marginBottom: 15, textTransform: 'uppercase' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 16, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#EEE', gap: 8 },
  btnVoid: { borderColor: '#FFEBEE', backgroundColor: '#FFF9F9' },
  actionBtnText: { fontWeight: '700', fontSize: 13, color: Colors.primary }
});