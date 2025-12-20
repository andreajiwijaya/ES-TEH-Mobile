import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  KeyboardAvoidingView
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { ownerAPI } from '../../services/api';
import { Outlet } from '../../types';

export default function OutletScreen() {
  // State
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  
  // Form Data
  const [formData, setFormData] = useState({
    nama: '',
    alamat: '',
    is_active: true,
  });

  useEffect(() => {
    loadOutlets();
  }, []);

  const loadOutlets = async () => {
    try {
      setLoading(true);
      const response = await ownerAPI.getOutlets();
      
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      
      if (response.data) {
        const rawData = Array.isArray(response.data) 
          ? response.data 
          : ((response.data as any).data || []);

        if (Array.isArray(rawData)) {
            const mappedOutlets = rawData.map((o: any) => ({
              id: o.id,
              nama: o.nama || 'Outlet Tanpa Nama',
              alamat: o.alamat || '-',
              // FIX: Menggunakan Strict Equality (===) agar ESLint happy
              is_active: o.is_active === 1 || o.is_active === '1' || o.is_active === true,
              users_count: o.users_count || 0
            }));
            setOutlets(mappedOutlets);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal memuat outlet');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOutlets();
  };

  const resetForm = () => {
    setFormData({ nama: '', alamat: '', is_active: true });
    setSelectedOutlet(null);
  };

  // --- ACTIONS ---

  const handleAdd = async () => {
    if (!formData.nama || !formData.alamat) {
      Alert.alert('Validasi', 'Nama dan alamat outlet harus diisi');
      return;
    }
    setProcessing(true);
    try {
      const response = await ownerAPI.createOutlet({
        nama: formData.nama,
        alamat: formData.alamat,
        is_active: formData.is_active,
      });
      if (response.error) Alert.alert('Gagal', response.error);
      else {
        Alert.alert('Sukses', 'Outlet berhasil ditambahkan');
        setShowAddModal(false);
        resetForm();
        loadOutlets();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal menambahkan outlet');
    } finally {
      setProcessing(false);
    }
  };

  const openEditModal = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setFormData({
      nama: outlet.nama,
      alamat: outlet.alamat,
      is_active: outlet.is_active,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedOutlet) return;
    if (!formData.nama || !formData.alamat) {
      Alert.alert('Validasi', 'Nama dan alamat harus diisi');
      return;
    }
    setProcessing(true);
    try {
      const response = await ownerAPI.updateOutlet(selectedOutlet.id, {
        nama: formData.nama,
        alamat: formData.alamat,
        is_active: formData.is_active,
      });
      if (response.error) Alert.alert('Gagal', response.error);
      else {
        Alert.alert('Sukses', 'Data outlet berhasil diperbarui');
        setShowEditModal(false);
        resetForm();
        loadOutlets();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mengupdate outlet');
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
          setLoading(true);
          try {
            const response = await ownerAPI.deleteOutlet(id);
            if (response.error) Alert.alert('Gagal', response.error);
            else {
              Alert.alert('Sukses', 'Outlet berhasil dihapus');
              loadOutlets();
            }
          } catch (error: any) {
            Alert.alert('Error', error.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const toggleStatus = async (outlet: Outlet) => {
    const updatedOutlets = outlets.map(o => 
        o.id === outlet.id ? { ...o, is_active: !o.is_active } : o
    );
    setOutlets(updatedOutlets);
    try {
        const response = await ownerAPI.updateOutlet(outlet.id, {
            nama: outlet.nama,
            alamat: outlet.alamat,
            is_active: !outlet.is_active
        });
        if (response.error) {
            loadOutlets(); 
            Alert.alert('Gagal', 'Gagal mengubah status outlet');
        }
    } catch (error) {
        console.error(error); 
        loadOutlets(); 
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER GREEN DNA */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Manajemen Cabang</Text>
          <Text style={styles.headerSubtitle}>Kelola lokasi dan operasional outlet</Text>
        </View>
        <View style={styles.headerIconBg}>
          <Ionicons name="storefront" size={28} color={Colors.primary} />
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
            <Text style={styles.sectionTitle}>Daftar Outlet</Text>
            <Text style={styles.sectionSubtitle}>{outlets.length} Cabang Terdaftar</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => { resetForm(); setShowAddModal(true); }}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Cabang Baru</Text>
          </TouchableOpacity>
        </View>

        {/* SUMMARY CARDS (Modern Grid) */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="business" size={20} color="#1565C0" />
            </View>
            <Text style={styles.summaryValue}>{outlets.length}</Text>
            <Text style={styles.summaryLabel}>Total Cabang</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#2E7D32" />
            </View>
            <Text style={styles.summaryValue}>{outlets.filter(o => o.is_active).length}</Text>
            <Text style={styles.summaryLabel}>Cabang Aktif</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Memuat data...</Text>
          </View>
        ) : (
          <View style={styles.listSection}>
            <FlatList
              data={outlets}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="storefront-outline" size={48} color="#E0E0E0" />
                  <Text style={styles.emptyText}>Belum ada outlet terdaftar.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={[styles.outletCard, !item.is_active && styles.outletCardInactive]}>
                  
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleSection}>
                      <Text style={styles.outletName}>{item.nama}</Text>
                      <View style={[
                        styles.statusPill, 
                        { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' }
                      ]}>
                        <View style={[
                          styles.statusDot, 
                          { backgroundColor: item.is_active ? '#4CAF50' : '#F44336' }
                        ]} />
                        <Text style={[
                          styles.statusText, 
                          { color: item.is_active ? '#2E7D32' : '#C62828' }
                        ]}>
                          {item.is_active ? 'Buka' : 'Tutup'}
                        </Text>
                      </View>
                    </View>
                    
                    <Switch
                        value={item.is_active}
                        onValueChange={() => toggleStatus(item)}
                        trackColor={{ false: '#e0e0e0', true: '#A5D6A7' }} 
                        thumbColor={item.is_active ? Colors.primary : '#f4f3f4'}
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                  </View>

                  {/* Card Body */}
                  <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                      <Text style={styles.infoText} numberOfLines={2}>{item.alamat}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
                      <Text style={styles.infoText}>{item.users_count || 0} Staff Bertugas</Text>
                    </View>
                  </View>

                  {/* Card Actions */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openEditModal(item)}
                    >
                      <Ionicons name="create-outline" size={18} color={Colors.primary} />
                      <Text style={styles.actionTextEdit}>Edit Info</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.verticalDivider} />
                    
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(item.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#D32F2F" />
                      <Text style={styles.actionTextDelete}>Hapus</Text>
                    </TouchableOpacity>
                  </View>

                </View>
              )}
            />
          </View>
        )}
      </ScrollView>

      {/* --- MODAL ADD / EDIT --- */}
      <Modal visible={showAddModal || showEditModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{showAddModal ? 'Tambah Outlet Baru' : 'Edit Data Outlet'}</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setShowEditModal(false); }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Outlet</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Es Teh Cabang Sudirman"
                  value={formData.nama}
                  onChangeText={(text) => setFormData({ ...formData, nama: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Alamat Lengkap</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Masukkan alamat lengkap outlet"
                  value={formData.alamat}
                  onChangeText={(text) => setFormData({ ...formData, alamat: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.switchContainer}>
                <View>
                  <Text style={styles.switchLabel}>Status Operasional</Text>
                  <Text style={styles.switchSubLabel}>Aktifkan jika outlet sudah buka</Text>
                </View>
                <Switch
                  value={formData.is_active}
                  onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                  trackColor={{ false: '#E0E0E0', true: '#A5D6A7' }}
                  thumbColor={formData.is_active ? Colors.primary : '#f4f3f4'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setShowAddModal(false); setShowEditModal(false); }}>
                <Text style={styles.btnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={showAddModal ? handleAdd : handleUpdate} disabled={processing}>
                {processing ? <ActivityIndicator color="white" /> : <Text style={styles.btnSaveText}>Simpan Data</Text>}
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
  
  // Header Green DNA
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 25,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: 'white', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  headerIconBg: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },

  content: { flex: 1, marginTop: 10, paddingHorizontal: 24 },

  // Action Bar
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  sectionSubtitle: { fontSize: 13, color: Colors.textSecondary },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 6 },
  addButtonText: { color: 'white', fontWeight: '700', fontSize: 13 },

  // Summary Grid
  summaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCard: { flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0', elevation: 1 },
  summaryIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  summaryValue: { fontSize: 20, fontWeight: '800', color: Colors.text },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary },

  loadingContainer: { paddingVertical: 50, alignItems: 'center' },
  loadingText: { marginTop: 10, color: Colors.textSecondary },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 10, color: Colors.textSecondary },

  // List Item (Clean Card)
  listSection: { paddingBottom: 20 },
  outletCard: { backgroundColor: 'white', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0', elevation: 1, overflow:'hidden' },
  outletCardInactive: { backgroundColor: '#FAFAFA', borderColor: '#EEEEEE' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 12 },
  cardTitleSection: { flex: 1, paddingRight: 10 },
  outletName: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  
  statusPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },

  cardBody: { paddingHorizontal: 16, paddingBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },

  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  verticalDivider: { width: 1, backgroundColor: '#F5F5F5' },
  actionTextEdit: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  actionTextDelete: { fontSize: 13, fontWeight: '700', color: '#D32F2F' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  modalBody: { marginBottom: 24 },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#FAFAFA' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, backgroundColor: '#FAFAFA', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EEEEEE' },
  switchLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  switchSubLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  modalFooter: { flexDirection: 'row', gap: 12 },
  btnCancel: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 12, backgroundColor: '#F5F5F5' },
  btnCancelText: { fontWeight: '700', color: '#757575' },
  btnSave: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.primary },
  btnSaveText: { fontWeight: '700', color: 'white' },
});