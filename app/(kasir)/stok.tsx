import { Ionicons } from '@expo/vector-icons';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  StatusBar,
  Platform
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Bahan, PermintaanStok, BarangKeluar, BahanGudang } from '../../types';
import { karyawanAPI, gudangAPI } from '../../services/api';

interface StockItem {
  id: string; 
  outlet_id: number;
  bahan_id: number;
  stok: number;
  bahan: Bahan; 
  status: 'Aman' | 'Menipis' | 'Kritis';
}

export default function StokScreen() {
  const [activeTab, setActiveTab] = useState<'stok' | 'terima' | 'riwayat'>('stok');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [requestHistory, setRequestHistory] = useState<PermintaanStok[]>([]);
  const [incomingShipments, setIncomingShipments] = useState<BarangKeluar[]>([]);
  const [bahanGudang, setBahanGudang] = useState<BahanGudang[]>([]);
  const [selectedBahanGudangId, setSelectedBahanGudangId] = useState<number | null>(null);
  const [modalFromGudang, setModalFromGudang] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [selectedRequestItem, setSelectedRequestItem] = useState<PermintaanStok | null>(null);
  const [inputQuantity, setInputQuantity] = useState('');
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');

  const loadAllData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [stokRes, reqRes, incomingRes, bahanGudangRes] = await Promise.all([
        karyawanAPI.getStokOutlet(),
        karyawanAPI.getPermintaanStok(),
        gudangAPI.getBarangKeluar(),
        karyawanAPI.getBahanGudang(),
      ]);

      if (stokRes.data && Array.isArray(stokRes.data)) {
        const mappedStok: StockItem[] = (stokRes.data as any[]).map((item: any) => {
          const stok = Number(item.stok) || 0;
          const min = Number(item.bahan?.stok_minimum_outlet) || 0;
          let status: 'Aman' | 'Menipis' | 'Kritis' = 'Aman';
          if (stok <= 0 || stok <= min * 0.3) status = 'Kritis';
          else if (stok <= min) status = 'Menipis';
          return {
            id: `${item.outlet_id}-${item.bahan_id}`,
            outlet_id: item.outlet_id,
            bahan_id: item.bahan_id,
            stok,
            bahan: item.bahan || { nama: 'Unknown', satuan: 'Unit' },
            status
          };
        });
        setStockItems(mappedStok);
      }

      if (reqRes.data && Array.isArray(reqRes.data)) {
        setRequestHistory((reqRes.data as PermintaanStok[]).sort((a, b) => b.id - a.id));
      }
      
      if (incomingRes.data && Array.isArray(incomingRes.data)) {
        // show only shipments that still need to be received (exclude already received/cancelled)
        const pending = (incomingRes.data as BarangKeluar[]).filter(i => {
          const s = (i.status || '').toString().toLowerCase();
          return s !== 'received' && s !== 'diterima' && s !== 'cancelled';
        });
        setIncomingShipments(pending);
      }

      if (bahanGudangRes.data) {
        // API may return either an array directly, or an object { message, data: [...] }
        const payload = Array.isArray(bahanGudangRes.data)
          ? bahanGudangRes.data
          : (bahanGudangRes.data as any).data;
        if (Array.isArray(payload)) {
          setBahanGudang(payload as BahanGudang[]);
        } else {
          // if payload unexpected, clear list and log for debugging
          console.warn('Unexpected bahanGudang response shape', bahanGudangRes.data);
          setBahanGudang([]);
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Gagal sinkronisasi data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadAllData(); }, [loadAllData]));

  const filteredStock = stockItems.filter(item => 
    item.bahan.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirmReceipt = async (id: number) => {
    Alert.alert('Konfirmasi', 'Barang sudah sampai dan sesuai?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Tolak',
        style: 'destructive',
        onPress: async () => {
          Alert.alert('Tolak Kiriman', 'Apa Anda yakin menolak kiriman ini?', [
            { text: 'Batal', style: 'cancel' },
            { text: 'Ya, Tolak', style: 'destructive', onPress: async () => {
              setActionLoading(true);
              try {
                const res = await karyawanAPI.tolakBarangKeluar(id);
                if (res.error) throw new Error(res.error);
                const msg = (res.data && (res.data as any).message) || 'Kiriman ditolak.';
                Alert.alert('Berhasil', msg);
                await loadAllData(true);
              } catch (err: any) {
                console.error('Tolak Error:', err);
                Alert.alert('Gagal', err.message || 'Gagal menolak kiriman.');
              } finally {
                setActionLoading(false);
              }
            }}
          ]);
        }
      },
      {
        text: 'Ya, Terima',
        onPress: async () => {
          setActionLoading(true);
          try {
            const res = await karyawanAPI.terimaBarangKeluar(id);
            if (res.error) {
              throw new Error(res.error);
            }
            const successMsg = (res.data && (res.data as any).message) || 'Stok outlet telah bertambah.';
            Alert.alert('Sukses', successMsg);
            await loadAllData(true);
          } catch (err: any) {
            console.error('Terima Error:', err);
            Alert.alert('Gagal', err.message || 'Gagal menerima barang.');
          } finally {
            setActionLoading(false);
          }
        }
      }
    ]);
  };

  const handleRejectShipment = async (id: number) => {
    // helper if we need to call reject separately from confirm dialog
    setActionLoading(true);
    try {
      const res = await karyawanAPI.tolakBarangKeluar(id);
      if (res.error) throw new Error(res.error);
      const msg = (res.data && (res.data as any).message) || 'Kiriman ditolak.';
      Alert.alert('Berhasil', msg);
      await loadAllData(true);
    } catch (err: any) {
      console.error('Tolak Error:', err);
      Alert.alert('Gagal', err.message || 'Gagal menolak kiriman.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = async () => {
    const qty = parseInt(inputQuantity);
    if (isNaN(qty) || qty <= 0) return Alert.alert('Validasi', 'Input jumlah tidak valid.');
    setActionLoading(true);
    try {
      if (modalType === 'create') {
        if (modalFromGudang && selectedBahanGudangId) {
          await karyawanAPI.createPermintaanStok({ bahan_id: selectedBahanGudangId, jumlah: qty });
        } else if (selectedStockItem) {
          await karyawanAPI.createPermintaanStok({ bahan_id: selectedStockItem.bahan_id, jumlah: qty });
        } else {
          throw new Error('Pilih bahan terlebih dahulu.');
        }
      } else if (modalType === 'edit' && selectedRequestItem) {
        await karyawanAPI.updatePermintaanStok(selectedRequestItem.id, { bahan_id: selectedRequestItem.bahan_id, jumlah: qty });
      }
      setModalVisible(false);
      setModalFromGudang(false);
      setSelectedBahanGudangId(null);
      loadAllData(true);
    } catch (err: any) {
      Alert.alert('Gagal', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = () => {
    if (!selectedRequestItem) return;
    Alert.alert('Hapus', 'Batalkan permintaan ini?', [
      { text: 'Kembali' },
      { text: 'Ya, Hapus', style: 'destructive', onPress: async () => {
        await karyawanAPI.deletePermintaanStok(selectedRequestItem.id);
        setModalVisible(false);
        loadAllData(true);
      }}
    ]);
  };

  const getStatusColor = (s: string) => {
    const st = s.toLowerCase();
    if (st === 'aman' || st === 'received' || st === 'completed') return Colors.success;
    if (st === 'menipis' || st === 'pending' || st === 'in_transit') return Colors.warning;
    return Colors.error;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Persediaan Bahan</Text>
            <Text style={styles.headerSubtitle}>Monitor stok dan terima barang</Text>
          </View>
          <View style={styles.headerIconContainer}>
            <Ionicons name="cube" size={24} color={Colors.primary} />
          </View>
        </View>

        <View style={styles.tabContainer}>
          {(['stok', 'terima', 'riwayat'] as const).map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tabButton, activeTab === tab && styles.tabActive]} 
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'stok' ? 'Stok' : tab === 'terima' ? 'Penerimaan' : 'Request'}
              </Text>
              {tab === 'terima' && incomingShipments.length > 0 && <View style={styles.notifDot} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAllData(true)} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <>
            {activeTab === 'stok' && (
              <>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={20} color="#999" />
                  <TextInput 
                    style={styles.searchInput} 
                    placeholder="Cari nama bahan..." 
                    value={searchQuery} 
                    onChangeText={setSearchQuery} 
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <TouchableOpacity
                    style={[styles.reqBtn, { paddingHorizontal: 12, paddingVertical: 8 }]}
                    onPress={() => {
                      setModalFromGudang(true);
                      setSelectedStockItem(null);
                      setSelectedBahanGudangId(null);
                      setModalType('create');
                      setInputQuantity('');
                      setModalVisible(true);
                    }}
                  >
                    <Ionicons name="download-outline" size={16} color="white" />
                    <Text style={[styles.reqBtnText, { marginLeft: 8, fontSize: 12 }]}>Ambil dari Gudang</Text>
                  </TouchableOpacity>
                </View>

                {filteredStock.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="file-tray-outline" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>Data stok tidak ditemukan</Text>
                  </View>
                ) : (
                  filteredStock.map(item => (
                    <View key={item.id} style={styles.card}>
                      <View style={styles.cardTop}>
                        <View style={styles.cardInfo}>
                          <Text style={styles.cardTitle}>{item.bahan.nama}</Text>
                          <Text style={styles.cardUnit}>Satuan: {item.bahan.satuan}</Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                          <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                        </View>
                      </View>
                      <View style={styles.cardDivider} />
                      <View style={styles.cardBottom}>
                        <View>
                          <Text style={styles.stockLabel}>Jumlah Stok</Text>
                          <Text style={[styles.stockValue, { color: getStatusColor(item.status) }]}>
                            {item.stok} <Text style={styles.cardUnit}>{item.bahan.satuan}</Text>
                          </Text>
                        </View>
                        {item.status !== 'Aman' && (
                          <TouchableOpacity 
                            style={styles.reqBtn} 
                            onPress={() => { 
                              setSelectedStockItem(item); 
                              setModalType('create'); 
                              setInputQuantity(''); 
                              setModalVisible(true); 
                            }}
                          >
                            <Ionicons name="add-circle" size={18} color="white" />
                            <Text style={styles.reqBtnText}>Minta Stok</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </>
            )}

            {activeTab === 'terima' && (
              incomingShipments.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="mail-unread-outline" size={60} color="#ccc" />
                  <Text style={styles.emptyText}>Tidak ada kiriman dari gudang</Text>
                </View>
              ) : (
                incomingShipments.map(ship => (
                  <View key={ship.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <View>
                        <Text style={styles.cardTitle}>Kiriman #{ship.id}</Text>
                        <Text style={styles.shipmentSub}>Material: {ship.bahan?.nama}</Text>
                      </View>
                      <View style={styles.shipIcon}>
                        <Ionicons name="boat-outline" size={24} color={Colors.primary} />
                      </View>
                    </View>
                    <View style={styles.cardDivider} />
                    <View style={styles.cardBottom}>
                      <View>
                        <Text style={styles.stockLabel}>Jumlah Kirim</Text>
                        <Text style={styles.shipmentQty}>{ship.jumlah} {ship.bahan?.satuan}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.btn, { backgroundColor: Colors.error, paddingHorizontal: 12 } ]}
                          onPress={() => handleRejectShipment(ship.id)}
                          disabled={actionLoading}
                        >
                          {actionLoading ? (
                            <ActivityIndicator color="white" size="small" />
                          ) : (
                            <Text style={[styles.btnText, { fontSize: 13 }]}>Tolak</Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.confirmBtn} 
                          onPress={() => handleConfirmReceipt(ship.id)} 
                          disabled={actionLoading}
                        >
                          {actionLoading ? (
                            <ActivityIndicator color="white" size="small" />
                          ) : (
                            <Text style={styles.confirmBtnText}>Terima Barang</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )
            )}

            {activeTab === 'riwayat' && (
              requestHistory.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="list-outline" size={60} color="#ccc" />
                  <Text style={styles.emptyText}>Belum ada riwayat permintaan</Text>
                </View>
              ) : (
                requestHistory.map(req => (
                  <TouchableOpacity 
                    key={req.id} 
                    style={styles.card} 
                    onPress={() => { 
                      setSelectedRequestItem(req); 
                      setInputQuantity(req.jumlah.toString()); 
                      setModalType('edit'); 
                      setModalVisible(true); 
                    }} 
                    disabled={req.status !== 'pending'}
                  >
                    <View style={styles.cardTop}>
                      <View>
                        <Text style={styles.cardTitle}>{req.bahan?.nama}</Text>
                        <Text style={styles.cardUnit}>ID Permintaan: #{req.id}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: getStatusColor(req.status) + '15' }]}>
                        <Text style={[styles.badgeText, { color: getStatusColor(req.status) }]}>
                          {req.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardDivider} />
                    <View style={styles.historyBottom}>
                      <View>
                        <Text style={styles.stockLabel}>Jumlah Diminta</Text>
                        <Text style={styles.historyQty}>{req.jumlah} {req.bahan?.satuan}</Text>
                      </View>
                      {req.status === 'pending' && (
                        <View style={styles.editIndicator}>
                          <Ionicons name="pencil" size={14} color={Colors.primary} />
                          <Text style={styles.editText}>Edit</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalType === 'create' ? 'Ajukan Stok' : 'Edit Permintaan'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalInfoBox}>
               <Ionicons name="cube-outline" size={20} color={Colors.primary} />
               <Text style={styles.modalInfoText}>
                 {modalType === 'create' ? (
                   modalFromGudang ? (bahanGudang.find(b => b.id === selectedBahanGudangId)?.nama || 'Pilih bahan dari gudang')
                   : (selectedStockItem?.bahan.nama || 'Pilih bahan')
                 ) : (selectedRequestItem?.bahan?.nama)}
               </Text>
            </View>

            {modalType === 'create' && modalFromGudang && (
              <View style={{ maxHeight: 220, marginBottom: 12 }}>
                {bahanGudang.length === 0 ? (
                  <View style={{ padding: 16 }}>
                    <Text style={{ color: '#666' }}>Tidak ada referensi bahan dari gudang.</Text>
                  </View>
                ) : (
                  <ScrollView>
                    {bahanGudang.map(b => (
                      <TouchableOpacity
                        key={b.id}
                        style={[{ padding: 12, borderBottomWidth: 1, borderColor: '#F0F0F0' }, selectedBahanGudangId === b.id && { backgroundColor: '#F1F8E9' }]}
                        onPress={() => setSelectedBahanGudangId(b.id)}
                      >
                        <Text style={{ fontWeight: '700' }}>{b.nama}</Text>
                        <Text style={{ color: '#666', fontSize: 12 }}>{b.satuan}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
            <Text style={styles.inputLabel}>Jumlah yang Dibutuhkan</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              value={inputQuantity} 
              onChangeText={setInputQuantity} 
              placeholder="Contoh: 50" 
              autoFocus 
            />
            <View style={styles.modalActions}>
              {modalType === 'edit' && (
                <TouchableOpacity style={[styles.btn, styles.btnDelete]} onPress={handleCancelRequest} disabled={actionLoading}>
                  <Ionicons name="trash-outline" size={20} color="white" />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.btn, styles.btnSubmit, { flex: 1 }]} 
                onPress={handleSubmit} 
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.btnText}>Simpan Permintaan</Text>
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { 
    backgroundColor: Colors.primary, 
    paddingTop: Platform.OS === 'ios' ? 60 : 50, 
    paddingHorizontal: 24, 
    paddingBottom: 25, 
    borderBottomLeftRadius: 32, 
    borderBottomRightRadius: 32,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: 'white', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  headerIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, padding: 5 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 14, flexDirection:'row', justifyContent:'center' },
  tabActive: { backgroundColor: 'white', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 },
  tabText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 12 },
  tabTextActive: { color: Colors.primary },
  notifDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: Colors.error, 
    marginLeft: 6, 
    borderWidth: 1, // FIX: Properti yang benar
    borderColor: 'white' 
  },
  scrollContent: { padding: 20, paddingBottom: 100 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 15, marginBottom: 20, height: 50, borderWidth: 1, borderColor: '#EEE', elevation: 2, shadowColor: '#000', shadowOpacity: 0.02 },
  searchInput: { flex: 1, marginLeft: 10, fontWeight: '500' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 15, color: '#999', fontSize: 14, fontWeight: '500' },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 4 },
  cardUnit: { fontSize: 12, color: '#999', fontWeight: '500' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  cardDivider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 15 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  stockLabel: { fontSize: 11, color: '#999', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  stockValue: { fontSize: 24, fontWeight: '900' },
  reqBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, elevation: 3 },
  reqBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },
  shipmentSub: { fontSize: 13, color: '#666', marginTop: 2 },
  shipIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F8E9', justifyContent: 'center', alignItems: 'center' },
  shipmentQty: { fontSize: 22, fontWeight: '800', color: '#333' },
  confirmBtn: { backgroundColor: Colors.success, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, minWidth: 120, alignItems: 'center' },
  confirmBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },
  historyBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyQty: { fontSize: 20, fontWeight: '800', color: '#444' },
  editIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  editText: { color: Colors.primary, fontWeight: '700', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#333' },
  modalInfoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 15, borderRadius: 16, marginBottom: 20, gap: 10 },
  modalInfoText: { fontSize: 16, fontWeight: '700', color: '#333' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 10, textTransform: 'uppercase' },
  input: { backgroundColor: '#F5F5F5', borderRadius: 16, padding: 18, fontSize: 20, fontWeight: '800', color: Colors.primary, marginBottom: 25, borderWidth: 1, borderColor: '#EEE' },
  modalActions: { flexDirection: 'row', gap: 12 },
  btn: { padding: 18, borderRadius: 18, alignItems: 'center', justifyContent:'center' },
  btnSubmit: { backgroundColor: Colors.primary, elevation: 4 },
  btnDelete: { backgroundColor: Colors.error, width: 60 },
  btnText: { color: 'white', fontWeight: '800', fontSize: 16 }
});