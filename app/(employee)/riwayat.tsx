import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { Transaksi } from '../../types';
import { karyawanAPI } from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

interface TransactionWithItems extends Transaksi {
  items: Array<{
    produk_nama: string;
    quantity: number;
    subtotal: number;
  }>;
}

export default function RiwayatScreen() {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await karyawanAPI.getTransaksi();
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      if (response.data) {
        // Ensure response.data is an array
        const transactionsData = Array.isArray(response.data) ? response.data : [];
        // Map API response to TransactionWithItems type
        const mappedTransactions = transactionsData.map((tx: any) => ({
          id: tx.id?.toString() || '',
          outlet_id: tx.outlet_id?.toString() || '',
          karyawan_id: tx.karyawan_id?.toString() || '',
          tanggal: new Date(tx.tanggal),
          total: tx.total || 0,
          metode_bayar: tx.metode_bayar || 'tunai',
          items: tx.items?.map((item: any) => ({
            produk_nama: item.produk?.nama || 'Unknown',
            quantity: item.quantity || 0,
            subtotal: item.subtotal || 0,
          })) || [],
        }));
        setTransactions(mappedTransactions);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal memuat transaksi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getPaymentIcon = (method: string) => {
    return method === 'tunai' ? 'wallet-outline' : 'qr-code-outline';
  };

  const getPaymentLabel = (method: string) => {
    return method === 'tunai' ? 'Tunai' : 'QRIS';
  };

  const filteredTransactions = transactions.filter(tx => {
    const now = new Date();
    const txDate = new Date(tx.tanggal);

    switch (selectedFilter) {
      case 'today':
        return txDate.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return txDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return txDate >= monthAgo;
      default:
        return true;
    }
  });

  const totalRevenue = filteredTransactions.reduce((sum, tx) => sum + tx.total, 0);
  const totalTransactions = filteredTransactions.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Riwayat Transaksi</Text>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>GH</Text>
            </View>
            <View>
              <Text style={styles.userName}>Ghilman</Text>
              <Text style={styles.userRole}>Karyawan Outlet 1</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Ionicons name="receipt-outline" size={24} color={Colors.primary} />
            <Text style={styles.summaryLabel}>Total Transaksi</Text>
            <Text style={styles.summaryValue}>{totalTransactions}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="cash-outline" size={24} color={Colors.success} />
            <Text style={styles.summaryLabel}>Total Pendapatan</Text>
            <Text style={styles.summaryValue}>Rp {totalRevenue.toLocaleString('id-ID')}</Text>
          </View>
        </View>

        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter:</Text>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('all')}
            >
              <Text style={[styles.filterButtonText, selectedFilter === 'all' && styles.filterButtonTextActive]}>
                Semua
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'today' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('today')}
            >
              <Text style={[styles.filterButtonText, selectedFilter === 'today' && styles.filterButtonTextActive]}>
                Hari Ini
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'week' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('week')}
            >
              <Text style={[styles.filterButtonText, selectedFilter === 'week' && styles.filterButtonTextActive]}>
                Minggu
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedFilter === 'month' && styles.filterButtonActive]}
              onPress={() => setSelectedFilter('month')}
            >
              <Text style={[styles.filterButtonText, selectedFilter === 'month' && styles.filterButtonTextActive]}>
                Bulan
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.transactionsList}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Memuat transaksi...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredTransactions}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Tidak ada transaksi</Text>
                </View>
              }
              renderItem={({ item }) => (
              <View style={styles.transactionCard}>
                <View style={styles.transactionHeader}>
                  <View>
                    <Text style={styles.transactionId}>{item.id}</Text>
                    <Text style={styles.transactionDate}>{formatDate(item.tanggal)}</Text>
                  </View>
                  <View style={styles.transactionTotal}>
                    <Text style={styles.transactionTotalText}>
                      Rp {item.total.toLocaleString('id-ID')}
                    </Text>
                    <View style={styles.paymentMethod}>
                      <Ionicons
                        name={getPaymentIcon(item.metode_bayar)}
                        size={16}
                        color={Colors.primary}
                      />
                      <Text style={styles.paymentMethodText}>
                        {getPaymentLabel(item.metode_bayar)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.transactionItems}>
                  {item.items.map((orderItem, index) => (
                    <View key={index} style={styles.transactionItem}>
                      <Text style={styles.transactionItemName}>
                        {orderItem.produk_nama} x{orderItem.quantity}
                      </Text>
                      <Text style={styles.transactionItemPrice}>
                        Rp {orderItem.subtotal.toLocaleString('id-ID')}
                      </Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={styles.detailButton}>
                  <Text style={styles.detailButtonText}>Lihat Detail</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            )}
            />
          )}
        </View>
      </ScrollView>
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
  headerTitle: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: Colors.backgroundLight,
    flex: 1,
    minWidth: 120,
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
  content: {
    flex: 1,
    padding: isSmallScreen ? 15 : 20,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: isSmallScreen ? 10 : 15,
    marginBottom: isSmallScreen ? 15 : 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
    borderRadius: isSmallScreen ? 10 : 12,
    padding: isSmallScreen ? 15 : 20,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 10,
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  filterContainer: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  filterButtons: {
    flexDirection: 'row',
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
  transactionsList: {
    marginBottom: 20,
  },
  transactionCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  transactionId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  transactionTotal: {
    alignItems: 'flex-end',
  },
  transactionTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primaryDark,
    marginBottom: 4,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentMethodText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  transactionItems: {
    marginBottom: 15,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  transactionItemName: {
    fontSize: 14,
    color: Colors.text,
  },
  transactionItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 8,
  },
  detailButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
});

