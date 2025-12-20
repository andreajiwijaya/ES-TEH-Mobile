import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Image,
  KeyboardAvoidingView,
  StatusBar
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { BarangKeluar, PermintaanStok } from '../../types';
import { gudangAPI } from '../../services/api';

export default function BarangKeluarScreen() {
  // --- STATE ---
  const [outgoingGoods, setOutgoingGoods] = useState<BarangKeluar[]>([]);
  const [permintaanStok, setPermintaanStok] = useState<PermintaanStok[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Modal Create
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermintaanModal, setShowPermintaanModal] = useState(false);
  const [selectedPermintaan, setSelectedPermintaan] = useState<PermintaanStok | null>(null);

  // Modal Update / Upload Bukti
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BarangKeluar | null>(null);
  const [buktiFoto, setBuktiFoto] = useState<any>(null);
  const [updateJumlah, setUpdateJumlah] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [barangKeluarRes, permintaanRes] = await Promise.all([
        gudangAPI.getBarangKeluar(),
        gudangAPI.getPermintaanStok(),
      ]);

      if (barangKeluarRes.data && Array.isArray(barangKeluarRes.data)) {
        const sorted = barangKeluarRes.data.sort((a: any, b: any) => b.id - a.id);
        setOutgoingGoods(sorted);
      }

      if (permintaanRes.data && Array.isArray(permintaanRes.data)) {
        // Filter hanya approved yang siap dikirim
        const filtered = permintaanRes.data.filter((p: any) => 
          p.status === 'approved'
        );
        setPermintaanStok(filtered);
      }

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]); 

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  // --- ACTION HANDLERS ---

  const handleCreate = async () => {
    if (!selectedPermintaan) {
      Alert.alert('Validasi', 'Pilih permintaan stok terlebih dahulu');
      return;
    }

    setProcessing(true);
    try {
      const res = await gudangAPI.createBarangKeluar({
        permintaan_id: selectedPermintaan.id
      });

      if (res.error) throw new Error(res.error);

      Alert.alert('Sukses', 'Barang keluar berhasil dibuat. Silakan update status dan upload bukti saat barang dikirim.');
      setShowAddModal(false);
      setSelectedPermintaan(null);
      loadData(true);
    } catch (error: any) {
      Alert.alert('Gagal', error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenUpdate = (item: BarangKeluar) => {
    setSelectedItem(item);
    setUpdateJumlah(item.jumlah ? item.jumlah.toString() : '');
    setBuktiFoto(null);
    setShowUpdateModal(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setBuktiFoto(result.assets[0]);
    }
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;
    
    if (!updateJumlah) {
        Alert.alert('Validasi', 'Jumlah barang harus diisi');
        return;
    }

    setProcessing(true);
    try {
      const res = await gudangAPI.updateBarangKeluar(selectedItem.id, {
        jumlah: parseInt(updateJumlah),
        bukti_foto: buktiFoto 
      });

      if (res.error) throw new Error(res.error);

      Alert.alert('Sukses', 'Data barang keluar berhasil diperbarui');
      setShowUpdateModal(false);
      loadData(true);
    } catch (error: any) {
      Alert.alert('Gagal', error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Hapus', 'Yakin ingin menghapus data ini? Stok akan dikembalikan.', [
        { text: 'Batal', style: 'cancel' },
        { 
            text: 'Hapus', 
            style: 'destructive', 
            onPress: async () => {
                setLoading(true);
                const res = await gudangAPI.deleteBarangKeluar(id);
                setLoading(false);
                if (res.error) Alert.alert('Gagal', res.error);
                else {
                    Alert.alert('Sukses', 'Data dihapus');
                    loadData(true);
                }
            }
        }
    ]);
  };

  // --- UI HELPERS ---

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return Colors.warning;
      case 'in_transit': return Colors.primary;
      case 'received': return Colors.success;
      case 'cancelled': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
      switch (status) {
          case 'in_transit': return 'DIKIRIM';
          case 'received': return 'DITERIMA';
          case 'cancelled': return 'BATAL';
          default: return status.toUpperCase();
      }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* HEADER GREEN DNA */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Barang Keluar</Text>
            <Text style={styles.headerSubtitle}>Distribusi ke Outlet</Text>
          </View>
          <View style={styles.headerIconBg}>
            <Ionicons name="arrow-up-circle" size={24} color={Colors.primary} />
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
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
                <Ionicons name="add-circle" size={22} color="white" />
                <Text style={styles.addButtonText}>Buat Pengiriman Baru</Text>
            </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Memuat data...</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {outgoingGoods.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cube-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>Belum ada data barang keluar.</Text>
                </View>
            ) : (
                outgoingGoods.map((item) => (
                    <View key={item.id} style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View>
                                <Text style={styles.cardId}>Pengiriman #{item.id}</Text>
                                <Text style={styles.cardDate}>{formatDate(item.tanggal_keluar)}</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                <Text style={{ color: getStatusColor(item.status), fontWeight: '800', fontSize: 11 }}>
                                    {getStatusLabel(item.status)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.cardBody}>
                            <View style={styles.infoRow}>
                                <Ionicons name="storefront-outline" size={16} color={Colors.textSecondary} />
                                <Text style={styles.infoLabel}>Tujuan:</Text>
                                <Text style={styles.infoText}>Outlet #{item.outlet_id}</Text>
                            </View>
                            {item.bahan && (
                                <View style={styles.infoRow}>
                                    <Ionicons name="cube-outline" size={16} color={Colors.textSecondary} />
                                    <Text style={styles.infoLabel}>Bahan:</Text>
                                    <Text style={styles.infoText}>{item.bahan.nama}</Text>
                                </View>
                            )}
                            <View style={styles.infoRow}>
                                <Ionicons name="layers-outline" size={16} color={Colors.textSecondary} />
                                <Text style={styles.infoLabel}>Jumlah:</Text>
                                <Text style={styles.infoHighlight}>{item.jumlah || 0} {item.bahan?.satuan}</Text>
                            </View>
                        </View>

                        <View style={styles.cardFooter}>
                            {item.status !== 'received' && item.status !== 'cancelled' && (
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenUpdate(item)}>
                                    <Ionicons name="create-outline" size={16} color={Colors.primary} />
                                    <Text style={styles.actionBtnText}>Update Data</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item.id)}>
                                <Ionicons name="trash-outline" size={16} color={Colors.error} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}
          </View>
        )}
      </ScrollView>

      {/* --- MODAL 1: CREATE BARANG KELUAR --- */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buat Pengiriman</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Pilih Permintaan (Approved):</Text>
            <TouchableOpacity style={styles.selectBtn} onPress={() => setShowPermintaanModal(true)}>
                <Text style={styles.selectBtnText}>
                    {selectedPermintaan 
                        ? `Req #${selectedPermintaan.id} - ${selectedPermintaan.bahan?.nama} (${selectedPermintaan.jumlah})` 
                        : 'Pilih Permintaan...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.text} />
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.saveBtn, (!selectedPermintaan || processing) && styles.disabledBtn]}
                onPress={handleCreate}
                disabled={!selectedPermintaan || processing}
            >
                {processing ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Buat Data</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL 2: PILIH PERMINTAAN --- */}
      <Modal visible={showPermintaanModal} transparent animationType="fade" onRequestClose={() => setShowPermintaanModal(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, {maxHeight: '70%'}]}>
                <Text style={styles.modalTitle}>Daftar Permintaan (Approved)</Text>
                <ScrollView>
                    {permintaanStok.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Tidak ada permintaan yang disetujui.</Text>
                        </View>
                    ) : (
                        permintaanStok.map((p) => (
                            <TouchableOpacity 
                                key={p.id} 
                                style={styles.permintaanItem}
                                onPress={() => {
                                    setSelectedPermintaan(p);
                                    setShowPermintaanModal(false);
                                }}
                            >
                                <View>
                                    <Text style={{fontWeight:'bold', fontSize: 14}}>Request #{p.id}</Text>
                                    <Text style={{fontSize: 13, color: Colors.text}}>{p.bahan?.nama} - {p.jumlah} {p.bahan?.satuan}</Text>
                                    <Text style={{fontSize:12, color:Colors.textSecondary}}>Outlet ID: {p.outlet_id}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#ccc" />
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowPermintaanModal(false)}>
                    <Text style={{color:Colors.primary, fontWeight:'bold'}}>Tutup</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* --- MODAL 3: UPDATE & UPLOAD BUKTI --- */}
      <Modal visible={showUpdateModal} transparent animationType="slide" onRequestClose={() => setShowUpdateModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Update Pengiriman #{selectedItem?.id}</Text>
                    <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                        <Ionicons name="close" size={24} color={Colors.text} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.label}>Jumlah Realisasi:</Text>
                <TextInput 
                    style={styles.input} 
                    keyboardType="numeric"
                    value={updateJumlah} 
                    onChangeText={setUpdateJumlah}
                    placeholder="Contoh: 100"
                />

                <Text style={styles.label}>Bukti Foto (Opsional):</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                    {buktiFoto ? (
                        <Image source={{ uri: buktiFoto.uri }} style={{width: '100%', height: '100%', borderRadius: 8}} />
                    ) : (
                        <View style={{alignItems:'center'}}>
                            <Ionicons name="camera-outline" size={32} color={Colors.primary} />
                            <Text style={{color: Colors.primary, marginTop: 5, fontWeight:'600'}}>Ambil Foto</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.saveBtn, processing && styles.disabledBtn]}
                    onPress={handleUpdate}
                    disabled={processing}
                >
                    {processing ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Simpan Update</Text>}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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

  content: { flex: 1, padding: 24, marginTop: 10 },
  
  actionContainer: { marginBottom: 20 },
  addButton: { flexDirection: 'row', backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 2 },
  addButtonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

  loadingContainer: { marginTop: 50, alignItems: 'center' },
  loadingText: { marginTop: 10, color: Colors.textSecondary },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: Colors.textSecondary, marginTop: 10 },

  // Card List
  listContainer: { paddingBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardId: { fontWeight: '700', fontSize: 15, color: Colors.text },
  cardDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  
  divider: { height: 1, backgroundColor: '#F5F5F5', marginBottom: 12 },

  cardBody: { marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoLabel: { fontSize: 13, color: Colors.textSecondary, width: 60 },
  infoText: { color: Colors.text, fontSize: 13, fontWeight: '600', flex: 1 },
  infoHighlight: { color: Colors.primary, fontSize: 14, fontWeight: '700' },

  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: '#F5F7FA', gap: 6 },
  actionBtnText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#FFEBEE' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 24, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  
  label: { fontWeight: '600', marginBottom: 8, color: Colors.text, fontSize: 14 },
  selectBtn: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, marginBottom: 24, backgroundColor: '#FAFAFA' },
  selectBtnText: { color: Colors.text, fontSize: 14 },
  
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 24, backgroundColor: '#FAFAFA' },
  uploadBox: { height: 140, borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 24, backgroundColor: '#E8F5E9' },
  
  saveBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  disabledBtn: { opacity: 0.6 },

  permintaanItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  closeBtn: { padding: 16, alignItems: 'center', marginTop: 10 },
});