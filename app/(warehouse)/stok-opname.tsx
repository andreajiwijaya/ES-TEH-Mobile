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
import { StokGudang, Bahan } from '../../types';
import { gudangAPI, authAPI } from '../../services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface StockOpnameItem extends StokGudang {
  bahan: Bahan;
  stok_fisik: number;
  selisih: number;
  status: 'sesuai' | 'selisih';
}

export default function StokOpnameScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockOpnameItem | null>(null);
  const [stokFisik, setStokFisik] = useState('');
  const [stockOpnameItems, setStockOpnameItems] = useState<StockOpnameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadStok();
  }, []);

  const loadStok = async () => {
    try {
      setLoading(true);
      const response = await gudangAPI.getStok();
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      if (response.data) {
        // Ensure response.data is an array
        const stokData = Array.isArray(response.data) ? response.data : [];
        const mappedItems = stokData.map((item: any) => {
          const stok = item.stok || 0;
          return {
            bahan_id: item.bahan_id?.toString() || '',
            stok: stok,
            bahan: {
              id: item.bahan?.id?.toString() || '',
              nama: item.bahan?.nama || 'Unknown',
              satuan: item.bahan?.satuan || '',
              stok_minimum_gudang: item.bahan?.stok_minimum_gudang || 0,
              stok_minimum_outlet: item.bahan?.stok_minimum_outlet || 0,
            },
            stok_fisik: stok, // Default to current stock
            selisih: 0,
            status: 'sesuai' as const,
          };
        });
        setStockOpnameItems(mappedItems);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal memuat stok');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStok();
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

  const filteredItems = stockOpnameItems.filter(item =>
    item.bahan.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalItems = stockOpnameItems.length;
  const sesuaiCount = stockOpnameItems.filter(item => item.status === 'sesuai').length;
  const selisihCount = stockOpnameItems.filter(item => item.status === 'selisih').length;

  const handleRecord = (item: StockOpnameItem) => {
    setSelectedItem(item);
    setStokFisik(item.stok_fisik.toString());
    setShowRecordModal(true);
  };

  const handleSave = () => {
    // Handle save logic here
    setShowRecordModal(false);
    setSelectedItem(null);
    setStokFisik('');
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
            <Text style={styles.title}>Stok Opname</Text>
            <Text style={styles.subtitle}>
              Pencatatan dan penyesuaian stok fisik
            </Text>
          </View>
        </View>

        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Ionicons name="cube-outline" size={32} color={Colors.primary} />
            <Text style={styles.summaryLabel}>Total Item</Text>
            <Text style={styles.summaryValue}>{totalItems}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
            <Text style={styles.summaryLabel}>Sesuai</Text>
            <Text style={styles.summaryValue}>{sesuaiCount}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="alert-circle" size={32} color={Colors.warning} />
            <Text style={styles.summaryLabel}>Selisih</Text>
            <Text style={styles.summaryValue}>{selisihCount}</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari bahan..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity>
            <Ionicons name="filter" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Memuat stok...</Text>
          </View>
        ) : (
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>Daftar Stok Opname</Text>

            <FlatList
              data={filteredItems}
              keyExtractor={item => item.bahan_id}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Tidak ada stok tersedia</Text>
                </View>
              }
              renderItem={({ item }) => (
              <View style={styles.stockCard}>
                <View style={styles.stockHeader}>
                  <View style={styles.stockInfo}>
                    <Text style={styles.stockName}>{item.bahan.nama}</Text>
                    <Text style={styles.stockUnit}>{item.bahan.satuan}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'sesuai' ? Colors.success + '20' : Colors.warning + '20' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: item.status === 'sesuai' ? Colors.success : Colors.warning }
                    ]}>
                      {item.status === 'sesuai' ? 'Sesuai' : 'Selisih'}
                    </Text>
                  </View>
                </View>

                <View style={styles.stockComparison}>
                  <View style={styles.stockValue}>
                    <Text style={styles.stockLabel}>Stok Sistem</Text>
                    <Text style={styles.stockNumber}>{item.stok}</Text>
                  </View>
                  <View style={styles.stockArrow}>
                    <Ionicons
                      name={item.selisih === 0 ? "checkmark" : item.selisih > 0 ? "arrow-up" : "arrow-down"}
                      size={24}
                      color={item.selisih === 0 ? Colors.success : item.selisih > 0 ? Colors.success : Colors.error}
                    />
                  </View>
                  <View style={styles.stockValue}>
                    <Text style={styles.stockLabel}>Stok Fisik</Text>
                    <Text style={[
                      styles.stockNumber,
                      { color: item.selisih === 0 ? Colors.text : item.selisih > 0 ? Colors.success : Colors.error }
                    ]}>
                      {item.stok_fisik}
                    </Text>
                  </View>
                </View>

                {item.selisih !== 0 && (
                  <View style={styles.selisihInfo}>
                    <Text style={styles.selisihLabel}>Selisih:</Text>
                    <Text style={[
                      styles.selisihValue,
                      { color: item.selisih > 0 ? Colors.success : Colors.error }
                    ]}>
                      {item.selisih > 0 ? '+' : ''}{item.selisih} {item.bahan.satuan}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.recordButton}
                  onPress={() => handleRecord(item)}
                >
                  <Ionicons name="create-outline" size={18} color={Colors.primary} />
                  <Text style={styles.recordButtonText}>Catat Stok Fisik</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
        )}
      </ScrollView>

      {/* Record Modal */}
      <Modal
        visible={showRecordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRecordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Catat Stok Fisik</Text>
              <TouchableOpacity onPress={() => setShowRecordModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {selectedItem && (
                <>
                  <View style={styles.modalInfo}>
                    <Text style={styles.modalInfoLabel}>Bahan:</Text>
                    <Text style={styles.modalInfoValue}>{selectedItem.bahan.nama}</Text>
                  </View>
                  <View style={styles.modalInfo}>
                    <Text style={styles.modalInfoLabel}>Stok Sistem:</Text>
                    <Text style={styles.modalInfoValue}>{selectedItem.stok} {selectedItem.bahan.satuan}</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Stok Fisik</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Masukkan stok fisik"
                      value={stokFisik}
                      onChangeText={setStokFisik}
                      keyboardType="numeric"
                    />
                    <Text style={styles.inputHint}>
                      Satuan: {selectedItem.bahan.satuan}
                    </Text>
                  </View>

                  {stokFisik && parseInt(stokFisik) !== selectedItem.stok && (
                    <View style={styles.selisihPreview}>
                      <Text style={styles.selisihPreviewLabel}>Selisih:</Text>
                      <Text style={[
                        styles.selisihPreviewValue,
                        {
                          color: (parseInt(stokFisik) - selectedItem.stok) > 0
                            ? Colors.success
                            : Colors.error
                        }
                      ]}>
                        {(parseInt(stokFisik) - selectedItem.stok) > 0 ? '+' : ''}
                        {parseInt(stokFisik) - selectedItem.stok} {selectedItem.bahan.satuan}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRecordModal(false);
                  setSelectedItem(null);
                  setStokFisik('');
                }}
                disabled={processing}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, processing && styles.saveButtonDisabled]}
                onPress={handleRecord}
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
    marginBottom: isSmallScreen ? 15 : 20,
  },
  title: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: isSmallScreen ? 13 : 14,
    color: Colors.textSecondary,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
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
  stockCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  stockInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  stockUnit: {
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
  stockComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stockValue: {
    flex: 1,
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 5,
  },
  stockNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  stockArrow: {
    paddingHorizontal: 10,
  },
  selisihInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  selisihLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  selisihValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 8,
  },
  recordButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
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
  modalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalInfoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  modalInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
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
  inputHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 5,
  },
  selisihPreview: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.background,
    borderRadius: 8,
    gap: 8,
  },
  selisihPreviewLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  selisihPreviewValue: {
    fontSize: 18,
    fontWeight: 'bold',
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
});

