import { Ionicons } from '@expo/vector-icons';
import React, { useState, useCallback } from 'react'; // FIX: useEffect dihapus
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
import { Bahan } from '../../types';
import { gudangAPI } from '../../services/api';

export default function MasterBahanScreen() {
  // --- STATE ---
  const [bahanList, setBahanList] = useState<Bahan[]>([]);
  const [filteredList, setFilteredList] = useState<Bahan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
    nama: '',
    satuan: '',
    stok_minimum_gudang: '',
    stok_minimum_outlet: ''
  });

  // --- LOAD DATA ---
  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await gudangAPI.getBahan();
      if (response.data && Array.isArray(response.data)) {
        const sortedData = response.data.sort((a: any, b: any) => b.id - a.id);
        setBahanList(sortedData);
        setFilteredList(sortedData);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal memuat data bahan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // FIX: Gunakan useFocusEffect untuk sinkronisasi otomatis
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Search Filter (Client Side)
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredList(bahanList);
    } else {
      const filtered = bahanList.filter(item => 
        item.nama.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredList(filtered);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  // --- ACTIONS ---

  const openCreateModal = () => {
    setIsEditMode(false);
    setFormData({ nama: '', satuan: '', stok_minimum_gudang: '', stok_minimum_outlet: '' });
    setSelectedId(null);
    setShowModal(true);
  };

  const openEditModal = (item: Bahan) => {
    setIsEditMode(true);
    setSelectedId(item.id);
    setFormData({
      nama: item.nama,
      satuan: item.satuan,
      stok_minimum_gudang: item.stok_minimum_gudang.toString(),
      stok_minimum_outlet: item.stok_minimum_outlet.toString()
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.nama || !formData.satuan) {
      Alert.alert('Validasi', 'Nama bahan dan satuan wajib diisi!');
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        nama: formData.nama,
        satuan: formData.satuan,
        stok_minimum_gudang: parseInt(formData.stok_minimum_gudang) || 0,
        stok_minimum_outlet: parseInt(formData.stok_minimum_outlet) || 0
      };

      let response;
      if (isEditMode && selectedId) {
        response = await gudangAPI.updateBahan(selectedId, payload);
      } else {
        response = await gudangAPI.createBahan(payload);
      }

      if (response.error) throw new Error(response.error);

      Alert.alert('Sukses', `Data bahan berhasil ${isEditMode ? 'diperbarui' : 'ditambahkan'}`);
      setShowModal(false);
      loadData(true);
    } catch (error: any) {
      Alert.alert('Gagal', error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Hapus Bahan',
      'Yakin ingin menghapus bahan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await gudangAPI.deleteBahan(id);
              if (res.error) throw new Error(res.error);
              Alert.alert('Terhapus', 'Data bahan berhasil dihapus.');
              loadData(true);
            } catch (error: any) {
              setLoading(false);
              Alert.alert('Gagal', error.message);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Manajemen Bahan</Text>
            <Text style={styles.headerSubtitle}>Kelola katalog bahan baku gudang</Text>
          </View>
          <View style={styles.headerIconBg}>
            <Ionicons name="beaker" size={24} color={Colors.primary} />
          </View>
        </View>
      </View>

      <View style={styles.content}>
        
        {/* SEARCH & ADD ROW */}
        <View style={styles.actionRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari bahan..."
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* LIST */}
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={filteredList}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Ionicons name="file-tray-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Data bahan kosong</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.titleRow}>
                    <View style={styles.iconBox}>
                      <Text style={styles.iconText}>{item.nama.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.nama}</Text>
                      <Text style={styles.cardSubTitle}>Satuan: {item.satuan}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
                      <Ionicons name="pencil" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.deleteBtnBg]} onPress={() => handleDelete(item.id)}>
                      <Ionicons name="trash" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Min. Gudang</Text>
                    <Text style={styles.statValue}>{item.stok_minimum_gudang} {item.satuan}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Min. Outlet</Text>
                    <Text style={styles.statValue}>{item.stok_minimum_outlet} {item.satuan}</Text>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* MODAL FORM */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditMode ? 'Edit Bahan' : 'Bahan Baru'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nama Bahan</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Contoh: Gula Pasir" 
                value={formData.nama}
                onChangeText={t => setFormData({...formData, nama: t})}
              />

              <Text style={styles.label}>Satuan</Text>
              <TextInput 
                style={styles.input} 
                placeholder="kg, pcs, liter, dll" 
                value={formData.satuan}
                onChangeText={t => setFormData({...formData, satuan: t})}
              />

              <View style={styles.rowInputs}>
                <View style={{flex: 1, marginRight: 10}}>
                  <Text style={styles.label}>Min. Gudang</Text>
                  <TextInput 
                    style={styles.input} 
                    keyboardType="numeric"
                    value={formData.stok_minimum_gudang}
                    onChangeText={t => setFormData({...formData, stok_minimum_gudang: t})}
                  />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>Min. Outlet</Text>
                  <TextInput 
                    style={styles.input} 
                    keyboardType="numeric"
                    value={formData.stok_minimum_outlet}
                    onChangeText={t => setFormData({...formData, stok_minimum_outlet: t})}
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={processing}>
              {processing ? <ActivityIndicator color="white" /> : <Text style={styles.btnSaveText}>Simpan Bahan</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 25,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  headerIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: 20 },
  actionRow: { flexDirection: 'row', marginBottom: 20, gap: 12 },
  searchContainer: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', 
    backgroundColor: 'white', borderRadius: 15, paddingHorizontal: 15, 
    borderWidth: 1, borderColor: '#EEE', height: 50 
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '500' },
  addButton: { 
    width: 50, height: 50, borderRadius: 15, 
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    elevation: 3 
  },
  centerContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 10, color: '#999', fontWeight: '600' },
  card: { 
    backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 15,
    borderWidth: 1, borderColor: '#F0F0F0', elevation: 2 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  iconText: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  cardSubTitle: { fontSize: 12, color: '#999', marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center' },
  deleteBtnBg: { backgroundColor: '#FFEBEE' },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flex: 1 },
  statLabel: { fontSize: 10, color: '#999', marginBottom: 2 },
  statValue: { fontSize: 13, fontWeight: '700', color: '#555' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#333' },
  modalBody: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#EEE', borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#F9F9F9', marginBottom: 15 },
  rowInputs: { flexDirection: 'row' },
  btnSave: { backgroundColor: Colors.primary, padding: 18, borderRadius: 15, alignItems: 'center' },
  btnSaveText: { fontSize: 16, fontWeight: '700', color: 'white' },
});