import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { ownerAPI } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

// Interface Lokal
interface ReportItem {
  id: string;
  jenis: 'penjualan' | 'stok' | 'keuangan' | 'gudang';
  tanggal_dibuat: Date;
  judul: string;
  periode: string;
  data_ringkasan?: string;
}

export default function LaporanScreen() {
  // State Data
  const [selectedType, setSelectedType] = useState<'all' | 'penjualan' | 'stok' | 'keuangan' | 'gudang'>('all');
  const [reports, setReports] = useState<ReportItem[]>([]);
  
  // State UI
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // State Modal Generate
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempSelectedCategory, setTempSelectedCategory] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Dummy Data Awal
    setReports([
      {
        id: 'LAP-001',
        jenis: 'penjualan',
        tanggal_dibuat: new Date(),
        judul: 'Laporan Penjualan',
        periode: 'Hari Ini',
        data_ringkasan: 'Total Pendapatan: Rp 2.500.000'
      }
    ]);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredReports = selectedType === 'all'
    ? reports
    : reports.filter(r => r.jenis === selectedType);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
    }).format(date);
  };

  // --- LOGIC GENERATE (DENGAN FILTER) ---
  
  const openGenerateModal = (type: string) => {
    setTempSelectedCategory(type);
    setSelectedPeriod('today');
    setShowFilterModal(true);
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

      if (tempSelectedCategory === 'penjualan' || tempSelectedCategory === 'keuangan') {
          const response = await ownerAPI.getLaporanPendapatan(strStartDate, strEndDate);
          if (response.data) {
              if (Array.isArray(response.data)) {
                  const total = response.data.reduce((acc: number, curr: any) => acc + (parseInt(curr.total_pendapatan) || 0), 0);
                  summaryData = `Total Omset: Rp ${total.toLocaleString('id-ID')}`;
              } else {
                  const data = response.data as any; 
                  summaryData = `Omset: Rp ${(data.total_pendapatan || 0).toLocaleString('id-ID')}`;
              }
          }
      } else {
          summaryData = `Laporan ${tempSelectedCategory} berhasil direkap.`;
      }

      const newReport: ReportItem = {
        id: `REQ-${Math.floor(Math.random() * 10000)}`,
        jenis: tempSelectedCategory as any,
        tanggal_dibuat: new Date(),
        judul: `Laporan ${tempSelectedCategory.charAt(0).toUpperCase() + tempSelectedCategory.slice(1)}`,
        periode: periodeLabel,
        data_ringkasan: summaryData
      };

      setReports([newReport, ...reports]);
      setShowFilterModal(false);
      Alert.alert('Sukses', 'Laporan berhasil dibuat!');

    } catch (error: any) {
      // FIX 1: Gunakan variabel error agar tidak warning
      console.error(error);
      Alert.alert('Error', 'Gagal membuat laporan: ' + (error.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  // --- LOGIC DOWNLOAD PDF ---
  const generatePDF = async (report: ReportItem) => {
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
              .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #4CAF50; padding-bottom: 20px; }
              .brand { font-size: 24px; font-weight: bold; color: #4CAF50; }
              .title { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
              .meta { font-size: 12px; color: #666; margin-bottom: 30px; }
              .content-box { background-color: #f9f9f9; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
              .label { font-weight: bold; font-size: 14px; color: #555; }
              .value { font-size: 18px; color: #000; margin-top: 5px; }
              .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #aaa; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="brand">ES TEH INDONESIA</div>
              <div style="font-size: 12px;">Laporan Resmi Internal</div>
            </div>
            <div class="title">${report.judul}</div>
            <div class="meta">
              Periode: ${report.periode}<br/>
              ID Laporan: ${report.id}<br/>
              Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}
            </div>
            <div class="content-box">
              <div class="label">Ringkasan Data:</div>
              <div class="value">${report.data_ringkasan}</div>
            </div>
            <div class="footer">
              Dokumen ini digenerate secara otomatis oleh sistem Aplikasi Es Teh Owner.
            </div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error: any) {
      // FIX 2: Gunakan variabel error agar tidak warning
      console.error(error);
      Alert.alert('Error', 'Gagal membuat PDF: ' + (error.message || 'Unknown error'));
    }
  };

  // --- LOGIC DOWNLOAD EXCEL ---
  const handleDownloadExcel = async (report: ReportItem) => {
    setDownloading(true);
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      const today = new Date();
      const strDate = today.toISOString().split('T')[0];
      
      const url = `https://esteh-backend-production.up.railway.app/api/laporan/export?start_date=${strDate}&end_date=${strDate}`;
      const fileName = `Laporan_${report.jenis}_${report.id}.xlsx`; 

      if (Platform.OS === 'web') {
        const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Gagal mengunduh file');
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl; link.setAttribute('download', fileName);
        document.body.appendChild(link); link.click(); link.remove();
        Alert.alert('Sukses', 'File Excel berhasil diunduh.');
      } else {
        const fs = FileSystem as any;
        const baseDir = fs.documentDirectory || fs.cacheDirectory;
        if (!baseDir) throw new Error('Storage tidak tersedia');
        const fileUri = baseDir + fileName;
        const downloadRes = await FileSystem.downloadAsync(url, fileUri, { headers: { 'Authorization': `Bearer ${token}` } });
        if (downloadRes.status !== 200) throw new Error('Gagal download file');
        if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(downloadRes.uri); } 
        else { Alert.alert('Info', 'File tersimpan di: ' + downloadRes.uri); }
      }
    } catch (error: any) {
      // FIX 3: Gunakan variabel error agar tidak warning
      console.error(error);
      Alert.alert('Error', 'Gagal mengunduh Excel: ' + (error.message || 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'penjualan': return { bg: '#E8F5E9', text: '#2E7D32', icon: 'receipt' };
      case 'stok': return { bg: '#F1F8E9', text: '#558B2F', icon: 'cube' };
      case 'keuangan': return { bg: '#E0F2F1', text: '#00695C', icon: 'cash' };
      case 'gudang': return { bg: '#F9FBE7', text: '#827717', icon: 'storefront' };
      default: return { bg: '#F5F5F5', text: '#757575', icon: 'document-text' };
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Laporan Bisnis</Text>
          <Text style={styles.headerSubtitle}>Arsip & Ekspor Data Kinerja</Text>
        </View>
        <View style={styles.headerIconBg}>
          <Ionicons name="document-text" size={28} color={Colors.primary} />
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        
        {/* QUICK GENERATE GRID */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buat Laporan Baru</Text>
          <View style={styles.grid}>
            {['penjualan', 'stok', 'keuangan', 'gudang'].map((type) => {
              const theme = getTypeColor(type);
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.cardButton]}
                  onPress={() => openGenerateModal(type)}
                >
                  <View style={[styles.iconCircle, { backgroundColor: theme.bg }]}>
                    <Ionicons name={theme.icon as any} size={24} color={theme.text} />
                  </View>
                  <Text style={styles.cardButtonText}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* FILTER TABS */}
        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {['all', 'penjualan', 'stok', 'keuangan'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.tab, selectedType === type && styles.tabActive]}
                onPress={() => setSelectedType(type as any)}
              >
                <Text style={[styles.tabText, selectedType === type && styles.tabTextActive]}>
                  {type === 'all' ? 'Semua' : type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* REPORT LIST */}
        <View style={styles.listContainer}>
          {filteredReports.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="leaf-outline" size={64} color="#C8E6C9" />
              <Text style={styles.emptyText}>Belum ada laporan dibuat</Text>
            </View>
          ) : (
            filteredReports.map((item) => {
              const theme = getTypeColor(item.jenis);
              const isExpanded = expandedId === item.id;
              
              return (
                <View key={item.id} style={[styles.reportCard, isExpanded && styles.reportCardActive]}>
                  <TouchableOpacity 
                    style={styles.cardHeader} 
                    onPress={() => toggleExpand(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.listIconContainer, { backgroundColor: theme.bg }]}>
                      <Ionicons name={theme.icon as any} size={20} color={theme.text} />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.reportTitle}>{item.judul}</Text>
                      <Text style={styles.reportDate}>{item.periode} • {formatDate(item.tanggal_dibuat)}</Text>
                    </View>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.cardBody}>
                      <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Ringkasan:</Text>
                        <Text style={styles.summaryValue}>{item.data_ringkasan}</Text>
                      </View>
                      
                      <View style={styles.actionGrid}>
                        <TouchableOpacity 
                          style={[styles.downloadBtn, { backgroundColor: '#E8F5E9', flex:1 }]}
                          onPress={() => handleDownloadExcel(item)}
                          disabled={downloading}
                        >
                          {downloading ? <ActivityIndicator size="small" color={Colors.primary} /> : (
                            <>
                              <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                              <Text style={[styles.downloadText, { color: Colors.primary }]}>Excel</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.downloadBtn, { backgroundColor: Colors.primary, flex:1 }]}
                          onPress={() => generatePDF(item)}
                        >
                          <Ionicons name="print-outline" size={18} color="white" />
                          <Text style={[styles.downloadText, { color: 'white' }]}>PDF</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* --- MODAL FILTER PERIODE --- */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Periode Laporan</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.radioContainer}>
              <TouchableOpacity 
                style={[styles.radioItem, selectedPeriod === 'today' && styles.radioItemActive]}
                onPress={() => setSelectedPeriod('today')}
              >
                <Text style={[styles.radioText, selectedPeriod === 'today' && styles.radioTextActive]}>Hari Ini</Text>
                {selectedPeriod === 'today' && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.radioItem, selectedPeriod === 'week' && styles.radioItemActive]}
                onPress={() => setSelectedPeriod('week')}
              >
                <Text style={[styles.radioText, selectedPeriod === 'week' && styles.radioTextActive]}>7 Hari Terakhir</Text>
                {selectedPeriod === 'week' && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.radioItem, selectedPeriod === 'month' && styles.radioItemActive]}
                onPress={() => setSelectedPeriod('month')}
              >
                <Text style={[styles.radioText, selectedPeriod === 'month' && styles.radioTextActive]}>Bulan Ini</Text>
                {selectedPeriod === 'month' && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.confirmBtn, processing && { opacity: 0.7 }]}
              onPress={handleConfirmGenerate}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.confirmBtnText}>Buat Laporan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: 'white', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  headerIconBg: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },

  content: { flex: 1, marginTop: 10 },
  section: { padding: 24, paddingBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 16 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cardButton: {
    width: '48%', paddingVertical: 20, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'white',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4,
    borderWidth: 1, borderColor: '#F0F0F0'
  },
  iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardButtonText: { fontSize: 13, fontWeight: '600', color: Colors.text },

  tabContainer: { marginVertical: 10 },
  tabScroll: { paddingHorizontal: 24 },
  tab: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white',
    marginRight: 10, borderWidth: 1, borderColor: '#EEE',
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: 'white' },

  listContainer: { paddingHorizontal: 24, marginTop: 10 },
  reportCard: {
    backgroundColor: 'white', borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#F0F0F0', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1
  },
  reportCardActive: { borderColor: Colors.primary, borderWidth: 1 },
  
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  listIconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardInfo: { flex: 1 },
  reportTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  reportDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  cardBody: { padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  summaryBox: {
    backgroundColor: '#F9F9F9', padding: 12, borderRadius: 12,
    marginTop: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: Colors.primary
  },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: Colors.text },
  
  actionGrid: { flexDirection: 'row', gap: 10 },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 10
  },
  downloadText: { fontSize: 13, fontWeight: '700' },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: Colors.textSecondary, fontWeight: '500' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  
  radioContainer: { gap: 12, marginBottom: 24 },
  radioItem: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EEE', backgroundColor: '#FAFAFA' 
  },
  radioItemActive: { borderColor: Colors.primary, backgroundColor: '#F0FDF4' },
  radioText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  radioTextActive: { color: Colors.primary },

  confirmBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});