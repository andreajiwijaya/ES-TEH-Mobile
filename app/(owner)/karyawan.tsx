import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Switch,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { User, Outlet } from '../../types';
import { ownerAPI } from '../../services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

export default function KaryawanScreen() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'karyawan' as 'karyawan' | 'gudang' | 'owner',
    outlet_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResponse, outletsResponse] = await Promise.all([
        ownerAPI.getUsers(),
        ownerAPI.getOutlets(),
      ]);

      if (usersResponse.error) {
        Alert.alert('Error', usersResponse.error);
      } else if (usersResponse.data) {
        // Ensure response.data is an array
        const usersData = Array.isArray(usersResponse.data) ? usersResponse.data : [];
        const mappedUsers = usersData.map((u: any) => ({
          id: u.id?.toString() || '',
          username: u.username || '',
          password: '***',
          role: u.role || 'karyawan',
          outlet_id: u.outlet_id?.toString() || '',
        }));
        setEmployees(mappedUsers);
      }

      if (outletsResponse.error) {
        Alert.alert('Error', outletsResponse.error);
      } else if (outletsResponse.data) {
        // Ensure response.data is an array
        const outletsData = Array.isArray(outletsResponse.data) ? outletsResponse.data : [];
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
      Alert.alert('Error', error.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getOutletName = (outletId?: string) => {
    if (!outletId) return 'Tidak Ada';
    const outlet = outlets.find(o => o.id === outletId);
    return outlet?.nama || 'Tidak Diketahui';
  };

  const handleAdd = async () => {
    if (!formData.username || !formData.password) {
      Alert.alert('Error', 'Username dan password harus diisi');
      return;
    }

    setProcessing(true);
    try {
      const userData: any = {
        username: formData.username,
        password: formData.password,
        role: formData.role,
      };
      
      // Only include outlet_id if provided
      if (formData.outlet_id) {
        userData.outlet_id = parseInt(formData.outlet_id);
      }
      
      const response = await ownerAPI.createUser(userData);

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      Alert.alert('Sukses', 'Karyawan berhasil ditambahkan');
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal menambahkan karyawan');
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = (employee: User) => {
    setSelectedEmployee(employee);
    setFormData({
      username: employee.username,
      password: '',
      role: employee.role,
      outlet_id: employee.outlet_id || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedEmployee || !formData.username) {
      Alert.alert('Error', 'Username harus diisi');
      return;
    }

    setProcessing(true);
    try {
      const updateData: any = {
        username: formData.username,
        role: formData.role,
      };
      
      if (formData.password) {
        updateData.password = formData.password;
      }
      
      if (formData.outlet_id) {
        updateData.outlet_id = parseInt(formData.outlet_id);
      }

      const response = await ownerAPI.updateUser(parseInt(selectedEmployee.id), updateData);

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      Alert.alert('Sukses', 'Karyawan berhasil diupdate');
      setShowEditModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mengupdate karyawan');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Konfirmasi',
      'Apakah Anda yakin ingin menghapus karyawan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await ownerAPI.deleteUser(parseInt(id));
              if (response.error) {
                Alert.alert('Error', response.error);
                return;
              }
              Alert.alert('Sukses', 'Karyawan berhasil dihapus');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Gagal menghapus karyawan');
            }
          },
        },
      ]
    );
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="stats-chart" size={24} color={Colors.backgroundLight} />
            <Text style={styles.headerTitle}>Owner Panel</Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>OW</Text>
            </View>
            <View>
              <Text style={styles.userName}>Pak Owner</Text>
              <Text style={styles.userRole}>Pemilik</Text>
            </View>
          </View>
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
            <Text style={styles.title}>Kelola Karyawan</Text>
            <Text style={styles.subtitle}>
              Manajemen akun karyawan dan staff
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={20} color={Colors.backgroundLight} />
            <Text style={styles.addButtonText}>Tambah Karyawan</Text>
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
                <Ionicons name="people-outline" size={32} color={Colors.primary} />
                <Text style={styles.summaryLabel}>Total Karyawan</Text>
                <Text style={styles.summaryValue}>{employees.length}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="storefront-outline" size={32} color={Colors.success} />
                <Text style={styles.summaryLabel}>Karyawan Aktif</Text>
                <Text style={styles.summaryValue}>{employees.length}</Text>
              </View>
            </View>

            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>Daftar Karyawan</Text>

              <FlatList
                data={employees}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Tidak ada karyawan</Text>
                  </View>
                }
                renderItem={({ item }) => (
              <View style={styles.employeeCard}>
                <View style={styles.employeeHeader}>
                  <View style={styles.employeeAvatar}>
                    <Text style={styles.employeeAvatarText}>
                      {item.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>{item.username}</Text>
                    <Text style={styles.employeeRole}>
                      {item.role === 'karyawan' ? 'Karyawan' : item.role === 'gudang' ? 'Staff Gudang' : 'Owner'}
                    </Text>
                    <Text style={styles.employeeOutlet}>
                      {getOutletName(item.outlet_id)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.moreButton}
                    onPress={() => handleEdit(item)}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.employeeActions}>
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
                    <Text style={[styles.actionButtonText, { color: Colors.error }]}>
                      Hapus
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
          </>
        )}
      </ScrollView>

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
              <Text style={styles.modalTitle}>Tambah Karyawan</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan username"
                  value={formData.username}
                  onChangeText={(text) => setFormData({ ...formData, username: text })}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan password"
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Role</Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.role === 'karyawan' && styles.roleButtonActive
                    ]}
                    onPress={() => setFormData({ ...formData, role: 'karyawan' })}
                  >
                    <Text style={[
                      styles.roleButtonText,
                      formData.role === 'karyawan' && styles.roleButtonTextActive
                    ]}>
                      Karyawan
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.role === 'gudang' && styles.roleButtonActive
                    ]}
                    onPress={() => setFormData({ ...formData, role: 'gudang' })}
                  >
                    <Text style={[
                      styles.roleButtonText,
                      formData.role === 'gudang' && styles.roleButtonTextActive
                    ]}>
                      Gudang
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Outlet</Text>
                <TouchableOpacity 
                  style={styles.selectButton}
                  onPress={() => setShowOutletModal(true)}
                >
                  <Text style={styles.selectButtonText}>
                    {formData.outlet_id ? getOutletName(formData.outlet_id) : 'Pilih Outlet'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
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
              <Text style={styles.modalTitle}>Edit Karyawan</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan username"
                  value={formData.username}
                  onChangeText={(text) => setFormData({ ...formData, username: text })}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password Baru (kosongkan jika tidak diubah)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan password baru"
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Role</Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.role === 'karyawan' && styles.roleButtonActive
                    ]}
                    onPress={() => setFormData({ ...formData, role: 'karyawan' })}
                  >
                    <Text style={[
                      styles.roleButtonText,
                      formData.role === 'karyawan' && styles.roleButtonTextActive
                    ]}>
                      Karyawan
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.role === 'gudang' && styles.roleButtonActive
                    ]}
                    onPress={() => setFormData({ ...formData, role: 'gudang' })}
                  >
                    <Text style={[
                      styles.roleButtonText,
                      formData.role === 'gudang' && styles.roleButtonTextActive
                    ]}>
                      Gudang
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Outlet</Text>
                <TouchableOpacity 
                  style={styles.selectButton}
                  onPress={() => setShowOutletModal(true)}
                >
                  <Text style={styles.selectButtonText}>
                    {formData.outlet_id ? getOutletName(formData.outlet_id) : 'Pilih Outlet'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
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

      {/* Outlet Selection Modal */}
      <Modal
        visible={showOutletModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOutletModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Outlet</Text>
              <TouchableOpacity onPress={() => setShowOutletModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {outlets.map((outlet) => (
                <TouchableOpacity
                  key={outlet.id}
                  style={[
                    styles.outletOption,
                    formData.outlet_id === outlet.id && styles.outletOptionSelected,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, outlet_id: outlet.id });
                    setShowOutletModal(false);
                  }}
                >
                  <Text style={styles.outletOptionText}>{outlet.nama}</Text>
                  {formData.outlet_id === outlet.id && (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} />
                  )}
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
  employeeCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  employeeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  employeeAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primaryDark,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  employeeRole: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  employeeOutlet: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  moreButton: {
    padding: 5,
  },
  employeeActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
  roleButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  roleButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: Colors.primaryDark,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 15,
    backgroundColor: Colors.backgroundLight,
  },
  selectButtonText: {
    fontSize: 16,
    color: Colors.text,
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
  outletOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  outletOptionSelected: {
    backgroundColor: Colors.primaryLight + '20',
  },
  outletOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
});

