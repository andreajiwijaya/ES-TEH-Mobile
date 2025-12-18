import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Bahan } from '../../types'; // Fix: Hapus StokGudang
import { gudangAPI, authAPI } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

// Definisi Interface Lokal
interface StockItem {
  id: string;
  bahan_id: number;
  stok: number;
  bahan: Bahan;
  status: 'Aman' | 'Menipis' | 'Kritis';
}

export default function WarehouseOverviewScreen() {
  const router = useRouter();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Load User Data Local
  const loadUserData = async () => {
    const userData = await AsyncStorage.getItem('@user_data');
    if (userData) setUser(JSON.parse(userData));
  };

  // Load Stok Data dari API
  const loadStok = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      // API 33: GET /gudang/stok
      const response = await gudangAPI.getStok();
      
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      
      if (response.data) {
        const stokData = Array.isArray(response.data) ? response.data : [];
        
        // Mapping data
        const mappedItems: StockItem[] = stokData.map((item: any) => {
          const stok = Number(item.stok) || 0;
          const minStok = Number(item.bahan?.stok_minimum_gudang) || 0;
          
          let status: 'Aman' | 'Menipis' | 'Kritis' = 'Aman';
          if (stok <= 0) {
            status = 'Kritis';
          } else if (stok <= minStok * 0.3) {
            status = 'Kritis';
          } else if (stok <= minStok) {
            status = 'Menipis';
          }

          return {
            id: `stok-${item.bahan_id}`,
            bahan_id: Number(item.bahan_id),
            stok: stok,
            bahan: item.bahan || { 
              id: item.bahan_id, 
              nama: 'Unknown', 
              satuan: 'Unit', 
              stok_minimum_gudang: minStok, 
              stok_minimum_outlet: 0 
            },
            status: status,
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
  }, []);

  useEffect(() => {
    loadUserData();
    loadStok();
  }, [loadStok]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStok(true);
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

  // Logic Filter
  const filteredItems = stockItems.filter(item =>
    item.bahan.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper UI
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aman': return Colors.success;
      case 'Menipis': return Colors.warning;
      case 'Kritis': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  const totalSKU = stockItems.length;
  const lowStockCount = stockItems.filter(item => item.status === 'Menipis').length;
  const criticalCount = stockItems.filter(item => item.status === 'Kritis').length;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="cube" size={24} color={Colors.backgroundLight} />
            <Text style={styles.headerTitle}>Gudang Pusat</Text>
          </View>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => setShowProfileMenu(true)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.username ? user.username.substring(0, 2).toUpperCase() : 'GD'}
              </Text>
            </View>
            <View>
              <Text style={styles.userName}>{user?.username || 'Staff'}</Text>
              <Text style={styles.userRole}>Logistik</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={Colors.backgroundLight} style={{marginLeft: 5}} />
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
            <Text style={styles.title}>Stok Gudang Pusat</Text>
            <Text style={styles.subtitle}>
              Pantau pergerakan bahan baku secara real-time
            </Text>
          </View>
        </View>

        {/* OVERVIEW CARDS */}
        <View style={styles.overviewCards}>
          <View style={styles.overviewCard}>
            <Ionicons name="cube-outline" size={32} color={Colors.primary} />
            <Text style={styles.overviewLabel}>Total SKU</Text>
            <Text style={styles.overviewValue}>{totalSKU}</Text>
          </View>

          <View style={styles.overviewCard}>
            <Ionicons name="warning-outline" size={32} color={Colors.warning} />
            <Text style={styles.overviewLabel}>Stok Menipis</Text>
            <Text style={styles.overviewValue}>{lowStockCount}</Text>
          </View>

          <View style={styles.overviewCard}>
            <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
            <Text style={styles.overviewLabel}>Kritis</Text>
            <Text style={styles.overviewValue}>{criticalCount}</Text>
          </View>
        </View>

        {/* INVENTORY LIST */}
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
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Memuat stok...</Text>
            </View>
          ) : (
            <>
              {/* MOBILE CARD VIEW */}
              {isSmallScreen ? (
                <FlatList
                  data={filteredItems}
                  keyExtractor={item => item.id}
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
                          <Text style={styles.stockDetailLabelMobile}>Stok:</Text>
                          <Text style={[styles.stockDetailValueMobile, {color: Colors.primary}]}>
                            {item.stok} {item.bahan.satuan}
                          </Text>
                        </View>
                        <View style={styles.stockDetailRowMobile}>
                          <Text style={styles.stockDetailLabelMobile}>Min. Stok:</Text>
                          <Text style={styles.stockDetailValueMobile}>
                            {item.bahan.stok_minimum_gudang} {item.bahan.satuan}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                />
              ) : (
                /* TABLE VIEW (TABLET/LARGE PHONE) */
                <>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 2 }]}>Nama Bahan</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Stok</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Min</Text>
                    <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Unit</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Status</Text>
                  </View>

                  <FlatList
                    data={filteredItems}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Data tidak ditemukan</Text>
                    }
                    renderItem={({ item }) => (
                      <View style={styles.tableRow}>
                        <Text style={[styles.tableCell, { flex: 2, fontWeight: '600' }]}>
                          {item.bahan.nama}
                        </Text>
                        <Text style={[styles.tableCell, { flex: 1, color: Colors.primary, fontWeight:'bold' }]}>{item.stok}</Text>
                        <Text style={[styles.tableCell, { flex: 1 }]}>{item.bahan.stok_minimum_gudang}</Text>
                        <Text style={[styles.tableCell, { flex: 0.8 }]}>{item.bahan.satuan}</Text>
                        <View style={[styles.statusBadge, { flex: 1, backgroundColor: getStatusColor(item.status) + '20', alignSelf:'flex-start' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(item.status), fontSize:10 }]}>
                            {item.status}
                          </Text>
                        </View>
                      </View>
                    )}
                  />
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* PROFILE MENU */}
      <Modal visible={showProfileMenu} transparent animationType="fade" onRequestClose={() => setShowProfileMenu(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileMenu(false)}
        >
          <View style={styles.profileMenu}>
            <View style={styles.profileMenuHeader}>
              <View style={styles.profileMenuAvatar}>
                <Text style={styles.profileMenuAvatarText}>
                    {user?.username ? user.username.substring(0, 2).toUpperCase() : 'GD'}
                </Text>
              </View>
              <View>
                <Text style={styles.profileMenuName}>{user?.username || 'Staff'}</Text>
                <Text style={styles.profileMenuRole}>Logistik</Text>
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
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: 'bold', color: Colors.primary },
  userName: { fontSize: 14, fontWeight: 'bold', color: 'white' },
  userRole: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  content: { flex: 1, padding: 20 },
  titleSection: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 5 },
  subtitle: { fontSize: 14, color: Colors.textSecondary },

  // Overview Cards
  overviewCards: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  overviewCard: { flex: 1, minWidth: '30%', backgroundColor: 'white', borderRadius: 12, padding: 15, alignItems: 'center', elevation: 2 },
  overviewLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 8 },
  overviewValue: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginTop: 4 },

  // Inventory
  inventorySection: { backgroundColor: 'white', borderRadius: 12, padding: 15, paddingBottom: 30, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 10, marginBottom: 15 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },

  // Table
  tableHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: '#eee', marginBottom: 5 },
  tableHeaderText: { fontSize: 12, fontWeight: 'bold', color: Colors.textSecondary, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  tableCell: { fontSize: 13, color: Colors.text },

  // Mobile Card
  stockCardMobile: { backgroundColor: '#f9f9f9', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  stockCardHeaderMobile: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  stockNameMobile: { fontSize: 15, fontWeight: 'bold', color: Colors.text, flex: 1 },
  statusBadgeMobile: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusTextMobile: { fontSize: 11, fontWeight: 'bold' },
  stockDetailsMobile: { gap: 4 },
  stockDetailRowMobile: { flexDirection: 'row', justifyContent: 'space-between' },
  stockDetailLabelMobile: { fontSize: 13, color: Colors.textSecondary },
  stockDetailValueMobile: { fontSize: 13, fontWeight: '600' },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: 'bold' },

  loadingContainer: { paddingVertical: 50, alignItems: 'center' },
  loadingText: { marginTop: 10, color: Colors.textSecondary, fontSize: 14 },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, marginTop: 20 },

  // Profile Menu
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  profileMenu: { position: 'absolute', top: 90, right: 20, backgroundColor: 'white', borderRadius: 8, padding: 5, elevation: 5, minWidth: 160 },
  profileMenuHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  profileMenuAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  profileMenuAvatarText: { fontWeight: 'bold', color: Colors.primary },
  profileMenuName: { fontWeight: 'bold', fontSize: 14 },
  profileMenuRole: { fontSize: 11, color: Colors.textSecondary },
  profileMenuDivider: { height: 1, backgroundColor: '#eee' },
  profileMenuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  profileMenuItemText: { color: Colors.error, fontWeight: 'bold', fontSize: 14 },
});