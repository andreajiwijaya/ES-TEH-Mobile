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
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { User, Outlet } from '../../types';
import { ownerAPI } from '../../services/api';

export default function KaryawanScreen() {
  // State
  const [employees, setEmployees] = useState<User[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  
  // Form Data
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'karyawan' as 'karyawan' | 'gudang',
    outlet_id: '',
  });

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [usersResponse, outletsResponse] = await Promise.all([
        ownerAPI.getUsers(),
        ownerAPI.getOutlets(),
      ]);

      if (usersResponse.data) {
        const rawUsers = Array.isArray(usersResponse.data) 
          ? usersResponse.data 
          : ((usersResponse.data as any).data || []);

        if (Array.isArray(rawUsers)) {
            const mappedUsers: User[] = rawUsers.map((u: any) => ({
              id: u.id,
              username: u.username || 'Unknown',
              role: u.role || 'karyawan',
              outlet_id: u.outlet_id,
              outlet: u.outlet, 
            }));
            setEmployees(mappedUsers);
        }
      }

      if (outletsResponse.data) {
        const rawOutlets = Array.isArray(outletsResponse.data) 
          ? outletsResponse.data 
          : ((outletsResponse.data as any).data || []);
        if (Array.isArray(rawOutlets)) setOutlets(rawOutlets);
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

  // Helpers
  const getOutletName = (outletId?: number | null) => {
    if (!outletId) return '-';
    const outlet = outlets.find(o => o.id === outletId);
    return outlet ? outlet.nama : `Outlet #${outletId}`;
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', role: 'karyawan', outlet_id: '' });
    setSelectedEmployee(null);
  };

  // Actions
  const handleAdd = async () => {
    if (!formData.username || !formData.password) {
      Alert.alert('Validasi', 'Username dan password wajib diisi');
      return;
    }
    setProcessing(true);
    try {
      const payload: any = { username: formData.username, password: formData.password, role: formData.role };
      if (formData.outlet_id) payload.outlet_id = parseInt(formData.outlet_id);
      
      const response = await ownerAPI.createUser(payload);
      if (response.error) Alert.alert('Gagal', response.error);
      else {
        Alert.alert('Sukses', 'User berhasil ditambahkan');
        setShowAddModal(false);
        resetForm();
        loadData(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setProcessing(false);
    }
  };

  const openEditModal = (employee: User) => {
    setSelectedEmployee(employee);
    setFormData({
      username: employee.username,
      password: '', 
      role: employee.role as any,
      outlet_id: employee.outlet_id ? employee.outlet_id.toString() : '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedEmployee) return;
    if (!formData.username) {
      Alert.alert('Validasi', 'Username tidak boleh kosong');
      return;
    }
    setProcessing(true);
    try {
      const payload: any = { username: formData.username, role: formData.role };
      if (formData.password) payload.password = formData.password;
      if (formData.outlet_id) payload.outlet_id = parseInt(formData.outlet_id);
      else payload.outlet_id = null;

      const response = await ownerAPI.updateUser(selectedEmployee.id, payload);
      if (response.error) Alert.alert('Gagal', response.error);
      else {
        Alert.alert('Sukses', 'Data user diperbarui');
        setShowEditModal(false);
        resetForm();
        loadData(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setProcessing(false);
    }
  };

  // --- LOGIC HAPUS (FIXED FOR WEB & MOBILE) ---
  const executeDelete = async (id: number) => {
    setLoading(true);
    try {
      const res = await ownerAPI.deleteUser(id);
      if (res.error) {
        Alert.alert('Gagal', res.error);
      } else {
        if (Platform.OS !== 'web') {
            Alert.alert('Terhapus', 'Akun berhasil dihapus.');
        }
        loadData(true);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    if (Platform.OS === 'web') {
        // Confirm khusus Web
        if (window.confirm('Yakin ingin menghapus akun ini? Akses akan dicabut permanen.')) {
            executeDelete(id);
        }
    } else {
        // Alert khusus Android/iOS
        Alert.alert('Hapus User', 'Yakin ingin menghapus akun ini?', [
            { text: 'Batal', style: 'cancel' },
            { 
                text: 'Hapus', 
                style: 'destructive', 
                onPress: () => executeDelete(id)
            }
        ]);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER GREEN DNA */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Manajemen SDM</Text>
          <Text style={styles.headerSubtitle}>Kelola akun pegawai & akses sistem</Text>
        </View>
        <View style={styles.headerIconBg}>
          <Ionicons name="people" size={28} color={Colors.primary} />
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
            <Text style={styles.sectionTitle}>Daftar User Aktif</Text>
            <Text style={styles.sectionSubtitle}>{employees.length} Akun Terdaftar</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => { resetForm(); setShowAddModal(true); }}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>User Baru</Text>
          </TouchableOpacity>
        </View>

        {/* SUMMARY CARDS (Modern Grid) */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="storefront" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.summaryValue}>{employees.filter(e => e.role === 'karyawan').length}</Text>
            <Text style={styles.summaryLabel}>Outlet Staff</Text>
          </View>
          
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="cube" size={20} color={Colors.warning} />
            </View>
            <Text style={styles.summaryValue}>{employees.filter(e => e.role === 'gudang').length}</Text>
            <Text style={styles.summaryLabel}>Gudang Staff</Text>
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
              data={employees}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color="#E0E0E0" />
                  <Text style={styles.emptyText}>Belum ada data user.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.employeeCard}>
                  <View style={styles.cardMain}>
                    <View style={styles.avatarContainer}>
                      <View style={[
                        styles.avatarCircle, 
                        { backgroundColor: item.role === 'owner' ? Colors.primary : (item.role === 'gudang' ? '#FFAB00' : '#81C784') }
                      ]}>
                        <Text style={styles.avatarLetter}>{item.username.charAt(0).toUpperCase()}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.infoContainer}>
                      <Text style={styles.employeeName}>{item.username}</Text>
                      <View style={styles.roleRow}>
                        <View style={[
                          styles.roleBadge, 
                          { backgroundColor: item.role === 'owner' ? '#E8F5E9' : (item.role === 'gudang' ? '#FFF8E1' : '#F1F8E9') }
                        ]}>
                          <Text style={[
                            styles.roleText,
                            { color: item.role === 'owner' ? Colors.primary : (item.role === 'gudang' ? '#FF8F00' : '#2E7D32') }
                          ]}>
                            {item.role.toUpperCase()}
                          </Text>
                        </View>
                        
                        {item.outlet_id && (
                          <View style={styles.locationBadge}>
                            <Ionicons name="location-outline" size={12} color="#757575" />
                            <Text style={styles.locationText}>{getOutletName(item.outlet_id)}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
                      <Ionicons name="create-outline" size={18} color={Colors.primary} />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    
                    {item.role !== 'owner' && (
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                        <Ionicons name="trash-outline" size={18} color="#D32F2F" />
                      </TouchableOpacity>
                    )}
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
              <Text style={styles.modalTitle}>{showAddModal ? 'Tambah User Baru' : 'Edit Data User'}</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setShowEditModal(false); }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput style={styles.input} placeholder="Contoh: kasir_sudirman" value={formData.username} onChangeText={(t) => setFormData({ ...formData, username: t })} autoCapitalize="none" />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{showEditModal ? 'Password Baru (Opsional)' : 'Password'}</Text>
                <TextInput style={styles.input} placeholder={showEditModal ? "Kosongkan jika tidak diubah" : "Masukkan password"} value={formData.password} onChangeText={(t) => setFormData({ ...formData, password: t })} secureTextEntry />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Role Akses</Text>
                <View style={styles.roleGrid}>
                  {['karyawan', 'gudang'].map((r) => (
                    <TouchableOpacity key={r} style={[styles.roleCard, formData.role === r && styles.roleCardActive]} onPress={() => setFormData({...formData, role: r as any})}>
                      <Ionicons name={r === 'karyawan' ? 'storefront' : 'cube'} size={24} color={formData.role === r ? Colors.primary : '#BDBDBD'} />
                      <Text style={[styles.roleCardText, formData.role === r && styles.roleCardTextActive]}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {formData.role === 'karyawan' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Penempatan Outlet</Text>
                  <TouchableOpacity style={styles.selectButton} onPress={() => setShowOutletModal(true)}>
                    <Text style={styles.selectText}>{formData.outlet_id ? getOutletName(parseInt(formData.outlet_id)) : 'Pilih Outlet'}</Text>
                    <Ionicons name="chevron-down" size={20} color={Colors.text} />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setShowAddModal(false); setShowEditModal(false); }}>
                <Text style={styles.btnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={showAddModal ? handleAdd : handleUpdate} disabled={processing}>
                {processing ? <ActivityIndicator color="white" /> : <Text style={styles.btnSaveText}>Simpan</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- MODAL PILIH OUTLET --- */}
      <Modal visible={showOutletModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, {maxHeight: '60%'}]}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Pilih Outlet</Text>
                    <TouchableOpacity onPress={() => setShowOutletModal(false)}>
                        <Ionicons name="close" size={24} color={Colors.text} />
                    </TouchableOpacity>
                </View>
                <ScrollView>
                    {outlets.map((o) => (
                        <TouchableOpacity key={o.id} style={[styles.outletItem, formData.outlet_id === o.id.toString() && styles.outletItemActive]} onPress={() => { setFormData({...formData, outlet_id: o.id.toString()}); setShowOutletModal(false); }}>
                            <Text style={[styles.outletItemText, formData.outlet_id === o.id.toString() && {color: Colors.primary, fontWeight:'bold'}]}>{o.nama}</Text>
                            {formData.outlet_id === o.id.toString() && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
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

  // Employee Card
  listSection: { paddingBottom: 20 },
  employeeCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0', elevation: 1 },
  cardMain: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarContainer: { marginRight: 16 },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  infoContainer: { flex: 1 },
  employeeName: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  
  roleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleText: { fontSize: 11, fontWeight: '700' },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: '#757575' },

  actionRow: { flexDirection: 'row', gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F9FF', paddingVertical: 10, borderRadius: 8, gap: 6 },
  editBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  // FIX: Tombol delete diberi style yang lebih jelas (width & height fix) agar mudah ditekan
  deleteBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFEBEE', borderRadius: 8 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  modalBody: { marginBottom: 24 },
  
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#FAFAFA' },
  
  roleGrid: { flexDirection: 'row', gap: 12 },
  roleCard: { flex: 1, padding: 16, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, alignItems: 'center', gap: 8 },
  roleCardActive: { borderColor: Colors.primary, backgroundColor: '#F0F9FF' },
  roleCardText: { fontWeight: '600', color: '#9E9E9E' },
  roleCardTextActive: { color: Colors.primary },

  selectButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, backgroundColor: '#FAFAFA' },
  selectText: { fontSize: 15, color: Colors.text },

  modalFooter: { flexDirection: 'row', gap: 12 },
  btnCancel: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 12, backgroundColor: '#F5F5F5' },
  btnCancelText: { fontWeight: '700', color: '#757575' },
  btnSave: { flex: 1, padding: 16, alignItems: 'center', borderRadius: 12, backgroundColor: Colors.primary },
  btnSaveText: { fontWeight: '700', color: 'white' },

  outletItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  outletItemActive: { backgroundColor: '#F0F9FF' },
  outletItemText: { fontSize: 15, color: Colors.text },
});