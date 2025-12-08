import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { Laporan } from '../../types';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

export default function LaporanScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<'all' | 'penjualan' | 'stok' | 'keuangan' | 'gudang'>('all');
  const [reports, setReports] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    // Load reports if needed (you might want to store generated reports)
    // For now, reports are generated on demand
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    // Reload if needed
    setRefreshing(false);
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
            router.replace('/(auth)/login' as any);
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
      case 'penjualan':
        return 'receipt-outline';
      case 'stok':
        return 'cube-outline';
      case 'keuangan':
        return 'cash-outline';
      case 'gudang':
        return 'storefront-outline';
      default:
        return 'document-text-outline';
    }
  };

  const getReportLabel = (jenis: string) => {
    switch (jenis) {
      case 'penjualan':
        return 'Penjualan';
      case 'stok':
        return 'Stok';
      case 'keuangan':
        return 'Keuangan';
      case 'gudang':
        return 'Gudang';
      default:
        return jenis;
    }
  };

  const getReportColor = (jenis: string) => {
    switch (jenis) {
      case 'penjualan':
        return Colors.primary;
      case 'stok':
        return Colors.warning;
      case 'keuangan':
        return Colors.success;
      case 'gudang':
        return Colors.primaryDark;
      default:
        return Colors.textSecondary;
    }
  };

  const handleDownload = async (report: Laporan, format: 'csv' | 'pdf') => {
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
        Alert.alert('Sukses', 'Laporan berhasil diekspor');
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

      const response = await ownerAPI.getLaporanPendapatan(startDate, endDate);
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      // Create report object from response
      const newReport: Laporan = {
        id: `LAP-${Date.now()}`,
        jenis: type as any,
        tanggal_dibuat: new Date(),
        data: `Laporan ${type} ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
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
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="stats-chart" size={24} color={Colors.backgroundLight} />
            <Text style={styles.headerTitle}>Owner Panel</Text>
          </View>
          <TouchableOpacity style={styles.userInfo} onPress={() => setShowProfileMenu(true)} activeOpacity={0.7}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>OW</Text>
            </View>
            <View>
              <Text style={styles.userName}>Pak Owner</Text>
              <Text style={styles.userRole}>Pemilik</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={Colors.backgroundLight} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.titleSection}>
          <View>
            <Text style={styles.title}>Laporan</Text>
            <Text style={styles.subtitle}>
              Generate dan download laporan bisnis
            </Text>
          </View>
        </View>

        <View style={styles.generateSection}>
          <Text style={styles.sectionTitle}>Generate Laporan Baru</Text>
          <View style={styles.generateButtons}>
            <TouchableOpacity
              style={[styles.generateButton, generating === 'penjualan' && styles.generateButtonDisabled]}
              onPress={() => handleGenerate('penjualan')}
              disabled={!!generating}
            >
              {generating === 'penjualan' ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="receipt-outline" size={24} color={Colors.primary} />
                  <Text style={styles.generateButtonText}>Laporan Penjualan</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.generateButton, generating === 'stok' && styles.generateButtonDisabled]}
              onPress={() => handleGenerate('stok')}
              disabled={!!generating}
            >
              {generating === 'stok' ? (
                <ActivityIndicator size="small" color={Colors.warning} />
              ) : (
                <>
                  <Ionicons name="cube-outline" size={24} color={Colors.warning} />
                  <Text style={styles.generateButtonText}>Laporan Stok</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.generateButton, generating === 'keuangan' && styles.generateButtonDisabled]}
              onPress={() => handleGenerate('keuangan')}
              disabled={!!generating}
            >
              {generating === 'keuangan' ? (
                <ActivityIndicator size="small" color={Colors.success} />
              ) : (
                <>
                  <Ionicons name="cash-outline" size={24} color={Colors.success} />
                  <Text style={styles.generateButtonText}>Laporan Keuangan</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.generateButton, generating === 'gudang' && styles.generateButtonDisabled]}
              onPress={() => handleGenerate('gudang')}
              disabled={!!generating}
            >
              {generating === 'gudang' ? (
                <ActivityIndicator size="small" color={Colors.primaryDark} />
              ) : (
                <>
                  <Ionicons name="storefront-outline" size={24} color={Colors.primaryDark} />
                  <Text style={styles.generateButtonText}>Laporan Gudang</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Filter Laporan</Text>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[styles.filterButton, selectedType === 'all' && styles.filterButtonActive]}
              onPress={() => setSelectedType('all')}
            >
              <Text style={[styles.filterButtonText, selectedType === 'all' && styles.filterButtonTextActive]}>
                Semua
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedType === 'penjualan' && styles.filterButtonActive]}
              onPress={() => setSelectedType('penjualan')}
            >
              <Text style={[styles.filterButtonText, selectedType === 'penjualan' && styles.filterButtonTextActive]}>
                Penjualan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedType === 'stok' && styles.filterButtonActive]}
              onPress={() => setSelectedType('stok')}
            >
              <Text style={[styles.filterButtonText, selectedType === 'stok' && styles.filterButtonTextActive]}>
                Stok
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedType === 'keuangan' && styles.filterButtonActive]}
              onPress={() => setSelectedType('keuangan')}
            >
              <Text style={[styles.filterButtonText, selectedType === 'keuangan' && styles.filterButtonTextActive]}>
                Keuangan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedType === 'gudang' && styles.filterButtonActive]}
              onPress={() => setSelectedType('gudang')}
            >
              <Text style={[styles.filterButtonText, selectedType === 'gudang' && styles.filterButtonTextActive]}>
                Gudang
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Riwayat Laporan</Text>

          {reports.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Belum ada laporan yang dibuat</Text>
              <Text style={styles.emptySubtext}>Klik tombol di atas untuk membuat laporan</Text>
            </View>
          ) : (
            <FlatList
              data={filteredReports}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
              <View style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <View style={[styles.reportIcon, { backgroundColor: getReportColor(item.jenis) + '20' }]}>
                    <Ionicons
                      name={getReportIcon(item.jenis) as any}
                      size={24}
                      color={getReportColor(item.jenis)}
                    />
                  </View>
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportId}>{item.id}</Text>
                    <Text style={styles.reportType}>{getReportLabel(item.jenis)}</Text>
                    <Text style={styles.reportDate}>{formatDate(item.tanggal_dibuat)}</Text>
                  </View>
                </View>

                <Text style={styles.reportData}>{item.data}</Text>

                <View style={styles.reportActions}>
                  <TouchableOpacity
                    style={[styles.downloadButton, styles.csvButton]}
                    onPress={() => handleDownload(item, 'csv')}
                  >
                    <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                    <Text style={[styles.downloadButtonText, { color: Colors.primary }]}>
                      Download CSV
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.downloadButton, styles.pdfButton]}
                    onPress={() => handleDownload(item, 'pdf')}
                  >
                    <Ionicons name="document-outline" size={18} color={Colors.error} />
                    <Text style={[styles.downloadButtonText, { color: Colors.error }]}>
                      Download PDF
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <TouchableOpacity
          style={styles.profileModalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileMenu(false)}
        >
          <View style={styles.profileMenu}>
            <View style={styles.profileMenuHeader}>
              <View style={styles.profileMenuAvatar}>
                <Text style={styles.profileMenuAvatarText}>OW</Text>
              </View>
              <View>
                <Text style={styles.profileMenuName}>Pak Owner</Text>
                <Text style={styles.profileMenuRole}>Pemilik</Text>
              </View>
            </View>
            <View style={styles.profileMenuDivider} />
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
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.backgroundLight,
    marginLeft: 10,
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
  profileModalOverlay: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'flex-end',
  },
  profileMenu: {
    backgroundColor: Colors.backgroundLight,
    margin: 20,
    borderRadius: 12,
    padding: 16,
  },
  profileMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileMenuAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  profileMenuAvatarText: {
    color: Colors.backgroundLight,
    fontWeight: 'bold',
  },
  profileMenuName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  profileMenuRole: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileMenuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
  },
  content: {
    flex: 1,
    padding: isSmallScreen ? 15 : 20,
  },
  titleSection: {
    marginBottom: isSmallScreen ? 15 : 20,
  },
  title: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: isSmallScreen ? 13 : 14,
    color: Colors.textSecondary,
  },
  generateSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  generateButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  generateButton: {
    width: isSmallScreen ? '100%' : '48%',
    backgroundColor: Colors.backgroundLight,
    borderRadius: isSmallScreen ? 10 : 12,
    padding: isSmallScreen ? 15 : 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 10,
    textAlign: 'center',
  },
  filterSection: {
    marginBottom: 30,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  filterButtonTextActive: {
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  listSection: {
    marginBottom: 20,
  },
  reportCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  reportIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  reportInfo: {
    flex: 1,
  },
  reportId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  reportType: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  reportDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  reportData: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 10,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  csvButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  pdfButton: {
    borderWidth: 1,
    borderColor: Colors.error,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginBottom: 5,
  },
  emptySubtext: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});

