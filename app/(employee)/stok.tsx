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
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { StokOutlet, Bahan } from '../../types';
import { karyawanAPI } from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface StockItem extends StokOutlet {
  bahan: Bahan;
  status: 'Aman' | 'Menipis' | 'Kritis';
}

export default function StokScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStok();
  }, []);

  const loadStok = async () => {
    try {
      setLoading(true);
      const response = await karyawanAPI.getStokOutlet();
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      if (response.data) {
        // Ensure response.data is an array
        const stokData = Array.isArray(response.data) ? response.data : [];
        const mappedItems = stokData.map((item: any) => {
          const stok = item.stok || 0;
          const minStok = item.bahan?.stok_minimum_outlet || 0;
          let status: 'Aman' | 'Menipis' | 'Kritis' = 'Aman';
          
          if (stok <= minStok * 0.3) {
            status = 'Kritis';
          } else if (stok <= minStok) {
            status = 'Menipis';
          }

          return {
            outlet_id: item.outlet_id?.toString() || '',
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

  const lowStockCount = stockItems.filter(item => item.status !== 'Aman').length;
  const criticalCount = stockItems.filter(item => item.status === 'Kritis').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Stok Bahan</Text>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>GH</Text>
            </View>
            <View>
              <Text style={styles.userName}>Ghilman</Text>
              <Text style={styles.userRole}>Karyawan Outlet 1</Text>
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
        <View style={styles.overviewCards}>
          <View style={styles.overviewCard}>
            <Ionicons name="cube-outline" size={32} color={Colors.primary} />
            <Text style={styles.overviewLabel}>Total Bahan</Text>
            <Text style={styles.overviewValue}>{stockItems.length} Item</Text>
          </View>

          <View style={styles.overviewCard}>
            <Ionicons name="warning-outline" size={32} color={Colors.warning} />
            <Text style={styles.overviewLabel}>Stok Menipis</Text>
            <Text style={styles.overviewValue}>{lowStockCount} Item</Text>
          </View>

          <View style={styles.overviewCard}>
            <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
            <Text style={styles.overviewLabel}>Stok Kritis</Text>
            <Text style={styles.overviewValue}>{criticalCount} Item</Text>
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

        <View style={styles.stockList}>
          <Text style={styles.sectionTitle}>Daftar Stok Bahan</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Memuat stok...</Text>
            </View>
          ) : (
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
                <View style={styles.stockCardHeader}>
                  <View style={styles.stockInfo}>
                    <Text style={styles.stockName}>{item.bahan.nama}</Text>
                    <Text style={styles.stockCategory}>{item.bahan.satuan}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.stockDetails}>
                  <View style={styles.stockDetailRow}>
                    <Text style={styles.stockDetailLabel}>Stok Saat Ini:</Text>
                    <Text style={styles.stockDetailValue}>{item.stok} {item.bahan.satuan}</Text>
                  </View>
                  <View style={styles.stockDetailRow}>
                    <Text style={styles.stockDetailLabel}>Min. Stok:</Text>
                    <Text style={styles.stockDetailValue}>{item.bahan.stok_minimum_outlet} {item.bahan.satuan}</Text>
                  </View>
                </View>

                <View style={styles.stockActions}>
                  <TouchableOpacity 
                    style={styles.requestButton}
                    onPress={async () => {
                      try {
                        const response = await karyawanAPI.createPermintaanStok({
                          bahan_id: parseInt(item.bahan_id),
                          jumlah: item.bahan.stok_minimum_outlet - item.stok,
                        });
                        if (response.error) {
                          Alert.alert('Error', response.error);
                        } else {
                          Alert.alert('Sukses', 'Permintaan stok berhasil dibuat');
                          loadStok();
                        }
                      } catch (error: any) {
                        Alert.alert('Error', error.message || 'Gagal membuat permintaan');
                      }
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                    <Text style={styles.requestButtonText}>Ajukan Permintaan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            />
          )}
        </View>
      </ScrollView>
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
  headerTitle: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: Colors.backgroundLight,
    flex: 1,
    minWidth: 120,
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
  overviewCards: {
    flexDirection: 'row',
    gap: isSmallScreen ? 10 : 15,
    marginBottom: isSmallScreen ? 15 : 20,
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
    textAlign: 'center',
  },
  overviewValue: {
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
  stockList: {
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
  stockCardHeader: {
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
  stockCategory: {
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
  stockDetails: {
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  stockDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stockDetailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  stockDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  stockActions: {
    flexDirection: 'row',
    gap: 10,
  },
  requestButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 8,
  },
  requestButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
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

