import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Product, StokOutletItem, FileAsset } from '../../types';
import { karyawanAPI } from '../../services/api';

export default function ProdukScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [bahanOptions, setBahanOptions] = useState<StokOutletItem[]>([]);
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

  const loadInitialData = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      if (isRefresh) setRefreshing(true);

      try {
        const resProduk = await karyawanAPI.getProduk();
        const dataProduk = (resProduk && (resProduk.data ?? resProduk)) as Product[] | undefined;
        setProducts(Array.isArray(dataProduk) ? (dataProduk as Product[]) : []);

        const resBahan = await karyawanAPI.getStokOutlet();
        const dataBahan = (resBahan && (resBahan.data ?? resBahan)) as StokOutletItem[] | undefined;
        setBahanOptions(Array.isArray(dataBahan) ? (dataBahan as StokOutletItem[]) : []);
      } catch (err) {
        console.error('loadInitialData error:', err);
        Alert.alert('Error', 'Gagal memuat data produk dan bahan');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [loadInitialData])
  );

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

const pickImage = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin dibutuhkan', 'Berikan izin akses foto untuk mengunggah gambar.');
      return;
    }

    // Gunakan MediaTypeOptions jika MediaType memicu error property not exist
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      
      // Pastikan format URI dan Type benar untuk mencegah "Network request failed"
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

  const handleOpenEdit = async (id: number) => {
    setProcessing(true);
    try {
      const res = await karyawanAPI.getProdukById(id);
      const p = (res && (res.data ?? res)) as Product | undefined;
      if (!p) {
        Alert.alert('Error', 'Produk tidak ditemukan');
        return;
      }
      setEditingProduct(p);

      setForm({
        nama: p.nama ?? '',
        harga: p.harga !== undefined ? String(p.harga) : '',
        category: p.category ?? 'Minuman',
        gambar: null,
      });

      const existing =
        (p.komposisi?.map(k => ({
          bahan_id: k.bahan_id,
          quantity: String(k.quantity),
        })) as { bahan_id: number; quantity: string }[]) ?? [];
      setKomposisiList(existing.length ? existing : [{ bahan_id: 0, quantity: '' }]);

      setShowModal(true);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Gagal mengambil detail produk');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!form.nama || !form.harga) return Alert.alert('Validasi', 'Nama dan harga wajib diisi');

    const validKomposisi = komposisiList.filter(k => k.bahan_id && k.bahan_id !== 0 && k.quantity !== '');
    if (validKomposisi.length === 0) return Alert.alert('Validasi', 'Minimal masukkan 1 komposisi bahan');

    setProcessing(true);
    try {
      // FIX: Pastikan payload sesuai untuk FormData di api.ts
      const payload: any = {
        nama: form.nama,
        harga: parseInt(String(form.harga), 10) || 0,
        category: form.category,
        gambar: form.gambar, 
        komposisi: validKomposisi.map(k => ({
          bahan_id: k.bahan_id,
          quantity: parseFloat(k.quantity),
        })),
      };

      const res = editingProduct
        ? await karyawanAPI.updateProduk(editingProduct.id, payload)
        : await karyawanAPI.createProduk(payload);

      if (res.error) throw new Error(res.error);

      Alert.alert('Sukses', 'Data produk berhasil disimpan');
      setShowModal(false);
      setForm({ nama: '', harga: '', category: 'Minuman', gambar: null });
      setKomposisiList([{ bahan_id: 0, quantity: '' }]);
      setEditingProduct(null);
      await loadInitialData(true);
    } catch (error: any) {
      console.error('handleSave error detail:', error); // Log detail error untuk debug
      Alert.alert('Gagal', error?.message || 'Terjadi kesalahan saat menyimpan');
    } finally {
      setProcessing(false);
    }
  };

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
            await loadInitialData(true);
          } catch (error: any) {
            console.error('delete error', error);
            Alert.alert('Gagal', error?.message || 'Terjadi kesalahan saat menghapus');
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Katalog Menu</Text>
            <Text style={styles.headerSubtitle}>Kelola harga & resep outlet</Text>
          </View>
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() => {
              setEditingProduct(null);
              setForm({ nama: '', harga: '', category: 'Minuman', gambar: null });
              setKomposisiList([{ bahan_id: 0, quantity: '' }]);
              setShowModal(true);
            }}
          >
            <Ionicons name="add" size={28} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Memuat Katalog...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => String(item.id ?? item.nama ?? Math.random())}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadInitialData(true)} colors={[Colors.primary]} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardImageContainer}>
                <Image source={{ uri: getImageUri(item.gambar) }} style={styles.cardImg} resizeMode="cover" />
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{item.category || 'Minuman'}</Text>
                </View>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{item.nama}</Text>
                <Text style={styles.cardPrice}>Rp {safeNumberFormat(item.harga)}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => handleOpenEdit(item.id)} style={styles.editBtn}>
                    <Ionicons name="pencil" size={16} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProduct ? 'Update Menu' : 'Menu Baru'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
              <TouchableOpacity style={styles.uploadArea} activeOpacity={0.7} onPress={pickImage}>
                {form.gambar ? (
                  <Image source={{ uri: form.gambar.uri }} style={styles.previewImg} resizeMode="cover" />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="camera" size={32} color={Colors.primary} />
                    <Text style={styles.uploadText}>Upload foto menu</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nama Produk</Text>
                <TextInput style={styles.input} value={form.nama} onChangeText={t => setForm({ ...form, nama: t })} placeholder="Es Teh Leci" />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Harga Jual (Rp)</Text>
                <TextInput style={styles.input} value={form.harga} onChangeText={t => setForm({ ...form, harga: t })} keyboardType="numeric" placeholder="5000" />
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.label}>Komposisi / Resep</Text>
                <TouchableOpacity onPress={addKomposisiRow} style={styles.addBahanBtn}>
                  <Text style={styles.addBahanText}>+ Bahan</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.komposisiList}>
                {komposisiList.map((it, index) => (
                  <View key={index} style={styles.komposisiRow}>
                    <View style={{ flex: 1 }}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {bahanOptions.map(b => {
                          const bahanId = (b as any).bahan_id ?? (b as any).bahan?.id ?? (b as any).id;
                          const namaBahan = (b as any).bahan?.nama ?? (b as any).nama ?? 'Bahan';
                          const active = it.bahan_id === bahanId;
                          return (
                            <TouchableOpacity key={bahanId} onPress={() => updateKomposisiRow(index, 'bahan_id', bahanId)} style={[styles.chip, active && styles.chipActive]}>
                              <Text style={[styles.chipText, active && styles.chipTextActive]}>{namaBahan}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                    <TextInput style={styles.qtyInput} value={it.quantity} onChangeText={t => updateKomposisiRow(index, 'quantity', t)} placeholder="Qty" keyboardType="numeric" />
                    <TouchableOpacity onPress={() => removeKomposisiRow(index)} style={{ marginLeft: 8 }}>
                      <Ionicons name="trash-outline" size={22} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={[styles.saveBtn, processing && styles.btnDisabled]} onPress={handleSave} disabled={processing}>
                {processing ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Simpan Menu</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: Colors.primary, paddingTop: 50, paddingBottom: 25, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  headerAddBtn: { backgroundColor: 'white', width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 15, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  card: { flex: 0.5, backgroundColor: 'white', margin: 8, borderRadius: 24, overflow: 'hidden', elevation: 4 },
  cardImageContainer: { position: 'relative' },
  cardImg: { width: '100%', height: 120, backgroundColor: '#F0F0F0' },
  categoryBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  categoryBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  cardInfo: { padding: 12 },
  cardName: { fontWeight: '800', fontSize: 14, color: '#333' },
  cardPrice: { color: Colors.primary, fontWeight: '900', fontSize: 15, marginVertical: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  editBtn: { backgroundColor: Colors.primary, padding: 8, borderRadius: 10, flex: 1, marginRight: 4, alignItems: 'center' },
  deleteBtn: { backgroundColor: Colors.error, padding: 8, borderRadius: 10, flex: 1, marginLeft: 4, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20, maxHeight: '95%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalCloseBtn: { padding: 5 },
  formContent: { paddingBottom: 20 },
  uploadArea: { height: 150, backgroundColor: '#F8F9FA', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: '#DDD', overflow: 'hidden' },
  previewImg: { width: '100%', height: '100%' },
  uploadPlaceholder: { alignItems: 'center' },
  uploadText: { color: '#999', fontSize: 12, marginTop: 5 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 8, textTransform: 'uppercase' },
  input: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 15, fontSize: 15, borderWidth: 1, borderColor: '#EEE' },
  saveBtn: { backgroundColor: Colors.primary, padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
  btnDisabled: { opacity: 0.7 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  addBahanBtn: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBahanText: { color: Colors.primary, fontWeight: 'bold', fontSize: 12 },
  komposisiList: { backgroundColor: '#F9FAF9', borderRadius: 16, padding: 10, marginBottom: 20 },
  komposisiRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  qtyInput: { width: 60, backgroundColor: 'white', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#DDD', textAlign: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'white', borderRadius: 10, marginRight: 8, borderWidth: 1, borderColor: '#EEE' },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, color: '#666' },
  chipTextActive: { color: 'white', fontWeight: 'bold' },
});