import { Ionicons } from '@expo/vector-icons';
import React, { useState, useCallback } from 'react'; // FIX: useEffect diganti useFocusEffect
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform
} from 'react-native';
import { useFocusEffect } from 'expo-router'; // FIX: Tambahkan import ini
import { Colors } from '../../constants/Colors';
import { PermintaanStok } from '../../types';
import { gudangAPI } from '../../services/api';

export default function ApprovalPermintaanScreen() {
  // --- STATE ---
  const [requests, setRequests] = useState<PermintaanStok[]>([]);
  const [filter, setFilter] = useState<'pending' | 'history'>('pending');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // --- LOAD DATA ---
  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await gudangAPI.getPermintaanStok();
      
      if (response.data && Array.isArray(response.data)) {
        // Normalize status to lowercase to avoid mismatches like 'PENDING'|'Pending' etc.
        const normalized = (response.data as any[]).map((r: any) => ({
          ...r,
          status: (r.status || '').toString().toLowerCase(),
        }));
        // Sort: newest (highest id) first
        const sorted = normalized.sort((a: any, b: any) => b.id - a.id);
        setRequests(sorted);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal memuat permintaan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // --- USE FOCUS EFFECT (FIX) ---
  // Memastikan inbox permintaan selalu terupdate otomatis saat layar dibuka
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  // Filter Data Sesuai Tab
  const isPendingStatus = (s?: string) => {
    const st = (s || '').toString().toLowerCase();
    if (!st) return true; // treat empty/unknown as pending for review
    return (
      st.includes('pending') ||
      st.includes('menunggu') ||
      st.includes('wait') ||
      st.includes('requested') ||
      st.includes('diajukan') ||
      st.includes('ajukan') ||
      st === 'pending'
    );
  };

  const filteredData = requests.filter(item => {
    if (filter === 'pending') return isPendingStatus(item.status);
    return !isPendingStatus(item.status);
  });

  // --- ACTIONS ---

  const handleProcess = async (id: number, status: 'approved' | 'rejected', itemName: string) => {
    Alert.alert(
      status === 'approved' ? 'Setujui Permintaan?' : 'Tolak Permintaan?',
      `Anda akan ${status === 'approved' ? 'menyetujui' : 'menolak'} permintaan stok ${itemName}.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: status === 'approved' ? 'Setujui' : 'Tolak',
          style: status === 'approved' ? 'default' : 'destructive',
            onPress: async () => {
            setProcessingId(id);
            try {
              // Map client-side action tokens to backend-expected English status values
              const backendStatus = status === 'approved' ? 'approved' : 'rejected';
              const payload = { status: backendStatus } as any;
              const res = await gudangAPI.updatePermintaanStok(id, payload);
              
              if (res.error) throw new Error(res.error);
              
              Alert.alert('Sukses', `Permintaan berhasil di-${status}.`);
              loadData(true); 
            } catch (error: any) {
              Alert.alert('Gagal', error.message);
            } finally {
              setProcessingId(null);
            }
          }
        }
      ]
    );
  };

  // Helper UI
  const getStatusBadge = (status: string) => {
    const st = (status || '').toString().toLowerCase();
    switch(st) {
      case 'pending':
      case 'menunggu':
      case 'requested':
        return { bg: '#FFF8E1', text: '#FF8F00', label: 'MENUNGGU' };
      case 'approved':
      case 'completed':
        return { bg: '#E8F5E9', text: '#2E7D32', label: 'DISETUJUI' };
      case 'rejected':
      case 'cancelled':
      case 'ditolak':
        return { bg: '#FFEBEE', text: '#C62828', label: 'DITOLAK' };
      default:
        return { bg: '#F5F5F5', text: '#757575', label: (status || '').toString().toUpperCase() };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    } catch { 
      return dateString;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Permintaan Stok</Text>
            <Text style={styles.headerSubtitle}>Approval request dari outlet</Text>
          </View>
          <View style={styles.headerIconBg}>
            <Ionicons name="git-pull-request" size={24} color={Colors.primary} />
          </View>
        </View>
      </View>

      <View style={styles.content}>
        
        {/* TABS FILTER */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, filter === 'pending' && styles.tabActive]} 
            onPress={() => setFilter('pending')}
          >
              <Text style={[styles.tabText, filter === 'pending' && styles.tabTextActive]}>
                Pending ({requests.filter(r => isPendingStatus(r.status)).length})
              </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, filter === 'history' && styles.tabActive]} 
            onPress={() => setFilter('history')}
          >
            <Text style={[styles.tabText, filter === 'history' && styles.tabTextActive]}>
              Riwayat
            </Text>
          </TouchableOpacity>
        </View>

        {/* LIST */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Memuat data...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={item => item.id.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Ionicons name={filter === 'pending' ? "checkmark-done-circle-outline" : "time-outline"} size={50} color="#ccc" />
                <Text style={styles.emptyText}>
                  {filter === 'pending' ? 'Inbox kosong' : 'Belum ada riwayat'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const badge = getStatusBadge(item.status);
              const isProcessing = processingId === item.id;
              const itemDate = (item as any).created_at || (item as any).tanggal || new Date().toISOString();

              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.outletInfo}>
                      <Ionicons name="storefront-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.outletName}>Outlet #{item.outlet_id}</Text>
                    </View>
                    <Text style={styles.dateText}>{formatDate(itemDate)}</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.itemRow}>
                    <View style={styles.itemIcon}>
                      <Text style={styles.itemIconText}>
                        {item.bahan?.nama?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.itemName}>{item.bahan?.nama || 'Unknown Item'}</Text>
                      <Text style={styles.itemQty}>
                        Jumlah: <Text style={{color: Colors.primary, fontWeight:'700'}}>{item.jumlah} {item.bahan?.satuan}</Text>
                      </Text>
                    </View>
                    
                    {filter === 'history' && (
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
                      </View>
                    )}
                  </View>

                  {filter === 'pending' && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity 
                        style={[styles.btnAction, styles.btnReject]} 
                        onPress={() => handleProcess(item.id, 'rejected', item.bahan?.nama || 'Item')}
                        disabled={isProcessing}
                      >
                        <Ionicons name="close-outline" size={18} color="#D32F2F" />
                        <Text style={styles.btnRejectText}>Tolak</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.btnAction, styles.btnApprove]} 
                        onPress={() => handleProcess(item.id, 'approved', item.bahan?.nama || 'Item')}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-outline" size={18} color="white" />
                            <Text style={styles.btnApproveText}>Terima</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 25,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: 'white', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  headerIconBg: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: 20 },
  tabContainer: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: '#F0F0F0' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#E3F2FD' },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  centerContainer: { alignItems: 'center', marginTop: 60 },
  loadingText: { marginTop: 10, color: Colors.textSecondary },
  emptyText: { marginTop: 15, fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  card: { 
    backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#F0F0F0', elevation: 2 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  outletInfo: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  outletName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  dateText: { fontSize: 11, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  itemIconText: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  itemName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  itemQty: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  btnAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  btnReject: { backgroundColor: '#FFEBEE' },
  btnRejectText: { color: '#D32F2F', fontWeight: '700', fontSize: 13 },
  btnApprove: { backgroundColor: Colors.primary },
  btnApproveText: { color: 'white', fontWeight: '700', fontSize: 13 },
});