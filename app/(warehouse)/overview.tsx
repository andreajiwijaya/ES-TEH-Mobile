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
import { StokGudang, Bahan, BarangMasuk, BarangKeluar } from '../../types';
import { gudangAPI, authAPI } from '../../services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface StockItem extends StokGudang {
  bahan: Bahan;
  status: 'Aman' | 'Menipis' | 'Kritis';
}

export default function WarehouseOverviewScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
          const minStok = item.bahan?.stok_minimum_gudang || 0;
          let status: 'Aman' | 'Menipis' | 'Kritis' = 'Aman';
          
          if (stok <= minStok * 0.3) {
            status = 'Kritis';
          } else if (stok <= minStok) {
            status = 'Menipis';
          }

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
            status,
          };
        });
        setStockItems(mappedItems);
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

  const filteredItems = stockItems.filter(item =>
    item.bahan.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aman':
        return Colors.success;
      case 'Menipis':
        return Colors.warning;
      case 'Kritis':
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  const totalSKU = stockItems.length;
  const lowStockCount = stockItems.filter(item => item.status !== 'Aman').length;
  const criticalCount = stockItems.filter(item => item.status === 'Kritis').length;
  const todayIncoming = 3;
  const todayOutgoing = 2;

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
            <Text style={styles.title}>Stok Gudang Pusat</Text>
            <Text style={styles.subtitle}>
              Pantau pergerakan bahan baku secara real-time
            </Text>
          </View>
        </View>

        <View style={styles.overviewCards}>
          <View style={styles.overviewCard}>
            <Ionicons name="cube-outline" size={32} color={Colors.primary} />
            <Text style={styles.overviewLabel}>Total SKU</Text>
            <Text style={styles.overviewValue}>{totalSKU} Item</Text>
          </View>

          <View style={styles.overviewCard}>
            <Ionicons name="warning-outline" size={32} color={Colors.warning} />
            <Text style={styles.overviewLabel}>Stok Menipis</Text>
            <Text style={styles.overviewValue}>{lowStockCount} Item</Text>
          </View>

          <View style={styles.overviewCard}>
            <Ionicons name="car-outline" size={32} color={Colors.primary} />
            <Text style={styles.overviewLabel}>Pengiriman Hari Ini</Text>
            <Text style={styles.overviewValue}>{todayOutgoing} Outlet</Text>
          </View>
        </View>

        <View style={styles.inventorySection}>
          <Text style={styles.sectionTitle}>Inventaris Bahan Baku</Text>

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
          ) : isSmallScreen ? (
            <FlatList
              data={filteredItems}
              keyExtractor={item => item.bahan_id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.stockCardMobile}>
                  <View style={styles.stockCardHeaderMobile}>
                    <Text style={styles.stockNameMobile}>{item.bahan.nama}</Text>
                    <View style={[styles.statusBadgeMobile, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                      <Text style={[styles.statusTextMobile, { color: getStatusColor(item.status) }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.stockDetailsMobile}>
                    <View style={styles.stockDetailRowMobile}>
                      <Text style={styles.stockDetailLabelMobile}>Kategori:</Text>
                      <Text style={styles.stockDetailValueMobile}>Bahan Utama</Text>
                    </View>
                    <View style={styles.stockDetailRowMobile}>
                      <Text style={styles.stockDetailLabelMobile}>Stok:</Text>
                      <Text style={styles.stockDetailValueMobile}>{item.stok} {item.bahan.satuan}</Text>
                    </View>
                    <View style={styles.stockDetailRowMobile}>
                      <Text style={styles.stockDetailLabelMobile}>Min. Stok:</Text>
                      <Text style={styles.stockDetailValueMobile}>{item.bahan.stok_minimum_gudang} {item.bahan.satuan}</Text>
                    </View>
                  </View>
                </View>
              )}
            />
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Nama Bahan</Text>
                <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Kategori</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Stok</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Min. Stok</Text>
                <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Satuan</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Status</Text>
                <Text style={[styles.tableHeaderText, { flex: 0.5 }]}>Aksi</Text>
              </View>

              <FlatList
                data={filteredItems}
                keyExtractor={item => item.bahan_id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2, fontWeight: '600' }]}>
                      {item.bahan.nama}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>Bahan Utama</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>{item.stok}</Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>{item.bahan.stok_minimum_gudang}</Text>
                    <Text style={[styles.tableCell, { flex: 0.8 }]}>{item.bahan.satuan}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status}
                      </Text>
                    </View>
                    <TouchableOpacity style={{ flex: 0.5 }}>
                      <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* Profile Menu Modal */}
      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
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
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: Colors.backgroundLight,
    marginLeft: isSmallScreen ? 8 : 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  avatar: {
    width: isSmallScreen ? 35 : 40,
    height: isSmallScreen ? 35 : 40,
    borderRadius: isSmallScreen ? 17.5 : 20,
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallScreen ? 8 : 10,
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
  overviewCards: {
    flexDirection: 'row',
    gap: isSmallScreen ? 10 : 15,
    marginBottom: isSmallScreen ? 20 : 30,
    flexWrap: 'wrap',
  },
  overviewCard: {
    flex: 1,
    minWidth: isSmallScreen ? '48%' : undefined,
    backgroundColor: Colors.backgroundLight,
    borderRadius: isSmallScreen ? 10 : 12,
    padding: isSmallScreen ? 15 : 20,
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 10,
    marginBottom: 5,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  inventorySection: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: isSmallScreen ? 10 : 12,
    padding: isSmallScreen ? 15 : 20,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: isSmallScreen ? 12 : 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
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
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
    marginBottom: 10,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableCell: {
    fontSize: 14,
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chevronIcon: {
    marginLeft: 8,
  },
  modalOverlay: {
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
  stockCardMobile: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stockCardHeaderMobile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stockNameMobile: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 10,
  },
  statusBadgeMobile: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusTextMobile: {
    fontSize: 11,
    fontWeight: '600',
  },
  stockDetailsMobile: {
    gap: 8,
  },
  stockDetailRowMobile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockDetailLabelMobile: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  stockDetailValueMobile: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
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
});

