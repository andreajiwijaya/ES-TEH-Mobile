import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Bahan, PermintaanStok } from '../../types';
import { karyawanAPI } from '../../services/api';

// Interface Lokal untuk UI Stok
interface StockItem {
  id: string; 
  outlet_id: number;
  bahan_id: number;
  stok: number;
  bahan: Bahan; 
  status: 'Aman' | 'Menipis' | 'Kritis';
}

export default function StokScreen() {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState<'stok' | 'riwayat'>('stok');
  
  // State Data
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [requestHistory, setRequestHistory] = useState<PermintaanStok[]>([]);
  const [filteredStock, setFilteredStock] = useState<StockItem[]>([]);
  
  // State UI
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // State Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [selectedRequestItem, setSelectedRequestItem] = useState<PermintaanStok | null>(null);
  const [inputQuantity, setInputQuantity] = useState('');
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');

  // --- API INTEGRATION FUNCTIONS ---

  // 1. Load Data Utama (API 52 & 47)
  const loadAllData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [stokRes, reqRes] = await Promise.all([
        karyawanAPI.getStokOutlet(),      // API 52
        karyawanAPI.getPermintaanStok()   // API 47
      ]);

      // Handle Response Stok
      if (stokRes.data && Array.isArray(stokRes.data)) {
        const mappedStok: StockItem[] = stokRes.data.map((item: any) => {
          const stok = Number(item.stok) || 0;
          const min = Number(item.bahan?.stok_minimum_outlet) || 0;
          let status: 'Aman' | 'Menipis' | 'Kritis' = 'Aman';
          
          if (stok <= 0) status = 'Kritis';
          else if (stok <= min * 0.3) status = 'Kritis';
          else if (stok <= min) status = 'Menipis';

          return {
            id: `${item.outlet_id}-${item.bahan_id}`,
            outlet_id: item.outlet_id,
            bahan_id: item.bahan_id,
            stok: stok,
            bahan: item.bahan || { nama: 'Unknown', satuan: 'Unit' },
            status
          };
        });
        setStockItems(mappedStok);
        setFilteredStock(mappedStok);
      }

      // Handle Response Riwayat Request
      if (reqRes.data && Array.isArray(reqRes.data)) {
        const sortedHistory = reqRes.data.sort((a: any, b: any) => b.id - a.id);
        setRequestHistory(sortedHistory);
      }

    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Gagal memuat data stok dan riwayat.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // --- INITIAL LOAD ---
  // REVISI: Menambahkan loadAllData ke dependency array
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Filter logika pencarian
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStock(stockItems);
    } else {
      const filtered = stockItems.filter(item => 
        item.bahan.nama.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStock(filtered);
    }
  }, [searchQuery, stockItems]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData(true);
  };

  // 2. Handle Buka Modal Request Baru (Persiapan API 49)
  const openCreateRequest = (item: StockItem) => {
    const recommendedQty = Math.max(0, Math.ceil(item.bahan.stok_minimum_outlet * 1.5) - item.stok);
    
    setSelectedStockItem(item);
    setSelectedRequestItem(null);
    setInputQuantity(recommendedQty > 0 ? recommendedQty.toString() : '');
    setModalType('create');
    setModalVisible(true);
  };

  // 3. Handle Buka Modal Edit Request (API 48 - Detail)
  const openEditRequest = async (req: PermintaanStok) => {
    if (req.status !== 'pending') {
      Alert.alert('Info', 'Hanya permintaan dengan status "Pending" yang dapat diedit atau dibatalkan.');
      return;
    }

    setActionLoading(true);
    // Hit API 48 (Detail)
    const res = await karyawanAPI.getPermintaanStokById(req.id);
    setActionLoading(false);

    if (res.data) {
      const data = res.data as PermintaanStok;
      setSelectedRequestItem(data);
      setSelectedStockItem(null);
      setInputQuantity(data.jumlah.toString());
      setModalType('edit');
      setModalVisible(true);
    } else {
      Alert.alert('Error', 'Gagal mengambil detail permintaan.');
    }
  };

  // 4. Submit Form (API 49 Create & API 50 Update)
  const handleSubmit = async () => {
    const qty = parseInt(inputQuantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Validasi', 'Jumlah harus berupa angka lebih dari 0.');
      return;
    }

    setActionLoading(true);
    try {
      if (modalType === 'create' && selectedStockItem) {
        // API 49: Create Request
        const res = await karyawanAPI.createPermintaanStok({
          bahan_id: selectedStockItem.bahan_id,
          jumlah: qty
        });
        
        if (res.error) throw new Error(res.error);
        Alert.alert('Sukses', 'Permintaan stok berhasil diajukan.');
        setActiveTab('riwayat');

      } else if (modalType === 'edit' && selectedRequestItem) {
        // API 50: Update Request
        const res = await karyawanAPI.updatePermintaanStok(selectedRequestItem.id, {
          bahan_id: selectedRequestItem.bahan_id,
          jumlah: qty
        });

        if (res.error) throw new Error(res.error);
        Alert.alert('Sukses', 'Permintaan stok berhasil diperbarui.');
      }

      setModalVisible(false);
      loadAllData(true);

    } catch (error: any) {
      Alert.alert('Gagal', error.message || 'Terjadi kesalahan saat memproses data.');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Handle Delete / Cancel Request (API 51)
  const handleCancelRequest = () => {
    if (!selectedRequestItem) return;

    Alert.alert('Batalkan Permintaan', 'Apakah Anda yakin ingin membatalkan permintaan ini?', [
      { text: 'Kembali', style: 'cancel' },
      {
        text: 'Ya, Batalkan',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            const res = await karyawanAPI.deletePermintaanStok(selectedRequestItem.id);
            if (res.error) throw new Error(res.error);
            
            Alert.alert('Sukses', 'Permintaan berhasil dibatalkan.');
            setModalVisible(false);
            loadAllData(true);
          } catch (error: any) {
            Alert.alert('Gagal', error.message || 'Gagal membatalkan permintaan.');
          } finally {
            setActionLoading(false);
          }
        }
      }
    ]);
  };

  // --- UI HELPER ---
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'aman': return Colors.success;
      case 'menipis': return Colors.warning;
      case 'kritis': return Colors.error;
      case 'pending': return Colors.warning;
      case 'approved': return Colors.primary;
      case 'completed': return Colors.success;
      case 'rejected': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'Menunggu Konfirmasi';
      case 'approved': return 'Disetujui';
      case 'rejected': return 'Ditolak';
      case 'completed': return 'Selesai';
      default: return status;
    }
  };

  const lowStockCount = stockItems.filter(i => i.status === 'Menipis').length;
  const criticalCount = stockItems.filter(i => i.status === 'Kritis').length;

  return (
    <View style={styles.container}>
      {/* Header Area */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Stok Bahan</Text>
            <Text style={styles.headerSubtitle}>Outlet Utama</Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.avatar}><Text style={styles.avatarText}>KS</Text></View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'stok' && styles.tabActive]}
            onPress={() => setActiveTab('stok')}
          >
            <Ionicons name="cube-outline" size={18} color={activeTab === 'stok' ? Colors.primary : '#fff'} />
            <Text style={[styles.tabText, activeTab === 'stok' && styles.tabTextActive]}>Stok Outlet</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'riwayat' && styles.tabActive]}
            onPress={() => setActiveTab('riwayat')}
          >
            <Ionicons name="time-outline" size={18} color={activeTab === 'riwayat' ? Colors.primary : '#fff'} />
            <Text style={[styles.tabText, activeTab === 'riwayat' && styles.tabTextActive]}>Riwayat Request</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* --- CONTENT: TAB STOK --- */}
        {activeTab === 'stok' && (
          <>
            {/* Overview Cards */}
            <View style={styles.overviewContainer}>
              <View style={styles.overviewCard}>
                <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="cube" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.overviewValue}>{stockItems.length}</Text>
                <Text style={styles.overviewLabel}>Total Item</Text>
              </View>
              
              <View style={styles.overviewCard}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="warning" size={20} color={Colors.warning} />
                </View>
                <Text style={styles.overviewValue}>{lowStockCount}</Text>
                <Text style={styles.overviewLabel}>Menipis</Text>
              </View>

              <View style={styles.overviewCard}>
                <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="alert-circle" size={20} color={Colors.error} />
                </View>
                <Text style={styles.overviewValue}>{criticalCount}</Text>
                <Text style={styles.overviewLabel}>Kritis</Text>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={Colors.textSecondary} />
              <TextInput 
                style={styles.searchInput}
                placeholder="Cari nama bahan..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Stock List */}
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 50}} />
            ) : (
              <View>
                {filteredStock.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={48} color={Colors.textSecondary} />
                    <Text style={styles.emptyText}>Data tidak ditemukan</Text>
                  </View>
                ) : (
                  filteredStock.map((item) => (
                    <View key={item.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={{flex: 1}}>
                          <Text style={styles.cardTitle}>{item.bahan.nama}</Text>
                          <Text style={styles.cardSubtitle}>ID Bahan: {item.bahan_id}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                        </View>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Stok Saat Ini</Text>
                          <Text style={styles.detailValue}>{item.stok} {item.bahan.satuan}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Min. Stok</Text>
                          <Text style={styles.detailValue}>{item.bahan.stok_minimum_outlet} {item.bahan.satuan}</Text>
                        </View>
                      </View>

                      {/* Tombol Request hanya muncul jika stok tidak aman */}
                      {item.status !== 'Aman' && (
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => openCreateRequest(item)}
                        >
                          <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                          <Text style={styles.actionButtonText}>Ajukan Restock</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}

        {/* --- CONTENT: TAB RIWAYAT --- */}
        {activeTab === 'riwayat' && (
          <>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 50}} />
            ) : (
              <View>
                {requestHistory.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="file-tray-outline" size={48} color={Colors.textSecondary} />
                    <Text style={styles.emptyText}>Belum ada riwayat permintaan</Text>
                  </View>
                ) : (
                  requestHistory.map((req) => (
                    <TouchableOpacity 
                      key={req.id} 
                      style={styles.card}
                      onPress={() => openEditRequest(req)}
                      disabled={req.status !== 'pending'}
                    >
                      <View style={styles.cardHeader}>
                        <View style={{flex: 1}}>
                          <Text style={styles.cardTitle}>{req.bahan?.nama || `Bahan #${req.bahan_id}`}</Text>
                          <Text style={styles.cardSubtitle}>Permintaan #{req.id}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(req.status) + '20' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(req.status) }]}>
                            {getStatusLabel(req.status)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.detailsRow}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Jumlah Diminta</Text>
                          <Text style={[styles.detailValue, {fontSize: 18}]}>{req.jumlah}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Status</Text>
                          <Text style={{fontWeight: '600', color: getStatusColor(req.status)}}>
                            {req.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {req.status === 'pending' && (
                        <View style={styles.footerNote}>
                          <Ionicons name="create-outline" size={14} color={Colors.primary} />
                          <Text style={styles.footerNoteText}>Ketuk untuk mengedit atau membatalkan</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* --- MODAL FORM (CREATE / EDIT) --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'create' ? 'Ajukan Permintaan Stok' : 'Edit Permintaan'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.infoBox}>
                <Ionicons name="cube-outline" size={24} color={Colors.primary} />
                <View style={{marginLeft: 10}}>
                  <Text style={styles.infoBoxLabel}>Nama Bahan</Text>
                  <Text style={styles.infoBoxValue}>
                    {modalType === 'create' ? selectedStockItem?.bahan.nama : selectedRequestItem?.bahan?.nama}
                  </Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Jumlah Permintaan</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={inputQuantity}
                  onChangeText={setInputQuantity}
                  placeholder="0"
                  autoFocus
                />
                <Text style={styles.inputSuffix}>
                  {modalType === 'create' ? selectedStockItem?.bahan.satuan : 'Unit'}
                </Text>
              </View>

              {modalType === 'create' && selectedStockItem && (
                <Text style={styles.helperText}>
                  *Rekomendasi sistem: {Math.max(0, Math.ceil(selectedStockItem.bahan.stok_minimum_outlet * 1.5) - selectedStockItem.stok)} {selectedStockItem.bahan.satuan}
                </Text>
              )}
            </View>

            <View style={styles.modalFooter}>
              {modalType === 'edit' && (
                <TouchableOpacity 
                  style={[styles.modalButton, styles.buttonDelete]} 
                  onPress={handleCancelRequest}
                  disabled={actionLoading}
                >
                  <Ionicons name="trash-outline" size={20} color="white" />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.buttonPrimary, { flex: 1 }]} 
                onPress={handleSubmit}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>
                    {modalType === 'create' ? 'Kirim Permintaan' : 'Simpan Perubahan'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.backgroundLight,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.backgroundLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  tabText: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  overviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  overviewCard: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  overviewLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 50,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: Colors.text,
  },
  card: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  actionButton: {
    marginTop: 15,
    backgroundColor: '#E3F2FD',
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    justifyContent: 'flex-end',
    gap: 4,
  },
  footerNoteText: {
    fontSize: 12,
    color: Colors.primary,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  emptyText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.backgroundLight,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalBody: {
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoBoxLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  infoBoxValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  inputSuffix: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonDelete: {
    backgroundColor: Colors.error,
    width: 50,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});