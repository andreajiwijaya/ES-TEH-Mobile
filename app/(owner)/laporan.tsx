import { Ionicons } from '@expo/vector-icons';
import React, { useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { ownerAPI } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// FIX: Kompatibilitas Expo SDK 54
import * as FileSystem from 'expo-file-system/legacy'; 
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

interface ReportItem {
  id: string;
  jenis: 'penjualan' | 'stok' | 'keuangan' | 'gudang';
  tanggal_dibuat: string; 
  judul: string;
  periode: string;
  startDate: string;
  endDate: string;
  data_ringkasan?: string;
}

export default function LaporanScreen() {
  // --- STATE ---
  const [selectedType, setSelectedType] = useState<'all' | 'penjualan' | 'stok' | 'keuangan' | 'gudang'>('all');
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null); // State User Baru

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempSelectedCategory, setTempSelectedCategory] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [processing, setProcessing] = useState(false);

  // --- PERSISTENCE LOGIC UTUH ---
  const loadReports = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      // SINKRONISASI DATA USER UNTUK AVATAR
      const userData = await AsyncStorage.getItem('@user_data');
      if (userData) setUser(JSON.parse(userData));

      const savedReports = await AsyncStorage.getItem('@saved_reports');
      if (savedReports) {
        setReports(JSON.parse(savedReports));
      }
    } catch (err) {
      console.error("Gagal load history:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports(true);
    }, [loadReports])
  );

  const saveReportsToStorage = async (newReports: ReportItem[]) => {
    try {
      await AsyncStorage.setItem('@saved_reports', JSON.stringify(newReports));
    } catch (err) {
      console.error("Gagal simpan storage:", err);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReports(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const stats = useMemo(() => {
    return {
      total: reports.length,
      penjualan: reports.filter(r => r.jenis === 'penjualan' || r.jenis === 'keuangan').length,
      stok: reports.filter(r => r.jenis === 'stok' || r.jenis === 'gudang').length
    };
  }, [reports]);

  // --- ACTIONS ---
  const handleDeleteReport = (id: string) => {
    Alert.alert('Hapus Riwayat', 'Yakin ingin menghapus laporan ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => {
          const updated = reports.filter(r => r.id !== id);
          setReports(updated);
          saveReportsToStorage(updated);
        }
      }
    ]);
  };

  const handleConfirmGenerate = async () => {
    if (!tempSelectedCategory) return;
    setProcessing(true);

    try {
      const endDate = new Date();
      const startDate = new Date();
      let periodeLabel = '';

      if (selectedPeriod === 'today') {
        periodeLabel = 'Hari Ini';
      } else if (selectedPeriod === 'week') {
        periodeLabel = '7 Hari Terakhir';
        startDate.setDate(startDate.getDate() - 7);
      } else if (selectedPeriod === 'month') {
        periodeLabel = 'Bulan Ini';
        startDate.setDate(1); 
      }

      const strStartDate = startDate.toISOString().split('T')[0];
      const strEndDate = endDate.toISOString().split('T')[0];
      let summaryData = "Data tidak tersedia";
      let reportJudul = "";

      if (tempSelectedCategory === 'penjualan' || tempSelectedCategory === 'keuangan') {
          reportJudul = tempSelectedCategory === 'penjualan' ? "Laporan Penjualan" : "Laporan Keuangan";
          const response = await ownerAPI.getLaporanPendapatan(strStartDate, strEndDate);
          if (response.data) {
              const total = response.data.total_pendapatan || 0;
              summaryData = `Total Omset: Rp ${total.toLocaleString('id-ID')}`;
          }
      } else if (tempSelectedCategory === 'stok') {
          reportJudul = "Laporan Stok Outlet";
          const response = await ownerAPI.getStokDetail();
          if (response.data?.data) {
              summaryData = `Stok Outlet: ${response.data.data.total_stok_kritis_outlet || 0} bahan kritis.`;
          }
      } else if (tempSelectedCategory === 'gudang') {
          reportJudul = "Laporan Persediaan Gudang";
          const response = await ownerAPI.getStokDetail();
          if (response.data?.data) {
              summaryData = `Stok Gudang: ${response.data.data.total_stok_kritis_gudang || 0} bahan kritis.`;
          }
      }

      const newReport: ReportItem = {
        id: `LAP-${Date.now()}`,
        jenis: tempSelectedCategory as any,
        tanggal_dibuat: new Date().toISOString(),
        judul: reportJudul,
        periode: periodeLabel,
        startDate: strStartDate,
        endDate: strEndDate,
        data_ringkasan: summaryData
      };

      const updated = [newReport, ...reports];
      setReports(updated);
      await saveReportsToStorage(updated);
      setShowFilterModal(false);
      Alert.alert('Sukses', 'Laporan berhasil dibuat.');
    } catch {
      Alert.alert('Gagal', 'Server tidak merespon.');
    } finally {
      setProcessing(false);
    }
  };

  const generatePDF = async (report: ReportItem) => {
    try {
      let detailContent = '';
      const responseStok = await ownerAPI.getStokDetail();
      const detailStok = responseStok.data?.data;

      if (report.jenis === 'keuangan') {
        detailContent = `
          <div style="text-align: center; margin-top: 50px; padding: 40px; border: 2px solid ${Colors.primary}; border-radius: 20px;">
            <p style="font-size: 18px; color: #666; margin-bottom: 10px;">TOTAL OMSET KEUANGAN</p>
            <h1 style="font-size: 48px; color: #1E293B; margin: 0;">${report.data_ringkasan?.split(': ')[1] || 'Rp 0'}</h1>
            <p style="font-size: 14px; color: #94A3B8; margin-top: 20px;">Periode: ${report.periode}</p>
          </div>
        `;
      } else if (report.jenis === 'penjualan') {
        const res = await ownerAPI.getLaporanPendapatan(report.startDate, report.endDate);
        const detailHarian = res.data?.detail_per_hari || [];
        detailContent = `
          <h3 style="color: ${Colors.primary}; border-left: 5px solid ${Colors.primary}; padding-left: 10px;">Rincian Penjualan Harian</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr style="background-color: #f8f9fa;">
              <th style="border: 1px solid #ddd; padding: 12px;">Tanggal</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Pemasukan</th>
            </tr>
            ${detailHarian.map((h: any) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 12px;">${h.tanggal}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">Rp ${(h.total_pemasukan || 0).toLocaleString('id-ID')}</td>
              </tr>
            `).join('')}
            <tr style="background-color: #f0fdf4; font-weight: bold;">
              <td style="border: 1px solid #ddd; padding: 12px;">GRAND TOTAL</td>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: right;">Rp ${(res.data?.total_pendapatan || 0).toLocaleString('id-ID')}</td>
            </tr>
          </table>
        `;
      } else if (report.jenis === 'stok') {
        const outlets = detailStok?.stok_outlet || [];
        detailContent = outlets.map((ot: any) => `
          <div style="margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 10px;">
            <h3 style="color: #2E7D32;">Cabang: ${ot.nama_outlet}</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background-color: #f2f2f2;"><th>Bahan</th><th>Stok</th><th>Status</th></tr>
              ${ot.stok.map((s: any) => `<tr><td>${s.nama_bahan}</td><td>${s.stok}</td><td style="color: ${s.status === 'Kritis' ? 'red' : 'green'}; font-weight:bold;">${s.status}</td></tr>`).join('')}
            </table>
          </div>`).join('');
      } else if (report.jenis === 'gudang') {
        const gudangData = detailStok?.stok_gudang || [];
        detailContent = `
          <h3 style="color: #558B2F;">Inventaris Gudang Pusat</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #F1F8E9;"><th>Bahan Baku</th><th style="text-align:center">Sisa</th><th style="text-align:center">Status</th></tr>
            ${gudangData.map((g: any) => `<tr><td>${g.nama_bahan}</td><td style="text-align:center">${g.stok} ${g.satuan}</td><td style="text-align:center; font-weight:bold; color: ${g.stok <= 10 ? 'red' : 'green'};">${g.stok <= 10 ? 'KRITIS' : 'AMAN'}</td></tr>`).join('')}
          </table>`;
      }

      const html = `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #333; }
              .header { text-align: center; border-bottom: 3px solid ${Colors.primary}; padding-bottom: 10px; margin-bottom: 20px; }
              .meta { margin-bottom: 30px; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="color: ${Colors.primary}; margin: 0;">ES TEH INDONESIA</h1>
              <p style="margin: 5px 0 0 0;">Laporan Resmi Dashboard Owner</p>
            </div>
            <div class="meta">
              <p><strong>Jenis Dokumen:</strong> ${report.judul}</p>
              <p><strong>Periode Laporan:</strong> ${report.periode} (${report.startDate} s/d ${report.endDate})</p>
              <p><strong>Tanggal Cetak:</strong> ${formatDateLabel(new Date().toISOString())}</p>
            </div>
            ${detailContent}
            <div style="margin-top: 50px; text-align: center; color: #94A3B8; font-size: 10px;">Dokumen ini sah dan dihasilkan secara sistematis oleh Esteh Indonesia Application</div>
          </body>
        </html>`;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch {
      Alert.alert('Error', 'Gagal membuat PDF.');
    }
  };

  const handleDownloadExcel = async (report: ReportItem) => {
    setDownloading(true);
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      const url = `https://esteh-backend-production.up.railway.app/api/laporan/export?start_date=${report.startDate}&end_date=${report.endDate}`;
      const fileUri = `${FileSystem.cacheDirectory}Laporan_${report.id}.xlsx`;
      const res = await FileSystem.downloadAsync(url, fileUri, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 200) await Sharing.shareAsync(res.uri);
    } catch {
      Alert.alert('Gagal', 'Excel tidak tersedia.');
    } finally {
      setDownloading(false);
    }
  };

  const getTypeTheme = (type: string) => {
    switch(type) {
      case 'penjualan': return { bg: '#F0FDF4', text: '#15803D', icon: 'receipt' };
      case 'stok': return { bg: '#EFF6FF', text: '#1D4ED8', icon: 'cube' };
      case 'keuangan': return { bg: '#FDF2F8', text: '#BE185D', icon: 'cash' };
      case 'gudang': return { bg: '#FFFBEB', text: '#B45309', icon: 'storefront' };
      default: return { bg: '#F8FAFC', text: '#475569', icon: 'document-text' };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      <View style={styles.premiumHeader}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Laporan Bisnis</Text>
            <Text style={styles.headerSubtitle}>Arsip data Es Teh Indonesia</Text>
          </View>
          <View style={styles.headerAvatar}>
            {/* FIX: Avatar Inisial Dinamis Mengikuti User Login */}
            <Text style={styles.avatarText}>
              {user?.username ? user.username.substring(0, 2).toUpperCase() : 'PT'}
            </Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statBox}><Text style={styles.statVal}>{stats.total}</Text><Text style={styles.statLab}>ARSIP</Text></View>
          <View style={styles.vDivider} />
          <View style={styles.statBox}><Text style={[styles.statVal, {color: '#15803D'}]}>{stats.penjualan}</Text><Text style={styles.statLab}>SALES</Text></View>
          <View style={styles.vDivider} />
          <View style={styles.statBox}><Text style={[styles.statVal, {color: '#1D4ED8'}]}>{stats.stok}</Text><Text style={styles.statLab}>STOK</Text></View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        style={styles.mainContent}
        contentContainerStyle={styles.scrollPadding}
      >
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Buat Laporan Baru</Text>
          <View style={styles.reportGrid}>
            {['penjualan', 'stok', 'keuangan', 'gudang'].map((type) => {
              const theme = getTypeTheme(type);
              return (
                <TouchableOpacity key={type} style={styles.gridBtn} onPress={() => { setTempSelectedCategory(type); setShowFilterModal(true); }}>
                  <View style={[styles.gridIconCircle, { backgroundColor: theme.bg }]}><Ionicons name={theme.icon as any} size={24} color={theme.text} /></View>
                  <Text style={styles.gridBtnText}>{type === 'stok' ? 'Stok Outlet' : type === 'gudang' ? 'Stok Gudang' : type === 'keuangan' ? 'Keuangan' : 'Penjualan'}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <View style={styles.tabSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {['all', 'penjualan', 'stok', 'keuangan', 'gudang'].map((type) => (
              <TouchableOpacity key={type} style={[styles.tabBtn, selectedType === type && styles.tabBtnActive]} onPress={() => setSelectedType(type as any)}>
                <Text style={[styles.tabBtnText, selectedType === type && styles.tabBtnTextActive]}>{type === 'all' ? 'Semua Riwayat' : type.charAt(0).toUpperCase() + type.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.listArea}>
          {reports.filter(r => selectedType === 'all' || r.jenis === selectedType).length === 0 ? (
            <View style={styles.emptyContainer}><Ionicons name="document-text-outline" size={64} color="#CBD5E1" /><Text style={styles.emptyText}>Belum ada riwayat laporan</Text></View>
          ) : (
            reports.filter(r => selectedType === 'all' || r.jenis === selectedType).map((item) => {
              const theme = getTypeTheme(item.jenis);
              const isExpanded = expandedId === item.id;
              return (
                <View key={item.id} style={[styles.historyCard, isExpanded && styles.historyCardActive]}>
                  <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(item.id)}>
                    <View style={[styles.listIconBox, { backgroundColor: theme.bg }]}><Ionicons name={theme.icon as any} size={20} color={theme.text} /></View>
                    <View style={styles.cardMainInfo}><Text style={styles.cardTitle}>{item.judul}</Text><Text style={styles.cardSub}>{item.periode} • {formatDateLabel(item.tanggal_dibuat)}</Text></View>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#94A3B8" />
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.cardDetail}>
                      <View style={[styles.summaryBox, { backgroundColor: theme.bg + '50' }]}><Text style={[styles.summaryTxt, { color: theme.text }]}>{item.data_ringkasan}</Text></View>
                      <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteReport(item.id)}><Ionicons name="trash-outline" size={20} color="#EF4444" /></TouchableOpacity>
                        {item.jenis !== 'stok' && item.jenis !== 'gudang' && (
                          <TouchableOpacity style={styles.excelBtn} onPress={() => handleDownloadExcel(item)} disabled={downloading}><Ionicons name="file-tray-full-outline" size={20} color="#15803D" /></TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.printBtn} onPress={() => generatePDF(item)}><Ionicons name="print-outline" size={18} color="white" /><Text style={styles.printBtnText}> Cetak PDF</Text></TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showFilterModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Periode Laporan</Text>
            <View style={styles.radioGroup}>
              {['today', 'week', 'month'].map((p) => (
                <TouchableOpacity key={p} style={[styles.radioBtn, selectedPeriod === p && styles.radioBtnActive]} onPress={() => setSelectedPeriod(p as any)}>
                  <Ionicons name={selectedPeriod === p ? "radio-button-on" : "radio-button-off"} size={20} color={selectedPeriod === p ? Colors.primary : '#94A3B8'} />
                  <Text style={[styles.radioBtnText, selectedPeriod === p && styles.radioBtnTextActive]}>{p === 'today' ? 'Hari Ini' : p === 'week' ? '7 Hari Terakhir' : 'Seluruh Bulan Ini'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmGenerate} disabled={processing}>{processing ? <ActivityIndicator color="white" /> : <Text style={styles.confirmBtnText}>Generate Laporan</Text>}</TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowFilterModal(false)}><Text style={styles.cancelBtnText}>Batal</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  premiumHeader: { backgroundColor: Colors.primary, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 70, paddingHorizontal: 25, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, zIndex: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  headerAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 16, fontWeight: '900' },
  statsCard: { position: 'absolute', bottom: -35, left: 25, right: 25, flexDirection: 'row', backgroundColor: 'white', borderRadius: 24, paddingVertical: 20, elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15, borderWidth: 1, borderColor: '#F1F5F9' },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  statLab: { fontSize: 8, fontWeight: '900', color: '#94A3B8', letterSpacing: 1, marginTop: 4 },
  vDivider: { width: 1, height: '60%', backgroundColor: '#F1F5F9', alignSelf: 'center' },
  mainContent: { flex: 1 },
  scrollPadding: { paddingTop: 60, paddingHorizontal: 25 },
  section: { marginTop: 10 },
  sectionHeading: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 15 },
  reportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridBtn: { width: '48%', backgroundColor: 'white', padding: 20, borderRadius: 25, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
  gridIconCircle: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  gridBtnText: { fontWeight: '800', fontSize: 13, color: '#1E293B' },
  tabSection: { marginVertical: 25 },
  tabScroll: { gap: 10 },
  tabBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 15, backgroundColor: 'white', borderWidth: 1, borderColor: '#F1F5F9' },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabBtnText: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  tabBtnTextActive: { color: 'white' },
  listArea: { marginTop: 5 },
  historyCard: { backgroundColor: 'white', borderRadius: 25, marginBottom: 15, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, overflow: 'hidden' },
  historyCardActive: { borderColor: Colors.primary, borderWidth: 1.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  listIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardMainInfo: { flex: 1 },
  cardTitle: { fontWeight: '800', fontSize: 16, color: '#1E293B' },
  cardSub: { fontSize: 12, color: '#94A3B8', marginTop: 2, fontWeight: '500' },
  cardDetail: { padding: 18, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  summaryBox: { padding: 15, borderRadius: 15, marginVertical: 15 },
  summaryTxt: { fontWeight: '800', fontSize: 14 },
  actionRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  deleteBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  excelBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },
  printBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12, backgroundColor: Colors.primary },
  printBtnText: { color: 'white', fontWeight: '900', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'center', padding: 25 },
  modalContent: { backgroundColor: 'white', borderRadius: 32, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B', marginBottom: 25, textAlign: 'center' },
  radioGroup: { gap: 12, marginBottom: 30 },
  radioBtn: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, borderWidth: 1.5, borderColor: '#F1F5F9', gap: 12 },
  radioBtnActive: { borderColor: Colors.primary, backgroundColor: '#F0FDF4' },
  radioBtnText: { fontWeight: '700', color: '#64748B', fontSize: 15 },
  radioBtnTextActive: { color: Colors.primary },
  confirmBtn: { backgroundColor: Colors.primary, padding: 20, borderRadius: 18, alignItems: 'center' },
  confirmBtnText: { color: 'white', fontWeight: '900', fontSize: 16 },
  cancelBtn: { marginTop: 15, alignItems: 'center', padding: 10 },
  cancelBtnText: { color: '#94A3B8', fontWeight: '700' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#94A3B8', fontWeight: '600', marginTop: 15 }
});