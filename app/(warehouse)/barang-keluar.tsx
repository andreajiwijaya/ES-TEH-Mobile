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
  Modal,
  TextInput,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { BarangKeluar, DetailBarangKeluar, Bahan, Outlet } from '../../types';
import { gudangAPI, authAPI, ownerAPI } from '../../services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface OutgoingGoodsItem extends BarangKeluar {
  details: Array<DetailBarangKeluar & { bahan: Bahan }>;
  outlet: Outlet;
}

export default function BarangKeluarScreen() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermintaanModal, setShowPermintaanModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [outgoingGoods, setOutgoingGoods] = useState<OutgoingGoodsItem[]>([]);
  const [permintaanStok, setPermintaanStok] = useState<any[]>([]);
  const [selectedPermintaan, setSelectedPermintaan] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [barangKeluarResponse, permintaanResponse, outletsResponse] = await Promise.all([
        gudangAPI.getBarangKeluar(),
        gudangAPI.getPermintaanStok(),
        ownerAPI.getOutlets(),
      ]);

      if (barangKeluarResponse.error) {
        Alert.alert('Error', barangKeluarResponse.error);
      } else if (barangKeluarResponse.data) {
        // Ensure response.data is an array
        const barangKeluarData = Array.isArray(barangKeluarResponse.data) ? barangKeluarResponse.data : [];
        const mappedItems = barangKeluarData.map((item: any) => ({
          id: item.id?.toString() || '',
          gudang_id: item.gudang_id?.toString() || '',
          outlet_id: item.outlet_id?.toString() || '',
          tanggal_keluar: new Date(item.tanggal_keluar),
          status: item.status || 'pending',
          outlet: {
            id: item.outlet?.id?.toString() || '',
            nama: item.outlet?.nama || 'Unknown',
            alamat: item.outlet?.alamat || '',
            telepon: item.outlet?.telepon || '',
            is_active: item.outlet?.is_active !== false,
          },
          details: item.details?.map((detail: any) => ({
            barang_keluar_id: item.id?.toString() || '',
            bahan_id: detail.bahan_id?.toString() || '',
            quantity: detail.quantity || detail.jumlah || 0,
            bahan: {
              id: detail.bahan?.id?.toString() || '',
              nama: detail.bahan?.nama || 'Unknown',
              satuan: detail.bahan?.satuan || '',
              stok_minimum_gudang: detail.bahan?.stok_minimum_gudang || 0,
              stok_minimum_outlet: detail.bahan?.stok_minimum_outlet || 0,
            },
          })) || [],
        }));
        setOutgoingGoods(mappedItems);
      }

      if (permintaanResponse.error) {
        Alert.alert('Error', permintaanResponse.error);
      } else if (permintaanResponse.data) {
        // Ensure response.data is an array
        const permintaanData = Array.isArray(permintaanResponse.data) ? permintaanResponse.data : [];
        // Filter only pending/approved requests
        const filtered = permintaanData.filter((p: any) => 
          p.status === 'approved' || p.status === 'pending'
        );
        setPermintaanStok(filtered);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return Colors.warning;
      case 'in_transit':
        return Colors.primary;
      case 'received':
        return Colors.success;
      case 'cancelled':
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Menunggu';
      case 'in_transit':
        return 'Dalam Perjalanan';
      case 'received':
        return 'Diterima';
      case 'cancelled':
        return 'Dibatalkan';
      default:
        return status;
    }
  };

  const handleAdd = async () => {
    if (!selectedPermintaan) {
      Alert.alert('Error', 'Pilih permintaan stok terlebih dahulu');
      return;
    }

    setProcessing(true);
    try {
      const response = await gudangAPI.createBarangKeluar({
        permintaan_id: parseInt(selectedPermintaan.id),
      });

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      Alert.alert('Sukses', 'Pengiriman barang berhasil dibuat');
      setShowAddModal(false);
      setSelectedPermintaan(null);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal membuat pengiriman');
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
            <Text style={styles.title}>Barang Keluar</Text>
            <Text style={styles.subtitle}>
              Kelola pengiriman barang ke outlet
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={20} color={Colors.backgroundLight} />
            <Text style={styles.addButtonText}>Buat Pengiriman</Text>
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
                <Ionicons name="arrow-up-circle" size={32} color={Colors.primary} />
                <Text style={styles.summaryLabel}>Total Keluar Hari Ini</Text>
                <Text style={styles.summaryValue}>
                  {outgoingGoods.filter(item => {
                    const today = new Date();
                    return new Date(item.tanggal_keluar).toDateString() === today.toDateString();
                  }).length} Item
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="time-outline" size={32} color={Colors.warning} />
                <Text style={styles.summaryLabel}>Dalam Perjalanan</Text>
                <Text style={styles.summaryValue}>
                  {outgoingGoods.filter(item => item.status === 'in_transit').length} Item
                </Text>
              </View>
            </View>

            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>Riwayat Barang Keluar</Text>

              <FlatList
                data={outgoingGoods}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Tidak ada barang keluar</Text>
                  </View>
                }
                renderItem={({ item }) => (
              <View style={styles.goodsCard}>
                <View style={styles.goodsHeader}>
                  <View>
                    <Text style={styles.goodsId}>{item.id}</Text>
                    <Text style={styles.goodsDate}>{formatDate(item.tanggal_keluar)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {getStatusLabel(item.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.outletInfo}>
                  <Ionicons name="storefront-outline" size={18} color={Colors.primary} />
                  <Text style={styles.outletName}>{item.outlet.nama}</Text>
                </View>

                <View style={styles.goodsDetails}>
                  <Text style={styles.detailsTitle}>Detail Barang:</Text>
                  {item.details.map((detail, index) => (
                    <View key={index} style={styles.detailRow}>
                      <Text style={styles.detailName}>{detail.bahan.nama}</Text>
                      <Text style={styles.detailQuantity}>
                        {detail.quantity} {detail.bahan.satuan}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.goodsActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="eye-outline" size={18} color={Colors.primary} />
                    <Text style={styles.actionButtonText}>Detail</Text>
                  </TouchableOpacity>
                  {item.status === 'pending' && (
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
                      <Text style={styles.actionButtonText}>Kirim</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === 'in_transit' && (
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                      <Text style={styles.actionButtonText}>Lihat Bukti</Text>
                    </TouchableOpacity>
                  )}
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
              <Text style={styles.modalTitle}>Buat Pengiriman Barang</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pilih Permintaan Stok</Text>
                <TouchableOpacity 
                  style={styles.selectButton}
                  onPress={() => setShowPermintaanModal(true)}
                >
                  <Text style={styles.selectButtonText}>
                    {selectedPermintaan 
                      ? `${selectedPermintaan.outlet?.nama || 'Outlet'} - ${selectedPermintaan.bahan?.nama || 'Bahan'}`
                      : 'Pilih Permintaan Stok'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
                {selectedPermintaan && (
                  <View style={styles.permintaanInfo}>
                    <Text style={styles.permintaanInfoText}>
                      Jumlah: {selectedPermintaan.jumlah} {selectedPermintaan.bahan?.satuan}
                    </Text>
                    <Text style={styles.permintaanInfoText}>
                      Outlet: {selectedPermintaan.outlet?.nama}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setSelectedPermintaan(null);
                }}
                disabled={processing}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, processing && styles.saveButtonDisabled]}
                onPress={handleAdd}
                disabled={processing || !selectedPermintaan}
              >
                {processing ? (
                  <ActivityIndicator color={Colors.backgroundLight} />
                ) : (
                  <Text style={styles.saveButtonText}>Buat Pengiriman</Text>
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

      {/* Permintaan Selection Modal */}
      <Modal
        visible={showPermintaanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPermintaanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Permintaan Stok</Text>
              <TouchableOpacity onPress={() => setShowPermintaanModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {permintaanStok.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Tidak ada permintaan stok yang tersedia</Text>
                </View>
              ) : (
                permintaanStok.map((permintaan) => (
                  <TouchableOpacity
                    key={permintaan.id}
                    style={[
                      styles.permintaanOption,
                      selectedPermintaan?.id === permintaan.id && styles.permintaanOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedPermintaan(permintaan);
                      setShowPermintaanModal(false);
                    }}
                  >
                    <View style={styles.permintaanOptionContent}>
                      <Text style={styles.permintaanOptionTitle}>
                        {permintaan.outlet?.nama || 'Outlet'}
                      </Text>
                      <Text style={styles.permintaanOptionSubtitle}>
                        {permintaan.bahan?.nama} - {permintaan.jumlah} {permintaan.bahan?.satuan}
                      </Text>
                    </View>
                    {selectedPermintaan?.id === permintaan.id && (
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  outletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  outletName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  goodsDetails: {
    marginBottom: 15,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailName: {
    fontSize: 14,
    color: Colors.text,
  },
  detailQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryDark,
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
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    padding: 15,
    gap: 8,
  },
  addItemButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
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
  permintaanInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  permintaanInfoText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 5,
  },
  permintaanOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  permintaanOptionSelected: {
    backgroundColor: Colors.primaryLight + '20',
  },
  permintaanOptionContent: {
    flex: 1,
  },
  permintaanOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 5,
  },
  permintaanOptionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

