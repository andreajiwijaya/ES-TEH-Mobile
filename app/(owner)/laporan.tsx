import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { authAPI, ownerAPI } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Interface Lokal untuk Laporan UI
interface ReportItem {
  id: string;
  jenis: 'penjualan' | 'stok' | 'keuangan' | 'gudang';
  tanggal_dibuat: Date;
  judul: string;
  data_ringkasan?: string;
}

export default function LaporanScreen() {
  const router = useRouter();
  
  // State
  const [selectedType, setSelectedType] = useState<'all' | 'penjualan' | 'stok' | 'keuangan' | 'gudang'>('all');
  const [reports, setReports] = useState<ReportItem[]>([]); // Data lokal sementara
  
  // HAPUS: loading state yang tidak terpakai
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  
  // User Profile
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUserData();
    // Load dummy reports or fetch history if available
    setReports([
      {
        id: 'LAP-001',
        jenis: 'penjualan',
        tanggal_dibuat: new Date(),
        judul: 'Laporan Penjualan Harian',
        data_ringkasan: 'Total Pendapatan: Rp 2.500.000'
      }
    ]);
  }, []);

  const loadUserData = async () => {
    const userData = await AsyncStorage.getItem('@user_data');
    if (userData) setUser(JSON.parse(userData));
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Logic refresh jika ada API history laporan
    setTimeout(() => setRefreshing(false), 1000);
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

  const filteredReports = selectedType === 'all'
    ? reports
    : reports.filter(r => r.jenis === selectedType);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getReportIcon = (jenis: string) => {
    switch (jenis) {
      case 'penjualan': return 'receipt-outline';
      case 'stok': return 'cube-outline';
      case 'keuangan': return 'cash-outline';
      case 'gudang': return 'storefront-outline';
      default: return 'document-text-outline';
    }
  };

  const getReportLabel = (jenis: string) => {
    switch (jenis) {
      case 'penjualan': return 'Penjualan';
      case 'stok': return 'Stok';
      case 'keuangan': return 'Keuangan';
      case 'gudang': return 'Gudang';
      default: return jenis;
    }
  };

  const getReportColor = (jenis: string) => {
    switch (jenis) {
      case 'penjualan': return Colors.primary;
      case 'stok': return Colors.warning;
      case 'keuangan': return Colors.success;
      case 'gudang': return '#5D4037'; // Brownish for Gudang
      default: return Colors.textSecondary;
    }
  };

  const handleDownload = async (report: ReportItem, format: 'csv' | 'pdf') => {
    try {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      if (format === 'csv') {
        const response = await ownerAPI.exportLaporan(startDate, endDate);
        if (response.error) {
          Alert.alert('Error', response.error);
          return;
        }
        // Simulasi download sukses
        Alert.alert('Sukses', `Laporan ${report.id} berhasil diekspor ke CSV.`);
      } else {
        Alert.alert('Info', 'Fitur PDF akan segera tersedia');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal mengekspor laporan');
    }
  };

  const handleGenerate = async (type: string) => {
    setGenerating(type);
    try {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      // Panggil API untuk mendapatkan data real
      let summaryData = "Data tidak tersedia";
      
      if (type === 'penjualan' || type === 'keuangan') {
          const response = await ownerAPI.getLaporanPendapatan(startDate, endDate);
          if (response.data) {
              // Jika response array
              if (Array.isArray(response.data)) {
                  const total = response.data.reduce((acc: number, curr: any) => acc + (parseInt(curr.total_pendapatan) || 0), 0);
                  summaryData = `Total Pendapatan: Rp ${total.toLocaleString('id-ID')}`;
              } else {
                  // Jika object
                  const data = response.data as any; // Cast to avoid TS error
                  summaryData = `Pendapatan: Rp ${(data.total_pendapatan || 0).toLocaleString('id-ID')}`;
              }
          }
      } else {
          summaryData = `Laporan ${type} generated.`;
      }

      const newReport: ReportItem = {
        id: `LAP-${Math.floor(Math.random() * 10000)}`,
        jenis: type as any,
        tanggal_dibuat: new Date(),
        judul: `Laporan ${getReportLabel(type)} ${new Date().toLocaleDateString('id-ID', { month: 'long' })}`,
        data_ringkasan: summaryData
      };

      setReports([newReport, ...reports]);
      Alert.alert('Sukses', 'Laporan berhasil dibuat');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal membuat laporan');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="document-text" size={24} color={Colors.backgroundLight} />
            <Text style={styles.headerTitle}>Laporan Bisnis</Text>
          </View>
          <TouchableOpacity 
            style={styles.userInfo} 
            onPress={() => setShowProfileMenu(true)} 
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.username ? user.username.substring(0, 2).toUpperCase() : 'OW'}
              </Text>
            </View>
            <View>
              <Text style={styles.userName}>{user?.username || 'Owner'}</Text>
              <Text style={styles.userRole}>Pemilik</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={Colors.backgroundLight} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>Pusat Laporan</Text>
          <Text style={styles.subtitle}>Generate dan unduh laporan kinerja bisnis Anda.</Text>
        </View>

        {/* GENERATE SECTION */}
        <View style={styles.generateSection}>
          <Text style={styles.sectionTitle}>Buat Laporan Baru</Text>
          <View style={styles.generateGrid}>
            <TouchableOpacity
              style={[styles.generateButton, { borderColor: Colors.primary }]}
              onPress={() => handleGenerate('penjualan')}
              disabled={!!generating}
            >
              {generating === 'penjualan' ? <ActivityIndicator color={Colors.primary} /> : (
                <>
                    <Ionicons name="receipt-outline" size={28} color={Colors.primary} />
                    <Text style={styles.generateButtonText}>Penjualan</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.generateButton, { borderColor: Colors.warning }]}
              onPress={() => handleGenerate('stok')}
              disabled={!!generating}
            >
              {generating === 'stok' ? <ActivityIndicator color={Colors.warning} /> : (
                <>
                    <Ionicons name="cube-outline" size={28} color={Colors.warning} />
                    <Text style={styles.generateButtonText}>Stok</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.generateButton, { borderColor: Colors.success }]}
              onPress={() => handleGenerate('keuangan')}
              disabled={!!generating}
            >
              {generating === 'keuangan' ? <ActivityIndicator color={Colors.success} /> : (
                <>
                    <Ionicons name="cash-outline" size={28} color={Colors.success} />
                    <Text style={styles.generateButtonText}>Keuangan</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.generateButton, { borderColor: '#5D4037' }]}
              onPress={() => handleGenerate('gudang')}
              disabled={!!generating}
            >
              {generating === 'gudang' ? <ActivityIndicator color="#5D4037" /> : (
                <>
                    <Ionicons name="storefront-outline" size={28} color="#5D4037" />
                    <Text style={styles.generateButtonText}>Gudang</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* FILTER SECTION */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {['all', 'penjualan', 'stok', 'keuangan', 'gudang'].map((type) => (
                <TouchableOpacity
                    key={type}
                    style={[
                        styles.filterPill,
                        selectedType === type && styles.filterPillActive
                    ]}
                    onPress={() => setSelectedType(type as any)}
                >
                    <Text style={[
                        styles.filterPillText,
                        selectedType === type && styles.filterPillTextActive
                    ]}>
                        {type === 'all' ? 'Semua' : getReportLabel(type)}
                    </Text>
                </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* REPORT LIST */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Riwayat Laporan</Text>

          {filteredReports.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>Belum ada laporan</Text>
            </View>
          ) : (
            <FlatList
              data={filteredReports}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.reportCard}>
                  <View style={styles.reportHeader}>
                    <View style={[styles.reportIconCircle, { backgroundColor: getReportColor(item.jenis) + '20' }]}>
                        <Ionicons name={getReportIcon(item.jenis) as any} size={24} color={getReportColor(item.jenis)} />
                    </View>
                    <View style={styles.reportInfo}>
                        <Text style={styles.reportTitle}>{item.judul}</Text>
                        <Text style={styles.reportDate}>{formatDate(item.tanggal_dibuat)} • #{item.id}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.reportContent}>
                      <Text style={styles.reportSummary}>{item.data_ringkasan}</Text>
                  </View>

                  <View style={styles.reportActions}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.btnCsv]}
                        onPress={() => handleDownload(item, 'csv')}
                    >
                        <Ionicons name="download-outline" size={16} color={Colors.primary} />
                        <Text style={styles.btnCsvText}>CSV</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.btnPdf]}
                        onPress={() => handleDownload(item, 'pdf')}
                    >
                        <Ionicons name="document-outline" size={16} color={Colors.error} />
                        <Text style={styles.btnPdfText}>PDF</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>

      {/* Profile Menu Modal */}
      <Modal visible={showProfileMenu} transparent animationType="fade" onRequestClose={() => setShowProfileMenu(false)}>
        <TouchableOpacity style={styles.profileModalOverlay} activeOpacity={1} onPress={() => setShowProfileMenu(false)}>
          <View style={styles.profileMenu}>
            <TouchableOpacity style={styles.profileMenuItem} onPress={handleLogout}>
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
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: 'bold', color: Colors.primary },
  userName: { fontSize: 14, fontWeight: 'bold', color: 'white' },
  userRole: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  content: { flex: 1, padding: 20 },
  titleSection: { marginBottom: 25 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 5 },

  // Generate Section
  generateSection: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 15 },
  generateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  generateButton: {
    width: '47%',
    aspectRatio: 1.6,
    backgroundColor: 'white',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4
  },
  generateButtonText: { marginTop: 8, fontSize: 13, fontWeight: '600', color: Colors.text },

  // Filter Section
  filterSection: { marginBottom: 20 },
  filterScroll: { paddingBottom: 10 },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary
  },
  filterPillText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  filterPillTextActive: { color: 'white' },

  // List Section
  listSection: { paddingBottom: 40 },
  reportCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4
  },
  reportHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  reportIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  reportInfo: { flex: 1 },
  reportTitle: { fontSize: 15, fontWeight: 'bold', color: Colors.text },
  reportDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  
  reportContent: { 
    backgroundColor: '#F9F9F9', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 15 
  },
  reportSummary: { fontSize: 14, color: Colors.text, fontWeight: '500' },

  reportActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 10, 
    borderRadius: 8, 
    borderWidth: 1,
    gap: 6
  },
  btnCsv: { borderColor: Colors.primary, backgroundColor: '#F0F9FF' },
  btnCsvText: { color: Colors.primary, fontWeight: 'bold', fontSize: 13 },
  btnPdf: { borderColor: Colors.error, backgroundColor: '#FFF0F0' },
  btnPdfText: { color: Colors.error, fontWeight: 'bold', fontSize: 13 },

  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 10, color: Colors.textSecondary, fontSize: 16 },

  // Profile Menu
  profileModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 20 },
  profileMenu: { backgroundColor: 'white', borderRadius: 12, minWidth: 160, padding: 5, elevation: 8 },
  profileMenuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  profileMenuItemText: { color: Colors.error, fontWeight: 'bold' },
});