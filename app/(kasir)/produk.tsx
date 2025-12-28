import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
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

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { spacing, radius, typography } from '../../constants/DesignSystem';
import { authAPI, karyawanAPI } from '../../services/api';
import { CreateProductPayload, FileAsset, Kategori, Product, StokOutletItem, UpdateProductPayload, User } from '../../types';

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

export default function ProdukScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + spacing.lg;

  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [bahanOptions, setBahanOptions] = useState<StokOutletItem[]>([]);
  const [kategoriList, setKategoriList] = useState<Kategori[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [form, setForm] = useState<{ nama: string; harga: string; category: string; gambar: FileAsset | null }>({
    nama: '',
    harga: '',
    category: 'Minuman',
    gambar: null,
  });

  const [komposisiList, setKomposisiList] = useState<{ bahan_id: number; quantity: string }[]>([]);
  const [selectedKategoriId, setSelectedKategoriId] = useState<number | null>(null);

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

      const [resProduk, resBahan, resKategori] = await Promise.all([
        karyawanAPI.getProduk(),
        karyawanAPI.getStokOutlet(),
        karyawanAPI.getKategori(),
      ]);

      // Products
      const dataProduk = (resProduk && (resProduk.data ?? resProduk)) as Product[] | undefined;
      setProducts(Array.isArray(dataProduk) ? dataProduk : []);

      // Bahan Options
      const dataBahan = (resBahan && (resBahan.data ?? resBahan)) as StokOutletItem[] | undefined;
      setBahanOptions(Array.isArray(dataBahan) ? dataBahan : []);

      // Kategori
      const rawData: any = resKategori?.data;
      const dataKategori = (rawData?.data ?? rawData ?? resKategori) as Kategori[] | undefined;
      setKategoriList(Array.isArray(dataKategori) ? dataKategori : []);
    } catch (err) {
      console.error('Load Error:', err);
      Alert.alert('Error', 'Gagal memuat data produk');
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

  // --- HELPERS ---
  const safeNumberFormat = (n?: number) => {
    if (typeof n !== 'number') return '-';
    try {
      return n.toLocaleString('id-ID');
    } catch {
      return String(n);
    }
  };

  const getImageUri = (img: any) => {
    if (!img) return 'https://via.placeholder.com/300';
    if (typeof img === 'string') return img;
    if (img.uri) return img.uri;
    return 'https://via.placeholder.com/300';
  };

  // --- PICK IMAGE ---
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin dibutuhkan', 'Berikan izin akses foto untuk mengunggah gambar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const file: FileAsset = {
          uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
          fileName: asset.fileName || `img_${Date.now()}.jpg`,
          name: asset.fileName || `img_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        };
        setForm(prev => ({ ...prev, gambar: file }));
      }
    } catch (err) {
      console.error('pickImage error', err);
      Alert.alert('Error', 'Gagal memilih gambar');
    }
  };

  // --- KOMPOSISI MANAGEMENT ---
  const addKomposisiRow = () => {
    setKomposisiList(prev => [...prev, { bahan_id: 0, quantity: '' }]);
  };

  const removeKomposisiRow = (index: number) => {
    setKomposisiList(prev => {
      const newList = [...prev];
      newList.splice(index, 1);
      return newList;
    });
  };

  const updateKomposisiRow = (index: number, field: 'bahan_id' | 'quantity', value: any) => {
    setKomposisiList(prev => {
      const newList = [...prev];
      newList[index] = { ...newList[index], [field]: value };
      return newList;
    });
  };

  // --- OPEN EDIT ---
  const handleOpenEdit = async (id: number) => {
    setProcessing(true);
    try {
      const p = products.find(prod => prod.id === id);
      
      if (!p || !p.id) {
        Alert.alert('Error', 'Produk tidak ditemukan');
        setProcessing(false);
        return;
      }
      
      setEditingProduct(p);

      setForm({
        nama: p.nama ?? '',
        harga: p.harga !== undefined ? String(p.harga) : '',
        category: p.category ?? 'Minuman',
        gambar: null,
      });

      setSelectedKategoriId(p.kategori_id ?? p.kategori?.id ?? null);

      const existing =
        (p.komposisi?.map(k => ({
          bahan_id: k.bahan_id,
          quantity: String(k.quantity),
        })) as { bahan_id: number; quantity: string }[]) ?? [];
      setKomposisiList(existing.length ? existing : [{ bahan_id: 0, quantity: '' }]);

      setShowModal(true);
    } catch (err) {
      console.error('handleOpenEdit error:', err);
      Alert.alert('Error', 'Gagal mengambil detail produk');
    } finally {
      setProcessing(false);
    }
  };

  // --- SAVE PRODUCT ---
  const handleSave = async () => {
    if (!form.nama || !form.harga) return Alert.alert('Validasi', 'Nama dan harga wajib diisi');

    const validKomposisi = komposisiList.filter(k => k.bahan_id && k.bahan_id !== 0 && k.quantity !== '');
    if (validKomposisi.length === 0) return Alert.alert('Validasi', 'Minimal masukkan 1 komposisi bahan');
    if (!selectedKategoriId) return Alert.alert('Validasi', 'Kategori produk wajib dipilih');

    setProcessing(true);
    try {
      const komposisiPayload = validKomposisi.map(k => ({
        bahan_id: k.bahan_id,
        quantity: parseFloat(k.quantity) || 0,
      }));

      const kategoriIdToSend = selectedKategoriId;

      const updatePayload: UpdateProductPayload = {
        nama: form.nama,
        harga: parseInt(String(form.harga), 10) || 0,
        category: form.category,
        gambar: form.gambar,
        komposisi: komposisiPayload,
        kategori_id: kategoriIdToSend,
      };

      const createPayload: CreateProductPayload = {
        nama: form.nama,
        harga: parseInt(String(form.harga), 10) || 0,
        category: form.category,
        gambar: form.gambar,
        komposisi: komposisiPayload,
        kategori_id: kategoriIdToSend,
      };

      const res = editingProduct
        ? await karyawanAPI.updateProduk(editingProduct.id, updatePayload)
        : await karyawanAPI.createProduk(createPayload);

      if (res.error) throw new Error(res.error);

      Alert.alert('Sukses', 'Data produk berhasil disimpan');
      setShowModal(false);
      setForm({ nama: '', harga: '', category: 'Minuman', gambar: null });
      setKomposisiList([{ bahan_id: 0, quantity: '' }]);
      setEditingProduct(null);
      setSelectedKategoriId(null);
      await loadAllData(true);
    } catch (error: any) {
      console.error('handleSave error detail:', error);
      Alert.alert('Gagal', error?.message || 'Terjadi kesalahan saat menyimpan');
    } finally {
      setProcessing(false);
    }
  };

  // --- DELETE PRODUCT ---
  const handleDelete = (id: number) => {
    Alert.alert('Hapus Menu', 'Yakin ingin menghapus menu ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          setProcessing(true);
          try {
            const res = await karyawanAPI.deleteProduk(id);
            if (res.error) throw new Error(res.error);
            Alert.alert('Sukses', 'Menu berhasil dihapus');
            await loadAllData(true);
          } catch (error: any) {
            console.error('delete error detail:', error);
            Alert.alert('Gagal', error?.message || 'Gagal menghapus menu');
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  };

  // --- OPEN CREATE MODAL ---
  const openCreateModal = () => {
    setEditingProduct(null);
    setForm({ nama: '', harga: '', category: 'Minuman', gambar: null });
    setKomposisiList([{ bahan_id: 0, quantity: '' }]);
    setSelectedKategoriId(null);
    setShowModal(true);
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
        </View>

        <View style={styles.shimmerGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={styles.shimmerCard}>
              <SkeletonShimmer width="100%" height={140} borderRadius={20} style={{ marginBottom: spacing.md }} />
              <SkeletonShimmer width="80%" height={14} borderRadius={6} style={{ marginBottom: spacing.sm }} />
              <SkeletonShimmer width="60%" height={16} borderRadius={6} style={{ marginBottom: spacing.md }} />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <SkeletonShimmer width="48%" height={36} borderRadius={10} />
                <SkeletonShimmer width="48%" height={36} borderRadius={10} />
              </View>
            </View>
          ))}
        </View>
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
            <Text style={styles.headerTitle}>Kelola Menu</Text>
            <Text style={styles.headerSubtitle}>Manajemen katalog outlet</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.username?.substring(0, 2).toUpperCase() || 'KA'}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={item => String(item.id ?? item.nama ?? Math.random())}
        numColumns={2}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="fast-food-outline" size={72} color="#E0E0E0" />
            <Text style={styles.emptyText}>Belum ada menu</Text>
            <Text style={styles.emptySubtext}>Tap tombol + untuk menambah menu baru</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardImageContainer}>
              <Image source={{ uri: getImageUri(item.gambar) }} style={styles.cardImg} resizeMode="cover" />
              {item.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{item.category}</Text>
                </View>
              )}
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName} numberOfLines={1}>{item.nama}</Text>
              <Text style={styles.cardPrice}>Rp {safeNumberFormat(item.harga)}</Text>
              <View style={styles.cardDivider} />
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => handleOpenEdit(item.id)}
                  style={styles.editBtn}
                  disabled={processing}
                >
                  <Ionicons name="pencil" size={16} color="white" />
                  <Text style={styles.btnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  style={styles.deleteBtn}
                  disabled={processing}
                >
                  <Ionicons name="trash" size={16} color="white" />
                  <Text style={styles.btnText}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Modal Form */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProduct ? 'Update Menu' : 'Menu Baru'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {/* Upload Image */}
              <TouchableOpacity style={styles.uploadArea} activeOpacity={0.7} onPress={pickImage}>
                {form.gambar ? (
                  <Image source={{ uri: form.gambar.uri }} style={styles.previewImg} resizeMode="cover" />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="camera" size={40} color={Colors.primary} />
                    <Text style={styles.uploadText}>Upload Foto Menu</Text>
                    <Text style={styles.uploadSubtext}>Tap untuk memilih gambar</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Nama Produk */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nama Produk</Text>
                <TextInput
                  style={styles.input}
                  value={form.nama}
                  onChangeText={t => setForm({ ...form, nama: t })}
                  placeholder="Es Teh Leci"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Harga */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Harga Jual (Rp)</Text>
                <TextInput
                  style={styles.input}
                  value={form.harga}
                  onChangeText={t => setForm({ ...form, harga: t })}
                  keyboardType="numeric"
                  placeholder="5000"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Kategori */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kategori Produk</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
                  {kategoriList.map(k => {
                    const active = selectedKategoriId === k.id;
                    return (
                      <TouchableOpacity
                        key={k.id}
                        onPress={() => setSelectedKategoriId(k.id)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{k.nama}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Komposisi / Resep */}
              <View style={styles.sectionHeader}>
                <Text style={styles.label}>Komposisi / Resep</Text>
                <TouchableOpacity onPress={addKomposisiRow} style={styles.addBahanBtn}>
                  <Ionicons name="add-circle" size={18} color={Colors.primary} />
                  <Text style={styles.addBahanText}>Tambah Bahan</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.komposisiContainer}>
                {komposisiList.map((it, index) => (
                  <View key={index} style={styles.komposisiRow}>
                    <View style={styles.komposisiLeft}>
                      <Text style={styles.komposisiLabel}>Pilih Bahan #{index + 1}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bahanChipContainer}>
                        {bahanOptions.map(b => {
                          const bahanId = (b as any).bahan_id ?? (b as any).bahan?.id ?? (b as any).id;
                          const namaBahan = (b as any).bahan?.nama ?? (b as any).nama ?? 'Bahan';
                          const active = it.bahan_id === bahanId;
                          return (
                            <TouchableOpacity
                              key={bahanId}
                              onPress={() => updateKomposisiRow(index, 'bahan_id', bahanId)}
                              style={[styles.bahanChip, active && styles.bahanChipActive]}
                            >
                              <Text style={[styles.bahanChipText, active && styles.bahanChipTextActive]}>
                                {namaBahan}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                    <View style={styles.komposisiRight}>
                      <Text style={styles.komposisiLabel}>Qty</Text>
                      <TextInput
                        style={styles.qtyInput}
                        value={it.quantity}
                        onChangeText={t => updateKomposisiRow(index, 'quantity', t)}
                        placeholder="0"
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                      />
                    </View>
                    <TouchableOpacity onPress={() => removeKomposisiRow(index)} style={styles.removeBtn}>
                      <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.saveBtn, processing && styles.btnDisabled]}
                onPress={handleSave}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.saveBtnText}>Simpan Menu</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    paddingBottom: 28,
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
  shimmerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    paddingBottom: 100,
  },
  shimmerCard: {
    width: '48%',
    margin: '1%',
    backgroundColor: 'white',
    borderRadius: radius.lg,
    padding: spacing.md,
    elevation: 3,
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
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
  card: {
    flex: 0.5,
    backgroundColor: 'white',
    margin: spacing.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardImageContainer: {
    position: 'relative',
  },
  cardImg: {
    width: '100%',
    height: 140,
    backgroundColor: '#F0F0F0',
  },
  categoryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  categoryBadgeText: {
    color: 'white',
    fontSize: typography.caption,
    fontWeight: '800',
  },
  cardInfo: {
    padding: spacing.md,
  },
  cardName: {
    fontWeight: '800',
    fontSize: typography.bodyStrong,
    color: '#1A1A1A',
    marginBottom: spacing.xs,
  },
  cardPrice: {
    color: Colors.primary,
    fontWeight: '900',
    fontSize: typography.title,
    marginBottom: spacing.md,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginBottom: spacing.md,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editBtn: {
    backgroundColor: Colors.primary,
    padding: spacing.sm,
    borderRadius: radius.md,
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    elevation: 2,
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
    padding: spacing.sm,
    borderRadius: radius.md,
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    elevation: 2,
  },
  btnText: {
    color: 'white',
    fontWeight: '800',
    fontSize: typography.caption,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: radius.xl,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
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
    maxHeight: '95%',
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.headline,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  modalBody: {
    marginBottom: spacing.lg,
  },
  uploadArea: {
    height: 180,
    backgroundColor: '#F5F7FA',
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#DDD',
    overflow: 'hidden',
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    color: Colors.primary,
    fontSize: typography.bodyStrong,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  uploadSubtext: {
    color: '#999',
    fontSize: typography.caption,
    marginTop: spacing.xs,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.body,
    fontWeight: '800',
    color: '#666',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: typography.bodyStrong,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    color: '#333',
  },
  chipContainer: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'white',
    borderRadius: radius.md,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: typography.body,
    color: '#666',
    fontWeight: '700',
  },
  chipTextActive: {
    color: 'white',
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addBahanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: 5,
  },
  addBahanText: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: typography.caption,
  },
  komposisiContainer: {
    backgroundColor: '#F9FAF9',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  komposisiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: spacing.sm,
  },
  komposisiLeft: {
    flex: 1,
  },
  komposisiLabel: {
    fontSize: typography.caption,
    fontWeight: '700',
    color: '#999',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  bahanChipContainer: {
    flexDirection: 'row',
  },
  bahanChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'white',
    borderRadius: radius.md,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  bahanChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  bahanChipText: {
    fontSize: typography.caption,
    color: '#666',
    fontWeight: '600',
  },
  bahanChipTextActive: {
    color: 'white',
    fontWeight: '800',
  },
  komposisiRight: {
    width: 80,
  },
  qtyInput: {
    backgroundColor: 'white',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    textAlign: 'center',
    fontWeight: '700',
    color: '#333',
  },
  removeBtn: {
    padding: spacing.sm,
  },
  modalActions: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 20,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    elevation: 3,
  },
  saveBtnText: {
    color: 'white',
    fontWeight: '800',
    fontSize: typography.bodyStrong,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
