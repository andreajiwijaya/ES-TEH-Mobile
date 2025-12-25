import { Ionicons } from '@expo/vector-icons';
import React, { useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  StatusBar
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { ownerAPI } from '../../services/api';
import { Outlet } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage'; // FIX: Ditambahkan

export default function OutletScreen() {
  // --- STATE LENGKAP ---
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [user, setUser] = useState<any>(null); // State User Baru untuk Sinkronisasi

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);

  const [formData, setFormData] = useState({
    nama: '',
    alamat: '',
    is_active: true,
  });

  // --- LOGIKA FETCHING ASLI ---
  const loadOutlets = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // SINKRONISASI DATA USER UNTUK AVATAR
      const userData = await AsyncStorage.getItem('@user_data');
      if (userData) setUser(JSON.parse(userData));

      const response = await ownerAPI.getOutlets();
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      const raw: any = response.data;
      const rawData = Array.isArray(raw) ? raw : (raw && (raw.data ?? raw.items ?? [])) ?? [];

      if (!Array.isArray(rawData)) {
        setOutlets([]);
        return;
      }

      const mappedOutlets: Outlet[] = rawData.map((o: any) => ({
        id: Number(o.id),
        nama: String(o.nama ?? 'Outlet Tanpa Nama'),
        alamat: String(o.alamat ?? '-'),
        is_active: o.is_active === true || o.is_active === 1 || o.is_active === '1' || o.is_active === 'true',
        users_count: Number(o.users_count ?? 0),
        created_at: o.created_at ?? undefined,
        updated_at: o.updated_at ?? undefined,
      }));

      setOutlets(mappedOutlets);
    } catch (err: any) {
      console.error('loadOutlets error', err);
      Alert.alert('Error', err?.message ?? 'Gagal memuat outlet');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOutlets(true);
    }, [loadOutlets])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadOutlets(true);
  };

  const resetForm = () => {
    setFormData({ nama: '', alamat: '', is_active: true });
    setSelectedOutlet(null);
  };

  // --- SEARCH & STATS LOGIC ---
  const filteredOutlets = useMemo(() => {
    return outlets.filter(o => 
      o.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
      o.alamat.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [outlets, searchQuery]);

  const stats = useMemo(() => {
    const total = outlets.length;
    const aktif = outlets.filter(o => o.is_active).length;
    const tutup = total - aktif;
    return { total, aktif, tutup };
  }, [outlets]);

  // --- ACTIONS ---
  const handleAdd = async () => {
    if (!formData.nama.trim() || !formData.alamat.trim()) {
      Alert.alert('Validasi', 'Nama dan alamat outlet harus diisi');
      return;
    }
    setProcessing(true);
    try {
      const response = await ownerAPI.createOutlet({
        nama: formData.nama.trim(),
        alamat: formData.alamat.trim(),
        is_active: formData.is_active,
      });
      if (response.error) {
        Alert.alert('Gagal', response.error);
      } else {
        Alert.alert('Sukses', 'Outlet berhasil ditambahkan');
        setShowAddModal(false);
        resetForm();
        loadOutlets(true);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Gagal menambahkan outlet');
    } finally {
      setProcessing(false);
    }
  };

  const openEditModal = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setFormData({
      nama: outlet.nama ?? '',
      alamat: outlet.alamat ?? '',
      is_active: !!outlet.is_active,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedOutlet) return;
    if (!formData.nama.trim() || !formData.alamat.trim()) {
      Alert.alert('Validasi', 'Nama dan alamat harus diisi');
      return;
    }
    setProcessing(true);
    try {
      const response = await ownerAPI.updateOutlet(selectedOutlet.id, {
        nama: formData.nama.trim(),
        alamat: formData.alamat.trim(),
        is_active: formData.is_active,
      });
      if (response.error) {
        Alert.alert('Gagal', response.error);
      } else {
        Alert.alert('Sukses', 'Data outlet berhasil diperbarui');
        setShowEditModal(false);
        resetForm();
        loadOutlets(true);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Gagal mengupdate outlet');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Hapus Outlet', 'Yakin ingin menghapus outlet ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await ownerAPI.deleteOutlet(id);
            if (response.error) Alert.alert('Gagal', response.error);
            else {
              Alert.alert('Sukses', 'Outlet berhasil dihapus');
              loadOutlets(true);
            }
          } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Gagal menghapus outlet');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Manajemen Outlet</Text>
            <Text style={styles.headerSubtitle}>Status operasional cabang</Text>
          </View>
          <View style={styles.headerAvatar}>
            {/* FIX: Avatar Inisial Dinamis Mengikuti User Login */}
            <Text style={styles.avatarText}>
              {user?.username ? user.username.substring(0, 2).toUpperCase() : 'PT'}
            </Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{stats.total}</Text>
            <Text style={styles.statLab}>TOTAL</Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, {color: '#22C55E'}]}>{stats.aktif}</Text>
            <Text style={styles.statLab}>BUKA</Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, {color: '#EF4444'}]}>{stats.tutup}</Text>
            <Text style={styles.statLab}>TUTUP</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        style={styles.mainContent}
        contentContainerStyle={styles.scrollPadding}
      >
        <View style={styles.actionRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari nama atau lokasi..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
            />
          </View>
          <TouchableOpacity 
            style={styles.greenAddBtn}
            onPress={() => { resetForm(); setShowAddModal(true); }}
          >
            <Ionicons name="add" size={30} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.listSection}>
          <Text style={styles.sectionHeading}>Daftar Cabang</Text>
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 40}} />
          ) : (
            filteredOutlets.map((item) => (
              <View key={item.id} style={styles.outletCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.nameRow}>
                    <View style={[styles.statusLamp, { backgroundColor: item.is_active ? '#22C55E' : '#EF4444' }]} />
                    <Text style={styles.outletName} numberOfLines={1}>{item.nama}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: item.is_active ? '#F0FDF4' : '#FEF2F2' }]}>
                    <Text style={[styles.pillText, { color: item.is_active ? '#22C55E' : '#EF4444' }]}>
                        {item.is_active ? 'BUKA' : 'TUTUP'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={14} color="#94A3B8" />
                    <Text style={styles.alamatText} numberOfLines={2}>{item.alamat}</Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardFooter}>
                    <View style={styles.staffBadge}>
                        <Ionicons name="people-outline" size={14} color="#64748B" />
                        <Text style={styles.staffCount}>{item.users_count} Karyawan</Text>
                    </View>
                    <View style={styles.footerBtns}>
                        <TouchableOpacity style={styles.footerIconBtn} onPress={() => openEditModal(item)}>
                            <Ionicons name="create-outline" size={20} color="#64748B" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.footerIconBtn} onPress={() => handleDelete(item.id)}>
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
              </View>
            ))
          )}
        </View>
        <View style={{height: 100}} />
      </ScrollView>

      {/* MODAL LENGKAP TETAP DIKEMBALIKAN */}
      <Modal visible={showAddModal || showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{showAddModal ? 'Tambah Outlet' : 'Edit Outlet'}</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setShowEditModal(false); }}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Cabang</Text>
                <TextInput style={styles.input} value={formData.nama} onChangeText={(t) => setFormData({...formData, nama: t})} placeholder="Input nama..." />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Alamat Lengkap</Text>
                <TextInput style={[styles.input, {height: 80}]} value={formData.alamat} onChangeText={(t) => setFormData({...formData, alamat: t})} multiline placeholder="Input alamat..." />
              </View>
              <View style={styles.switchContainer}>
                <View>
                  <Text style={styles.inputLabel}>Status Operasional</Text>
                  <Text style={styles.switchSub}>{formData.is_active ? 'Outlet Aktif/Buka' : 'Outlet Non-Aktif'}</Text>
                </View>
                <Switch value={formData.is_active} onValueChange={(v) => setFormData({...formData, is_active: v})} trackColor={{ false: '#CBD5E1', true: '#A5D6A7' }} thumbColor={formData.is_active ? '#22C55E' : '#f4f3f4'} />
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={showAddModal ? handleAdd : handleUpdate} disabled={processing}>
                {processing ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Simpan Data</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerContainer: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 70,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  headerAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 16, fontWeight: '900' },

  statsCard: {
    position: 'absolute',
    bottom: -35,
    left: 25,
    right: 25,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 24,
    paddingVertical: 20,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
  statLab: { fontSize: 8, fontWeight: '900', color: '#94A3B8', letterSpacing: 1, marginTop: 4 },
  vDivider: { width: 1, height: '60%', backgroundColor: '#F1F5F9', alignSelf: 'center' },

  mainContent: { flex: 1 },
  scrollPadding: { paddingTop: 60, paddingHorizontal: 25 },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 18, paddingHorizontal: 15, height: 56, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#1E293B', fontWeight: '600' },
  greenAddBtn: { width: 56, height: 56, backgroundColor: '#22C55E', borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 4 },

  listSection: { marginTop: 10 },
  sectionHeading: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 15 },
  outletCard: { backgroundColor: 'white', padding: 20, borderRadius: 30, marginBottom: 15, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  statusLamp: { width: 10, height: 10, borderRadius: 5 },
  outletName: { fontSize: 17, fontWeight: '800', color: '#1E293B', flex: 1 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  pillText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  
  cardBody: { marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alamatText: { fontSize: 13, color: '#64748B', fontWeight: '500', flex: 1 },
  
  cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 15 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  staffBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  staffCount: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  footerBtns: { flexDirection: 'row', gap: 8 },
  footerIconBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'center', padding: 25 },
  modalContent: { backgroundColor: 'white', borderRadius: 32, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 15, padding: 18, fontSize: 15, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, padding: 15, backgroundColor: '#F0FDF4', borderRadius: 20 },
  switchSub: { fontSize: 11, color: '#15803D', fontWeight: '600' },
  saveBtn: { backgroundColor: Colors.primary, padding: 20, borderRadius: 20, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: '900', fontSize: 16 }
});