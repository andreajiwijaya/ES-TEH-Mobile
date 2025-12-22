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
  StatusBar
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Product } from '../../types';
import { karyawanAPI } from '../../services/api';

export default function ProdukScreen() {
  // --- STATE ---
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Data
  const [form, setForm] = useState({
    nama: '',
    harga: '',
    category: 'Minuman',
    gambar: null as any
  });

  // --- LOAD DATA (API 37) ---
  const loadProducts = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await karyawanAPI.getProduk();
      if (response.data && Array.isArray(response.data)) {
        setProducts(response.data);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'Gagal memuat daftar produk');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  // --- ACTIONS ---
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setForm({ ...form, gambar: result.assets[0] });
  };

  const handleOpenEdit = async (id: number) => {
    setProcessing(true);
    try {
      const res = await karyawanAPI.getProdukById(id);
      if (res.data) {
        const p = res.data as Product;
        setEditingProduct(p);
        setForm({
          nama: p.nama,
          harga: p.harga.toString(),
          category: p.category || 'Minuman',
          gambar: null // Biarkan null jika tidak ingin ganti foto
        });
        setShowModal(true);
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'Gagal mengambil detail produk');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!form.nama || !form.harga) return Alert.alert('Validasi', 'Nama dan harga wajib diisi');

    setProcessing(true);
    try {
      // PERBAIKAN LOGIKA: Pastikan payload sesuai dengan apa yang diharapkan api.ts
      const payload = {
        nama: form.nama,
        harga: parseInt(form.harga),
        category: form.category,
        gambar: form.gambar,
        // Pastikan komposisi dikirim sebagai array asli, 
        // stringify-nya biar dilakukan di api.ts agar konsisten
        komposisi: editingProduct?.komposisi || [] 
      };

      const res = editingProduct 
        ? await karyawanAPI.updateProduk(editingProduct.id, payload)
        : await karyawanAPI.createProduk(payload);

      if (res.error) throw new Error(res.error);
      
      Alert.alert('Sukses', 'Data produk berhasil disimpan');
      setShowModal(false);
      loadProducts(true);
    } catch (error: any) {
      // Menampilkan pesan error detail dari backend jika ada
      Alert.alert('Gagal', error.message || 'Terjadi kesalahan saat menyimpan');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Hapus Menu', 'Yakin ingin menghapus menu ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        setProcessing(true);
        try {
          const res = await karyawanAPI.deleteProduk(id);
          if (res.error) throw new Error(res.error);
          loadProducts(true);
        } catch (error: any) {
          Alert.alert('Gagal', error.message);
        } finally {
          setProcessing(false);
        }
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Katalog Menu</Text>
            <Text style={styles.headerSubtitle}>Kelola harga & produk outlet</Text>
          </View>
          <TouchableOpacity 
            style={styles.headerAddBtn} 
            onPress={() => { 
              setEditingProduct(null); 
              setForm({nama:'', harga:'', category:'Minuman', gambar:null}); 
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
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProducts(true)} colors={[Colors.primary]} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardImageContainer}>
                <Image source={{ uri: item.gambar || 'https://via.placeholder.com/150' }} style={styles.cardImg} />
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{item.category || 'Minuman'}</Text>
                </View>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{item.nama}</Text>
                <Text style={styles.cardPrice}>Rp {item.harga.toLocaleString()}</Text>
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

      {/* MODAL FORM */}
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
                  <Image source={{ uri: form.gambar.uri }} style={styles.previewImg} />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <View style={styles.uploadIconContainer}>
                       <Ionicons name="camera" size={32} color={Colors.primary} />
                    </View>
                    <Text style={styles.uploadText}>Ketuk untuk upload foto</Text>
                  </View>
                )}
                {form.gambar && (
                  <View style={styles.uploadEditBadge}>
                    <Ionicons name="sync" size={12} color="white" />
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nama Produk</Text>
                <TextInput 
                  style={styles.input} 
                  value={form.nama} 
                  onChangeText={t => setForm({...form, nama:t})} 
                  placeholder="Contoh: Es Teh Leci" 
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Harga Jual (Rp)</Text>
                <TextInput 
                  style={styles.input} 
                  value={form.harga} 
                  onChangeText={t => setForm({...form, harga:t})} 
                  keyboardType="numeric" 
                  placeholder="5000" 
                />
              </View>

              <TouchableOpacity 
                style={[styles.saveBtn, processing && styles.btnDisabled]} 
                onPress={handleSave} 
                disabled={processing}
              >
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
  header: { 
    backgroundColor: Colors.primary, 
    paddingTop: Platform.OS === 'ios' ? 60 : 50, 
    paddingBottom: 25, 
    paddingHorizontal: 24, 
    borderBottomLeftRadius: 32, 
    borderBottomRightRadius: 32,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: 'white', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerAddBtn: { backgroundColor: 'white', width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  
  listContent: { padding: 15, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666', fontWeight: '600' },
  
  card: { flex: 0.5, backgroundColor: 'white', margin: 8, borderRadius: 24, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  cardImageContainer: { position: 'relative' },
  cardImg: { width: '100%', height: 140, backgroundColor: '#F0F0F0' },
  categoryBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  categoryBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  
  cardInfo: { padding: 15 },
  cardName: { fontWeight: '800', fontSize: 15, color: '#333' },
  cardPrice: { color: Colors.primary, fontWeight: '900', fontSize: 16, marginVertical: 6 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 5 },
  editBtn: { backgroundColor: Colors.primary, padding: 10, borderRadius: 12, flex: 1, alignItems: 'center' },
  deleteBtn: { backgroundColor: Colors.error, padding: 10, borderRadius: 12, flex: 1, alignItems: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#333' },
  modalCloseBtn: { padding: 5 },
  formContent: { paddingBottom: 20 },
  
  uploadArea: { height: 180, backgroundColor: '#F8F9FA', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 25, overflow: 'hidden', borderStyle: 'dashed', borderWidth: 2, borderColor: '#DDD' },
  previewImg: { width: '100%', height: '100%' },
  uploadPlaceholder: { alignItems: 'center' },
  uploadIconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  uploadText: { color: '#999', fontWeight: '600', fontSize: 13 },
  uploadEditBadge: { position: 'absolute', bottom: 15, right: 15, backgroundColor: Colors.primary, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#F8F9FA', borderRadius: 16, padding: 18, fontSize: 16, fontWeight: '600', color: '#333', borderWidth: 1, borderColor: '#EEE' },
  
  saveBtn: { backgroundColor: Colors.primary, padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 10, elevation: 4 },
  saveBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
  btnDisabled: { opacity: 0.7, elevation: 0 }
});