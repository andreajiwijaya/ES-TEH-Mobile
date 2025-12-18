import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { authAPI, ownerAPI } from '../../services/api';
import { Outlet } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OutletScreen() {
  const router = useRouter();
  
  // State
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState({
    nama: '',
    alamat: '',
    is_active: true,
  });

  useEffect(() => {
    loadUserData();
    loadOutlets();
  }, []);

  const loadUserData = async () => {
    const userData = await AsyncStorage.getItem('@user_data');
    if (userData) setUser(JSON.parse(userData));
  };

  const loadOutlets = async () => {
    try {
      setLoading(true);
      const response = await ownerAPI.getOutlets();
      
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      
      if (response.data && Array.isArray(response.data)) {
        const mappedOutlets = response.data.map((o: any) => ({
          id: o.id,
          nama: o.nama || 'Outlet Tanpa Nama',
          alamat: o.alamat || '-',
          is_active: o.is_active !== false,
          users_count: o.users_count || 0
        }));
        setOutlets(mappedOutlets);
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

  const handleLogout = async () => {
    Alert.alert(
      'Keluar',
      'Apakah Anda yakin ingin keluar?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            await authAPI.logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
    setShowProfileMenu(false);
  };

  const resetForm = () => {
    setFormData({
      nama: '',
      alamat: '',
      is_active: true,
    });
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

      if (response.error) {
        Alert.alert('Gagal', response.error);
        return;
      }

      Alert.alert('Sukses', 'Outlet berhasil ditambahkan');
      setShowAddModal(false);
      resetForm();
      loadOutlets();
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

      if (response.error) {
        Alert.alert('Gagal', response.error);
        return;
      }

      Alert.alert('Sukses', 'Data outlet berhasil diperbarui');
      setShowEditModal(false);
      resetForm();
      loadOutlets();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mengupdate outlet');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Hapus Outlet',
      'Yakin ingin menghapus outlet ini? Data terkait mungkin juga akan terhapus.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await ownerAPI.deleteOutlet(id);
              if (response.error) {
                Alert.alert('Gagal', response.error);
                return;
              }
              Alert.alert('Sukses', 'Outlet berhasil dihapus');
              loadOutlets();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const toggleStatus = async (outlet: Outlet) => {
    // Optimistic update
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
            loadOutlets(); // Revert jika error
            Alert.alert('Gagal', 'Gagal mengubah status outlet');
        }
    } catch (error) {
        console.error(error); // Log error agar variabel terpakai
        loadOutlets(); // Revert
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="storefront" size={24} color={Colors.backgroundLight} />
            <Text style={styles.headerTitle}>Manajemen Cabang</Text>
          </View>
          <TouchableOpacity style={styles.userInfo} onPress={() => setShowProfileMenu(true)} activeOpacity={0.7}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.username ? user.username.substring(0, 2).toUpperCase() : 'OW'}
              </Text>
            </View>
            <View>
              <Text style={styles.userName}>{user?.username || 'Owner'}</Text>
              <Text style={styles.userRole}>Pemilik</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={Colors.backgroundLight} style={{ marginLeft: 6 }} />
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
            <Text style={styles.title}>Daftar Outlet</Text>
            <Text style={styles.subtitle}>Kelola lokasi dan status cabang</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => { resetForm(); setShowAddModal(true); }}
          >
            <Ionicons name="add-circle" size={20} color={Colors.backgroundLight} />
            <Text style={styles.addButtonText}>Tambah</Text>
          </TouchableOpacity>
        </View>

        {/* SUMMARY CARDS */}
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Ionicons name="storefront-outline" size={32} color={Colors.primary} />
            <Text style={styles.summaryLabel}>Total Outlet</Text>
            <Text style={styles.summaryValue}>{outlets.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="checkmark-circle-outline" size={32} color={Colors.success} />
            <Text style={styles.summaryLabel}>Cabang Aktif</Text>
            <Text style={styles.summaryValue}>
              {outlets.filter(o => o.is_active).length}
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
              data={outlets}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Belum ada outlet terdaftar.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={[styles.outletCard, !item.is_active && styles.outletCardInactive]}>
                  <View style={styles.outletHeader}>
                    <View style={styles.outletInfo}>
                      <Text style={styles.outletName}>{item.nama}</Text>
                      <View style={styles.outletStatusRow}>
                          <View style={[
                            styles.statusDot, 
                            { backgroundColor: item.is_active ? Colors.success : Colors.error }
                          ]} />
                          <Text style={styles.statusText}>
                            {item.is_active ? 'Beroperasi' : 'Tutup Sementara'}
                          </Text>
                      </View>
                    </View>
                    
                    <Switch
                        value={item.is_active}
                        onValueChange={() => toggleStatus(item)}
                        trackColor={{ false: '#e0e0e0', true: Colors.primaryLight }}
                        thumbColor={item.is_active ? Colors.primary : '#f4f3f4'}
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.outletDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                      <Text style={styles.detailText}>{item.alamat}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
                      <Text style={styles.detailText}>{item.users_count || 0} Staff Terdaftar</Text>
                    </View>
                  </View>

                  <View style={styles.outletActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => openEditModal(item)}
                    >
                      <Ionicons name="create-outline" size={16} color={Colors.primary} />
                      <Text style={[styles.actionButtonText, { color: Colors.primary }]}>Edit Info</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDelete(item.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color={Colors.error} />
                      <Text style={[styles.actionButtonText, { color: Colors.error }]}>Hapus</Text>
                    </TouchableOpacity>
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
                {showAddModal ? 'Registrasi Outlet Baru' : 'Edit Informasi Outlet'}
              </Text>
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
                <Text style={styles.inputLabel}>Status Operasional</Text>
                <Switch
                  value={formData.is_active}
                  onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                  thumbColor={formData.is_active ? Colors.primary : '#f4f3f4'}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => { setShowAddModal(false); setShowEditModal(false); }}
                disabled={processing}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, processing && styles.saveButtonDisabled]}
                onPress={showAddModal ? handleAdd : handleUpdate}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color={Colors.backgroundLight} />
                ) : (
                  <Text style={styles.saveButtonText}>Simpan Data</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Profile Menu */}
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
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: 'bold', color: Colors.primary },
  userName: { fontSize: 14, fontWeight: 'bold', color: 'white' },
  userRole: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  content: { flex: 1, padding: 20 },
  titleSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary },
  
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, gap: 5 },
  addButtonText: { color: Colors.backgroundLight, fontSize: 14, fontWeight: '600' },

  summaryCards: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  summaryCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 15, alignItems: 'center', elevation: 2 },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 5 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: Colors.text },

  loadingContainer: { paddingVertical: 50, alignItems: 'center' },
  loadingText: { marginTop: 10, color: Colors.textSecondary, fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: Colors.textSecondary, fontSize: 16 },

  // List Item
  listSection: { paddingBottom: 20 },
  outletCard: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: 'transparent' },
  outletCardInactive: { opacity: 0.8, backgroundColor: '#F9F9F9' },
  
  outletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  outletInfo: { flex: 1 },
  outletName: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  outletStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, color: Colors.textSecondary },

  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  
  outletDetails: { marginBottom: 15, gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: Colors.text },

  outletActions: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 5, borderWidth: 1 },
  editButton: { borderColor: Colors.primary, backgroundColor: '#F0F9FF' },
  deleteButton: { borderColor: Colors.error, backgroundColor: '#FFF0F0' },
  actionButtonText: { fontSize: 12, fontWeight: 'bold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.backgroundLight, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  modalBody: { marginBottom: 20 },

  inputGroup: { marginBottom: 15 },
  inputLabel: { fontWeight: '600', marginBottom: 8, color: Colors.text, fontSize: 14 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: 'white' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },

  modalFooter: { flexDirection: 'row', gap: 10 },
  modalButton: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd' },
  cancelButtonText: { fontWeight: 'bold', color: '#666' },
  saveButton: { backgroundColor: Colors.primary },
  saveButtonText: { fontWeight: 'bold', color: 'white' },
  saveButtonDisabled: { opacity: 0.7 },

  // Profile Menu
  profileModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 20 },
  profileMenu: { backgroundColor: 'white', borderRadius: 12, minWidth: 160, padding: 5, elevation: 8 },
  profileMenuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  profileMenuItemText: { color: Colors.error, fontWeight: 'bold' },
});