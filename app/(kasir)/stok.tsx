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
import { radius, spacing, typography } from '../../constants/DesignSystem';
import { authAPI, karyawanAPI } from '../../services/api';
import { Bahan, BahanGudang, BarangKeluar, FileAsset, PermintaanStok, User } from '../../types';

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
  const [incomingShipments, setIncomingShipments] = useState<(BarangKeluar | PermintaanStok)[]>([]);
  const [bahanGudang, setBahanGudang] = useState<BahanGudang[]>([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  
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
      }

      // Cek barangKeluar dulu; jika kosong atau error, fallback ke PermintaanStok dengan status 'dikirim'
      if (reqRes.data) {
        // Fallback: gunakan PermintaanStok dengan status 'dikirim'
        const allReq = (reqRes.data as PermintaanStok[]);
        const inTransit = allReq.filter(i => 
          (i.status || '').toString().toLowerCase() === 'dikirim'
        );
        // Sort by ID ascending (FIFO - pertama dikirim duluan)
        setIncomingShipments(inTransit.sort((a, b) => a.id - b.id));
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
  const handleConfirmReceipt = async (ship: BarangKeluar | PermintaanStok) => {
    Alert.alert('Konfirmasi Terima', 'Barang sudah sampai dan sesuai?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Foto Bukti', onPress: () => pickImage(ship.id) },
      { 
        text: 'Ya, Terima', 
        onPress: async () => {
          setActionLoading(true);
          try {
            const res = await karyawanAPI.terimaBarangKeluar(ship.id, buktiFoto);
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
        console.log('[DEBUG] Create PermintaanStok:', { bahan_id: bId, jumlah: qty });
        const res = await karyawanAPI.createPermintaanStok({ bahan_id: bId, jumlah: qty });
        if (res.error) throw new Error(res.error);
        Alert.alert('Sukses', 'Permintaan stok telah diajukan.');
      } else if (selectedRequestItem) {
        const payload = { 
          bahan_id: selectedRequestItem.bahan_id, 
          jumlah: qty 
        };
        console.log('[DEBUG] Update PermintaanStok ID:', selectedRequestItem.id);
        console.log('[DEBUG] Current bahan_id:', selectedRequestItem.bahan_id);
        console.log('[DEBUG] Current bahan:', selectedRequestItem.bahan);
        console.log('[DEBUG] Payload:', payload);
        const res = await karyawanAPI.updatePermintaanStok(selectedRequestItem.id, payload);
        console.log('[DEBUG] Update response:', res);
        if (res.error) throw new Error(res.error);
        Alert.alert('Sukses', 'Permintaan telah diperbarui.');
      }
      // Close modal dulu, baru refresh data
      setModalVisible(false);
      setSelectedRequestItem(null);
      setInputQuantity('');
      // Refresh data after closing modal
      await loadAllData(true);
    } catch (err: any) {
      console.error('[ERROR] Submit error:', err);
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

  // Convert grams to packs (bungkus) based on bahan.berat_per_isi
  // Rounds to nearest pack; shows half-pack when exactly 0.5
  const getPackDisplay = (stok: number, bahan: Bahan) => {
    const perIsi = Number((bahan as any)?.berat_per_isi) || 0;
    if (!perIsi || perIsi <= 0) {
      // Fallback: show raw stok with satuan if available
      const unit = (bahan as any)?.satuan ? ` ${String((bahan as any)?.satuan)}` : '';
      return `${stok}${unit}`;
    }
    const exact = stok / perIsi;
    const flo = Math.floor(exact);
    const frac = exact - flo;
    const epsilon = 1e-6;
    if (Math.abs(frac - 0.5) <= epsilon && flo > 0) {
      return `${flo} ½ bungkus`;
    }
    const rounded = Math.round(exact);
    return `${rounded} bungkus`;
  };

  const getPerPackText = (bahan: Bahan) => {
    const perIsi = Number((bahan as any)?.berat_per_isi) || 0;
    if (!perIsi) return '';
    return `(${perIsi} gr per bungkus)`;
  };

  const getPerPackUnit = (bahan: Bahan) => {
    const perIsi = Number((bahan as any)?.berat_per_isi) || 0;
    if (!perIsi) return '-';
    return `${perIsi} gr / bungkus`;
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
              <SkeletonShimmer width={200} height={28} borderRadius={8} style={{ marginBottom: spacing.sm }} />
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
          <SkeletonShimmer width="100%" height={50} borderRadius={15} style={{ marginBottom: spacing.lg }} />
          <SkeletonShimmer width="100%" height={50} borderRadius={15} style={{ marginBottom: spacing.lg }} />
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <SkeletonShimmer width="60%" height={16} borderRadius={6} style={{ marginBottom: spacing.sm }} />
              <SkeletonShimmer width="40%" height={12} borderRadius={6} style={{ marginBottom: spacing.md }} />
              <View style={{ height: 1, backgroundColor: '#F5F5F5', marginVertical: spacing.md }} />
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
                          {getPackDisplay(item.stok, item.bahan)}
                        </Text>
                        {!!getPerPackText(item.bahan) && (
                          <Text style={styles.perPackText}>{getPerPackText(item.bahan)}</Text>
                        )}
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
                    <Ionicons name="time" size={28} color={getStatusColor(ship.status || '')} />
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
                      onPress={() => handleConfirmReceipt(ship)}
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
              {/* Bahan Selection Dropdown for "Minta Bahan Baru" */}
              {modalType === 'create' && modalFromGudang && (
                <View style={styles.bahanListSection}>
                  <Text style={styles.sectionLabel}>Pilih Bahan</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setDropdownVisible(!dropdownVisible)}
                  >
                    <View style={{ flex: 1 }}>
                      {selectedBahanGudangId ? (
                        <>
                          <Text style={styles.dropdownButtonLabel}>
                            {bahanGudang.find(b => b.id === selectedBahanGudangId)?.nama}
                          </Text>
                          <Text style={styles.dropdownButtonSubLabel}>
                            {bahanGudang.find(b => b.id === selectedBahanGudangId)?.satuan}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.dropdownPlaceholder}>Pilih bahan...</Text>
                      )}
                    </View>
                    <Ionicons
                      name={dropdownVisible ? 'chevron-up' : 'chevron-down'}
                      size={24}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>

                  {/* Dropdown List */}
                  {dropdownVisible && (
                    <View style={styles.dropdownList}>
                      <ScrollView
                        scrollEnabled
                        nestedScrollEnabled={true}
                        style={styles.dropdownListContent}
                        showsVerticalScrollIndicator={true}
                      >
                        {bahanGudang.map(b => (
                          <TouchableOpacity
                            key={b.id}
                            style={[
                              styles.dropdownItem,
                              selectedBahanGudangId === b.id && styles.dropdownItemSelected
                            ]}
                            onPress={() => {
                              setSelectedBahanGudangId(b.id);
                              setDropdownVisible(false);
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.dropdownItemName}>{b.nama}</Text>
                              <Text style={styles.dropdownItemUnit}>{b.satuan}</Text>
                            </View>
                            {selectedBahanGudangId === b.id && (
                              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
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
                        {getPackDisplay(selectedStockItem.stok, selectedStockItem.bahan)}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Kemasan</Text>
                      <Text style={styles.infoValue}>{getPerPackUnit(selectedStockItem.bahan)}</Text>
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
    paddingHorizontal: spacing.lg,
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
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.headline,
    fontWeight: '800',
    color: 'white',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.body,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  avatarText: {
    fontSize: typography.title,
    fontWeight: '900',
    color: Colors.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: 'white',
    borderColor: 'white',
  },
  tabText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    fontSize: typography.caption,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  notifBadge: {
    width: 20,
    height: 20,
    borderRadius: radius.md,
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
    fontSize: typography.caption,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  skeletonCard: {
    backgroundColor: 'white',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: radius.lg,
    paddingHorizontal: 15,
    marginBottom: spacing.md,
    height: 50,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontWeight: '600',
    fontSize: typography.bodyStrong,
    color: '#333',
  },
  addButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    elevation: 4,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: typography.bodyStrong,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
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
    gap: spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.bodyStrong,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  cardUnit: {
    fontSize: typography.caption,
    color: '#999',
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  statusText: {
    fontSize: typography.caption,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: spacing.md,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: typography.caption,
    color: '#999',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stockValue: {
    fontSize: typography.headline,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  perPackText: {
    fontSize: typography.caption,
    color: '#999',
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  requestButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    elevation: 2,
  },
  requestButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: typography.body,
  },
  confirmButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    elevation: 2,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: typography.body,
  },
  proofImageContainer: {
    marginVertical: spacing.md,
    borderRadius: radius.lg,
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
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    marginTop: spacing.md,
    color: '#999',
    fontSize: typography.bodyStrong,
    fontWeight: '700',
  },
  emptySubtext: {
    marginTop: spacing.sm,
    color: '#BBB',
    fontSize: typography.body,
    fontWeight: '500',
  },
  statusSmall: {
    fontSize: typography.caption,
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
    padding: spacing.xl,
    maxHeight: '90%',
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.title,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  modalBody: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.body,
    fontWeight: '800',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  bahanListSection: {
    marginBottom: spacing.lg,
  },
  bahanList: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  bahanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: spacing.md,
  },
  bahanItemSelected: {
    backgroundColor: '#E8F5E9',
  },
  bahanCheckbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bahanName: {
    fontWeight: '700',
    fontSize: typography.body,
    color: '#333',
  },
  bahanUnit: {
    fontSize: typography.caption,
    color: '#999',
    marginTop: 2,
  },
  // Dropdown Styles
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E8E8E8',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  dropdownButtonLabel: {
    fontSize: typography.body,
    fontWeight: '700',
    color: '#333',
  },
  dropdownButtonSubLabel: {
    fontSize: typography.caption,
    color: '#999',
    marginTop: 2,
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    fontSize: typography.body,
    fontWeight: '600',
    color: '#999',
  },
  dropdownList: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderTopWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    maxHeight: 200,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  dropdownListContent: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: spacing.sm,
  },
  dropdownItemSelected: {
    backgroundColor: '#F0FDF4',
  },
  dropdownItemName: {
    fontSize: typography.body,
    fontWeight: '700',
    color: '#333',
  },
  dropdownItemUnit: {
    fontSize: typography.caption,
    color: '#999',
    marginTop: 2,
    fontWeight: '500',
  },
  infoSection: {
    marginBottom: spacing.lg,
  },
  infoBox: {
    backgroundColor: '#F5F7FA',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: typography.body,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: typography.body,
    fontWeight: '700',
    color: '#333',
  },
  quantitySection: {
    marginBottom: spacing.lg,
  },
  quantityInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: typography.title,
    fontWeight: '700',
    color: '#333',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 20,
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: spacing.md,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    elevation: 2,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: typography.bodyStrong,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    padding: spacing.md,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    elevation: 2,
  },
});
