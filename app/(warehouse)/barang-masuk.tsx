import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { BarangMasuk, Bahan } from '../../types';
import { gudangAPI, authAPI } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface Lokal untuk UI
interface IncomingGoodsItem extends BarangMasuk {
  bahan: Bahan;
}

export default function BarangMasukScreen() {
  const router = useRouter();
  
  // --- STATE ---
  const [incomingGoods, setIncomingGoods] = useState<IncomingGoodsItem[]>([]);
  const [bahanList, setBahanList] = useState<Bahan[]>([]);
  const [user, setUser] = useState<any>(null);

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

  // Profile Menu
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // --- HELPER FUNCTIONS ---
  const loadUserData = async () => {
    const userData = await AsyncStorage.getItem('@user_data');
    if (userData) setUser(JSON.parse(userData));
  };

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

  // --- USE EFFECT ---
  useEffect(() => {
    loadUserData();
    loadData();
  }, [loadData]); // FIX: Dependency added

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

  const handleLogout = async () => {
    Alert.alert('Logout', 'Yakin ingin keluar?', [
      { text: 'Batal' },
      { text: 'Keluar', style: 'destructive', onPress: async () => {
          await authAPI.logout();
          router.replace('/(auth)/login');
      }}
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
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="cube" size={24} color={Colors.backgroundLight} />
            <Text style={styles.headerTitle}>Gudang Pusat</Text>
          </View>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => setShowProfileMenu(true)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.username ? user.username.substring(0,2).toUpperCase() : 'GD'}
              </Text>
            </View>
            <View>
              <Text style={styles.userName}>{user?.username || 'Staff'}</Text>
              <Text style={styles.userRole}>Logistik</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={Colors.backgroundLight} style={{marginLeft: 5}} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.titleSection}>
          <View>
            <Text style={styles.title}>Barang Masuk</Text>
            <Text style={styles.subtitle}>Catat penerimaan stok dari supplier</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => { resetForm(); setShowAddModal(true); }}
          >
            <Ionicons name="add" size={20} color={Colors.backgroundLight} />
            <Text style={styles.addButtonText}>Catat Baru</Text>
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
                <Ionicons name="arrow-down-circle" size={32} color={Colors.success} />
                <Text style={styles.summaryLabel}>Masuk Hari Ini</Text>
                <Text style={styles.summaryValue}>
                  {incomingGoods.filter(item => {
                    const today = new Date();
                    const itemDate = new Date(item.tanggal);
                    return itemDate.getDate() === today.getDate() &&
                           itemDate.getMonth() === today.getMonth() &&
                           itemDate.getFullYear() === today.getFullYear();
                  }).length} <Text style={{fontSize:12, fontWeight:'normal'}}>Transaksi</Text>
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="calendar-outline" size={32} color={Colors.primary} />
                <Text style={styles.summaryLabel}>Total Bulan Ini</Text>
                <Text style={styles.summaryValue}>{incomingGoods.length} <Text style={{fontSize:12, fontWeight:'normal'}}>Transaksi</Text></Text>
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
                    <Text style={styles.emptyText}>Tidak ada data barang masuk.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.goodsCard}>
                    <View style={styles.goodsHeader}>
                      <View>
                        <Text style={styles.goodsId}>ID #{item.id}</Text>
                        <Text style={styles.goodsDate}>{formatDate(item.tanggal.toString())}</Text>
                      </View>
                      <View style={styles.goodsStatus}>
                        <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                        <Text style={styles.goodsStatusText}>Success</Text>
                      </View>
                    </View>

                    <View style={styles.goodsDetails}>
                      <View style={styles.goodsDetailRow}>
                        <Ionicons name="cube-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.goodsDetailLabel}>Bahan:</Text>
                        <Text style={styles.goodsDetailValue}>{item.bahan.nama}</Text>
                      </View>
                      <View style={styles.goodsDetailRow}>
                        <Ionicons name="layers-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.goodsDetailLabel}>Jumlah:</Text>
                        <Text style={[styles.goodsDetailValue, {color: Colors.primary, fontWeight:'bold'}]}>
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
                            <Ionicons name="create-outline" size={18} color={Colors.warning} />
                            <Text style={[styles.actionButtonText, {color: Colors.warning}]}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, {borderColor: Colors.error}]} onPress={() => handleDelete(item.id)}>
                            <Ionicons name="trash-outline" size={18} color={Colors.error} />
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
                        <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PROFILE MENU */}
      <Modal visible={showProfileMenu} transparent animationType="fade" onRequestClose={() => setShowProfileMenu(false)}>
        <TouchableOpacity
          style={styles.profileModalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileMenu(false)}
        >
          <View style={styles.profileMenu}>
            <TouchableOpacity style={styles.profileMenuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              <Text style={styles.profileMenuItemText}>Keluar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.backgroundLight },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: 'bold', color: Colors.primary },
  userName: { fontSize: 14, fontWeight: 'bold', color: 'white' },
  userRole: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  content: { flex: 1, padding: 20 },
  titleSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary },
  
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, gap: 8 },
  addButtonText: { color: Colors.backgroundLight, fontSize: 14, fontWeight: '600' },

  loadingContainer: { paddingVertical: 50, alignItems: 'center' },
  loadingText: { marginTop: 10, color: Colors.textSecondary },
  
  // Summary Cards
  summaryCards: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  summaryCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 15, alignItems: 'center', elevation: 2 },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 5, marginBottom: 2 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: Colors.text },

  // List
  listSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 15 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: Colors.textSecondary },

  goodsCard: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  goodsHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  goodsId: { fontWeight: 'bold', fontSize: 16 },
  goodsDate: { fontSize: 12, color: Colors.textSecondary },
  goodsStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  goodsStatusText: { fontSize: 12, fontWeight: '600', color: Colors.success },

  goodsDetails: { marginBottom: 15 },
  goodsDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  goodsDetailLabel: { fontSize: 14, color: Colors.textSecondary, width: 80, marginLeft: 5 },
  goodsDetailValue: { fontSize: 14, fontWeight: '500', color: Colors.text, flex: 1 },

  goodsActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#ddd', gap: 5 },
  actionButtonText: { fontSize: 12, fontWeight: 'bold' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.backgroundLight, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  modalBody: { marginBottom: 20 },

  inputGroup: { marginBottom: 20 },
  inputLabel: { fontWeight: '600', marginBottom: 8, color: Colors.text },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: 'white' },
  selectButton: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, backgroundColor: 'white' },
  selectButtonText: { fontSize: 16, color: Colors.text },

  modalFooter: { flexDirection: 'row', gap: 10 },
  modalButton: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd' },
  cancelButtonText: { fontWeight: 'bold', color: '#666' },
  saveButton: { backgroundColor: Colors.primary },
  saveButtonText: { fontWeight: 'bold', color: 'white' },
  saveButtonDisabled: { opacity: 0.7 },

  bahanOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  bahanOptionSelected: { backgroundColor: '#f0f9ff' },
  bahanOptionText: { fontSize: 16, fontWeight: '500' },

  // Profile Menu
  profileModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  profileMenu: { position: 'absolute', top: 90, right: 20, backgroundColor: 'white', borderRadius: 8, padding: 5, elevation: 5, minWidth: 150 },
  profileMenuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  profileMenuItemText: { color: Colors.error, fontWeight: 'bold' },
});