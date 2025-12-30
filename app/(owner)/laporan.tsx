import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
import { Colors } from '../../constants/Colors';
import { radius, spacing, typography } from '../../constants/DesignSystem';
import { ownerAPI } from '../../services/api';

// FIX: Kompatibilitas Expo SDK 54
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null); // State User Baru

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempSelectedCategory, setTempSelectedCategory] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [processing, setProcessing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmActions, setConfirmActions] = useState<
    { label: string; onPress: () => void | Promise<void>; type?: 'primary' | 'secondary' | 'danger'; loading?: boolean; disabled?: boolean }[]
  >([]);

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const showConfirm = (
    title: string,
    message: string,
    actions: { label: string; onPress: () => void | Promise<void>; type?: 'primary' | 'secondary' | 'danger'; loading?: boolean; disabled?: boolean }[]
  ) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmActions(actions);
    setConfirmVisible(true);
  };

  // --- SKELETON SHIMMER ---
  const SkeletonShimmer = ({ width, height, style }: { width?: number | string; height?: number; style?: any }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true })
        ])
      );
      loop.start();
      return () => loop.stop();
    }, [anim]);

    const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] });
    return (
      <View style={[{ overflow: 'hidden', backgroundColor: '#E5E7EB', borderRadius: 12 }, style, width ? { width } : {}, height ? { height } : {}]}> 
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: '50%',
            opacity: 0.5,
            transform: [{ translateX }],
            backgroundColor: 'rgba(255,255,255,0.6)'
          }}
        />
      </View>
    );
  };

  // --- PERSISTENCE LOGIC UTUH ---
  const loadReports = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    setLoading(true);
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
      // Beri sedikit delay agar shimmer terasa
      setTimeout(() => setLoading(false), 250);
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
    showConfirm('Hapus Riwayat', 'Yakin ingin menghapus laporan ini?', [
      { label: 'Batal', type: 'secondary', onPress: () => setConfirmVisible(false) },
      { label: 'Hapus', type: 'danger', onPress: () => {
          setConfirmVisible(false);
          const updated = reports.filter(r => r.id !== id);
          setReports(updated);
          saveReportsToStorage(updated);
          showAlert('Terhapus', 'Laporan dihapus dari riwayat', 'success');
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
          // Gabungkan Penjualan & Keuangan dalam satu laporan
          reportJudul = "Laporan Penjualan & Keuangan";
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
      showAlert('Sukses', 'Laporan berhasil dibuat.', 'success');
    } catch {
      showAlert('Gagal', 'Server tidak merespon.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const generatePDF = async (report: ReportItem) => {
    try {
      let detailContent = '';
      const responseStok = await ownerAPI.getStokDetail();
      const detailStok = responseStok.data?.data || responseStok.data;
      // Use dashboard for gudang data to ensure nested `bahan` fields are available
      const responseDash = await ownerAPI.getDashboard();
      const dashData = (responseDash as any)?.data?.data || (responseDash as any)?.data || responseDash;

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
        // Gabungkan Keuangan (kartu ringkas total omset) + tabel penjualan harian
        detailContent = `
          <div style="text-align: center; margin-top: 30px; padding: 30px; border: 2px solid ${Colors.primary}; border-radius: 16px;">
            <p style="font-size: 16px; color: #666; margin-bottom: 8px;">TOTAL OMSET KEUANGAN</p>
            <h1 style="font-size: 36px; color: #1E293B; margin: 0;">Rp ${(res.data?.total_pendapatan || 0).toLocaleString('id-ID')}</h1>
            <p style="font-size: 12px; color: #94A3B8; margin-top: 12px;">Periode: ${report.periode}</p>
          </div>

          <h3 style="color: ${Colors.primary}; border-left: 5px solid ${Colors.primary}; padding-left: 10px; margin-top: 24px;">Rincian Penjualan Harian</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
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
              <td style="border: 1px solid #ddd; padding: 12px;">TOTAL PEMASUKAN</td>
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
        // Prefer dashboard stok_gudang (has nested `bahan`). Fallback to stok-detail when needed.
        const gudangData = (dashData?.stok_gudang || detailStok?.stok_gudang || []) as any[];
        detailContent = `
          <h3 style="color: #558B2F;">Inventaris Gudang Pusat</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #F1F8E9;"><th>Bahan Baku</th><th style="text-align:center">Sisa</th><th style="text-align:center">Status</th></tr>
            ${gudangData.map((g: any) => {
              // Calculate display quantity using the same logic as warehouse/owner dashboard
              const unitRaw = (g?.bahan?.satuan || g?.satuan || '').toLowerCase();
              const unitLabel = g?.bahan?.satuan || g?.satuan || '';
              const stokVal = Number(g?.stok || 0);

              let displayQty = `${stokVal.toLocaleString('id-ID')} ${unitLabel}`;

              if (unitRaw !== 'gr') {
                const perUnitWeight = (
                  (Number(g?.bahan?.berat_per_isi) || Number(g?.berat_per_isi) || 0) *
                  (Number(g?.bahan?.isi_per_satuan) || Number(g?.isi_per_satuan) || 1)
                );

                if (perUnitWeight > 0) {
                  const packCount = Math.floor(stokVal / perUnitWeight);
                  const remainder = stokVal - (packCount * perUnitWeight);
                  if (packCount > 0 && remainder > 0) {
                    displayQty = `${packCount.toLocaleString('id-ID')} ${unitLabel} + sisa ${Math.round(remainder).toLocaleString('id-ID')} gr`;
                  } else if (packCount > 0) {
                    displayQty = `${packCount.toLocaleString('id-ID')} ${unitLabel}`;
                  } else {
                    // Tidak cukup untuk 1 pack, tampilkan gram saja
                    displayQty = `${Math.round(remainder).toLocaleString('id-ID')} gr`;
                  }
                } else {
                  // Packaging data missing: avoid wrong unit labels like "karton" with raw grams
                  displayQty = `${stokVal.toLocaleString('id-ID')} gr`;
                }
              }

              const namaBahan = g?.bahan?.nama || g?.nama_bahan || '—';
              const isKritis = (g?.is_kritis === true) || (stokVal <= 10);
              return `<tr><td>${namaBahan}</td><td style="text-align:center">${displayQty}</td><td style="text-align:center; font-weight:bold; color: ${isKritis ? 'red' : 'green'};">${isKritis ? 'KRITIS' : 'AMAN'}</td></tr>`;
            }).join('')}
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
              <h1 style="color: ${Colors.primary}; margin: 0;">ES TEH FAVORIT INDONESIA</h1>
              <p style="margin: 5px 0 0 0;">Laporan Resmi Dashboard Owner</p>
            </div>
            <div class="meta">
              <p><strong>Jenis Dokumen:</strong> ${report.judul}</p>
              <p><strong>Periode Laporan:</strong> ${report.periode} (${report.startDate} s/d ${report.endDate})</p>
              <p><strong>Tanggal Cetak:</strong> ${formatDateLabel(new Date().toISOString())}</p>
            </div>
            ${detailContent}
            <div style="margin-top: 50px; text-align: center; color: #94A3B8; font-size: 10px;">Es Teh Favorit Indonesia Application</div>
          </body>
        </html>`;

      // Bangun nama file dengan rentang tanggal
      const safeTitle = (report.judul || 'Laporan')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'Laporan';

      const startD = new Date(report.startDate);
      const endD = new Date(report.endDate);
      const sameDay = report.startDate === report.endDate;
      const sameMonth = startD.getMonth() === endD.getMonth() && startD.getFullYear() === endD.getFullYear();
      const sameYear = startD.getFullYear() === endD.getFullYear();

      const dd = (d: Date) => String(d.getDate()).padStart(2, '0');
      const mm = (d: Date) => String(d.getMonth() + 1).padStart(2, '0');
      const yy = (d: Date) => String(d.getFullYear()).slice(-2);

      let suffix = `${startD.getFullYear()}${mm(startD)}${dd(startD)}`; // default hari-ini: YYYYMMDD
      if (!sameDay) {
        if (sameMonth && sameYear) {
          // Dalam bulan & tahun yang sama, singkat: 07-14MM
          suffix = `${dd(startD)}-${dd(endD)}${mm(startD)}`;
        } else if (sameYear) {
          // Tahun sama beda bulan: 07MM-14MM
          suffix = `${dd(startD)}${mm(startD)}-${dd(endD)}${mm(endD)}`;
        } else {
          // Lintas tahun: 07MMYY-14MMYY
          suffix = `${dd(startD)}${mm(startD)}${yy(startD)}-${dd(endD)}${mm(endD)}${yy(endD)}`;
        }
      }

      const pdfFileName = `${safeTitle}-${suffix}.pdf`;

      const { uri } = await Print.printToFileAsync({ html });
      const targetPath = `${FileSystem.cacheDirectory}${pdfFileName}`;
      await FileSystem.moveAsync({ from: uri, to: targetPath });
      await Sharing.shareAsync(targetPath, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch {
      showAlert('Error', 'Gagal membuat PDF.', 'error');
    }
  };

  const handleDownloadExcel = async (report: ReportItem) => {
    setDownloading(true);
    try {
      // Panggil endpoint owner terlebih dahulu untuk memastikan akses dan kesiapan ekspor
      const warmup = await ownerAPI.exportLaporan(report.startDate, report.endDate);
      if (warmup.error) throw new Error(warmup.error);

      const token = await AsyncStorage.getItem('@auth_token');
      const url = `https://esteh-backend-production.up.railway.app/api/laporan/export?start_date=${report.startDate}&end_date=${report.endDate}`;
      const fileUri = `${FileSystem.cacheDirectory}Laporan_${report.id}.xlsx`;
      const res = await FileSystem.downloadAsync(url, fileUri, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 200) await Sharing.shareAsync(res.uri);
    } catch {
      showAlert('Gagal', 'Excel tidak tersedia.', 'error');
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
          {loading ? (
            <>
              <View style={styles.statBox}><SkeletonShimmer width={70} height={22} /><Text style={styles.statLab}>ARSIP</Text></View>
              <View style={styles.vDivider} />
              <View style={styles.statBox}><SkeletonShimmer width={70} height={22} /><Text style={styles.statLab}>SALES</Text></View>
              <View style={styles.vDivider} />
              <View style={styles.statBox}><SkeletonShimmer width={70} height={22} /><Text style={styles.statLab}>STOK</Text></View>
            </>
          ) : (
            <>
              <View style={styles.statBox}><Text style={styles.statVal}>{stats.total}</Text><Text style={styles.statLab}>ARSIP</Text></View>
              <View style={styles.vDivider} />
              <View style={styles.statBox}><Text style={[styles.statVal, {color: '#15803D'}]}>{stats.penjualan}</Text><Text style={styles.statLab}>SALES</Text></View>
              <View style={styles.vDivider} />
              <View style={styles.statBox}><Text style={[styles.statVal, {color: '#1D4ED8'}]}>{stats.stok}</Text><Text style={styles.statLab}>STOK</Text></View>
            </>
          )}
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
            {['penjualan', 'stok', 'gudang'].map((type) => {
              const theme = getTypeTheme(type);
              return (
                <TouchableOpacity key={type} style={styles.gridBtn} onPress={() => { setTempSelectedCategory(type); setShowFilterModal(true); }}>
                  <View style={[styles.gridIconCircle, { backgroundColor: theme.bg }]}><Ionicons name={theme.icon as any} size={24} color={theme.text} /></View>
                  <Text style={styles.gridBtnText}>{type === 'stok' ? 'Stok Outlet' : type === 'gudang' ? 'Stok Gudang' : 'Penjualan & Keuangan'}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <View style={styles.tabSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {['all', 'penjualan', 'stok', 'gudang'].map((type) => (
              <TouchableOpacity key={type} style={[styles.tabBtn, selectedType === type && styles.tabBtnActive]} onPress={() => setSelectedType(type as any)}>
                <Text style={[styles.tabBtnText, selectedType === type && styles.tabBtnTextActive]}>{type === 'all' ? 'Semua Riwayat' : type.charAt(0).toUpperCase() + type.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.listArea}>
          {loading ? (
            <>
              {[1,2,3].map((i) => (
                <View key={i} style={styles.historyCard}>
                  <View style={styles.cardHeader}>
                    <SkeletonShimmer width={44} height={44} style={{ borderRadius: 14, marginRight: 15 }} />
                    <View style={{ flex: 1 }}>
                      <SkeletonShimmer width={160} height={16} />
                      <SkeletonShimmer width={120} height={12} style={{ marginTop: 8 }} />
                    </View>
                    <SkeletonShimmer width={24} height={24} style={{ borderRadius: 6 }} />
                  </View>
                  <View style={styles.cardDetail}>
                    <SkeletonShimmer height={48} style={{ borderRadius: 12 }} />
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                      <SkeletonShimmer width={48} height={48} style={{ borderRadius: 12 }} />
                      <SkeletonShimmer width={48} height={48} style={{ borderRadius: 12 }} />
                      <View style={{ flex: 1 }}>
                        <SkeletonShimmer height={48} style={{ borderRadius: 12 }} />
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </>
          ) : (
            reports.filter(r => selectedType === 'all' || r.jenis === selectedType).length === 0 ? (
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
            )
          )}
        </View>
        <View style={{ height: 20 }} />
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

      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
      />
      <ConfirmModal
        visible={confirmVisible}
        title={confirmTitle}
        message={confirmMessage}
        actions={confirmActions}
        onClose={() => setConfirmVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  premiumHeader: { backgroundColor: Colors.primary, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: spacing.xl + spacing.lg + spacing.md, paddingHorizontal: spacing.xl, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, zIndex: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 20 },
  headerTitle: { color: 'white', fontSize: typography.title, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: typography.body, fontWeight: '600', marginTop: 2 },
  headerAvatar: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: typography.bodyStrong, fontWeight: '900' },
  statsCard: { position: 'absolute', bottom: -35, left: spacing.xl, right: spacing.xl, flexDirection: 'row', backgroundColor: 'white', borderRadius: radius.xl, paddingVertical: spacing.lg, elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15, borderWidth: 1, borderColor: '#F1F5F9', zIndex: 5 },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: typography.headline, fontWeight: '900', color: '#1E293B' },
  statLab: { fontSize: typography.caption, fontWeight: '900', color: '#94A3B8', letterSpacing: 1, marginTop: 4 },
  vDivider: { width: 1, height: '60%', backgroundColor: '#F1F5F9', alignSelf: 'center' },
  mainContent: { flex: 1 },
  scrollPadding: { paddingTop: spacing.xl + spacing.md, paddingHorizontal: spacing.xl, paddingBottom: 140 },
  section: { marginTop: spacing.sm },
  sectionHeading: { fontSize: typography.title, fontWeight: '900', color: '#1E293B', marginBottom: spacing.md },
  reportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridBtn: { width: '48%', backgroundColor: 'white', padding: spacing.lg, borderRadius: radius.xl, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
  gridIconCircle: { width: 52, height: 52, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  gridBtnText: { fontWeight: '800', fontSize: typography.bodyStrong, color: '#1E293B' },
  tabSection: { marginVertical: spacing.xl },
  tabScroll: { gap: spacing.sm },
  tabBtn: { paddingHorizontal: spacing.lg + spacing.sm, paddingVertical: spacing.sm + 2, borderRadius: radius.md, backgroundColor: 'white', borderWidth: 1, borderColor: '#F1F5F9' },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabBtnText: { fontSize: typography.caption, fontWeight: '700', color: '#94A3B8' },
  tabBtnTextActive: { color: 'white' },
  listArea: { marginTop: spacing.xs },
  historyCard: { backgroundColor: 'white', borderRadius: radius.xl, marginBottom: spacing.md, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, overflow: 'hidden' },
  historyCardActive: { borderColor: Colors.primary, borderWidth: 1.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.md + spacing.xs },
  listIconBox: { width: 44, height: 44, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  cardMainInfo: { flex: 1 },
  cardTitle: { fontWeight: '800', fontSize: typography.bodyStrong, color: '#1E293B' },
  cardSub: { fontSize: typography.caption, color: '#94A3B8', marginTop: 2, fontWeight: '500' },
  cardDetail: { padding: spacing.md + spacing.xs, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  summaryBox: { padding: spacing.md, borderRadius: radius.md, marginVertical: spacing.md },
  summaryTxt: { fontWeight: '800', fontSize: typography.bodyStrong },
  actionRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  deleteBtn: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  excelBtn: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center' },
  printBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, height: 48, borderRadius: radius.md, backgroundColor: Colors.primary },
  printBtnText: { color: 'white', fontWeight: '900', fontSize: typography.bodyStrong },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'center', padding: spacing.xl },
  modalContent: { backgroundColor: 'white', borderRadius: radius.xl, padding: spacing.xl },
  modalTitle: { fontSize: typography.headline, fontWeight: '900', color: '#1E293B', marginBottom: spacing.xl, textAlign: 'center' },
  radioGroup: { gap: spacing.md, marginBottom: spacing.xl + spacing.sm },
  radioBtn: { flexDirection: 'row', alignItems: 'center', padding: spacing.md + spacing.xs, borderRadius: radius.lg, borderWidth: 1.5, borderColor: '#F1F5F9', gap: spacing.sm },
  radioBtnActive: { borderColor: Colors.primary, backgroundColor: '#F0FDF4' },
  radioBtnText: { fontWeight: '700', color: '#64748B', fontSize: typography.bodyStrong },
  radioBtnTextActive: { color: Colors.primary },
  confirmBtn: { backgroundColor: Colors.primary, padding: spacing.lg, borderRadius: radius.lg, alignItems: 'center' },
  confirmBtnText: { color: 'white', fontWeight: '900', fontSize: typography.bodyStrong },
  cancelBtn: { marginTop: spacing.md, alignItems: 'center', padding: spacing.sm },
  cancelBtnText: { color: '#94A3B8', fontWeight: '700' },
  emptyContainer: { alignItems: 'center', marginTop: spacing.xl + spacing.lg },
  emptyText: { color: '#94A3B8', fontWeight: '600', marginTop: spacing.md }
});