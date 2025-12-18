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
import { Bahan } from '../../types';
import { gudangAPI, authAPI } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface Lokal
interface StockOpnameItem {
  id: string; 
  bahan_id: number;
  stok_sistem: number;
  stok_fisik: number | null; 
  selisih: number;
  bahan: Bahan;
  status: 'pending' | 'sesuai' | 'selisih';
}

export default function StokOpnameScreen() {
  const router = useRouter();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [stockOpnameItems, setStockOpnameItems] = useState<StockOpnameItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<StockOpnameItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Modal Record
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockOpnameItem | null>(null);
  const [inputStokFisik, setInputStokFisik] = useState('');

  // Profile
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // --- LOAD DATA ---
  const loadUserData = async () => {
    const userData = await AsyncStorage.getItem('@user_data');
    if (userData) setUser(JSON.parse(userData));
  };

  const loadStok = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await gudangAPI.getStok();
      
      if (response.data && Array.isArray(response.data)) {
        const mappedItems: StockOpnameItem[] = response.data.map((item: any) => ({
          id: `opname-${item.bahan_id}`,
          bahan_id: Number(item.bahan_id),
          stok_sistem: Number(item.stok) || 0,
          stok_fisik: null, // Reset saat reload
          selisih: 0,
          status: 'pending',
          bahan: item.bahan || { 
            id: item.bahan_id, 
            nama: 'Unknown', 
            satuan: 'Unit',
            stok_minimum_gudang: 0, 
            stok_minimum_outlet: 0 
          },
        }));
        setStockOpnameItems(mappedItems);
        setFilteredItems(mappedItems);
      } else if (response.error) {
        Alert.alert('Error', response.error);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal memuat stok');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
    loadStok();
  }, [loadStok]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredItems(stockOpnameItems);
    } else {
      const filtered = stockOpnameItems.filter(item => 
        item.bahan.nama.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  }, [searchQuery, stockOpnameItems]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStok(true);
  };

  // --- ACTION HANDLERS ---

  const handleOpenRecord = (item: StockOpnameItem) => {
    setSelectedItem(item);
    // Jika sudah ada data sebelumnya, tampilkan
    setInputStokFisik(item.stok_fisik !== null ? item.stok_fisik.toString() : '');
    setShowRecordModal(true);
  };

  const handleSaveRecord = () => {
    if (!selectedItem) return;
    
    const fisik = parseInt(inputStokFisik);
    if (isNaN(fisik) || fisik < 0) {
      Alert.alert('Validasi', 'Masukkan jumlah stok fisik yang valid (>= 0)');
      return;
    }

    const selisih = fisik - selectedItem.stok_sistem;
    
    // FIX 1: Berikan tipe eksplisit agar TypeScript tidak menganggap ini string biasa
    const status: 'sesuai' | 'selisih' = selisih === 0 ? 'sesuai' : 'selisih';

    // Update state lokal
    const updatedItems = stockOpnameItems.map(item => 
      item.id === selectedItem.id 
        ? { ...item, stok_fisik: fisik, selisih, status } 
        : item
    );

    setStockOpnameItems(updatedItems);
    // Update filtered items juga agar UI langsung berubah
    if (searchQuery.trim() !== '') {
        const updatedFiltered = updatedItems.filter(item => 
            item.bahan.nama.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredItems(updatedFiltered);
    } else {
        setFilteredItems(updatedItems);
    }

    setShowRecordModal(false);
    setSelectedItem(null);
    setInputStokFisik('');
  };

  // Fungsi Finalisasi (Simpan ke Server - Mockup karena endpoint belum ada)
  const handleFinalize = async () => {
    const itemsToUpdate = stockOpnameItems.filter(item => item.status !== 'pending');
    
    if (itemsToUpdate.length === 0) {
      Alert.alert('Info', 'Belum ada data stok fisik yang dicatat.');
      return;
    }

    Alert.alert(
      'Konfirmasi',
      `Anda akan menyimpan ${itemsToUpdate.length} data hasil opname. Lanjutkan?`,
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Simpan', 
          onPress: async () => {
            setProcessing(true);
            try {
              // TODO: Panggil API simpan opname di sini jika sudah ada endpointnya.
              // Untuk sekarang kita simulasi sukses saja.
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              Alert.alert('Sukses', 'Hasil stok opname berhasil disimpan.');
              loadStok(true); // Reset form
            } catch (error) {
              // FIX 2: Gunakan variabel error agar ESLint senang
              console.log('Error finalize:', error);
              Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan.');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
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

  // --- STATISTIK ---
  const totalRecorded = stockOpnameItems.filter(i => i.status !== 'pending').length;
  const totalSelisih = stockOpnameItems.filter(i => i.status === 'selisih').length;

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
            <Text style={styles.title}>Stok Opname</Text>
            <Text style={styles.subtitle}>Pencatatan & Penyesuaian Stok Fisik</Text>
          </View>
          {totalRecorded > 0 && (
            <TouchableOpacity style={styles.finalizeButton} onPress={handleFinalize} disabled={processing}>
               {processing ? <ActivityIndicator color="white" size="small"/> : (
                   <>
                    <Ionicons name="save-outline" size={18} color="white" />
                    <Text style={styles.finalizeButtonText}>Simpan</Text>
                   </>
               )}
            </TouchableOpacity>
          )}
        </View>

        {/* SUMMARY */}
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Ionicons name="clipboard-outline" size={28} color={Colors.primary} />
            <Text style={styles.summaryLabel}>Total Item</Text>
            <Text style={styles.summaryValue}>{stockOpnameItems.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="checkmark-done-outline" size={28} color={Colors.success} />
            <Text style={styles.summaryLabel}>Sudah Cek</Text>
            <Text style={styles.summaryValue}>{totalRecorded}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="alert-circle-outline" size={28} color={Colors.warning} />
            <Text style={styles.summaryLabel}>Selisih</Text>
            <Text style={[styles.summaryValue, {color: totalSelisih > 0 ? Colors.error : Colors.text}]}>
                {totalSelisih}
            </Text>
          </View>
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari bahan..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* LIST */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Memuat stok...</Text>
          </View>
        ) : (
          <View style={styles.listSection}>
            <FlatList
              data={filteredItems}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Tidak ada data stok.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={[styles.card, item.status === 'selisih' && styles.cardWarning]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.bahan.nama}</Text>
                    <View style={[
                        styles.statusBadge, 
                        { backgroundColor: item.status === 'pending' ? '#eee' : (item.status === 'sesuai' ? Colors.success+'20' : Colors.error+'20') }
                    ]}>
                        <Text style={[
                            styles.statusText,
                            { color: item.status === 'pending' ? '#888' : (item.status === 'sesuai' ? Colors.success : Colors.error) }
                        ]}>
                            {item.status === 'pending' ? 'Belum Cek' : item.status.toUpperCase()}
                        </Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.stockRow}>
                        <View style={{flex:1}}>
                            <Text style={styles.stockLabel}>Sistem</Text>
                            <Text style={styles.stockValue}>{item.stok_sistem} <Text style={styles.unit}>{item.bahan.satuan}</Text></Text>
                        </View>
                        
                        <Ionicons name="arrow-forward" size={20} color="#ccc" style={{marginHorizontal:10}} />
                        
                        <View style={{flex:1, alignItems:'flex-end'}}>
                            <Text style={styles.stockLabel}>Fisik</Text>
                            <Text style={[styles.stockValue, item.stok_fisik === null && {color:'#ccc', fontSize:14}]}>
                                {item.stok_fisik !== null ? item.stok_fisik : '-'} 
                                {item.stok_fisik !== null && <Text style={styles.unit}> {item.bahan.satuan}</Text>}
                            </Text>
                        </View>
                    </View>

                    {item.selisih !== 0 && (
                        <View style={styles.selisihBox}>
                            <Text style={styles.selisihText}>
                                Selisih: {item.selisih > 0 ? '+' : ''}{item.selisih} {item.bahan.satuan}
                            </Text>
                        </View>
                    )}
                  </View>

                  <TouchableOpacity 
                    style={[styles.actionButton, item.status === 'pending' ? styles.btnPrimary : styles.btnOutline]}
                    onPress={() => handleOpenRecord(item)}
                  >
                    <Ionicons name="create-outline" size={18} color={item.status === 'pending' ? 'white' : Colors.primary} />
                    <Text style={item.status === 'pending' ? styles.btnTextWhite : styles.btnTextPrimary}>
                        {item.status === 'pending' ? 'Catat Stok' : 'Edit Hasil'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        )}
      </ScrollView>

      {/* MODAL RECORD */}
      <Modal visible={showRecordModal} transparent animationType="slide" onRequestClose={() => setShowRecordModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Catat Stok Fisik</Text>
              <TouchableOpacity onPress={() => setShowRecordModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
                <View style={styles.modalBody}>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoTitle}>{selectedItem.bahan.nama}</Text>
                        <Text style={styles.infoSub}>Stok Sistem: {selectedItem.stok_sistem} {selectedItem.bahan.satuan}</Text>
                    </View>

                    <Text style={styles.label}>Jumlah Fisik Saat Ini:</Text>
                    <TextInput 
                        style={styles.input}
                        keyboardType="numeric"
                        value={inputStokFisik}
                        onChangeText={setInputStokFisik}
                        placeholder="0"
                        autoFocus
                    />

                    {inputStokFisik !== '' && (
                        <View style={styles.previewBox}>
                            <Text style={{color: Colors.textSecondary}}>Preview Selisih:</Text>
                            <Text style={{fontWeight:'bold', fontSize:16, color: (parseInt(inputStokFisik) - selectedItem.stok_sistem) === 0 ? Colors.success : Colors.error}}>
                                {(parseInt(inputStokFisik) - selectedItem.stok_sistem) > 0 ? '+' : ''}
                                {parseInt(inputStokFisik) - selectedItem.stok_sistem} {selectedItem.bahan.satuan}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setShowRecordModal(false)}>
                    <Text style={styles.btnCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSave} onPress={handleSaveRecord}>
                    <Text style={styles.btnSaveText}>Simpan</Text>
                </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* PROFILE MENU */}
      <Modal visible={showProfileMenu} transparent animationType="fade" onRequestClose={() => setShowProfileMenu(false)}>
        <TouchableOpacity style={styles.profileModalOverlay} activeOpacity={1} onPress={() => setShowProfileMenu(false)}>
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
  
  finalizeButton: { flexDirection: 'row', backgroundColor: Colors.success, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, gap: 5, alignItems: 'center' },
  finalizeButtonText: { color: 'white', fontWeight: 'bold' },

  summaryCards: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 15, alignItems: 'center', elevation: 2 },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 5 },
  summaryValue: { fontSize: 20, fontWeight: 'bold', color: Colors.text },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 10, marginBottom: 15 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },

  listSection: { marginBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: 'transparent' },
  cardWarning: { borderColor: Colors.warning },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: 'bold' },

  cardBody: { marginBottom: 15 },
  stockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stockLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  stockValue: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  unit: { fontSize: 12, fontWeight: 'normal', color: Colors.textSecondary },
  
  selisihBox: { marginTop: 10, padding: 8, backgroundColor: '#FFF3E0', borderRadius: 6, alignItems: 'center' },
  selisihText: { color: Colors.warning, fontWeight: 'bold', fontSize: 13 },

  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 5 },
  btnPrimary: { backgroundColor: Colors.primary },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary },
  btnTextWhite: { color: 'white', fontWeight: 'bold' },
  btnTextPrimary: { color: Colors.primary, fontWeight: 'bold' },

  loadingContainer: { paddingVertical: 50, alignItems: 'center' },
  loadingText: { marginTop: 10, color: Colors.textSecondary, fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 30 },
  emptyText: { color: Colors.textSecondary },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { marginBottom: 20 },
  
  infoBox: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 8, marginBottom: 20, alignItems: 'center' },
  infoTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  infoSub: { color: Colors.textSecondary, marginTop: 5 },
  
  label: { fontWeight: '600', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 15, fontSize: 18, textAlign: 'center', marginBottom: 15 },
  previewBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#f0f9ff', borderRadius: 8 },

  modalFooter: { flexDirection: 'row', gap: 10 },
  btnCancel: { flex: 1, padding: 15, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center' },
  btnCancelText: { fontWeight: 'bold', color: '#666' },
  btnSave: { flex: 1, padding: 15, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center' },
  btnSaveText: { fontWeight: 'bold', color: 'white' },

  // Profile
  profileModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  profileMenu: { position: 'absolute', top: 90, right: 20, backgroundColor: 'white', borderRadius: 8, padding: 5, elevation: 5, minWidth: 150 },
  profileMenuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  profileMenuItemText: { color: Colors.error, fontWeight: 'bold' },
});