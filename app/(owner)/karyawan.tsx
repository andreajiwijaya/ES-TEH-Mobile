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
    role: 'karyawan' as 'karyawan' | 'gudang' | 'owner',
    outlet_id: '',
  });

  // --- LOAD DATA ---
  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [usersResponse, outletsResponse] = await Promise.all([
        ownerAPI.getUsers(),
        ownerAPI.getOutlets(),
      ]);

      if (usersResponse.data && Array.isArray(usersResponse.data)) {
        const mappedUsers: User[] = usersResponse.data.map((u: any) => ({
          id: u.id,
          username: u.username || 'Unknown',
          role: u.role || 'karyawan',
          outlet_id: u.outlet_id,
          outlet: u.outlet, 
        }));
        setEmployees(mappedUsers);
      }

      if (outletsResponse.data && Array.isArray(outletsResponse.data)) {
        setOutlets(outletsResponse.data);
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

  // --- HELPERS ---
  const getOutletName = (outletId?: number | null) => {
    if (!outletId) return '-';
    const outlet = outlets.find(o => o.id === outletId);
    return outlet ? outlet.nama : `Outlet #${outletId}`;
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'karyawan',
      outlet_id: '',
    });
    setSelectedEmployee(null);
  };

  // --- ACTIONS ---

  const handleAdd = async () => {
    if (!formData.username || !formData.password) {
      Alert.alert('Validasi', 'Username dan password wajib diisi');
      return;
    }

    setProcessing(true);
    try {
      const payload: any = {
        username: formData.username,
        password: formData.password,
        role: formData.role,
      };
      
      if (formData.outlet_id) {
        payload.outlet_id = parseInt(formData.outlet_id);
      }
      
      const response = await ownerAPI.createUser(payload);

      if (response.error) {
        Alert.alert('Gagal', response.error);
      } else {
        Alert.alert('Sukses', 'Karyawan berhasil ditambahkan');
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
      password: '', // Kosongkan password saat edit
      role: employee.role,
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
      const payload: any = {
        username: formData.username,
        role: formData.role,
      };
      
      // Kirim password hanya jika diisi (diganti)
      if (formData.password) {
        payload.password = formData.password;
      }
      
      if (formData.outlet_id) {
        payload.outlet_id = parseInt(formData.outlet_id);
      } else {
        payload.outlet_id = null; // Reset outlet jika kosong
      }

      const response = await ownerAPI.updateUser(selectedEmployee.id, payload);

      if (response.error) {
        Alert.alert('Gagal', response.error);
      } else {
        Alert.alert('Sukses', 'Data karyawan diperbarui');
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

  const handleDelete = (id: number) => {
    Alert.alert('Hapus Karyawan', 'Yakin ingin menghapus akun ini? Akses akan dicabut permanen.', [
      { text: 'Batal', style: 'cancel' },
      { 
        text: 'Hapus', 
        style: 'destructive', 
        onPress: async () => {
          setLoading(true); // Pakai loading screen utama biar aman
          try {
            const res = await ownerAPI.deleteUser(id);
            if (res.error) Alert.alert('Gagal', res.error);
            else {
              Alert.alert('Terhapus', 'Akun karyawan berhasil dihapus.');
              loadData(true);
            }
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="people" size={24} color={Colors.backgroundLight} />
            <Text style={styles.headerTitle}>Manajemen SDM</Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>OW</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.titleSection}>
          <View>
            <Text style={styles.title}>Daftar Karyawan</Text>
            <Text style={styles.subtitle}>Kelola akun & akses pegawai</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => { resetForm(); setShowAddModal(true); }}
          >
            <Ionicons name="person-add" size={18} color={Colors.backgroundLight} />
            <Text style={styles.addButtonText}>Tambah</Text>
          </TouchableOpacity>
        </View>

        {/* SUMMARY CARDS */}
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Ionicons name="people-outline" size={28} color={Colors.primary} />
            <Text style={styles.summaryLabel}>Total Staff</Text>
            <Text style={styles.summaryValue}>{employees.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="storefront-outline" size={28} color={Colors.success} />
            <Text style={styles.summaryLabel}>Outlet Staff</Text>
            <Text style={styles.summaryValue}>
              {employees.filter(e => e.role === 'karyawan').length}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="cube-outline" size={28} color={Colors.warning} />
            <Text style={styles.summaryLabel}>Gudang Staff</Text>
            <Text style={styles.summaryValue}>
              {employees.filter(e => e.role === 'gudang').length}
            </Text>
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
                  <Text style={styles.emptyText}>Belum ada data karyawan.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.employeeCard}>
                  <View style={styles.employeeHeader}>
                    <View style={[styles.avatarCircle, { 
                        backgroundColor: item.role === 'owner' ? Colors.primary : (item.role === 'gudang' ? Colors.warning : '#E0E0E0') 
                    }]}>
                      <Text style={styles.avatarLetter}>
                        {item.username.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.employeeInfo}>
                      <Text style={styles.employeeName}>{item.username}</Text>
                      <View style={{flexDirection:'row', alignItems:'center', marginTop: 2}}>
                        <View style={[
                            styles.roleBadge, 
                            { backgroundColor: item.role === 'owner' ? Colors.primary : (item.role === 'gudang' ? Colors.warning : Colors.success) }
                        ]}>
                            <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
                        </View>
                        {item.outlet_id && (
                            <Text style={styles.outletText}> • {getOutletName(item.outlet_id)}</Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.employeeActions}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.btnEdit]} 
                        onPress={() => openEditModal(item)}
                    >
                      <Ionicons name="create-outline" size={18} color={Colors.primary} />
                      <Text style={[styles.actionText, {color: Colors.primary}]}>Edit</Text>
                    </TouchableOpacity>
                    
                    {item.role !== 'owner' && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, styles.btnDelete]} 
                            onPress={() => handleDelete(item.id)}
                        >
                        <Ionicons name="trash-outline" size={18} color={Colors.error} />
                        <Text style={[styles.actionText, {color: Colors.error}]}>Hapus</Text>
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
      <Modal
        visible={showAddModal || showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowAddModal(false); setShowEditModal(false); }}
      >
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {showAddModal ? 'Tambah Karyawan Baru' : 'Edit Data Karyawan'}
              </Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setShowEditModal(false); }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan username"
                  value={formData.username}
                  onChangeText={(t) => setFormData({ ...formData, username: t })}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                    {showEditModal ? 'Password Baru (Opsional)' : 'Password'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={showEditModal ? "Kosongkan jika tidak diubah" : "Masukkan password"}
                  value={formData.password}
                  onChangeText={(t) => setFormData({ ...formData, password: t })}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Role Akses</Text>
                <View style={styles.roleContainer}>
                    {['karyawan', 'gudang', 'owner'].map((r) => (
                        <TouchableOpacity 
                            key={r}
                            style={[
                                styles.roleOption, 
                                formData.role === r && styles.roleOptionActive
                            ]}
                            onPress={() => setFormData({...formData, role: r as any})}
                        >
                            <Text style={[
                                styles.roleOptionText,
                                formData.role === r && styles.roleOptionTextActive
                            ]}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
              </View>

              {/* Outlet Selection hanya muncul jika role Karyawan */}
              {formData.role === 'karyawan' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Penempatan Outlet</Text>
                    <TouchableOpacity 
                        style={styles.selectButton}
                        onPress={() => setShowOutletModal(true)}
                    >
                        <Text style={styles.selectText}>
                            {formData.outlet_id ? getOutletName(parseInt(formData.outlet_id)) : 'Pilih Outlet'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={Colors.text} />
                    </TouchableOpacity>
                  </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setShowAddModal(false); setShowEditModal(false); }}
                disabled={processing}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveButton, processing && styles.disabledBtn]}
                onPress={showAddModal ? handleAdd : handleUpdate}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color={Colors.backgroundLight} />
                ) : (
                  <Text style={styles.saveButtonText}>Simpan</Text>
                )}
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
                    {outlets.length === 0 ? (
                        <Text style={{textAlign:'center', padding:20, color:'#999'}}>Belum ada data outlet.</Text>
                    ) : (
                        outlets.map((o) => (
                            <TouchableOpacity 
                                key={o.id} 
                                style={[
                                    styles.outletItem,
                                    formData.outlet_id === o.id.toString() && styles.outletItemSelected
                                ]}
                                onPress={() => {
                                    setFormData({...formData, outlet_id: o.id.toString()});
                                    setShowOutletModal(false);
                                }}
                            >
                                <Text style={styles.outletItemText}>{o.nama}</Text>
                                {formData.outlet_id === o.id.toString() && (
                                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            </View>
        </View>
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
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: 'bold', color: 'white', fontSize: 12 },

  content: { flex: 1, padding: 20 },
  titleSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary },
  
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 5 },
  addButtonText: { color: Colors.backgroundLight, fontSize: 12, fontWeight: '600' },

  // Summary
  summaryCards: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 15, alignItems: 'center', elevation: 2 },
  summaryLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 5, textAlign: 'center' },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginTop: 2 },

  loadingContainer: { paddingVertical: 50, alignItems: 'center' },
  loadingText: { marginTop: 10, color: Colors.textSecondary },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: Colors.textSecondary },

  // List Item
  listSection: { paddingBottom: 20 },
  employeeCard: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  employeeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatarCircle: { width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarLetter: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  employeeInfo: { flex: 1 },
  employeeName: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 5 },
  roleText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  outletText: { fontSize: 12, color: Colors.textSecondary },

  employeeActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10, gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 6, gap: 5 },
  btnEdit: { backgroundColor: '#F0F9FF' },
  btnDelete: { backgroundColor: '#FFF0F0' },
  actionText: { fontSize: 12, fontWeight: 'bold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.backgroundLight, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  modalBody: { marginBottom: 20 },

  inputGroup: { marginBottom: 15 },
  label: { fontWeight: '600', marginBottom: 8, color: Colors.text, fontSize: 14 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: 'white' },
  
  roleContainer: { flexDirection: 'row', gap: 10 },
  roleOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 8 },
  roleOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleOptionText: { color: Colors.textSecondary, fontWeight: '600' },
  roleOptionTextActive: { color: 'white' },

  selectButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, backgroundColor: 'white' },
  selectText: { fontSize: 16, color: Colors.text },

  modalFooter: { flexDirection: 'row', gap: 10 },
  cancelButton: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center', backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd' },
  cancelButtonText: { fontWeight: 'bold', color: '#666' },
  saveButton: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center', backgroundColor: Colors.primary },
  saveButtonText: { fontWeight: 'bold', color: 'white' },
  disabledBtn: { opacity: 0.7 },

  outletItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  outletItemSelected: { backgroundColor: '#F0F9FF' },
  outletItemText: { fontSize: 16, color: Colors.text },
});