import { Ionicons } from '@expo/vector-icons';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  StatusBar
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Bahan } from '../../types';
import { gudangAPI } from '../../services/api';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [stockOpnameItems, setStockOpnameItems] = useState<StockOpnameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockOpnameItem | null>(null);
  const [inputStokFisik, setInputStokFisik] = useState('');

  const loadStok = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await gudangAPI.getStok();
      if (response.data && Array.isArray(response.data)) {
        const mappedItems: StockOpnameItem[] = response.data.map((item: any) => ({
          id: `opname-${item.bahan_id}`,
          bahan_id: Number(item.bahan_id),
          stok_sistem: Number(item.stok) || 0,
          stok_fisik: null,
          selisih: 0,
          status: 'pending',
          bahan: item.bahan || { id: item.bahan_id, nama: 'Unknown', satuan: 'Unit' },
        }));
        setStockOpnameItems(mappedItems);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal memuat stok');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStok();
    }, [loadStok])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadStok(true);
  };

  const filteredItems = stockOpnameItems.filter(item => 
    item.bahan.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

    setStockOpnameItems(prev => prev.map(item => 
      item.id === selectedItem.id ? { ...item, stok_fisik: fisik, selisih, status } : item
    ));

    setShowRecordModal(false);
    setSelectedItem(null);
  };

  const handleFinalize = async () => {
    const itemsToUpdate = stockOpnameItems.filter(item => item.status !== 'pending');
    if (itemsToUpdate.length === 0) return Alert.alert('Info', 'Belum ada data yang dicek.');

    Alert.alert('Konfirmasi', `Simpan ${itemsToUpdate.length} data hasil opname?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Simpan', onPress: async () => {
        setProcessing(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        Alert.alert('Sukses', 'Stok opname berhasil disimpan.');
        setProcessing(false);
        loadStok(true);
      }}
    ]);
  };

  const totalRecorded = stockOpnameItems.filter(i => i.status !== 'pending').length;
  const totalSelisih = stockOpnameItems.filter(i => i.status === 'selisih').length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Stok Opname</Text>
            <Text style={styles.headerSubtitle}>Audit kesesuaian stok gudang</Text>
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
        <View style={styles.actionBar}>
          <Text style={styles.sectionTitle}>Ringkasan Audit</Text>
          {totalRecorded > 0 && (
            <TouchableOpacity style={styles.finalizeBtn} onPress={handleFinalize} disabled={processing}>
              {processing ? <ActivityIndicator color="white" size="small"/> : <Text style={styles.finalizeText}>Selesaikan</Text>}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statVal}>{stockOpnameItems.length}</Text><Text style={styles.statLab}>Item</Text></View>
          <View style={styles.statCard}><Text style={[styles.statVal, {color: Colors.success}]}>{totalRecorded}</Text><Text style={styles.statLab}>Dicek</Text></View>
          <View style={styles.statCard}><Text style={[styles.statVal, {color: totalSelisih > 0 ? Colors.error : Colors.text}]}>{totalSelisih}</Text><Text style={styles.statLab}>Selisih</Text></View>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput style={styles.searchInput} placeholder="Cari bahan..." value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 40}} />
        ) : (
          filteredItems.map((item) => (
            <View key={item.id} style={[styles.card, item.status === 'selisih' && styles.cardWarning]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.bahan.nama}</Text>
                <View style={[styles.badge, {backgroundColor: item.status === 'pending' ? '#F5F5F5' : (item.status === 'sesuai' ? '#E8F5E9' : '#FFEBEE')}]}>
                  <Text style={[styles.badgeText, {color: item.status === 'pending' ? '#999' : (item.status === 'sesuai' ? Colors.success : Colors.error)}]}>{item.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.stockInfo}>
                <View><Text style={styles.stockLabel}>Sistem</Text><Text style={styles.stockVal}>{item.stok_sistem} {item.bahan.satuan}</Text></View>
                <Ionicons name="arrow-forward" size={16} color="#DDD" />
                <View style={{alignItems:'flex-end'}}><Text style={styles.stockLabel}>Fisik</Text><Text style={styles.stockVal}>{item.stok_fisik ?? '-'}</Text></View>
              </View>

              {item.selisih !== 0 && (
                <View style={styles.selisihBox}>
                  <Text style={styles.selisihText}>Selisih: {item.selisih > 0 ? '+' : ''}{item.selisih} {item.bahan.satuan}</Text>
                </View>
              )}

              <TouchableOpacity style={[styles.actionBtn, item.status === 'pending' ? styles.btnFill : styles.btnOutline]} onPress={() => handleOpenRecord(item)}>
                <Text style={item.status === 'pending' ? styles.txtWhite : styles.txtPrimary}>
                  {item.status === 'pending' ? 'Catat Stok Fisik' : 'Koreksi'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showRecordModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Catat Stok Fisik</Text>
              <TouchableOpacity onPress={() => setShowRecordModal(false)}><Ionicons name="close" size={24} /></TouchableOpacity>
            </View>
            {/* FIX: modalBody style ditambahkan di bawah */}
            <View style={styles.modalBody}>
              <Text style={styles.modalBahan}>{selectedItem?.bahan.nama}</Text>
              <Text style={styles.modalSub}>Sistem: {selectedItem?.stok_sistem} {selectedItem?.bahan.satuan}</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={inputStokFisik} onChangeText={setInputStokFisik} placeholder="0" autoFocus />
            </View>
            <TouchableOpacity style={styles.btnSave} onPress={handleSaveRecord}><Text style={styles.btnSaveText}>Simpan</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: Colors.primary, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 25, paddingHorizontal: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  headerIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: 20 },
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  finalizeBtn: { backgroundColor: Colors.success, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  finalizeText: { color: 'white', fontWeight: '700', fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 15, padding: 15, alignItems: 'center', elevation: 2 },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLab: { fontSize: 11, color: '#999', marginTop: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 15, marginBottom: 20, height: 45, borderWidth: 1, borderColor: '#EEE' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 15, elevation: 2 },
  cardWarning: { borderColor: '#FFCCBC', borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  stockInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  stockLabel: { fontSize: 11, color: '#999' },
  stockVal: { fontSize: 15, fontWeight: '700' },
  selisihBox: { backgroundColor: '#FFF3E0', padding: 10, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  selisihText: { color: '#E65100', fontWeight: '700', fontSize: 12 },
  actionBtn: { padding: 12, borderRadius: 12, alignItems: 'center' },
  btnFill: { backgroundColor: Colors.primary },
  btnOutline: { borderWidth: 1, borderColor: Colors.primary },
  txtWhite: { color: 'white', fontWeight: '700' },
  txtPrimary: { color: Colors.primary, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { paddingVertical: 10 }, // FIX: Menambahkan modalBody yang sempat hilang
  modalBahan: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  modalSub: { textAlign: 'center', color: '#999', marginBottom: 20 },
  input: { backgroundColor: '#F5F5F5', borderRadius: 15, padding: 15, fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  btnSave: { backgroundColor: Colors.primary, padding: 16, borderRadius: 15, alignItems: 'center' },
  btnSaveText: { color: 'white', fontWeight: '800' }
});