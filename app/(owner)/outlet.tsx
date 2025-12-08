import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { authAPI, ownerAPI } from '../../services/api';
import { Outlet } from '../../types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

export default function OutletScreen() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [formData, setFormData] = useState({
    nama: '',
    alamat: '',
    telepon: '',
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
        // Ensure response.data is an array
        const outletsData = Array.isArray(response.data) ? response.data : [];
        const mappedOutlets = outletsData.map((o: any) => ({
          id: o.id?.toString() || '',
          nama: o.nama || '',
          alamat: o.alamat || '',
          telepon: o.telepon || '',
          is_active: o.is_active !== false,
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
            router.replace('/(auth)/login' as any);
          },
        },
      ]
    );
    setShowProfileMenu(false);
  };

  const handleAdd = async () => {
    if (!formData.nama || !formData.alamat) {
      Alert.alert('Error', 'Nama dan alamat harus diisi');
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
        Alert.alert('Error', response.error);
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

  const handleEdit = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setFormData({
      nama: outlet.nama,
      alamat: outlet.alamat,
      telepon: outlet.telepon,
      is_active: outlet.is_active,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedOutlet || !formData.nama || !formData.alamat) {
      Alert.alert('Error', 'Nama dan alamat harus diisi');
      return;
    }

    setProcessing(true);
    try {
      const response = await ownerAPI.updateOutlet(parseInt(selectedOutlet.id), {
        nama: formData.nama,
        alamat: formData.alamat,
        is_active: formData.is_active,
      });

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      Alert.alert('Sukses', 'Outlet berhasil diupdate');
      setShowEditModal(false);
      resetForm();
      loadOutlets();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mengupdate outlet');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Konfirmasi',
      'Apakah Anda yakin ingin menghapus outlet ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await ownerAPI.deleteOutlet(parseInt(id));
              if (response.error) {
                Alert.alert('Error', response.error);
                return;
              }
              Alert.alert('Sukses', 'Outlet berhasil dihapus');
              loadOutlets();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Gagal menghapus outlet');
            }
          },
        },
      ]
    );
  };

  const toggleActive = async (outlet: Outlet) => {
    try {
      const response = await ownerAPI.updateOutlet(parseInt(outlet.id), {
        nama: outlet.nama,
        alamat: outlet.alamat,
        is_active: !outlet.is_active,
      });

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      loadOutlets();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mengubah status outlet');
    }
  };

  const resetForm = () => {
    setFormData({
      nama: '',
      alamat: '',
      telepon: '',
      is_active: true,
    });
    setSelectedOutlet(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="stats-chart" size={24} color={Colors.backgroundLight} />
            <Text style={styles.headerTitle}>Owner Panel</Text>
          </View>
          <TouchableOpacity style={styles.userInfo} onPress={() => setShowProfileMenu(true)} activeOpacity={0.7}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>OW</Text>
            </View>
            <View>
              <Text style={styles.userName}>Pak Owner</Text>
              <Text style={styles.userRole}>Pemilik</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={Colors.backgroundLight} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.titleSection}>
          <View>
            <Text style={styles.title}>Kelola Outlet</Text>
            <Text style={styles.subtitle}>
              Manajemen outlet dan informasi lokasi
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={20} color={Colors.backgroundLight} />
            <Text style={styles.addButtonText}>Tambah Outlet</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Memuat data...</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <Ionicons name="storefront-outline" size={32} color={Colors.primary} />
                <Text style={styles.summaryLabel}>Total Outlet</Text>
                <Text style={styles.summaryValue}>{outlets.length}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
                <Text style={styles.summaryLabel}>Aktif</Text>
                <Text style={styles.summaryValue}>
                  {outlets.filter(o => o.is_active).length}
                </Text>
              </View>
            </View>

            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>Daftar Outlet</Text>

              <FlatList
                data={outlets}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Tidak ada outlet</Text>
                  </View>
                }
                renderItem={({ item }) => (
              <View style={styles.outletCard}>
                <View style={styles.outletHeader}>
                  <View style={styles.outletInfo}>
                    <Text style={styles.outletName}>{item.nama}</Text>
                    <View style={styles.outletStatus}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: item.is_active ? Colors.success : Colors.error }
                      ]} />
                      <Text style={styles.statusText}>
                        {item.is_active ? 'Aktif' : 'Tidak Aktif'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.moreButton}
                    onPress={() => handleEdit(item)}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.outletDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={18} color={Colors.textSecondary} />
                    <Text style={styles.detailText}>{item.alamat}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={18} color={Colors.textSecondary} />
                    <Text style={styles.detailText}>{item.telepon}</Text>
                  </View>
                </View>

                <View style={styles.outletActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.toggleButton]}
                    onPress={() => toggleActive(item)}
                  >
                    <Ionicons
                      name={item.is_active ? "pause-circle-outline" : "play-circle-outline"}
                      size={18}
                      color={item.is_active ? Colors.warning : Colors.success}
                    />
                    <Text style={[
                      styles.actionButtonText,
                      { color: item.is_active ? Colors.warning : Colors.success }
                    ]}>
                      {item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleEdit(item)}
                  >
                    <Ionicons name="create-outline" size={18} color={Colors.primary} />
                    <Text style={[styles.actionButtonText, { color: Colors.primary }]}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <TouchableOpacity
          style={styles.profileModalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileMenu(false)}
        >
          <View style={styles.profileMenu}>
            <View style={styles.profileMenuHeader}>
              <View style={styles.profileMenuAvatar}>
                <Text style={styles.profileMenuAvatarText}>OW</Text>
              </View>
              <View>
                <Text style={styles.profileMenuName}>Pak Owner</Text>
                <Text style={styles.profileMenuRole}>Pemilik</Text>
              </View>
            </View>
            <View style={styles.profileMenuDivider} />
            <TouchableOpacity style={styles.profileMenuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              <Text style={styles.profileMenuItemText}>Keluar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Outlet</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Outlet</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan nama outlet"
                  value={formData.nama}
                  onChangeText={(text) => setFormData({ ...formData, nama: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Alamat</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Masukkan alamat"
                  value={formData.alamat}
                  onChangeText={(text) => setFormData({ ...formData, alamat: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Telepon</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan nomor telepon"
                  value={formData.telepon}
                  onChangeText={(text) => setFormData({ ...formData, telepon: text })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.inputLabel}>Status Aktif</Text>
                  <Switch
                    value={formData.is_active}
                    onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                    trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                    thumbColor={formData.is_active ? Colors.primary : Colors.textSecondary}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                disabled={processing}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, processing && styles.saveButtonDisabled]}
                onPress={handleAdd}
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
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Outlet</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Outlet</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan nama outlet"
                  value={formData.nama}
                  onChangeText={(text) => setFormData({ ...formData, nama: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Alamat</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Masukkan alamat"
                  value={formData.alamat}
                  onChangeText={(text) => setFormData({ ...formData, alamat: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Telepon</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan nomor telepon"
                  value={formData.telepon}
                  onChangeText={(text) => setFormData({ ...formData, telepon: text })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.inputLabel}>Status Aktif</Text>
                  <Switch
                    value={formData.is_active}
                    onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                    trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                    thumbColor={formData.is_active ? Colors.primary : Colors.textSecondary}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                disabled={processing}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, processing && styles.saveButtonDisabled]}
                onPress={handleUpdate}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color={Colors.backgroundLight} />
                ) : (
                  <Text style={styles.saveButtonText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: isSmallScreen ? 15 : 20,
    paddingHorizontal: isSmallScreen ? 15 : 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.backgroundLight,
    marginLeft: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.backgroundLight,
  },
  userRole: {
    fontSize: 12,
    color: Colors.backgroundLight,
    opacity: 0.8,
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'flex-end',
  },
  profileMenu: {
    backgroundColor: Colors.backgroundLight,
    margin: 20,
    borderRadius: 12,
    padding: 16,
  },
  profileMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileMenuAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  profileMenuAvatarText: {
    color: Colors.backgroundLight,
    fontWeight: 'bold',
  },
  profileMenuName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  profileMenuRole: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileMenuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
  },
  content: {
    flex: 1,
    padding: isSmallScreen ? 15 : 20,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: isSmallScreen ? 15 : 20,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 5,
    flex: 1,
    minWidth: '100%',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: Colors.backgroundLight,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 10,
    marginBottom: 5,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  listSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  outletCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  outletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  outletInfo: {
    flex: 1,
  },
  outletName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  outletStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  moreButton: {
    padding: 5,
  },
  outletDetails: {
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  outletActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 5,
  },
  toggleButton: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: Colors.error,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.backgroundLight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: Colors.backgroundLight,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.backgroundLight,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
});

