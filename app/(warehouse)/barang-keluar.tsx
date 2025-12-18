import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
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
  KeyboardAvoidingView, // Fix: Added import
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { BarangKeluar, PermintaanStok } from '../../types';
import { gudangAPI, authAPI } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function BarangKeluarScreen() {
  const router = useRouter();
  
  // --- STATE ---
  const [outgoingGoods, setOutgoingGoods] = useState<BarangKeluar[]>([]);
  const [permintaanStok, setPermintaanStok] = useState<PermintaanStok[]>([]);
  const [user, setUser] = useState<any>(null);
  
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

  // Profile Menu
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const loadUserData = async () => {
    const userData = await AsyncStorage.getItem('@user_data');
    if (userData) setUser(JSON.parse(userData));
  };

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
    loadUserData();
    loadData();
  }, [loadData]); // Fix: Added loadData dependency

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

  const handleLogout = async () => {
    Alert.alert('Logout', 'Yakin ingin keluar?', [
      { text: 'Batal' },
      { text: 'Keluar', style: 'destructive', onPress: async () => {
          await authAPI.logout();
          router.replace('/(auth)/login');
      }}
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
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
            <Text style={styles.title}>Barang Keluar</Text>
            <Text style={styles.subtitle}>Distribusi ke Outlet</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Baru</Text>
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
                    <Text style={styles.emptyText}>Belum ada data barang keluar.</Text>
                </View>
            ) : (
                outgoingGoods.map((item) => (
                    <View key={item.id} style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View>
                                <Text style={styles.cardId}>#{item.id}</Text>
                                <Text style={styles.cardDate}>{formatDate(item.tanggal_keluar)}</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                <Text style={{ color: getStatusColor(item.status), fontWeight: 'bold', fontSize: 12 }}>
                                    {item.status.toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.cardBody}>
                            <View style={styles.infoRow}>
                                <Ionicons name="storefront-outline" size={16} color={Colors.textSecondary} />
                                <Text style={styles.infoText}>Outlet ID: {item.outlet_id}</Text>
                            </View>
                            {item.bahan && (
                                <View style={styles.infoRow}>
                                    <Ionicons name="cube-outline" size={16} color={Colors.textSecondary} />
                                    <Text style={styles.infoText}>{item.bahan.nama}</Text>
                                </View>
                            )}
                            <View style={styles.infoRow}>
                                <Ionicons name="layers-outline" size={16} color={Colors.textSecondary} />
                                <Text style={styles.infoText}>Jumlah: <Text style={{fontWeight:'bold', color:Colors.primary}}>{item.jumlah || 0}</Text></Text>
                            </View>
                        </View>

                        <View style={styles.cardFooter}>
                            {item.status !== 'received' && item.status !== 'cancelled' && (
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenUpdate(item)}>
                                    <Ionicons name="create-outline" size={18} color={Colors.primary} />
                                    <Text style={styles.actionBtnText}>Update / Upload</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={[styles.actionBtn, {borderColor: Colors.error}]} onPress={() => handleDelete(item.id)}>
                                <Ionicons name="trash-outline" size={18} color={Colors.error} />
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
                        <Text style={{textAlign:'center', padding: 20, color:'#888'}}>Tidak ada permintaan yang disetujui.</Text>
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
                                    <Text style={{fontWeight:'bold'}}>Request #{p.id}</Text>
                                    <Text>{p.bahan?.nama} - {p.jumlah} {p.bahan?.satuan}</Text>
                                    <Text style={{fontSize:12, color:'#666'}}>Outlet ID: {p.outlet_id}</Text>
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
                            <Ionicons name="camera-outline" size={30} color={Colors.primary} />
                            <Text style={{color: Colors.primary, marginTop: 5}}>Ambil Foto</Text>
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

      {/* Profile Menu */}
      <Modal visible={showProfileMenu} transparent animationType="fade" onRequestClose={() => setShowProfileMenu(false)}>
        <TouchableOpacity style={styles.profileOverlay} activeOpacity={1} onPress={() => setShowProfileMenu(false)}>
            <View style={styles.profileMenu}>
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                    <Text style={{color: Colors.error, fontWeight:'bold', marginLeft: 10}}>Keluar</Text>
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: 'bold', color: Colors.primary },
  userName: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  userRole: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },

  content: { flex: 1, padding: 20 },
  titleSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary },
  
  addButton: { flexDirection: 'row', backgroundColor: Colors.primary, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, alignItems: 'center', gap: 5 },
  addButtonText: { color: 'white', fontWeight: 'bold' },

  loadingContainer: { marginTop: 50, alignItems: 'center' },
  loadingText: { marginTop: 10, color: Colors.textSecondary },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: Colors.textSecondary },

  // Card List
  listContainer: { paddingBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  cardId: { fontWeight: 'bold', fontSize: 16 },
  cardDate: { fontSize: 12, color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  
  cardBody: { marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  infoText: { color: Colors.text, fontSize: 14 },

  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: Colors.primary, gap: 5 },
  actionBtnText: { color: Colors.primary, fontSize: 12, fontWeight: 'bold' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 12, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  
  label: { fontWeight: '600', marginBottom: 5, color: Colors.text },
  selectBtn: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 20 },
  selectBtnText: { color: Colors.text },
  
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20 },
  uploadBox: { height: 120, borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 20, backgroundColor: '#F0F9FF' },
  
  saveBtn: { backgroundColor: Colors.primary, padding: 15, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  disabledBtn: { opacity: 0.6 },

  permintaanItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  closeBtn: { padding: 15, alignItems: 'center', marginTop: 10 },

  // Profile
  profileOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  profileMenu: { position: 'absolute', top: 90, right: 20, backgroundColor: 'white', borderRadius: 8, padding: 5, elevation: 5, minWidth: 150 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 10 },
});