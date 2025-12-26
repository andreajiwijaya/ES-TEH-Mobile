import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { authAPI, karyawanAPI } from '../../services/api';
import { Bahan, BahanGudang, FileAsset, PermintaanStok, User } from '../../types';

interface StockItem {
  id: string;
  outlet_id: number;
  bahan_id: number;
  stok: number;
  bahan: Bahan;
  status: 'Aman' | 'Menipis' | 'Kritis';
}

// Skeleton Shimmer Component
const SkeletonShimmer = ({ width, height, borderRadius = 8, style }: any) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E0E0E0',
          opacity,
        },
        style,
      ]}
    />
  );
};

export default function StokScreen() {
  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'stok' | 'terima' | 'riwayat'>('stok');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [requestHistory, setRequestHistory] = useState<PermintaanStok[]>([]);
  const [incomingShipments, setIncomingShipments] = useState<PermintaanStok[]>([]);
  const [bahanGudang, setBahanGudang] = useState<BahanGudang[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [modalFromGudang, setModalFromGudang] = useState(false);
  
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [selectedRequestItem, setSelectedRequestItem] = useState<PermintaanStok | null>(null);
  const [selectedBahanGudangId, setSelectedBahanGudangId] = useState<number | null>(null);
  const [selectedShipmentId, setSelectedShipmentId] = useState<number | null>(null);
  const [inputQuantity, setInputQuantity] = useState('');
  const [buktiFoto, setBuktiFoto] = useState<FileAsset | null>(null);

  // --- LOAD USER DATA ---
  const loadUserData = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      if (response.data?.user) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Gagal memuat user data', error);
    }
  }, []);

  // --- LOAD ALL DATA ---
  const loadAllData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      await loadUserData();

      const [stokRes, reqRes, bahanGudangRes] = await Promise.all([
        karyawanAPI.getStokOutlet(),
        karyawanAPI.getPermintaanStok(),
        karyawanAPI.getBahanGudang(),
      ]);

      if (stokRes.data) {
        const mappedStok: StockItem[] = (stokRes.data as any[]).map((item: any) => {
          const stok = Number(item.stok) || 0;
          const min = Number(item.bahan?.stok_minimum_outlet) || 0;
          let status: 'Aman' | 'Menipis' | 'Kritis' = 'Aman';
          if (stok <= 0 || stok <= min * 0.3) status = 'Kritis';
          else if (stok <= min) status = 'Menipis';
          return {
            id: `${item.outlet_id}-${item.bahan_id}`,
            outlet_id: item.outlet_id,
            bahan_id: item.bahan_id,
            stok,
            bahan: item.bahan || { nama: 'Unknown', satuan: 'Unit', stok_minimum_gudang: 0, stok_minimum_outlet: 0 },
            status
          };
        });
        setStockItems(mappedStok);
      }

      if (reqRes.data) {
        const allReq = (reqRes.data as PermintaanStok[]);
        setRequestHistory([...allReq].sort((a, b) => b.id - a.id));

        const inTransit = allReq.filter(i => 
          (i.status || '').toString().toLowerCase() === 'dikirim' || 
          (i.status || '').toString().toLowerCase() === 'in_transit'
        );
        setIncomingShipments(inTransit);
      }

      if (bahanGudangRes.data) {
        const payload = Array.isArray(bahanGudangRes.data) ? bahanGudangRes.data : (bahanGudangRes.data as any).data;
        if (Array.isArray(payload)) setBahanGudang(payload as BahanGudang[]);
      }
    } catch (err) {
      console.error('Load Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadUserData]);

  useFocusEffect(useCallback(() => { loadAllData(); }, [loadAllData]));

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData(true);
  };

  // --- PICK IMAGE ---
  const pickImage = async (shipId: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const fileName = uri.split('/').pop() || 'bukti_terima.jpg';
        const extension = fileName.split('.').pop()?.toLowerCase();
        const type = extension === 'png' ? 'image/png' : 'image/jpeg';

        setSelectedShipmentId(shipId);
        setBuktiFoto({
          uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
          name: fileName,
          type: type,
        });
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Gagal membuka galeri foto.');
    }
  };

  // --- CONFIRM RECEIPT ---
  const handleConfirmReceipt = async (id: number) => {
    Alert.alert('Konfirmasi Terima', 'Barang sudah sampai dan sesuai?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Foto Bukti', onPress: () => pickImage(id) },
      { 
        text: 'Ya, Terima', 
        onPress: async () => {
          setActionLoading(true);
          try {
            const res = await karyawanAPI.terimaBarangKeluar(id, buktiFoto);
            if (res.error) throw new Error(res.error);
            Alert.alert('Sukses', 'Barang diterima dan stok diperbarui!');
            setBuktiFoto(null);
            setSelectedShipmentId(null);
            loadAllData(true);
          } catch (err: any) {
            Alert.alert('Gagal', err.message || 'Gagal memproses permintaan.');
          } finally {
            setActionLoading(false);
          }
        }
      }
    ]);
  };

  // --- SUBMIT FORM ---
  const handleSubmit = async () => {
    const qty = parseInt(inputQuantity);
    if (isNaN(qty) || qty <= 0) return Alert.alert('Validasi', 'Jumlah tidak valid');
    
    setActionLoading(true);
    try {
      if (modalType === 'create') {
        const bId = modalFromGudang ? selectedBahanGudangId : selectedStockItem?.bahan_id;
        if (!bId) throw new Error("Pilih bahan!");
        await karyawanAPI.createPermintaanStok({ bahan_id: bId, jumlah: qty });
        Alert.alert('Sukses', 'Permintaan stok telah diajukan.');
      } else if (selectedRequestItem) {
        await karyawanAPI.updatePermintaanStok(selectedRequestItem.id, { bahan_id: selectedRequestItem.bahan_id, jumlah: qty });
        Alert.alert('Sukses', 'Permintaan telah diperbarui.');
      }
      setModalVisible(false);
      loadAllData(true);
    } catch (err: any) {
      Alert.alert('Gagal', err.message || 'Terjadi kesalahan.');
    } finally {
      setActionLoading(false);
    }
  };

  // --- CANCEL REQUEST ---
  const handleCancelRequest = () => {
    if (!selectedRequestItem) return;
    Alert.alert('Hapus', 'Batalkan permintaan ini?', [
      { text: 'Kembali' },
      { text: 'Ya, Hapus', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try {
          await karyawanAPI.deletePermintaanStok(selectedRequestItem.id);
          setModalVisible(false);
          loadAllData(true);
        } catch (err: any) {
          Alert.alert('Gagal', err.message || 'Gagal menghapus permintaan.');
        } finally {
          setActionLoading(false);
        }
      }}
    ]);
  };

  // --- STATUS COLOR ---
  const getStatusColor = (s: string) => {
    const st = s.toLowerCase();
    if (st === 'aman' || st === 'diterima' || st === 'received' || st === 'completed') return '#22C55E';
    if (st === 'menipis' || st === 'diajukan' || st === 'dikirim' || st === 'pending' || st === 'in_transit') return '#F59E0B';
    return '#EF4444';
  };

  // --- OPEN MODAL HELPERS ---
  const openCreateRequestModal = (item?: StockItem, fromGudang = false) => {
    setModalFromGudang(fromGudang);
    setSelectedStockItem(item || null);
    setSelectedBahanGudangId(null);
    setInputQuantity('');
    setModalType('create');
    setModalVisible(true);
  };

  const openEditRequestModal = (req: PermintaanStok) => {
    setSelectedRequestItem(req);
    setInputQuantity(req.jumlah.toString());
    setModalType('edit');
    setModalVisible(true);
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <SkeletonShimmer width={200} height={28} borderRadius={8} style={{ marginBottom: 8 }} />
              <SkeletonShimmer width={240} height={14} borderRadius={6} />
            </View>
            <SkeletonShimmer width={48} height={48} borderRadius={24} />
          </View>
          <View style={styles.tabContainer}>
            <SkeletonShimmer width="30%" height={40} borderRadius={12} style={{ marginRight: 8 }} />
            <SkeletonShimmer width="30%" height={40} borderRadius={12} style={{ marginRight: 8 }} />
            <SkeletonShimmer width="30%" height={40} borderRadius={12} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <SkeletonShimmer width="100%" height={50} borderRadius={15} style={{ marginBottom: 20 }} />
          <SkeletonShimmer width="100%" height={50} borderRadius={15} style={{ marginBottom: 20 }} />
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <SkeletonShimmer width="60%" height={16} borderRadius={6} style={{ marginBottom: 8 }} />
              <SkeletonShimmer width="40%" height={12} borderRadius={6} style={{ marginBottom: 12 }} />
              <View style={{ height: 1, backgroundColor: '#F5F5F5', marginVertical: 12 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <SkeletonShimmer width="30%" height={14} borderRadius={6} />
                <SkeletonShimmer width="30%" height={18} borderRadius={6} />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Persediaan Bahan</Text>
            <Text style={styles.headerSubtitle}>Monitor & kelola stok</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.username?.substring(0, 2).toUpperCase() || 'KA'}
            </Text>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {(['stok', 'terima', 'riwayat'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons 
                name={tab === 'stok' ? 'cube' : tab === 'terima' ? 'checkmark-circle' : 'time'} 
                size={16} 
                color={activeTab === tab ? 'white' : 'rgba(255,255,255,0.6)'} 
              />
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'stok' ? 'Stok' : tab === 'terima' ? 'Masuk' : 'History'}
              </Text>
              {tab === 'terima' && incomingShipments.length > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifText}>{incomingShipments.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* STOK TAB */}
        {activeTab === 'stok' && (
          <>
            {/* Search Bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari bahan..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
            </View>

            {/* Add Request Button */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => openCreateRequestModal(undefined, true)}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.addButtonText}>Minta Bahan Baru</Text>
            </TouchableOpacity>

            {/* Stock Items */}
            {stockItems
              .filter(i => i.bahan?.nama?.toLowerCase().includes(searchQuery.toLowerCase()))
              .length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={72} color="#E0E0E0" />
                <Text style={styles.emptyText}>Tidak ada bahan</Text>
              </View>
            ) : (
              stockItems
                .filter(i => i.bahan?.nama?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(item => (
                  <View key={item.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle}>{item.bahan?.nama}</Text>
                        <Text style={styles.cardUnit}>{item.bahan?.satuan}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                          {item.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.cardBottom}>
                      <View>
                        <Text style={styles.stockLabel}>Stok Sekarang</Text>
                        <Text style={[styles.stockValue, { color: getStatusColor(item.status) }]}>
                          {item.stok}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.requestButton}
                        onPress={() => openCreateRequestModal(item, false)}
                      >
                        <Ionicons name="arrow-forward" size={16} color="white" />
                        <Text style={styles.requestButtonText}>Request</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
            )}
          </>
        )}

        {/* TERIMA TAB */}
        {activeTab === 'terima' && (
          <>
            {incomingShipments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="car-outline" size={72} color="#E0E0E0" />
                <Text style={styles.emptyText}>Tidak ada kiriman masuk</Text>
                <Text style={styles.emptySubtext}>Permintaan stok yang dikirim akan muncul di sini</Text>
              </View>
            ) : (
              incomingShipments.map(ship => (
                <View key={ship.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>KIRIMAN #{ship.id}</Text>
                      <Text style={styles.cardUnit}>{ship.bahan?.nama}</Text>
                    </View>
                    <Ionicons name="time" size={28} color={getStatusColor(ship.status)} />
                  </View>

                  {buktiFoto && ship.id === selectedShipmentId && (
                    <View style={styles.proofImageContainer}>
                      <Image
                        source={{ uri: buktiFoto.uri }}
                        style={styles.proofImage}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  <View style={styles.cardDivider} />

                  <View style={styles.cardBottom}>
                    <View>
                      <Text style={styles.stockLabel}>Jumlah Masuk</Text>
                      <Text style={styles.stockValue}>{ship.jumlah}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.confirmButton, actionLoading && styles.buttonDisabled]}
                      onPress={() => handleConfirmReceipt(ship.id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-done" size={16} color="white" />
                          <Text style={styles.confirmButtonText}>Terima</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* RIWAYAT TAB */}
        {activeTab === 'riwayat' && (
          <>
            {requestHistory.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="list-outline" size={72} color="#E0E0E0" />
                <Text style={styles.emptyText}>Tidak ada riwayat</Text>
              </View>
            ) : (
              requestHistory.map(req => (
                <TouchableOpacity
                  key={req.id}
                  style={styles.card}
                  onPress={() => {
                    if (req.status.toLowerCase() === 'diajukan') {
                      openEditRequestModal(req);
                    }
                  }}
                  disabled={req.status.toLowerCase() !== 'diajukan'}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{req.bahan?.nama}</Text>
                      <Text style={styles.cardUnit}>REQ #{req.id}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(req.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(req.status) }]}>
                        {req.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardBottom}>
                    <View>
                      <Text style={styles.stockLabel}>Jumlah Diminta</Text>
                      <Text style={styles.stockValue}>{req.jumlah}</Text>
                    </View>
                    <Text style={[styles.statusSmall, { color: getStatusColor(req.status) }]}>
                      {req.status === 'diajukan' ? 'Tap untuk edit' : 'Tidak bisa diubah'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Modal Form */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'create' ? 'Ajukan Permintaan' : 'Edit Permintaan'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Bahan Selection for "Minta Bahan Baru" */}
              {modalType === 'create' && modalFromGudang && (
                <View style={styles.bahanListSection}>
                  <Text style={styles.sectionLabel}>Pilih Bahan</Text>
                  <View style={styles.bahanList}>
                    {bahanGudang.map(b => (
                      <TouchableOpacity
                        key={b.id}
                        style={[
                          styles.bahanItem,
                          selectedBahanGudangId === b.id && styles.bahanItemSelected
                        ]}
                        onPress={() => setSelectedBahanGudangId(b.id)}
                      >
                        <View style={styles.bahanCheckbox}>
                          {selectedBahanGudangId === b.id && (
                            <Ionicons name="checkmark" size={16} color="white" />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.bahanName}>{b.nama}</Text>
                          <Text style={styles.bahanUnit}>{b.satuan}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Info Section */}
              {!modalFromGudang && selectedStockItem && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionLabel}>Informasi Bahan</Text>
                  <View style={styles.infoBox}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Bahan</Text>
                      <Text style={styles.infoValue}>{selectedStockItem.bahan?.nama}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Stok Saat Ini</Text>
                      <Text style={[styles.infoValue, { color: getStatusColor(selectedStockItem.status) }]}>
                        {selectedStockItem.stok}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Status</Text>
                      <Text style={[styles.infoValue, { color: getStatusColor(selectedStockItem.status) }]}>
                        {selectedStockItem.status}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Quantity Input */}
              <View style={styles.quantitySection}>
                <Text style={styles.sectionLabel}>Jumlah Permintaan</Text>
                <TextInput
                  style={styles.quantityInput}
                  keyboardType="numeric"
                  value={inputQuantity}
                  onChangeText={setInputQuantity}
                  placeholder="Masukkan jumlah"
                  placeholderTextColor="#999"
                  autoFocus
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              {modalType === 'edit' && (
                <TouchableOpacity
                  style={[styles.deleteButton, actionLoading && styles.buttonDisabled]}
                  onPress={handleCancelRequest}
                  disabled={actionLoading}
                >
                  <Ionicons name="trash-outline" size={20} color="white" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.submitButton, actionLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="white" />
                    <Text style={styles.submitButtonText}>Simpan</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA'
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 6,
  },
  tabActive: {
    backgroundColor: 'white',
    borderColor: 'white',
  },
  tabText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    fontSize: 11,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  notifBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -5,
    right: -5,
    borderWidth: 2,
    borderColor: 'white',
  },
  notifText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 10,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  skeletonCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 16,
    height: 50,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontWeight: '600',
    fontSize: 15,
    color: '#333',
  },
  addButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    elevation: 4,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 15,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  cardUnit: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: 16,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stockValue: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  requestButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 2,
  },
  requestButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 13,
  },
  confirmButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 2,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 13,
  },
  proofImageContainer: {
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  proofImage: {
    width: '100%',
    height: 200,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 24,
  },
  emptyText: {
    marginTop: 16,
    color: '#999',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtext: {
    marginTop: 8,
    color: '#BBB',
    fontSize: 13,
    fontWeight: '500',
  },
  statusSmall: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 28,
    maxHeight: '90%',
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  modalBody: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  bahanListSection: {
    marginBottom: 24,
  },
  bahanList: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 16,
    overflow: 'hidden',
  },
  bahanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  bahanItemSelected: {
    backgroundColor: '#E8F5E9',
  },
  bahanCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bahanName: {
    fontWeight: '700',
    fontSize: 14,
    color: '#333',
  },
  bahanUnit: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  quantitySection: {
    marginBottom: 24,
  },
  quantityInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    padding: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 20,
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 15,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    elevation: 2,
  },
});
