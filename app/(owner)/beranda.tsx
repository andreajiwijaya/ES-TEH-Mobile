import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  RefreshControl,
  StatusBar
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { ownerAPI } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage'; // FIX: Ditambahkan untuk ambil user

export default function OwnerDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null); // State User Baru
  
  const [dashData, setDashData] = useState<any>(null);
  const [outletData, setOutletData] = useState<any[]>([]);
  const [monthlyFin, setMonthlyFin] = useState<any>(null);
  const [stats, setStats] = useState({ users: 0, outlets: 0 });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const loadDataCenter = useCallback(async (isRefetching = false) => {
    try {
      if (!isRefetching) setLoading(true);
      
      // Ambil data user dari storage agar sinkron dengan akun
      const userData = await AsyncStorage.getItem('@user_data');
      if (userData) setUser(JSON.parse(userData));

      const today = new Date().toISOString().split('T')[0];
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const [dRes, sRes, fRes, uRes, oRes] = await Promise.all([
        ownerAPI.getDashboard(),
        ownerAPI.getStokDetail(),
        ownerAPI.getLaporanPendapatan(firstDay, today),
        ownerAPI.getUsers(),
        ownerAPI.getOutlets()
      ]);

      const dData = (dRes as any)?.data?.data || (dRes as any)?.data || dRes;
      const sData = (sRes as any)?.data?.data || (sRes as any)?.data || sRes;
      const fData = (fRes as any)?.data || fRes;
      const userList = (uRes as any)?.data?.data || (uRes as any)?.data || uRes;
      const outletList = (oRes as any)?.data?.data || (oRes as any)?.data || oRes;

      setDashData(dData);
      setOutletData(sData?.stok_outlet || []);
      setMonthlyFin(fData);
      setStats({
        users: Array.isArray(userList) ? userList.length : 0,
        outlets: Array.isArray(outletList) ? outletList.length : 0
      });
    } catch (error) {
      console.error("Sync Error:", error);
      Alert.alert('Update Gagal', 'Gagal menyinkronkan data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDataCenter();
    }, [loadDataCenter])
  );

  const formatIDR = (val: any) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(Number(val) || 0);
  };

  const calculateDailyAverage = () => {
    const total = monthlyFin?.total_pendapatan || 0;
    const currentDay = new Date().getDate();
    return total / Math.max(currentDay, 1);
  };

  const Skeleton = ({ width, height, style }: any) => (
    <View style={[{ width, height, backgroundColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden' }, style]}>
      <View style={styles.shimmerEffect} />
    </View>
  );

  const hasUrgentAction = (dashData?.permintaan_pending > 0) || (dashData?.jumlah_stok_kritis > 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      <View style={styles.premiumHeader}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            {/* FIX: Nama disesuaikan dengan user yang login */}
            <Text style={styles.headerTitle}>{user?.username || 'Pak Tardi'}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.avatarContainer}>
              {/* FIX: Avatar Inisial Dinamis */}
              <Text style={styles.avatarText}>
                {user?.username ? user.username.substring(0, 2).toUpperCase() : 'PT'}
              </Text>
              <View style={[styles.onlineStatus, { backgroundColor: loading ? '#94A3B8' : '#22C55E' }]} />
            </View>
          </View>
        </View>
        <View style={styles.headerBottom}>
          <View style={styles.datePill}>
            <Ionicons name="calendar-outline" size={14} color="white" />
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <View style={styles.overviewBadge}>
            <Text style={styles.overviewBadgeText}>Overview Bisnis</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDataCenter(true)} tintColor={Colors.primary} />}
        style={styles.scrollView}
      >
        {loading && !refreshing ? (
          <View style={{ paddingVertical: 10 }}>
            <View style={[styles.finCard, { height: 180, justifyContent: 'center' }]}>
               <Skeleton width="60%" height={15} style={{ marginBottom: 15 }} />
               <Skeleton width="80%" height={35} style={{ marginBottom: 20 }} />
               <Skeleton width="100%" height={40} />
            </View>
            <View style={styles.statsRow}>
               <Skeleton width="30%" height={60} style={{ borderRadius: 15 }} />
               <Skeleton width="30%" height={60} style={{ borderRadius: 15 }} />
               <Skeleton width="30%" height={60} style={{ borderRadius: 15 }} />
            </View>
            <View style={{ paddingHorizontal: 25, marginTop: 30 }}>
               <Skeleton width="40%" height={20} style={{ marginBottom: 15 }} />
               <Skeleton width="100%" height={120} style={{ borderRadius: 20, marginBottom: 15 }} />
               <Skeleton width="100%" height={120} style={{ borderRadius: 20 }} />
            </View>
          </View>
        ) : (
          <>
            {hasUrgentAction && (
              <View style={styles.urgentBar}>
                <Ionicons name="alert-circle" size={18} color="#991B1B" />
                <Text style={styles.urgentText} numberOfLines={1}>
                  {dashData?.permintaan_pending} Permintaan & {dashData?.jumlah_stok_kritis} Stok Kritis
                </Text>
              </View>
            )}

            <View style={styles.finCard}>
              <View style={styles.finMain}>
                <Text style={styles.finLabel}>TOTAL PENDAPATAN BULAN INI</Text>
                <Text style={styles.finValue}>{formatIDR(monthlyFin?.total_pendapatan)}</Text>
                <View style={styles.progressContainer}>
                    <View style={[styles.progressFill, { width: '75%', backgroundColor: Colors.primary }]} />
                </View>
                <Text style={styles.progressNote}>75% dari target bulan lalu</Text>
              </View>
              <View style={styles.finDivider} />
              <View style={styles.finRow}>
                <View style={styles.finSubItem}>
                  <Text style={styles.finSubLabel}>HARI INI</Text>
                  <Text style={styles.finSubValue}>{formatIDR(dashData?.pendapatan_hari_ini)}</Text>
                </View>
                <View style={styles.finSubItem}>
                  <Text style={styles.finSubLabel}>RATA-RATA</Text>
                  <Text style={styles.finSubValue}>{formatIDR(calculateDailyAverage())}</Text>
                </View>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{stats.outlets}</Text>
                <Text style={styles.statLab}>Outlet</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{stats.users}</Text>
                <Text style={styles.statLab}>Karyawan</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statVal, dashData?.permintaan_pending > 0 && {color: '#F97316'}]}>
                  {dashData?.permintaan_pending || 0}
                </Text>
                <Text style={styles.statLab}>Pengajuan</Text>
              </View>
            </View>

            <View style={styles.intelGrid}>
              <View style={styles.intelCard}>
                <View style={styles.intelIconBox}>
                    <Ionicons name="people-outline" size={16} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.intelLabel}>RASIO STAF</Text>
                  <Text style={styles.intelValue}>{stats.outlets > 0 ? (stats.users / stats.outlets).toFixed(1) : 0}</Text>
                </View>
              </View>
              <View style={styles.intelCard}>
                <View style={[styles.intelIconBox, {backgroundColor: '#ECFDF5'}]}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
                </View>
                <View>
                  <Text style={styles.intelLabel}>HEALTH STOK</Text>
                  <Text style={[styles.intelValue, {color: '#10B981'}]}>
                    {dashData?.stok_gudang?.length > 0 
                      ? (((dashData.stok_gudang.length - dashData.jumlah_stok_kritis) / dashData.stok_gudang.length) * 100).toFixed(0) 
                      : 0}%
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Monitoring Stok Gudang</Text>
                <View style={styles.liveBadge}><View style={styles.pulse} /><Text style={styles.liveText}>REAL-TIME</Text></View>
              </View>
              <View style={styles.stockGrid}>
                {(dashData?.stok_gudang || []).map((item: any, index: number) => (
                  <View key={index} style={styles.stockBox}>
                    <Text style={styles.stockLabel} numberOfLines={1}>{item.bahan?.nama}</Text>
                    <Text style={[styles.stockValue, item.is_kritis && { color: '#EF4444' }]}>
                      {item.stok} <Text style={styles.stockUnit}>{item.bahan?.satuan.charAt(0)}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Monitoring Cabang</Text>
              {outletData.map((ot, idx) => (
                <View key={idx} style={styles.branchCard}>
                  <View style={styles.branchHeader}>
                    <View style={styles.branchNameRow}>
                      <View style={[styles.statusLamp, { backgroundColor: ot.jumlah_stok_kritis > 0 ? '#EF4444' : '#22C55E' }]} />
                      <Text style={styles.branchName} numberOfLines={1}>{ot.nama_outlet}</Text>
                    </View>
                    <View style={[styles.statusPill, ot.jumlah_stok_kritis > 0 ? { backgroundColor: '#FEF2F2' } : { backgroundColor: '#F0FDF4' }]}>
                      <Text style={[styles.statusPillText, ot.jumlah_stok_kritis > 0 ? { color: '#EF4444' } : { color: '#22C55E' }]}>
                        {ot.jumlah_stok_kritis > 0 ? `${ot.jumlah_stok_kritis} Kritis` : 'Aman'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.branchDivider} />
                  <View style={styles.miniStokRow}>
                    {ot.stok.slice(0, 4).map((s: any, i: number) => (
                      <View key={i} style={styles.branchStockItem}>
                        <Text style={styles.branchStockName} numberOfLines={1}>{s.nama_bahan}</Text>
                        <Text style={[styles.branchStockQty, s.status === 'Kritis' && { color: '#EF4444' }]}>{s.stok}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  premiumHeader: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 45,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flex: 1 },
  greetingText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  headerTitle: { color: 'white', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  headerRight: { justifyContent: 'center', alignItems: 'center' },
  avatarContainer: {
    width: 54, height: 54, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
  },
  avatarText: { color: 'white', fontSize: 20, fontWeight: '900' },
  onlineStatus: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: Colors.primary },
  headerBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  datePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.12)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, gap: 6 },
  dateText: { color: 'white', fontSize: 11, fontWeight: '700' },
  overviewBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  overviewBadgeText: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  scrollView: { flex: 1, marginTop: -35 },
  shimmerEffect: { flex: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  urgentBar: { marginHorizontal: 25, marginBottom: 15, backgroundColor: '#FEF2F2', padding: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#FEE2E2' },
  urgentText: { fontSize: 11, color: '#991B1B', fontWeight: '800', flex: 1 },
  finCard: { marginHorizontal: 25, backgroundColor: 'white', borderRadius: 30, padding: 25, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15 },
  finMain: { marginBottom: 20 },
  finLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  finValue: { fontSize: 32, fontWeight: '900', color: '#1E293B' },
  progressContainer: { height: 7, backgroundColor: '#F1F5F9', borderRadius: 4, marginTop: 18, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressNote: { fontSize: 10, color: '#94A3B8', marginTop: 8, fontWeight: '700' },
  finDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
  finRow: { flexDirection: 'row' },
  finSubItem: { flex: 1, alignItems: 'center' },
  finSubLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '800', marginBottom: 4 },
  finSubValue: { fontSize: 16, fontWeight: '800', color: '#475569' },
  statsRow: { flexDirection: 'row', marginHorizontal: 25, marginTop: 20, backgroundColor: 'white', padding: 15, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  statLab: { fontSize: 10, color: '#94A3B8', fontWeight: '700', marginTop: 2 },
  statDivider: { width: 1, height: 20, backgroundColor: '#F1F5F9' },
  intelGrid: { flexDirection: 'row', paddingHorizontal: 25, gap: 12, marginTop: 25 },
  intelCard: { flex: 1, backgroundColor: 'white', padding: 18, borderRadius: 25, borderWidth: 1, borderColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', gap: 12 },
  intelIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  intelLabel: { fontSize: 8, fontWeight: '900', color: '#94A3B8', marginBottom: 2 },
  intelValue: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  section: { marginTop: 35, paddingHorizontal: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  pulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  liveText: { fontSize: 9, fontWeight: '900', color: '#22C55E' },
  stockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stockBox: { width: '31.3%', backgroundColor: 'white', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'center' },
  stockLabel: { fontSize: 10, color: '#64748B', fontWeight: '700', marginBottom: 6 },
  stockValue: { fontSize: 15, fontWeight: '900', color: '#1E293B' },
  stockUnit: { fontSize: 9, color: '#94A3B8' },
  branchCard: { backgroundColor: 'white', padding: 22, borderRadius: 30, marginBottom: 15, borderWidth: 1, borderColor: '#F1F5F9' },
  branchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  branchNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  statusLamp: { width: 10, height: 10, borderRadius: 5 },
  branchName: { fontSize: 17, fontWeight: '800', color: '#1E293B', flex: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  statusPillText: { fontSize: 10, fontWeight: '900' },
  branchDivider: { height: 1, backgroundColor: '#F8F8F8', marginVertical: 15 },
  miniStokRow: { flexDirection: 'row', justifyContent: 'space-between' },
  branchStockItem: { width: '23%', alignItems: 'center' },
  branchStockName: { fontSize: 8.5, color: '#94A3B8', marginBottom: 4, fontWeight: 'bold', textAlign: 'center' },
  branchStockQty: { fontSize: 14, fontWeight: '800', color: '#475569' }
});