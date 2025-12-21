import { Ionicons } from '@expo/vector-icons';
import React, { useState, useCallback } from 'react'; // FIX: useEffect dihapus karena diganti useFocusEffect
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  StatusBar
} from 'react-native';
import { useFocusEffect } from 'expo-router'; // FIX: Tambahkan import ini
import { Colors } from '../../constants/Colors';
import { BarangMasuk, Bahan } from '../../types';
import { gudangAPI } from '../../services/api';

// Interface Lokal untuk UI
interface IncomingGoodsItem extends BarangMasuk {
  bahan: Bahan;
}

export default function BarangMasukScreen() {
  // --- STATE ---
  const [incomingGoods, setIncomingGoods] = useState<IncomingGoodsItem[]>([]);
  const [bahanList, setBahanList] = useState<Bahan[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Modal Create
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBahanModal, setShowBahanModal] = useState(false);
  const [selectedBahan, setSelectedBahan] = useState<Bahan | null>(null);
  const [jumlah, setJumlah] = useState('');
  const [suplier, setSuplier] = useState('');

  // Modal Update
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<IncomingGoodsItem | null>(null);

  // --- HELPER FUNCTIONS ---

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [barangMasukResponse, bahanResponse] = await Promise.all([
        gudangAPI.getBarangMasuk(),
        gudangAPI.getBahan(),
      ]);

      if (barangMasukResponse.data && Array.isArray(barangMasukResponse.data)) {
        // Sort by tanggal terbaru (descending)
        const sortedData = barangMasukResponse.data.sort((a: any, b: any) => 
            new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
        );

        const mappedItems: IncomingGoodsItem[] = sortedData.map((item: any) => ({
          id: item.id,
          bahan_id: item.bahan_id,
          jumlah: Number(item.jumlah) || 0,
          tanggal: item.tanggal,
          supplier: item.supplier || item.suplier || 'Unknown',
          bahan: item.bahan || { 
            id: item.bahan_id, 
            nama: 'Bahan Dihapus', 
            satuan: 'Unit',
            stok_minimum_gudang: 0, 
            stok_minimum_outlet: 0 
          },
        }));
        setIncomingGoods(mappedItems);
      }

      if (bahanResponse.data && Array.isArray(bahanResponse.data)) {
        setBahanList(bahanResponse.data);
      }

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // --- USE FOCUS EFFECT (FIX) ---
  // Ini akan memicu reload data otomatis setiap kali layar ini tampil/fokus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  // --- ACTIONS ---

  const handleAdd = async () => {
    if (!selectedBahan || !jumlah || !suplier) {
      Alert.alert('Validasi', 'Mohon lengkapi semua data (Bahan, Jumlah, Supplier)');
      return;
    }

    const qty = parseFloat(jumlah);
    if (isNaN(qty) || qty <= 0) {
        Alert.alert('Validasi', 'Jumlah harus angka lebih dari 0');
        return;
    }

    setProcessing(true);
    try {
      const response = await gudangAPI.createBarangMasuk({
        bahan_id: selectedBahan.id,
        jumlah: qty,
        supplier: suplier,
      });

      if (response.error) throw new Error(response.error);

      Alert.alert('Sukses', 'Barang masuk berhasil dicatat');
      setShowAddModal(false);
      resetForm();
      loadData(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mencatat barang masuk');
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenUpdate = (item: IncomingGoodsItem) => {
    setSelectedItem(item);
    setJumlah(item.jumlah.toString());
    setSuplier(item.supplier);
    const bahan = bahanList.find(b => b.id === item.bahan_id) || item.bahan;
    setSelectedBahan(bahan);
    setShowUpdateModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedItem || !selectedBahan) return;

    setProcessing(true);
    try {
      const response = await gudangAPI.updateBarangMasuk(selectedItem.id, {
        bahan_id: selectedBahan.id,
        jumlah: parseFloat(jumlah),
        supplier: suplier
      });

      if (response.error) throw new Error(response.error);

      Alert.alert('Sukses', 'Data barang masuk diperbarui');
      setShowUpdateModal(false);
      resetForm();
      loadData(true);
    } catch (error: any) {
      Alert.alert('Gagal', error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Hapus', 'Yakin ingin menghapus data ini? Stok gudang akan berkurang otomatis.', [
        { text: 'Batal', style: 'cancel' },
        { 
            text: 'Hapus', 
            style: 'destructive', 
            onPress: async () => {
                setLoading(true);
                const res = await gudangAPI.deleteBarangMasuk(id);
                setLoading(false);
                
                if (res.error) Alert.alert('Gagal', res.error);
                else {
                    Alert.alert('Terhapus', 'Data barang masuk dihapus.');
                    loadData(true);
                }
            }
        }
    ]);
  };

  const resetForm = () => {
    setSelectedBahan(null);
    setJumlah('');
    setSuplier('');
    setSelectedItem(null);
  };

  // --- HELPERS UI ---
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* HEADER GREEN DNA */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Barang Masuk</Text>
            <Text style={styles.headerSubtitle}>Catat penerimaan stok dari supplier</Text>
          </View>
          <View style={styles.headerIconBg}>
            <Ionicons name="arrow-down-circle" size={24} color={Colors.primary} />
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Action Button */}
        <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setShowAddModal(true); }}>
                <Ionicons name="add-circle" size={22} color="white" />
                <Text style={styles.addButtonText}>Catat Penerimaan Baru</Text>
            </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Memuat data...</Text>
          </View>
        ) : (
          <>
            {/* SUMMARY CARDS */}
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="arrow-down" size={20} color={Colors.success} />
                </View>
                <Text style={styles.summaryValue}>
                  {incomingGoods.filter(item => {
                    const today = new Date();
                    const itemDate = new Date(item.tanggal);
                    return itemDate.getDate() === today.getDate() &&
                           itemDate.getMonth() === today.getMonth() &&
                           itemDate.getFullYear() === today.getFullYear();
                  }).length}
                </Text>
                <Text style={styles.summaryLabel}>Masuk Hari Ini</Text>
              </View>
              <View style={styles.summaryCard}>
                <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="calendar" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.summaryValue}>{incomingGoods.length}</Text>
                <Text style={styles.summaryLabel}>Total Bulan Ini</Text>
              </View>
            </View>

            {/* LIST DATA */}
            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>Riwayat Pemasukan</Text>

              <FlatList
                data={incomingGoods}
                keyExtractor={item => item.id.toString()}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="cube-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>Tidak ada data barang masuk.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.goodsCard}>
                    <View style={styles.goodsHeader}>
                      <View>
                        <Text style={styles.goodsId}>ID Masuk #{item.id}</Text>
                        <Text style={styles.goodsDate}>{formatDate(item.tanggal.toString())}</Text>
                      </View>
                      <View style={styles.goodsStatus}>
                        <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                        <Text style={styles.goodsStatusText}>Success</Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.goodsDetails}>
                      <View style={styles.goodsDetailRow}>
                        <Ionicons name="cube-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.goodsDetailLabel}>Bahan:</Text>
                        <Text style={styles.goodsDetailValue}>{item.bahan.nama}</Text>
                      </View>
                      <View style={styles.goodsDetailRow}>
                        <Ionicons name="layers-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.goodsDetailLabel}>Jumlah:</Text>
                        <Text style={styles.goodsHighlight}>
                          {item.jumlah} {item.bahan.satuan}
                        </Text>
                      </View>
                      <View style={styles.goodsDetailRow}>
                        <Ionicons name="business-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.goodsDetailLabel}>Supplier:</Text>
                        <Text style={styles.goodsDetailValue}>{item.supplier}</Text>
                      </View>
                    </View>

                    <View style={styles.goodsActions}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenUpdate(item)}>
                            <Ionicons name="create-outline" size={16} color={Colors.warning} />
                            <Text style={[styles.actionButtonText, {color: Colors.warning}]}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.deleteBtn]} onPress={() => handleDelete(item.id)}>
                            <Ionicons name="trash-outline" size={16} color={Colors.error} />
                            <Text style={[styles.actionButtonText, {color: Colors.error}]}>Hapus</Text>
                        </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* --- MODAL ADD / EDIT --- */}
      <Modal
        visible={showAddModal || showUpdateModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowAddModal(false); setShowUpdateModal(false); }}
      >
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {showAddModal ? 'Catat Barang Masuk' : 'Edit Barang Masuk'}
              </Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setShowUpdateModal(false); }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pilih Bahan</Text>
                <TouchableOpacity 
                  style={styles.selectButton}
                  onPress={() => setShowBahanModal(true)}
                >
                  <Text style={[styles.selectButtonText, !selectedBahan && {color: '#999'}]}>
                    {selectedBahan ? selectedBahan.nama : 'Pilih Bahan Baku'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Jumlah Masuk ({selectedBahan?.satuan || 'Unit'})</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: 100"
                  value={jumlah}
                  onChangeText={setJumlah}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Supplier</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Toko Jaya Abadi"
                  value={suplier}
                  onChangeText={setSuplier}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => { setShowAddModal(false); setShowUpdateModal(false); }}
                disabled={processing}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, processing && styles.saveButtonDisabled]}
                onPress={showAddModal ? handleAdd : handleUpdate}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color={Colors.backgroundLight} />
                ) : (
                  <Text style={styles.saveButtonText}>Simpan Data</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- MODAL PILIH BAHAN --- */}
      <Modal
        visible={showBahanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBahanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {maxHeight: '70%'}]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Bahan Baku</Text>
              <TouchableOpacity onPress={() => setShowBahanModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {bahanList.length === 0 ? (
                  <Text style={{textAlign:'center', color:'#999', padding: 20}}>Belum ada data bahan.</Text>
              ) : (
                  bahanList.map((bahan) => (
                    <TouchableOpacity
                      key={bahan.id}
                      style={[
                        styles.bahanOption,
                        selectedBahan?.id === bahan.id && styles.bahanOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedBahan(bahan);
                        setShowBahanModal(false);
                      }}
                    >
                      <View>
                        <Text style={styles.bahanOptionText}>{bahan.nama}</Text>
                        <Text style={{fontSize:12, color: Colors.textSecondary}}>Satuan: {bahan.satuan}</Text>
                      </View>
                      {selectedBahan?.id === bahan.id && (
                        <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ... styles tetap sama seperti sebelumnya ...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
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
  content: { flex: 1, padding: 24, marginTop: 10 },
  actionContainer: { marginBottom: 20 },
  addButton: { flexDirection: 'row', backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 2 },
  addButtonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  loadingContainer: { paddingVertical: 50, alignItems: 'center' },
  loadingText: { marginTop: 10, color: Colors.textSecondary, fontSize: 13 },
  summaryCards: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0', elevation: 2 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, fontWeight: '600' },
  summaryValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  listSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 15 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: Colors.textSecondary, marginTop: 10, fontSize: 14 },
  goodsCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
  goodsHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  goodsId: { fontWeight: '700', fontSize: 15, color: Colors.text },
  goodsDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  goodsStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  goodsStatusText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginBottom: 12 },
  goodsDetails: { marginBottom: 16 },
  goodsDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  goodsDetailLabel: { fontSize: 13, color: Colors.textSecondary, width: 70 },
  goodsDetailValue: { fontSize: 13, fontWeight: '600', color: Colors.text, flex: 1 },
  goodsHighlight: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  goodsActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 5, backgroundColor: '#FFF8E1' },
  actionButtonText: { fontSize: 12, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#FFEBEE' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.backgroundLight, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%', elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  modalBody: { marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontWeight: '600', marginBottom: 8, color: Colors.text, fontSize: 14 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#FAFAFA' },
  selectButton: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, backgroundColor: '#FAFAFA' },
  selectButtonText: { fontSize: 15, color: Colors.text },
  modalFooter: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: '#F5F5F5' },
  cancelButtonText: { fontWeight: '700', color: '#757575', fontSize: 15 },
  saveButton: { backgroundColor: Colors.primary },
  saveButtonText: { fontWeight: '700', color: 'white', fontSize: 15 },
  saveButtonDisabled: { opacity: 0.7 },
  bahanOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', alignItems: 'center' },
  bahanOptionSelected: { backgroundColor: '#E3F2FD' },
  bahanOptionText: { fontSize: 15, fontWeight: '600', color: Colors.text },
});