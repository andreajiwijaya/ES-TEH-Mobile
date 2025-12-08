import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { BarangMasuk, Bahan } from '../../types';
import { gudangAPI, authAPI } from '../../services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface IncomingGoodsItem extends BarangMasuk {
  bahan: Bahan;
}

export default function BarangMasukScreen() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBahanModal, setShowBahanModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedBahan, setSelectedBahan] = useState<Bahan | null>(null);
  const [bahanList, setBahanList] = useState<Bahan[]>([]);
  const [incomingGoods, setIncomingGoods] = useState<IncomingGoodsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [jumlah, setJumlah] = useState('');
  const [suplier, setSuplier] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [barangMasukResponse, bahanResponse] = await Promise.all([
        gudangAPI.getBarangMasuk(),
        gudangAPI.getBahan(),
      ]);

      if (barangMasukResponse.error) {
        Alert.alert('Error', barangMasukResponse.error);
      } else if (barangMasukResponse.data) {
        // Ensure response.data is an array
        const barangMasukData = Array.isArray(barangMasukResponse.data) ? barangMasukResponse.data : [];
        const mappedItems = barangMasukData.map((item: any) => ({
          id: item.id?.toString() || '',
          gudang_id: item.gudang_id?.toString() || '',
          bahan_id: item.bahan_id?.toString() || '',
          jumlah: item.jumlah || 0,
          tanggal: new Date(item.tanggal),
          suplier: item.supplier || item.suplier || '',
          bahan: {
            id: item.bahan?.id?.toString() || '',
            nama: item.bahan?.nama || 'Unknown',
            satuan: item.bahan?.satuan || '',
            stok_minimum_gudang: item.bahan?.stok_minimum_gudang || 0,
            stok_minimum_outlet: item.bahan?.stok_minimum_outlet || 0,
          },
        }));
        setIncomingGoods(mappedItems);
      }

      if (bahanResponse.error) {
        Alert.alert('Error', bahanResponse.error);
      } else if (bahanResponse.data) {
        // Ensure response.data is an array
        const bahanData = Array.isArray(bahanResponse.data) ? bahanResponse.data : [];
        const mappedBahan = bahanData.map((b: any) => ({
          id: b.id?.toString() || '',
          nama: b.nama || '',
          satuan: b.satuan || '',
          stok_minimum_gudang: b.stok_minimum_gudang || 0,
          stok_minimum_outlet: b.stok_minimum_outlet || 0,
        }));
        setBahanList(mappedBahan);
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

  const handleLogout = async () => {
    Alert.alert(
      'Keluar',
      'Apakah Anda yakin ingin keluar?',
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleAdd = async () => {
    if (!selectedBahan || !jumlah || !suplier) {
      Alert.alert('Error', 'Semua field harus diisi');
      return;
    }

    setProcessing(true);
    try {
      const response = await gudangAPI.createBarangMasuk({
        bahan_id: parseInt(selectedBahan.id),
        jumlah: parseFloat(jumlah),
        supplier: suplier,
      });

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      Alert.alert('Sukses', 'Barang masuk berhasil dicatat');
      setShowAddModal(false);
      setSelectedBahan(null);
      setJumlah('');
      setSuplier('');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mencatat barang masuk');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="cube" size={24} color={Colors.backgroundLight} />
            <Text style={styles.headerTitle}>Gudang Favorit</Text>
          </View>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => setShowProfileMenu(true)}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>SF</Text>
            </View>
            <View>
              <Text style={styles.userName}>Staff Gudang</Text>
              <Text style={styles.userRole}>Pusat</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={Colors.backgroundLight} style={styles.chevronIcon} />
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
            <Text style={styles.title}>Barang Masuk</Text>
            <Text style={styles.subtitle}>
              Catat barang yang masuk ke gudang
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={20} color={Colors.backgroundLight} />
            <Text style={styles.addButtonText}>Catat Barang Masuk</Text>
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
                <Ionicons name="arrow-down-circle" size={32} color={Colors.primary} />
                <Text style={styles.summaryLabel}>Total Masuk Hari Ini</Text>
                <Text style={styles.summaryValue}>
                  {incomingGoods.filter(item => {
                    const today = new Date();
                    return new Date(item.tanggal).toDateString() === today.toDateString();
                  }).length} Item
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="calendar-outline" size={32} color={Colors.success} />
                <Text style={styles.summaryLabel}>Total Bulan Ini</Text>
                <Text style={styles.summaryValue}>{incomingGoods.length} Item</Text>
              </View>
            </View>

            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>Riwayat Barang Masuk</Text>

              <FlatList
                data={incomingGoods}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Tidak ada barang masuk</Text>
                  </View>
                }
                renderItem={({ item }) => (
              <View style={styles.goodsCard}>
                <View style={styles.goodsHeader}>
                  <View>
                    <Text style={styles.goodsId}>{item.id}</Text>
                    <Text style={styles.goodsDate}>{formatDate(item.tanggal)}</Text>
                  </View>
                  <View style={styles.goodsStatus}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                    <Text style={styles.goodsStatusText}>Tercatat</Text>
                  </View>
                </View>

                <View style={styles.goodsDetails}>
                  <View style={styles.goodsDetailRow}>
                    <Text style={styles.goodsDetailLabel}>Bahan:</Text>
                    <Text style={styles.goodsDetailValue}>{item.bahan.nama}</Text>
                  </View>
                  <View style={styles.goodsDetailRow}>
                    <Text style={styles.goodsDetailLabel}>Jumlah:</Text>
                    <Text style={styles.goodsDetailValue}>
                      {item.jumlah} {item.bahan.satuan}
                    </Text>
                  </View>
                  <View style={styles.goodsDetailRow}>
                    <Text style={styles.goodsDetailLabel}>Supplier:</Text>
                    <Text style={styles.goodsDetailValue}>{item.suplier}</Text>
                  </View>
                </View>

                <View style={styles.goodsActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="eye-outline" size={18} color={Colors.primary} />
                    <Text style={styles.actionButtonText}>Detail</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="create-outline" size={18} color={Colors.warning} />
                    <Text style={styles.actionButtonText}>Edit</Text>
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
              <Text style={styles.modalTitle}>Catat Barang Masuk</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pilih Bahan</Text>
                <TouchableOpacity 
                  style={styles.selectButton}
                  onPress={() => setShowBahanModal(true)}
                >
                  <Text style={styles.selectButtonText}>
                    {selectedBahan ? selectedBahan.nama : 'Pilih Bahan'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Jumlah</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan jumlah"
                  value={jumlah}
                  onChangeText={setJumlah}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Supplier</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nama supplier"
                  value={suplier}
                  onChangeText={setSuplier}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setSelectedBahan(null);
                  setJumlah('');
                  setSuplier('');
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

      {/* Profile Menu Modal */}
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
                <Text style={styles.profileMenuAvatarText}>SF</Text>
              </View>
              <View>
                <Text style={styles.profileMenuName}>Staff Gudang</Text>
                <Text style={styles.profileMenuRole}>Pusat</Text>
              </View>
            </View>
            <View style={styles.profileMenuDivider} />
            <TouchableOpacity
              style={styles.profileMenuItem}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              <Text style={styles.profileMenuItemText}>Keluar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bahan Selection Modal */}
      <Modal
        visible={showBahanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBahanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Bahan</Text>
              <TouchableOpacity onPress={() => setShowBahanModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {bahanList.map((bahan) => (
                <TouchableOpacity
                  key={bahan.id}
                  style={[
                    styles.bahanOption,
                    selectedBahan?.id === bahan.id && styles.bahanOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedBahan(bahan);
                    setShowBahanModal(false);
                  }}
                >
                  <Text style={styles.bahanOptionText}>{bahan.nama}</Text>
                  {selectedBahan?.id === bahan.id && (
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
    fontSize: 20,
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
  goodsCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  goodsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  goodsId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  goodsDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  goodsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  goodsStatusText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  goodsDetails: {
    marginBottom: 15,
  },
  goodsDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  goodsDetailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  goodsDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  goodsActions: {
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
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 5,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
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
  chevronIcon: {
    marginLeft: 8,
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 20,
  },
  profileMenu: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    minWidth: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  profileMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  profileMenuAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileMenuAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primaryDark,
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
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    gap: 12,
  },
  profileMenuItemText: {
    fontSize: 16,
    color: Colors.error,
    fontWeight: '600',
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  bahanOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bahanOptionSelected: {
    backgroundColor: Colors.primaryLight + '20',
  },
  bahanOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
});

