import { Ionicons } from '@expo/vector-icons';
import React, { useState, useCallback } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router'; 
import { Colors } from '../../constants/Colors';
import { Bahan } from '../../types'; 
import { gudangAPI } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StockItem {
  id: string;
  bahan_id: number;
  stok: number;
  bahan: Bahan;
  status: 'Aman' | 'Menipis' | 'Kritis';
}

export default function WarehouseOverviewScreen() {
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  const loadUserData = async () => {
    const userData = await AsyncStorage.getItem('@user_data');
    if (userData) setUser(JSON.parse(userData));
  };

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
      console.log(error);
      Alert.alert('Gagal Memuat', 'Terjadi kesalahan saat mengambil data stok.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Sync Otomatis saat layar difokuskan
  useFocusEffect(
    useCallback(() => {
      loadUserData();
      loadStok();
    }, [loadStok])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadStok(true);
  };

  const filteredItems = stockItems.filter(item =>
    item.bahan.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSKU = stockItems.length;
  const lowStockCount = stockItems.filter(item => item.status === 'Menipis').length;
  const criticalCount = stockItems.filter(item => item.status === 'Kritis').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aman': return Colors.success;
      case 'Menipis': return '#FB8C00'; 
      case 'Kritis': return '#E53935'; 
      default: return Colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* --- HEADER --- */}
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
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* --- QUICK ACCESS (RE-DESIGNED) --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Akses Cepat</Text>
          <View style={styles.shortcutGrid}>
            <TouchableOpacity 
              style={styles.shortcutBtn} 
              onPress={() => router.push('/(gudang)/bahan')}
            >
              <View style={[styles.shortcutIcon, {backgroundColor: '#E8F5E9'}]}>
                <Ionicons name="cube" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.shortcutText}>Bahan</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.shortcutBtn} 
              onPress={() => router.push('/(gudang)/opname')}
            >
              <View style={[styles.shortcutIcon, {backgroundColor: '#FFF3E0'}]}>
                <Ionicons name="clipboard" size={24} color="#FB8C00" />
              </View>
              <Text style={styles.shortcutText}>Opname</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- STATS GRID --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Stok</Text>
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, styles.statCardPrimary]}>
              <Text style={styles.statValueWhite}>{totalSKU}</Text>
              <Text style={styles.statLabelWhite}>Total SKU</Text>
            </View>

            <View style={[styles.statCard, styles.statCardWarning]}>
              <Text style={[styles.statValue, { color: '#FB8C00' }]}>{lowStockCount}</Text>
              <Text style={styles.statLabel}>Menipis</Text>
            </View>

            <View style={[styles.statCard, styles.statCardCritical]}>
              <Text style={[styles.statValue, { color: '#E53935' }]}>{criticalCount}</Text>
              <Text style={styles.statLabel}>Kritis</Text>
            </View>
          </View>
        </View>

        {/* --- INVENTORY LIST --- */}
        <View style={styles.section}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Inventaris Gudang</Text>
            <TouchableOpacity onPress={() => loadStok(true)}>
              <Ionicons name="refresh-circle" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <View>
              {filteredItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={40} color="#E0E0E0" />
                  <Text style={styles.emptyText}>Data tidak ditemukan</Text>
                </View>
              ) : (
                filteredItems.map((item) => (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemLeft}>
                      <View style={[styles.itemIconBg, { backgroundColor: item.status === 'Aman' ? '#F1F8E9' : '#FFEBEE' }]}>
                        <Ionicons 
                          name="beaker-outline" 
                          size={20} 
                          color={item.status === 'Aman' ? Colors.success : Colors.error} 
                        />
                      </View>
                      <View>
                        <Text style={styles.itemName}>{item.bahan.nama}</Text>
                        <Text style={styles.itemMinStok}>Min: {item.bahan.stok_minimum_gudang} {item.bahan.satuan}</Text>
                      </View>
                    </View>

                    <View style={styles.itemRight}>
                      <Text style={styles.itemQty}>{item.stok} {item.bahan.satuan}</Text>
                      <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusPillText}>{item.status}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 24,
    paddingBottom: 35, 
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  welcomeText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: 'white' },
  headerIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 15,
    paddingHorizontal: 16, height: 50, marginBottom: -60, elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '500' },
  content: { flex: 1, marginTop: 40 },
  section: { paddingHorizontal: 24, marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 15 },
  shortcutGrid: { flexDirection: 'row', gap: 15 },
  shortcutBtn: { 
    flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 20, alignItems: 'center',
    borderWidth: 1, borderColor: '#F0F0F0', elevation: 2
  },
  shortcutIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  shortcutText: { fontSize: 14, fontWeight: '700', color: '#444' },
  statsContainer: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 18, padding: 15, elevation: 2 },
  statCardPrimary: { backgroundColor: Colors.primary },
  statCardWarning: { backgroundColor: 'white', borderWidth: 1, borderColor: '#FFE0B2' },
  statCardCritical: { backgroundColor: 'white', borderWidth: 1, borderColor: '#FFCDD2' },
  statValueWhite: { fontSize: 20, fontWeight: '800', color: 'white' },
  statLabelWhite: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#777', fontWeight: '600' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemCard: {
    backgroundColor: 'white', borderRadius: 18, padding: 15, marginBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#F0F0F0'
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  itemIconBg: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemName: { fontSize: 15, fontWeight: '700', color: '#333' },
  itemMinStok: { fontSize: 11, color: '#999', marginTop: 2 },
  itemRight: { alignItems: 'flex-end' },
  itemQty: { fontSize: 15, fontWeight: '800', color: '#333', marginBottom: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { color: 'white', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  emptyContainer: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { marginTop: 10, color: '#AAA', fontWeight: '600' },
  loadingText: { marginTop: 10, color: '#777' }
});