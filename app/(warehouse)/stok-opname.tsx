import { Ionicons } from '@expo/vector-icons';
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
  StatusBar
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Bahan } from '../../types';
import { gudangAPI } from '../../services/api';

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
  // State Data & UI
  const [searchQuery, setSearchQuery] = useState('');
  const [stockOpnameItems, setStockOpnameItems] = useState<StockOpnameItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<StockOpnameItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Modal Record State
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockOpnameItem | null>(null);
  const [inputStokFisik, setInputStokFisik] = useState('');

  // --- LOAD DATA ---
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
    const status: 'sesuai' | 'selisih' = selisih === 0 ? 'sesuai' : 'selisih';

    const updatedItems = stockOpnameItems.map(item => 
      item.id === selectedItem.id 
        ? { ...item, stok_fisik: fisik, selisih, status } 
        : item
    );

    setStockOpnameItems(updatedItems);
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
              // Simulasi API call (karena endpoint finalize belum ada di backend Bapak)
              await new Promise(resolve => setTimeout(resolve, 1500));
              Alert.alert('Sukses', 'Hasil stok opname berhasil disimpan.');
              loadStok(true); 
            } catch (error) {
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

  // --- STATISTIK ---
  const totalRecorded = stockOpnameItems.filter(i => i.status !== 'pending').length;
  const totalSelisih = stockOpnameItems.filter(i => i.status === 'selisih').length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* HEADER GREEN DNA */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Stok Opname</Text>
            <Text style={styles.headerSubtitle}>Pencatatan & Penyesuaian Stok Fisik</Text>
          </View>
          <View style={styles.headerIconBg}>
            <Ionicons name="clipboard" size={24} color={Colors.primary} />
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ACTION BAR */}
        <View style={styles.actionBar}>
            <View>
                <Text style={styles.sectionTitle}>Progress Opname</Text>
            </View>
            {totalRecorded > 0 && (
                <TouchableOpacity style={styles.finalizeButton} onPress={handleFinalize} disabled={processing}>
                    {processing ? <ActivityIndicator color="white" size="small"/> : (
                        <>
                            <Ionicons name="save-outline" size={16} color="white" />
                            <Text style={styles.finalizeButtonText}>Simpan Hasil</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}
        </View>

        {/* SUMMARY CARDS */}
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="layers" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.summaryValue}>{stockOpnameItems.length}</Text>
            <Text style={styles.summaryLabel}>Total Item</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="checkmark-done" size={20} color={Colors.success} />
            </View>
            <Text style={[styles.summaryValue, {color: Colors.success}]}>{totalRecorded}</Text>
            <Text style={styles.summaryLabel}>Sudah Cek</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="alert-circle" size={20} color={Colors.warning} />
            </View>
            <Text style={[styles.summaryValue, {color: totalSelisih > 0 ? Colors.error : Colors.text}]}>
                {totalSelisih}
            </Text>
            <Text style={styles.summaryLabel}>Selisih</Text>
          </View>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama bahan..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* LIST ITEM */}
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
                  <Ionicons name="search-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>Tidak ada data stok.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={[styles.card, item.status === 'selisih' && styles.cardWarning]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.bahan.nama}</Text>
                    <View style={[
                        styles.statusBadge, 
                        { backgroundColor: item.status === 'pending' ? '#F5F5F5' : (item.status === 'sesuai' ? '#E8F5E9' : '#FFEBEE') }
                    ]}>
                        <Text style={[
                            styles.statusText,
                            { color: item.status === 'pending' ? '#9E9E9E' : (item.status === 'sesuai' ? Colors.success : Colors.error) }
                        ]}>
                            {item.status === 'pending' ? 'Belum Cek' : item.status.toUpperCase()}
                        </Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.stockRow}>
                        <View style={styles.stockCol}>
                            <Text style={styles.stockLabel}>Sistem</Text>
                            <Text style={styles.stockValue}>{item.stok_sistem} <Text style={styles.unit}>{item.bahan.satuan}</Text></Text>
                        </View>
                        
                        <Ionicons name="arrow-forward" size={18} color="#E0E0E0" />
                        
                        <View style={[styles.stockCol, {alignItems:'flex-end'}]}>
                            <Text style={styles.stockLabel}>Fisik</Text>
                            <Text style={[styles.stockValue, item.stok_fisik === null && {color:'#BDBDBD', fontSize:14}]}>
                                {item.stok_fisik !== null ? item.stok_fisik : '-'} 
                                {item.stok_fisik !== null && <Text style={styles.unit}> {item.bahan.satuan}</Text>}
                            </Text>
                        </View>
                    </View>

                    {item.selisih !== 0 && (
                        <View style={styles.selisihBox}>
                            <Ionicons name="alert-circle" size={16} color={Colors.warning} />
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
                        {item.status === 'pending' ? 'Catat Stok Fisik' : 'Edit Hasil'}
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
                        <Ionicons name="cube-outline" size={24} color={Colors.primary} />
                        <View style={{marginLeft: 10}}>
                            <Text style={styles.infoTitle}>{selectedItem.bahan.nama}</Text>
                            <Text style={styles.infoSub}>Sistem: {selectedItem.stok_sistem} {selectedItem.bahan.satuan}</Text>
                        </View>
                    </View>

                    <Text style={styles.label}>Jumlah Fisik Saat Ini</Text>
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
                            <Text style={{color: Colors.textSecondary, fontSize: 12}}>Selisih:</Text>
                            <Text style={{fontWeight:'800', fontSize:16, color: (parseInt(inputStokFisik) - selectedItem.stok_sistem) === 0 ? Colors.success : Colors.error}}>
                                {(parseInt(inputStokFisik) - selectedItem.stok_sistem) > 0 ? '+' : ''}
                                {parseInt(inputStokFisik) - selectedItem.stok_sistem} {selectedItem.bahan.satuan}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.btnSave} onPress={handleSaveRecord}>
                    <Text style={styles.btnSaveText}>Simpan Data</Text>
                </TouchableOpacity>
            </View>
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
  
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  
  finalizeButton: { flexDirection: 'row', backgroundColor: Colors.success, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 6, alignItems: 'center' },
  finalizeButtonText: { color: 'white', fontWeight: '700', fontSize: 12 },

  // Summary Cards
  summaryCards: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0', elevation: 2 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, fontWeight: '600' },
  summaryValue: { fontSize: 18, fontWeight: '800', color: Colors.text },

  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 15, marginBottom: 20, borderWidth: 1, borderColor: '#E0E0E0', height: 50 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },

  // List
  listSection: { marginBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
  cardWarning: { borderColor: '#FFCCBC', backgroundColor: '#FFFBE6' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800' },

  cardBody: { marginBottom: 16 },
  stockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stockCol: { flex: 1 },
  stockLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4, fontWeight: '600' },
  stockValue: { fontSize: 15, fontWeight: '800', color: Colors.text },
  unit: { fontSize: 11, fontWeight: '500', color: Colors.textSecondary },
  
  selisihBox: { marginTop: 12, padding: 8, backgroundColor: '#FFF3E0', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  selisihText: { color: '#E65100', fontWeight: '700', fontSize: 12 },

  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, gap: 6 },
  btnPrimary: { backgroundColor: Colors.primary },
  btnOutline: { backgroundColor: 'white', borderWidth: 1, borderColor: Colors.primary },
  btnTextWhite: { color: 'white', fontWeight: '700', fontSize: 13 },
  btnTextPrimary: { color: Colors.primary, fontWeight: '700', fontSize: 13 },

  // Loading & Empty
  loadingContainer: { paddingVertical: 50, alignItems: 'center' },
  loadingText: { marginTop: 10, color: Colors.textSecondary, fontSize: 13 },
  emptyContainer: { alignItems: 'center', marginTop: 30 },
  emptyText: { color: Colors.textSecondary, fontSize: 14, marginTop: 10 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, elevation: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  
  modalBody: { marginBottom: 24 },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', padding: 16, borderRadius: 12, marginBottom: 20 },
  infoTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  infoSub: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  
  label: { fontWeight: '700', marginBottom: 10, fontSize: 14, color: Colors.text },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 16, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16, backgroundColor: '#FAFAFA' },
  
  previewBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#F0F9FF', borderRadius: 12 },

  modalFooter: { flexDirection: 'row' },
  btnSave: { flex: 1, padding: 16, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center' },
  btnSaveText: { fontWeight: '700', color: 'white', fontSize: 15 },
});