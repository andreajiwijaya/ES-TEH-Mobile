import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  StatusBar
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { OrderItem, Product } from '../../types';
import { karyawanAPI } from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');

// Helper untuk format rupiah
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function TransaksiScreen() {
  // =================================================================
  // 1. STATE MANAGEMENT
  // =================================================================
  
  const [isManageMode, setIsManageMode] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // -- State Kasir (POS) --
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'tunai' | 'qris' | null>(null);
  const [paymentProof, setPaymentProof] = useState<any>(null);

  // -- State Kelola Menu (CRUD) --
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form Inputs
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('Minuman');
  const [formImage, setFormImage] = useState<any>(null);

  // =================================================================
  // 2. LOAD DATA
  // =================================================================

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await karyawanAPI.getProduk();
      if (response.data && Array.isArray(response.data)) {
        const mappedProducts = response.data.map((p: any) => ({
          id: p.id,
          outlet_id: p.outlet_id,
          nama: p.nama,
          harga: Number(p.harga),
          gambar: p.gambar,
          is_available: p.is_available !== false,
          category: p.category || 'Lainnya',
        }));
        setProducts(mappedProducts);
      }
    } catch (error) {
      console.error('Load Produk Error:', error);
      Alert.alert('Koneksi Error', 'Gagal memuat daftar menu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // =================================================================
  // 3. LOGIC KELOLA MENU
  // =================================================================

  const handleAddProductPress = () => {
    setEditingProduct(null);
    setFormName('');
    setFormPrice('');
    setFormCategory('Minuman');
    setFormImage(null);
    setShowProductModal(true);
  };

  const handleEditProductPress = async (product: Product) => {
    setProcessing(true);
    try {
      const res = await karyawanAPI.getProdukById(product.id);
      if (res.data) {
        const p = res.data as Product;
        setEditingProduct(p);
        setFormName(p.nama);
        setFormPrice(p.harga.toString());
        setFormCategory(p.category || 'Minuman');
        setFormImage(null);
        setShowProductModal(true);
      } else {
        Alert.alert('Error', 'Gagal mengambil detail produk.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Terjadi kesalahan saat mengambil data.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!formName.trim()) return Alert.alert('Validasi', 'Nama produk tidak boleh kosong.');
    if (!formPrice.trim()) return Alert.alert('Validasi', 'Harga produk tidak boleh kosong.');
    
    setProcessing(true);
    try {
      const payload = {
        nama: formName,
        harga: parseInt(formPrice),
        category: formCategory,
        gambar: formImage, 
        komposisi: [] 
      };

      let res;
      if (editingProduct) {
        res = await karyawanAPI.updateProduk(editingProduct.id, payload);
      } else {
        res = await karyawanAPI.createProduk(payload);
      }

      if (res.error) throw new Error(res.error);

      Alert.alert('Berhasil', editingProduct ? 'Menu diperbarui.' : 'Menu ditambahkan.');
      setShowProductModal(false);
      loadProducts();

    } catch (error: any) {
      Alert.alert('Gagal', error.message || 'Gagal menyimpan data produk.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteProduct = (id: number) => {
    Alert.alert(
      'Konfirmasi Hapus', 
      'Yakin ingin menghapus menu ini?', 
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              const res = await karyawanAPI.deleteProduk(id);
              if (res.error) throw new Error(res.error);
              
              Alert.alert('Terhapus', 'Menu berhasil dihapus.');
              loadProducts();
            } catch (error: any) {
              Alert.alert('Gagal', error.message || 'Gagal menghapus produk.');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  // =================================================================
  // 4. LOGIC KASIR
  // =================================================================

  const addToCart = (product: Product) => {
    const existingItem = orderItems.find(item => item.produk_id === product.id);
    
    if (existingItem) {
      setOrderItems(orderItems.map(item =>
        item.produk_id === product.id
          ? { ...item, quantity: item.quantity + 1, subtotal: product.harga * (item.quantity + 1) }
          : item
      ));
    } else {
      setOrderItems([...orderItems, {
        id: Date.now().toString(),
        produk_id: product.id,
        quantity: 1,
        subtotal: product.harga,
      }]);
    }
  };

  const updateCartQty = (itemId: string, delta: number) => {
    setOrderItems(orderItems.map(item => {
      if (item.id === itemId) {
        const product = products.find(p => p.id === item.produk_id);
        if (product) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return item; 
          return { ...item, quantity: newQty, subtotal: product.harga * newQty };
        }
      }
      return item;
    }));
  };

  const removeFromCart = (itemId: string) => {
    setOrderItems(orderItems.filter(item => item.id !== itemId));
  };

  const handleProcessPayment = async () => {
    if (orderItems.length === 0) return Alert.alert('Error', 'Keranjang kosong.');
    if (!selectedPayment) return Alert.alert('Peringatan', 'Pilih metode pembayaran.');
    if (selectedPayment === 'qris' && !paymentProof) return Alert.alert('Peringatan', 'Upload bukti QRIS.');

    setProcessing(true);
    try {
      const payload: any = {
        tanggal: new Date().toISOString().slice(0, 19).replace('T', ' '),
        metode_bayar: selectedPayment,
        items: orderItems.map(item => ({
          produk_id: item.produk_id,
          quantity: item.quantity,
        })),
      };

      if (selectedPayment === 'qris' && paymentProof) {
        payload.bukti_qris = paymentProof;
      }

      const response = await karyawanAPI.createTransaksi(payload);

      if (response.error) throw new Error(response.error);

      Alert.alert('Sukses', 'Transaksi berhasil disimpan.', [
        {
          text: 'OK',
          onPress: () => {
            setOrderItems([]);
            setSelectedPayment(null);
            setPaymentProof(null);
            setShowCheckoutModal(false);
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Gagal', error.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setProcessing(false);
    }
  };

  // =================================================================
  // 5. HELPER UI
  // =================================================================

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Izin Ditolak", "Akses galeri diperlukan.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled) {
      if (showProductModal) setFormImage(result.assets[0]); 
      else setPaymentProof(result.assets[0]); 
    }
  };

  const categories = ['Semua', ...Array.from(new Set(products.map(p => p.category).filter((c): c is string => !!c)))];
  const filteredProducts = selectedCategory === 'Semua'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const grandTotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalQty = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const getProductName = (id: number) => products.find(p => p.id === id)?.nama || 'Unknown Product';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>{isManageMode ? 'Manajemen Menu' : 'Kasir Outlet'}</Text>
            <Text style={styles.headerSubtitle}>{isManageMode ? 'Tambah, Edit & Hapus' : 'Penjualan Hari Ini'}</Text>
          </View>
          
          <View style={[styles.modeSwitch, isManageMode ? styles.modeSwitchActive : styles.modeSwitchInactive]}>
            <Text style={[styles.modeText, isManageMode ? {color: Colors.primary} : {color: 'white'}]}>
              {isManageMode ? 'Admin' : 'Kasir'}
            </Text>
            <Switch
              value={isManageMode}
              onValueChange={setIsManageMode}
              trackColor={{ false: 'rgba(255,255,255,0.3)', true: 'rgba(0,0,0,0.1)' }}
              thumbColor={'white'}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        </View>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        {!isManageMode && (
          <View style={styles.categoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 15}}>
              {categories.map((cat, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.catPill, selectedCategory === cat && styles.catPillActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Memuat data menu...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={item => item.id.toString()}
            numColumns={2}
            contentContainerStyle={[styles.gridContainer, { paddingBottom: 120 }]}
            columnWrapperStyle={styles.rowWrapper}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Ionicons name="fast-food-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Tidak ada produk ditemukan</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => isManageMode ? handleEditProductPress(item) : addToCart(item)}
                onLongPress={() => isManageMode && handleDeleteProduct(item.id)}
              >
                <View style={styles.imageWrapper}>
                  {item.gambar ? (
                    <Image source={{ uri: item.gambar }} style={styles.cardImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={32} color="#ccc" />
                    </View>
                  )}
                  {isManageMode && (
                    <View style={styles.editOverlay}>
                      <Ionicons name="pencil" size={14} color="white" />
                    </View>
                  )}
                </View>
                
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.nama}</Text>
                  <Text style={styles.cardCategory}>{item.category}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardPrice}>{formatCurrency(item.harga)}</Text>
                    {!isManageMode && (
                      <View style={styles.addBtnSmall}>
                        <Ionicons name="add" size={16} color="white" />
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* FAB (Admin) */}
      {isManageMode && (
        <TouchableOpacity style={styles.fab} onPress={handleAddProductPress}>
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}

      {/* CART BAR (Kasir) */}
      {!isManageMode && orderItems.length > 0 && (
        <View style={styles.cartBarContainer}>
          <TouchableOpacity style={styles.cartBar} onPress={() => setShowCheckoutModal(true)}>
            <View style={styles.cartBarLeft}>
              <View style={styles.cartIconBadge}>
                <Ionicons name="cart" size={24} color={Colors.primary} />
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeText}>{totalQty}</Text>
                </View>
              </View>
              <View>
                <Text style={styles.cartTotalLabel}>Total Pembayaran</Text>
                <Text style={styles.cartTotalValue}>{formatCurrency(grandTotal)}</Text>
              </View>
            </View>
            <View style={styles.cartBarRight}>
              <Text style={styles.checkoutText}>Bayar</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL 1: FORM PRODUK */}
      <Modal visible={showProductModal} transparent animationType="slide" onRequestClose={() => setShowProductModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProduct ? 'Edit Menu' : 'Tambah Menu Baru'}</Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <TouchableOpacity style={styles.imageUploadArea} onPress={pickImage}>
                {formImage ? (
                  <Image source={{ uri: formImage.uri }} style={styles.uploadedImage} />
                ) : (
                  <View style={styles.uploadPlaceholderContent}>
                    <Ionicons name="camera" size={40} color={Colors.primary} />
                    <Text style={styles.uploadText}>Ketuk untuk upload foto</Text>
                  </View>
                )}
                <View style={styles.uploadIconBadge}>
                  <Ionicons name="create" size={12} color="white" />
                </View>
              </TouchableOpacity>

              <Text style={styles.label}>Nama Menu</Text>
              <TextInput 
                style={styles.input} 
                value={formName} 
                onChangeText={setFormName} 
                placeholder="Contoh: Es Teh Leci Jumbo" 
              />

              <Text style={styles.label}>Kategori</Text>
              <View style={styles.catSelectRow}>
                {['Minuman', 'Makanan', 'Topping'].map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.catSelectOption, formCategory === cat && styles.catSelectActive]}
                    onPress={() => setFormCategory(cat)}
                  >
                    <Text style={[styles.catSelectText, formCategory === cat && styles.catSelectTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Harga (Rp)</Text>
              <TextInput 
                style={styles.input} 
                value={formPrice} 
                onChangeText={setFormPrice} 
                keyboardType="numeric" 
                placeholder="0" 
              />

              <TouchableOpacity 
                style={[styles.saveButton, processing && styles.disabledBtn]} 
                onPress={handleSaveProduct}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Simpan Menu</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 2: CHECKOUT */}
      <Modal visible={showCheckoutModal} transparent animationType="slide" onRequestClose={() => setShowCheckoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Pesanan</Text>
              <TouchableOpacity onPress={() => setShowCheckoutModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cartScroll}>
              {orderItems.map((item) => (
                <View key={item.id} style={styles.cartItemRow}>
                  <View style={{flex: 1}}>
                    <Text style={styles.itemRowName}>{getProductName(item.produk_id)}</Text>
                    <Text style={styles.itemRowPrice}>{formatCurrency(item.subtotal)}</Text>
                  </View>
                  
                  <View style={styles.qtyControl}>
                    <TouchableOpacity onPress={() => updateCartQty(item.id, -1)} style={styles.qtyBtn}>
                      <Ionicons name="remove" size={16} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => updateCartQty(item.id, 1)} style={styles.qtyBtn}>
                      <Ionicons name="add" size={16} color={Colors.text} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.trashBtn}>
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.paymentContainer}>
              <View style={styles.paymentSummaryRow}>
                <Text style={styles.paymentLabel}>Total Tagihan</Text>
                <Text style={styles.paymentValue}>{formatCurrency(grandTotal)}</Text>
              </View>

              <Text style={styles.label}>Pilih Metode Pembayaran</Text>
              <View style={styles.paymentMethodsRow}>
                <TouchableOpacity 
                  style={[styles.payMethodCard, selectedPayment === 'tunai' && styles.payMethodActive]}
                  onPress={() => { setSelectedPayment('tunai'); setPaymentProof(null); }}
                >
                  <Ionicons name="cash" size={24} color={selectedPayment === 'tunai' ? Colors.primary : '#888'} />
                  <Text style={[styles.payMethodText, selectedPayment === 'tunai' && styles.payMethodTextActive]}>Tunai</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.payMethodCard, selectedPayment === 'qris' && styles.payMethodActive]}
                  onPress={() => setSelectedPayment('qris')}
                >
                  <Ionicons name="qr-code" size={24} color={selectedPayment === 'qris' ? Colors.primary : '#888'} />
                  <Text style={[styles.payMethodText, selectedPayment === 'qris' && styles.payMethodTextActive]}>QRIS</Text>
                </TouchableOpacity>
              </View>

              {selectedPayment === 'qris' && (
                <View style={styles.proofContainer}>
                  <Text style={styles.label}>Bukti Transfer (Wajib)</Text>
                  <TouchableOpacity style={styles.proofUploadBtn} onPress={pickImage}>
                    {paymentProof ? (
                      <View style={{flexDirection:'row', alignItems:'center'}}>
                        <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                        <Text style={{marginLeft: 8, color: Colors.success, fontWeight:'bold'}}>Foto Terlampir</Text>
                        <Text style={{marginLeft: 8, color:'#888', fontSize:12}}>Ketuk untuk ganti</Text>
                      </View>
                    ) : (
                      <View style={{flexDirection:'row', alignItems:'center'}}>
                        <Ionicons name="camera-outline" size={20} color={Colors.primary} />
                        <Text style={{marginLeft: 8, color: Colors.primary}}>Ambil / Pilih Foto</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.finalPayBtn, (!selectedPayment || processing) && styles.disabledBtn]} 
                onPress={handleProcessPayment}
                disabled={!selectedPayment || processing}
              >
                {processing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.finalPayText}>Selesaikan Transaksi</Text>
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  
  // Header
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.2, shadowRadius:4
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: 'white' },
  headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  modeSwitch: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 
  },
  modeSwitchActive: { backgroundColor: 'white' },
  modeSwitchInactive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  modeText: { fontSize: 12, fontWeight: '700', marginRight: 8 },

  // Content
  content: { flex: 1 },
  categoryContainer: { paddingVertical: 15 },
  catPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'white', marginRight: 10, borderWidth: 1, borderColor: '#eee'
  },
  catPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catText: { fontSize: 13, fontWeight: '600', color: '#666' },
  catTextActive: { color: 'white' },

  // Grid
  gridContainer: { paddingHorizontal: 15, paddingTop: 5 },
  rowWrapper: { justifyContent: 'space-between' },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  loadingText: { marginTop: 10, color: '#888' },
  emptyText: { marginTop: 10, color: '#888', fontSize: 16 },

  // Card
  card: {
    width: (screenWidth / 2) - 22,
    backgroundColor: 'white', borderRadius: 16,
    marginBottom: 15,
    shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.05, shadowRadius:4, elevation: 3
  },
  imageWrapper: {
    height: 140, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    backgroundColor: '#eee', overflow: 'hidden', position: 'relative'
  },
  cardImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  editOverlay: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 20
  },
  cardContent: { padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 2, height: 40 },
  cardCategory: { fontSize: 11, color: '#888', marginBottom: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 15, fontWeight: 'bold', color: Colors.primary },
  addBtnSmall: {
    backgroundColor: Colors.primary, width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center'
  },

  // FAB
  fab: {
    position: 'absolute', bottom: 30, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: {width:0, height:4}, shadowOpacity:0.3, shadowRadius:6, elevation: 6
  },

  // Cart Bar
  cartBarContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, backgroundColor: 'transparent'
  },
  cartBar: {
    backgroundColor: Colors.primary, borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity:0.2, shadowRadius:6, elevation: 8
  },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center' },
  cartIconBadge: { position: 'relative', marginRight: 15, backgroundColor: 'white', padding: 8, borderRadius: 12 },
  badgeCount: {
    position: 'absolute', top: -5, right: -5,
    backgroundColor: Colors.error, borderRadius: 10, width: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white'
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  cartTotalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  cartTotalValue: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  cartBarRight: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  checkoutText: { color: 'white', fontWeight: 'bold', marginRight: 6 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%', overflow: 'hidden' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  closeBtn: { padding: 4 },
  modalScroll: { padding: 20 },
  
  // Image Upload Style
  imageUploadArea: {
    height: 180, borderRadius: 16, backgroundColor: '#F5F7FA',
    borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    position: 'relative'
  },
  uploadedImage: { width: '100%', height: '100%', borderRadius: 14 },
  uploadPlaceholderContent: { alignItems: 'center' },
  uploadText: { marginTop: 10, color: '#888', fontWeight: '600' },
  uploadIconBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: Colors.primary, padding: 6, borderRadius: 20 },

  // Form Inputs
  label: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8, marginTop: 5 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 12,
    padding: 14, fontSize: 16, backgroundColor: '#fff', marginBottom: 15
  },
  catSelectRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  catSelectOption: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#ddd', alignItems: 'center'
  },
  catSelectActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catSelectText: { color: '#666', fontWeight: '600' },
  catSelectTextActive: { color: 'white' }, // FIX: Renamed from catTextActive to avoid duplicate
  
  // Cart Items
  cartScroll: { padding: 20 },
  cartItemRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
  },
  itemRowName: { fontSize: 15, fontWeight: '600', color: '#333' },
  itemRowPrice: { fontSize: 13, color: '#888', marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 8, padding: 4 },
  qtyBtn: { padding: 6 },
  qtyValue: { width: 30, textAlign: 'center', fontWeight: 'bold' },
  trashBtn: { marginLeft: 15, padding: 8, backgroundColor: '#FFEBEE', borderRadius: 8 },

  // Payment Section
  paymentContainer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee' },
  paymentSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  paymentLabel: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  paymentValue: { fontSize: 20, fontWeight: 'bold', color: Colors.primary },
  
  paymentMethodsRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  payMethodCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', gap: 8
  },
  payMethodActive: { borderColor: Colors.primary, backgroundColor: '#F0F9FF' },
  payMethodText: { fontWeight: '600', color: '#666' },
  payMethodTextActive: { color: Colors.primary },

  proofContainer: { marginBottom: 15 },
  proofUploadBtn: {
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary,
    borderStyle: 'dashed', backgroundColor: '#F0F9FF', alignItems: 'center'
  },

  // Buttons
  saveButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  finalPayBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 5 },
  finalPayText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  disabledBtn: { opacity: 0.6 },
});