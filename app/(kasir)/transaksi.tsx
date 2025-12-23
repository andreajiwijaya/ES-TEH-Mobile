import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useCallback } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  Platform
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { OrderItem, Product, FileAsset } from '../../types';
import { karyawanAPI } from '../../services/api';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function TransaksiScreen() {
  // --- STATE ---
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'tunai' | 'qris' | null>(null);
  const [paymentProof, setPaymentProof] = useState<FileAsset | null>(null);

  const getImageUri = (img?: string | FileAsset | null) => {
    if (!img) return 'https://via.placeholder.com/150';
    if (typeof img === 'string') return img;
    return img.uri ?? 'https://via.placeholder.com/150';
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await karyawanAPI.getProduk();
      if (response.data && Array.isArray(response.data)) {
        setProducts(response.data.map((p: any) => ({
          ...p,
          harga: Number(p.harga),
          is_available: p.is_available !== false,
        })));
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Gagal memuat menu kasir.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));

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
    if (!selectedPayment) return Alert.alert('Peringatan', 'Pilih metode pembayaran.');
    if (selectedPayment === 'qris' && !paymentProof) return Alert.alert('Peringatan', 'Upload bukti QRIS.');

    setProcessing(true);
    try {
      // FIX: Payload disesuaikan untuk diproses oleh makeFormDataRequest di api.ts
      const payload: any = {
        tanggal: new Date().toISOString().slice(0, 19).replace('T', ' '),
        metode_bayar: selectedPayment,
        items: JSON.stringify(orderItems.map(item => ({ 
          produk_id: item.produk_id,
          quantity: item.quantity,
        }))),
      };

      if (selectedPayment === 'qris' && paymentProof) {
        payload.bukti_qris = paymentProof;
      }

      const response = await karyawanAPI.createTransaksi(payload);
      if (response.error) throw new Error(response.error);

      Alert.alert('Sukses', 'Transaksi Berhasil!', [{
        text: 'Selesai', onPress: () => {
          setOrderItems([]);
          setSelectedPayment(null);
          setPaymentProof(null);
          setShowCheckoutModal(false);
        }
      }]);
    } catch (err: any) {
      console.error('Payment Processing Error:', err);
      Alert.alert('Gagal', err.message || 'Gagal menyimpan transaksi.');
    } finally {
      setProcessing(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin dibutuhkan', 'Berikan izin akses foto untuk mengunggah bukti pembayaran.');
        return;
      }

      // FIX: Menghilangkan deprecated MediaTypeOptions sesuai LOG
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // FIX: Pastikan format file sesuai agar tidak memicu "Network request failed"
        const file: FileAsset = {
          uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
          name: asset.fileName || `qris_${Date.now()}.jpg`,
          type: asset.type === 'image' ? 'image/jpeg' : (asset.mimeType || 'image/jpeg'),
        };
        setPaymentProof(file);
      }
    } catch (err) {
      console.error('pickImage error', err);
      Alert.alert('Error', 'Gagal memilih gambar');
    }
  };

  const categories = ['Semua', ...Array.from(new Set(products.map(p => p.category || ''))).filter(c => c !== '')];
  const filteredProducts = selectedCategory === 'Semua' ? products : products.filter(p => p.category === selectedCategory);
  const grandTotal = orderItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const totalQty = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Kasir Es Teh</Text>
            <Text style={styles.headerSubtitle}>Proses pesanan pelanggan hari ini</Text>
          </View>
          <View style={styles.headerIconContainer}>
             <Ionicons name="calculator" size={24} color={Colors.primary} />
          </View>
        </View>
      </View>

      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.catPill, selectedCategory === cat && styles.catPillActive]} 
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Menyiapkan Menu...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => addToCart(item)}>
              <Image source={{ uri: getImageUri(item.gambar) }} style={styles.cardImg} />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.nama}</Text>
                <Text style={styles.cardPrice}>{formatCurrency(item.harga)}</Text>
                <View style={styles.addBtnIcon}>
                  <Ionicons name="add" size={16} color="white" />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {orderItems.length > 0 && (
        <View style={styles.cartBarWrapper}>
          <TouchableOpacity style={styles.cartBar} activeOpacity={0.9} onPress={() => setShowCheckoutModal(true)}>
            <View style={styles.cartInfo}>
              <View style={styles.badge}><Text style={styles.badgeText}>{totalQty}</Text></View>
              <View>
                <Text style={styles.cartLabel}>Total Tagihan</Text>
                <Text style={styles.cartTotal}>{formatCurrency(grandTotal)}</Text>
              </View>
            </View>
            <View style={styles.btnCheckout}>
               <Text style={styles.btnCheckoutText}>Bayar</Text>
               <Ionicons name="chevron-forward" size={18} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showCheckoutModal} animationType="slide" transparent onRequestClose={() => setShowCheckoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Pesanan</Text>
              <TouchableOpacity onPress={() => setShowCheckoutModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
              {orderItems.map(item => {
                const p = products.find(prod => prod.id === item.produk_id);
                return (
                  <View key={item.id} style={styles.cartItem}>
                    <View style={{flex:1}}>
                      <Text style={styles.itemName}>{p?.nama}</Text>
                      <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal || 0)}</Text>
                    </View>
                    <View style={styles.qtyControl}>
                      <TouchableOpacity onPress={() => updateCartQty(item.id, -1)}><Ionicons name="remove-circle-outline" size={26} color={Colors.primary}/></TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity onPress={() => updateCartQty(item.id, 1)}><Ionicons name="add-circle-outline" size={26} color={Colors.primary}/></TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.itemDelete}>
                       <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                )
              })}
            </ScrollView>

            <View style={styles.paymentSection}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Grand Total</Text>
                <Text style={styles.summaryValue}>{formatCurrency(grandTotal)}</Text>
              </View>

              <Text style={styles.payLabel}>Metode Pembayaran</Text>
              <View style={styles.payRow}>
                <TouchableOpacity style={[styles.payBtn, selectedPayment === 'tunai' && styles.payBtnActive]} onPress={() => setSelectedPayment('tunai')}>
                  <Ionicons name="cash-outline" size={20} color={selectedPayment === 'tunai' ? 'white' : '#666'} />
                  <Text style={[styles.payBtnText, selectedPayment === 'tunai' && {color:'white'}]}>Tunai</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.payBtn, selectedPayment === 'qris' && styles.payBtnActive]} onPress={() => setSelectedPayment('qris')}>
                  <Ionicons name="qr-code-outline" size={20} color={selectedPayment === 'qris' ? 'white' : '#666'} />
                  <Text style={[styles.payBtnText, selectedPayment === 'qris' && {color:'white'}]}>QRIS</Text>
                </TouchableOpacity>
              </View>

              {selectedPayment === 'qris' && (
                <TouchableOpacity style={[styles.uploadBtn, paymentProof && styles.uploadBtnDone]} onPress={pickImage}>
                  <Ionicons name={paymentProof ? "checkmark-circle" : "camera"} size={20} color={paymentProof ? Colors.success : Colors.primary} />
                  <Text style={[styles.uploadBtnText, paymentProof && {color: Colors.success}]}>
                    {paymentProof ? 'Bukti Berhasil Diunggah' : 'Klik Upload Bukti Pembayaran'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.btnFinal, (!selectedPayment || processing) && styles.btnDisabled]} 
                onPress={handleProcessPayment} 
                disabled={processing || !selectedPayment}
              >
                {processing ? <ActivityIndicator color="white" /> : <Text style={styles.btnFinalText}>Selesaikan Transaksi</Text>}
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
  header: { 
    backgroundColor: Colors.primary, 
    paddingTop: Platform.OS === 'ios' ? 60 : 50, 
    paddingBottom: 25, 
    paddingHorizontal: 24, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30,
    elevation: 5,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: 'white', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  categoryContainer: { paddingVertical: 15 },
  categoryScroll: { paddingHorizontal: 20 },
  catPill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 25, backgroundColor: 'white', marginRight: 10, borderWidth: 1, borderColor: '#EEE' },
  catPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catText: { fontSize: 13, fontWeight: '700', color: '#666' },
  catTextActive: { color: 'white' },
  grid: { padding: 15, paddingBottom: 120 },
  card: { flex: 0.5, backgroundColor: 'white', margin: 8, borderRadius: 20, overflow: 'hidden', elevation: 3 },
  cardImg: { width: '100%', height: 130, backgroundColor: '#F0F0F0' },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  cardPrice: { fontSize: 14, fontWeight: '800', color: Colors.primary, marginTop: 4 },
  addBtnIcon: { position: 'absolute', bottom: 12, right: 12, backgroundColor: Colors.primary, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666', fontWeight: '600' },
  cartBarWrapper: { position: 'absolute', bottom: 30, left: 20, right: 20 },
  cartBar: { backgroundColor: Colors.primary, borderRadius: 20, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 8 },
  cartInfo: { flexDirection: 'row', alignItems: 'center' },
  badge: { backgroundColor: 'white', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  badgeText: { color: Colors.primary, fontWeight: '800', fontSize: 12 },
  cartLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  cartTotal: { color: 'white', fontSize: 18, fontWeight: '800' },
  btnCheckout: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
  btnCheckoutText: { color: 'white', fontWeight: '800', marginRight: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#333' },
  closeBtn: { padding: 5 },
  cartList: { marginBottom: 20 },
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  itemName: { fontWeight: '700', color: '#333', fontSize: 15 },
  itemSubtotal: { color: Colors.primary, fontSize: 13, fontWeight: '600', marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8F9FA', padding: 5, borderRadius: 15 },
  qtyText: { fontWeight: '800', fontSize: 16, minWidth: 20, textAlign: 'center' },
  itemDelete: { marginLeft: 10, padding: 5 },
  paymentSection: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  summaryLabel: { fontSize: 16, fontWeight: '600', color: '#666' },
  summaryValue: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  payLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 12 },
  payRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  payBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#EEE', gap: 10, backgroundColor: '#F8F9FA' },
  payBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  payBtnText: { fontWeight: '700', color: '#666' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: Colors.primary, borderRadius: 16, marginBottom: 20, backgroundColor: '#F1F8E9' },
  uploadBtnDone: { borderColor: Colors.success, backgroundColor: '#E8F5E9' },
  uploadBtnText: { marginLeft: 10, color: Colors.primary, fontWeight: '700' },
  btnFinal: { backgroundColor: Colors.primary, padding: 20, borderRadius: 20, alignItems: 'center', elevation: 4 },
  btnFinalText: { color: 'white', fontWeight: '800', fontSize: 16 },
  btnDisabled: { backgroundColor: '#CCC', elevation: 0 }
});