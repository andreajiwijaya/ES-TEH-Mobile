import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TouchableOpacity
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Bahan } from '../../types'; 
import { gudangAPI } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface
interface StockItem {
  id: string;
  bahan_id: number;
  stok: number;
  bahan: Bahan;
  status: 'Aman' | 'Menipis' | 'Kritis';
}

export default function WarehouseOverviewScreen() {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Load User
  const loadUserData = async () => {
    const userData = await AsyncStorage.getItem('@user_data');
    if (userData) setUser(JSON.parse(userData));
  };

  // Load Stok
  const loadStok = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await gudangAPI.getStok();
      if (response.data && Array.isArray(response.data)) {
        const mappedItems: StockItem[] = response.data.map((item: any) => {
          const stok = Number(item.stok) || 0;
          const minStok = Number(item.bahan?.stok_minimum_gudang) || 0;
          
          let status: 'Aman' | 'Menipis' | 'Kritis' = 'Aman';
          if (stok <= 0) status = 'Kritis';
          else if (stok <= minStok * 0.3) status = 'Kritis';
          else if (stok <= minStok) status = 'Menipis';

          return {
            id: `stok-${item.bahan_id}`,
            bahan_id: Number(item.bahan_id),
            stok: stok,
            bahan: item.bahan || { nama: 'Unknown', satuan: 'Unit', stok_minimum_gudang: minStok, stok_minimum_outlet: 0 },
            status: status,
          };
        });
        setStockItems(mappedItems);
      }
    } catch (error: any) {
      Alert.alert('Gagal Memuat', 'Terjadi kesalahan saat mengambil data stok.');
      console.log(error);
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

  // Filter & Stats
  const filteredItems = stockItems.filter(item =>
    item.bahan.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSKU = stockItems.length;
  const lowStockCount = stockItems.filter(item => item.status === 'Menipis').length;
  const criticalCount = stockItems.filter(item => item.status === 'Kritis').length;

  // Helper UI
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aman': return Colors.success;
      case 'Menipis': return '#FB8C00'; // Orange Deep
      case 'Kritis': return '#E53935'; // Red Deep
      default: return Colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* --- HEADER SECTION (ULTIMATE DESIGN) --- */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.welcomeText}>Halo, {user?.username || 'Staff'}</Text>
            <Text style={styles.headerTitle}>Gudang Pusat</Text>
          </View>
          <View style={styles.headerIconBg}>
            <Ionicons name="notifications" size={20} color={Colors.primary} />
          </View>
        </View>

        {/* FLOATING SEARCH BAR */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#BDBDBD" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Cari nama bahan baku..."
            placeholderTextColor="#BDBDBD"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* --- STATS GRID --- */}
        <View style={styles.statsContainer}>
          {/* Primary Card (Solid Green) */}
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <View style={styles.statIconCircleWhite}>
              <Ionicons name="layers" size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.statValueWhite}>{totalSKU}</Text>
              <Text style={styles.statLabelWhite}>Total SKU</Text>
            </View>
          </View>

          {/* Warning Card (Outlined) */}
          <View style={[styles.statCard, styles.statCardWarning]}>
            <View style={[styles.statIconCircle, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="warning" size={20} color="#FB8C00" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: '#FB8C00' }]}>{lowStockCount}</Text>
              <Text style={styles.statLabel}>Menipis</Text>
            </View>
          </View>

          {/* Critical Card (Outlined) */}
          <View style={[styles.statCard, styles.statCardCritical]}>
            <View style={[styles.statIconCircle, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="alert-circle" size={20} color="#E53935" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: '#E53935' }]}>{criticalCount}</Text>
              <Text style={styles.statLabel}>Kritis</Text>
            </View>
          </View>
        </View>

        {/* --- INVENTORY LIST --- */}
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Inventaris Gudang</Text>
          <TouchableOpacity onPress={() => loadStok(true)}>
            <Ionicons name="refresh-circle" size={28} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Sinkronisasi data...</Text>
          </View>
        ) : (
          <View>
            {filteredItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={50} color="#E0E0E0" />
                <Text style={styles.emptyText}>Bahan tidak ditemukan</Text>
              </View>
            ) : (
              filteredItems.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  {/* Left Side: Icon & Name */}
                  <View style={styles.itemLeft}>
                    <View style={[styles.itemIconBg, { backgroundColor: item.status === 'Aman' ? '#E8F5E9' : '#FFEBEE' }]}>
                      <Ionicons 
                        name="cube-outline" 
                        size={22} 
                        color={item.status === 'Aman' ? Colors.success : Colors.error} 
                      />
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.bahan.nama}</Text>
                      <Text style={styles.itemMinStok}>
                        Min: {item.bahan.stok_minimum_gudang} {item.bahan.satuan}
                      </Text>
                    </View>
                  </View>

                  {/* Right Side: Qty & Status */}
                  <View style={styles.itemRight}>
                    <Text style={styles.itemQty}>
                        {item.stok} <Text style={styles.itemUnit}>{item.bahan.satuan}</Text>
                    </Text>
                    <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) }]}>
                      <Text style={styles.statusPillText}>{item.status}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' }, 
  
  // HEADER
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 24,
    paddingBottom: 35, 
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 0, 
    zIndex: 1,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  welcomeText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: 'white', letterSpacing: 0.5 },
  headerIconBg: { 
    width: 40, height: 40, borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
  },

  // FLOATING SEARCH BAR
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: -27, 
    
    // Shadow Ultimate
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: Colors.text, fontWeight: '600' },

  // CONTENT
  content: { flex: 1, marginTop: 35, paddingHorizontal: 24 }, 

  // STATS GRID
  statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 30 },
  statCard: { 
    flex: 1, borderRadius: 20, padding: 14, 
    justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
    minHeight: 100,
  },
  statCardPrimary: { backgroundColor: Colors.primary },
  statCardWarning: { backgroundColor: 'white', borderWidth: 1, borderColor: '#FFE0B2' },
  statCardCritical: { backgroundColor: 'white', borderWidth: 1, borderColor: '#FFCDD2' },

  // Stat Icons & Text
  statIconCircleWhite: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statIconCircle: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  
  statValueWhite: { fontSize: 20, fontWeight: '800', color: 'white' },
  statLabelWhite: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: 2 },
  
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600', marginTop: 2 },

  // LIST HEADER
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, letterSpacing: 0.5 },

  // ITEM CARD (ULTIMATE)
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 20, 
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#90A4AE', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  itemIconBg: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  itemName: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  itemMinStok: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  
  itemRight: { alignItems: 'flex-end' },
  itemQty: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 5 },
  itemUnit: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { color: 'white', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  loadingContainer: { marginTop: 50, alignItems: 'center' },
  loadingText: { marginTop: 12, color: Colors.textSecondary, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 15, color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
});