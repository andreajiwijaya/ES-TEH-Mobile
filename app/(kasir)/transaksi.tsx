import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Image,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import AlertModal from '../../components/AlertModal';
import { Colors } from '../../constants/Colors';
import { radius, spacing, typography } from '../../constants/DesignSystem';
import { authAPI, karyawanAPI } from '../../services/api';
import { CreateTransaksiPayload, FileAsset, Product, TransaksiItemPayload, User } from '../../types';

// Format Currency Helper
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

type OrderItem = {
  id: string;
  produk_id: number;
  quantity: number;
  subtotal: number;
};

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

export default function TransaksiScreen() {
  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Leaf animations
  const leafFloat1 = useRef(new Animated.Value(0)).current;
  const leafFloat2 = useRef(new Animated.Value(0)).current;
  const leafFloat3 = useRef(new Animated.Value(0)).current;

  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'tunai' | 'qris' | null>(null);
  const [paymentProof, setPaymentProof] = useState<FileAsset | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // Shared alert modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success'|'error'|'warning'|'info'>('info');
  const [alertOnClose, setAlertOnClose] = useState<(() => void) | null>(null);

  const showAlert = (
    title: string,
    message: string,
    type: 'success'|'error'|'warning'|'info' = 'info',
    onClose?: () => void,
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertOnClose(() => onClose || null);
    setAlertVisible(true);
  };

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

  // --- LOAD PRODUCTS ---
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      await loadUserData();

      const response = await karyawanAPI.getProduk();
      if (response.data && Array.isArray(response.data)) {
        setProducts(response.data.map((p: any) => ({
          ...p,
          harga: Number(p.harga),
          is_available: p.is_available !== false,
        })));
      }
    } catch (err) {
      console.error('Load Error:', err);
      showAlert('Error', 'Gagal memuat menu kasir.', 'error');
    } finally {
      setLoading(false);
    }
  }, [loadUserData]);

  useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));

  // Floating leaves animation
  useEffect(() => {
    const floatAnimation = (animValue: Animated.Value, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    floatAnimation(leafFloat1, 3000);
    floatAnimation(leafFloat2, 4000);
    floatAnimation(leafFloat3, 3500);
  }, [leafFloat1, leafFloat2, leafFloat3]);

  // --- HELPERS ---
  const getImageUri = (img?: string | FileAsset | null) => {
    if (!img) return 'https://via.placeholder.com/150';
    if (typeof img === 'string') return img;
    return img.uri ?? 'https://via.placeholder.com/150';
  };

  const getCategoryLabel = (p: Product) => (p.category ?? p.kategori?.nama ?? '').trim();
  const normalizeCat = (value?: string | null) => (value ?? '').trim().toLowerCase();

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => {
      const label = getCategoryLabel(p);
      const key = normalizeCat(label);
      if (key) {
        map.set(key, label);
      }
    });
    return ['Semua', ...map.values()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Semua') return products;
    const selectedKey = normalizeCat(selectedCategory);
    return products.filter(p => normalizeCat(getCategoryLabel(p)) === selectedKey);
  }, [products, selectedCategory]);

  const grandTotal = orderItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const totalQty = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const leaf1Transform = leafFloat1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const leaf2Transform = leafFloat2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const leaf3Transform = leafFloat3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  // --- CART MANAGEMENT ---
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

  // --- IMAGE PICKER ---
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Izin dibutuhkan', 'Berikan izin akses foto untuk mengunggah bukti pembayaran.', 'warning');
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
          name: asset.fileName || `qris_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        };
        setPaymentProof(file);
      }
    } catch (err) {
      console.error('pickImage error', err);
      showAlert('Error', 'Gagal memilih gambar', 'error');
    }
  };

  const clearPaymentProof = () => setPaymentProof(null);

  // --- PROCESS PAYMENT ---
  const handleProcessPayment = async () => {
    if (!selectedPayment) return showAlert('Peringatan', 'Pilih metode pembayaran.', 'warning');
    if (selectedPayment === 'qris' && !paymentProof) return showAlert('Peringatan', 'Upload bukti QRIS.', 'warning');
    if (orderItems.length === 0) return showAlert('Peringatan', 'Tambahkan minimal 1 produk.', 'warning');

    setProcessing(true);
    try {
      const itemsPayload: TransaksiItemPayload[] = orderItems.map(item => ({
        produk_id: item.produk_id,
        quantity: item.quantity,
      }));

      const payload: CreateTransaksiPayload = {
        tanggal: new Date().toISOString().slice(0, 19).replace('T', ' '),
        metode_bayar: selectedPayment,
        items: itemsPayload,
        ...(selectedPayment === 'qris' && paymentProof ? { bukti_qris: paymentProof } : {}),
      };

      const response = await karyawanAPI.createTransaksi(payload);
      if (response.error) throw new Error(response.error);

      showAlert('Sukses', 'Transaksi Berhasil!', 'success', () => {
        setOrderItems([]);
        setSelectedPayment(null);
        setPaymentProof(null);
        setShowCheckoutModal(false);
      });
    } catch (err: any) {
      console.error('Payment Processing Error:', err);
      showAlert('Gagal', err.message || 'Gagal menyimpan transaksi.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // --- CONFIRM PAYMENT ---
  const confirmBeforePay = () => {
    if (processing || confirming) return;
    if (orderItems.length === 0) return showAlert('Peringatan', 'Tambahkan minimal 1 produk.', 'warning');
    if (!selectedPayment) return showAlert('Peringatan', 'Pilih metode pembayaran.', 'warning');
    if (selectedPayment === 'qris' && !paymentProof) return showAlert('Peringatan', 'Upload bukti QRIS.', 'warning');

    setShowConfirmModal(true);
  };

  const handleConfirmPayment = async () => {
    setShowConfirmModal(false);
    setConfirming(true);
    await handleProcessPayment();
    setConfirming(false);
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

        <View style={styles.categoryShimmer}>
          <SkeletonShimmer width={80} height={36} borderRadius={18} style={{ marginRight: 10 }} />
          <SkeletonShimmer width={100} height={36} borderRadius={18} style={{ marginRight: 10 }} />
          <SkeletonShimmer width={90} height={36} borderRadius={18} style={{ marginRight: 10 }} />
          <SkeletonShimmer width={80} height={36} borderRadius={18} />
        </View>

        <View style={styles.shimmerGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={styles.shimmerCard}>
              <SkeletonShimmer width="100%" height={140} borderRadius={20} style={{ marginBottom: spacing.md }} />
              <SkeletonShimmer width="80%" height={14} borderRadius={6} style={{ marginBottom: spacing.sm }} />
              <SkeletonShimmer width="60%" height={16} borderRadius={6} />
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
        {/* Animated Floating Leaves */}
        <Animated.View
          style={[
            styles.leafDecor1,
            { transform: [{ translateY: leaf1Transform }] },
          ]}
        >
          <Ionicons name="leaf" size={70} color="rgba(255,255,255,0.15)" style={{ transform: [{ rotate: '25deg' }] }} />
        </Animated.View>
        <Animated.View
          style={[
            styles.leafDecor2,
            { transform: [{ translateY: leaf2Transform }] },
          ]}
        >
          <Ionicons name="leaf" size={50} color="rgba(255,255,255,0.12)" style={{ transform: [{ rotate: '-45deg' }] }} />
        </Animated.View>
        <Animated.View
          style={[
            styles.leafDecor3,
            { transform: [{ translateY: leaf3Transform }] },
          ]}
        >
          <Ionicons name="leaf" size={60} color="rgba(255,255,255,0.1)" style={{ transform: [{ rotate: '60deg' }] }} />
        </Animated.View>

        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Kasir Es Teh</Text>
            <Text style={styles.headerSubtitle}>Proses pesanan pelanggan</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.username?.substring(0, 2).toUpperCase() || 'KA'}
            </Text>
          </View>
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
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

      {/* Product Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="fast-food-outline" size={72} color="#E0E0E0" />
            <Text style={styles.emptyText}>Tidak ada menu</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => addToCart(item)}
          >
            <View style={styles.cardImageContainer}>
              <Image source={{ uri: getImageUri(item.gambar) }} style={styles.cardImg} />
              {item.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{item.category}</Text>
                </View>
              )}
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.nama}</Text>
              <Text style={styles.cardPrice}>{formatCurrency(item.harga)}</Text>
              <View style={styles.addBtnIcon}>
                <Ionicons name="add" size={18} color="white" />
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Cart Bar */}
      {orderItems.length > 0 && (
        <View style={styles.cartBarWrapper}>
          <TouchableOpacity
            style={styles.cartBar}
            activeOpacity={0.9}
            onPress={() => setShowCheckoutModal(true)}
          >
            <View style={styles.cartInfo}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalQty}</Text>
              </View>
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

      {/* Checkout Modal */}
      <Modal
        visible={showCheckoutModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCheckoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Handle */}
            <View style={styles.modalHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="cart" size={24} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Detail Pesanan</Text>
                  <Text style={styles.modalSubtitle}>{orderItems.length} item dipilih</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowCheckoutModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalDivider} />

            {/* Cart Items List */}
            <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
              {orderItems.map(item => {
                const p = products.find(prod => prod.id === item.produk_id);
                return (
                  <View key={item.id} style={styles.cartItem}>
                    <View style={styles.itemLeft}>
                      <Text style={styles.itemName}>{p?.nama}</Text>
                      <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal || 0)}</Text>
                    </View>
                    <View style={styles.qtyControl}>
                      <TouchableOpacity onPress={() => updateCartQty(item.id, -1)}>
                        <Ionicons name="remove-circle" size={28} color={Colors.primary} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity onPress={() => updateCartQty(item.id, 1)}>
                        <Ionicons name="add-circle" size={28} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.itemDelete}>
                      <Ionicons name="trash-outline" size={22} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            {/* Payment Section */}
            <View style={styles.paymentSection}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Ionicons name="receipt" size={20} color={Colors.primary} />
                  <Text style={styles.summaryHeaderText}>Ringkasan Pembayaran</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Item</Text>
                  <Text style={styles.summaryDetail}>{orderItems.length} produk</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Quantity</Text>
                  <Text style={styles.summaryDetail}>{totalQty} pcs</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabelBold}>Grand Total</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(grandTotal)}</Text>
                </View>
              </View>

              <View style={styles.paymentHeader}>
                <Ionicons name="wallet" size={20} color={Colors.primary} />
                <Text style={styles.payLabel}>Metode Pembayaran</Text>
              </View>
              <View style={styles.payRow}>
                <TouchableOpacity
                  style={[styles.payBtn, selectedPayment === 'tunai' && styles.payBtnActive]}
                  onPress={() => setSelectedPayment('tunai')}
                >
                  <Ionicons
                    name="cash"
                    size={22}
                    color={selectedPayment === 'tunai' ? 'white' : '#666'}
                  />
                  <Text style={[styles.payBtnText, selectedPayment === 'tunai' && styles.payBtnTextActive]}>
                    Tunai
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.payBtn, selectedPayment === 'qris' && styles.payBtnActive]}
                  onPress={() => setSelectedPayment('qris')}
                >
                  <Ionicons
                    name="qr-code"
                    size={22}
                    color={selectedPayment === 'qris' ? 'white' : '#666'}
                  />
                  <Text style={[styles.payBtnText, selectedPayment === 'qris' && styles.payBtnTextActive]}>
                    QRIS
                  </Text>
                </TouchableOpacity>
              </View>

              {/* QRIS Upload Section */}
              {selectedPayment === 'qris' && (
                paymentProof ? (
                  <View style={styles.proofPreviewRow}>
                    <Image source={{ uri: paymentProof.uri }} style={styles.proofImg} resizeMode="cover" />
                    <View style={{ flex: 1 }}>
                      <TouchableOpacity style={styles.proofReplace} onPress={pickImage}>
                        <Ionicons name="refresh" size={16} color={Colors.primary} />
                        <Text style={styles.proofReplaceText}>Ganti Bukti</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.proofRemove} onPress={clearPaymentProof}>
                      <Ionicons name="trash" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                    <Ionicons name="camera" size={24} color={Colors.primary} />
                    <Text style={styles.uploadBtnText}>Upload Bukti Pembayaran</Text>
                  </TouchableOpacity>
                )
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.btnFinal, (!selectedPayment || processing || confirming) && styles.btnDisabled]}
                onPress={confirmBeforePay}
                disabled={processing || confirming || !selectedPayment}
              >
                {processing ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="white" />
                    <Text style={styles.btnFinalText}>Selesaikan Transaksi</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            {/* Icon Header */}
            <View style={styles.confirmIconContainer}>
              <View style={styles.confirmIconBg}>
                <Ionicons name="checkmark-circle" size={64} color={Colors.primary} />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.confirmTitle}>Konfirmasi Transaksi</Text>
            <Text style={styles.confirmSubtitle}>Pastikan detail pesanan sudah benar</Text>

            {/* Details */}
            <View style={styles.confirmDetails}>
              <View style={styles.confirmDetailRow}>
                <View style={styles.confirmDetailLeft}>
                  <Ionicons name="cart-outline" size={20} color="#64748B" />
                  <Text style={styles.confirmDetailLabel}>Total Item</Text>
                </View>
                <Text style={styles.confirmDetailValue}>{orderItems.length} produk</Text>
              </View>

              <View style={styles.confirmDetailRow}>
                <View style={styles.confirmDetailLeft}>
                  <Ionicons name="pricetag-outline" size={20} color="#64748B" />
                  <Text style={styles.confirmDetailLabel}>Total Quantity</Text>
                </View>
                <Text style={styles.confirmDetailValue}>{totalQty} pcs</Text>
              </View>

              <View style={styles.confirmDetailRow}>
                <View style={styles.confirmDetailLeft}>
                  <Ionicons name="wallet-outline" size={20} color="#64748B" />
                  <Text style={styles.confirmDetailLabel}>Metode Bayar</Text>
                </View>
                <Text style={styles.confirmDetailValue}>{selectedPayment?.toUpperCase()}</Text>
              </View>

              <View style={styles.confirmDivider} />

              <View style={styles.confirmTotalRow}>
                <Text style={styles.confirmTotalLabel}>Grand Total</Text>
                <Text style={styles.confirmTotalValue}>{formatCurrency(grandTotal)}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmBtnCancel}
                onPress={() => setShowConfirmModal(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={20} color="#64748B" />
                <Text style={styles.confirmBtnCancelText}>Periksa Lagi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtnConfirm}
                onPress={handleConfirmPayment}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.confirmBtnConfirmText}>Konfirmasi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Shared Alert Modal */}
      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => { setAlertVisible(false); if (alertOnClose) alertOnClose(); }}
      />
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
    paddingBottom: 28,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  leafDecor1: {
    position: 'absolute',
    top: 30,
    right: 20,
  },
  leafDecor2: {
    position: 'absolute',
    top: 80,
    left: 15,
  },
  leafDecor3: {
    position: 'absolute',
    top: 50,
    right: -5,
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
  categoryShimmer: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
  },
  categoryContainer: {
    paddingVertical: spacing.md,
  },
  categoryScroll: {
    paddingHorizontal: spacing.lg,
  },
  catPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: 'white',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    elevation: 2,
  },
  catPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catText: {
    fontSize: typography.body,
    fontWeight: '700',
    color: '#666'
  },
  catTextActive: {
    color: 'white'
  },
  shimmerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    paddingBottom: 120,
  },
  shimmerCard: {
    width: '48%',
    margin: '1%',
    backgroundColor: 'white',
    borderRadius: radius.lg,
    padding: spacing.md,
    elevation: 3,
  },
  grid: {
    padding: 15,
    paddingBottom: 120,
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
  cardBody: {
    padding: spacing.md,
    position: 'relative',
  },
  cardTitle: {
    fontSize: typography.body,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: spacing.xs,
    marginRight: 40,
  },
  cardPrice: {
    fontSize: typography.bodyStrong,
    fontWeight: '900',
    color: Colors.primary,
    marginTop: spacing.xs,
  },
  addBtnIcon: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  cartBarWrapper: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    right: 20,
  },
  cartBar: {
    backgroundColor: Colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  badge: {
    backgroundColor: 'white',
    width: 28,
    height: 28,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: Colors.primary,
    fontWeight: '900',
    fontSize: typography.body,
  },
  cartLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cartTotal: {
    color: 'white',
    fontSize: typography.title,
    fontWeight: '900',
    marginTop: 2,
  },
  btnCheckout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  btnCheckoutText: {
    color: 'white',
    fontWeight: '800',
    fontSize: typography.body,
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
    paddingTop: spacing.md,
    maxHeight: '90%',
    elevation: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  modalIconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: typography.title,
    fontWeight: '900',
    color: '#1E293B',
  },
  modalSubtitle: {
    fontSize: typography.caption,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: spacing.lg,
  },
  cartList: {
    marginBottom: spacing.lg,
    maxHeight: 250,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: spacing.md,
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontWeight: '800',
    color: '#1A1A1A',
    fontSize: typography.bodyStrong,
  },
  itemSubtotal: {
    color: Colors.primary,
    fontSize: typography.body,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#F5F7FA',
    padding: spacing.xs,
    borderRadius: radius.lg,
  },
  qtyText: {
    fontWeight: '900',
    fontSize: typography.bodyStrong,
    minWidth: 24,
    textAlign: 'center',
    color: '#333',
  },
  itemDelete: {
    padding: spacing.xs,
  },
  paymentSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing.lg,
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryHeaderText: {
    fontSize: typography.bodyStrong,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.body,
    fontWeight: '600',
    color: '#64748B',
  },
  summaryLabelBold: {
    fontSize: typography.bodyStrong,
    fontWeight: '800',
    color: '#1E293B',
  },
  summaryDetail: {
    fontSize: typography.body,
    fontWeight: '700',
    color: '#475569',
  },
  summaryValue: {
    fontSize: typography.title,
    fontWeight: '900',
    color: Colors.primary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: spacing.md,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  payLabel: {
    fontSize: typography.bodyStrong,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.3,
  },
  payRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    gap: spacing.sm,
    backgroundColor: 'white',
  },
  payBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  payBtnText: {
    fontWeight: '800',
    color: '#666',
    fontSize: typography.body,
  },
  payBtnTextActive: {
    color: 'white',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    backgroundColor: '#F1F8E9',
    gap: spacing.md,
  },
  uploadBtnText: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: typography.body,
  },
  proofPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#F5F7FA',
    borderRadius: radius.lg,
  },
  proofImg: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: '#f0f0f0',
  },
  proofReplace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'white',
  },
  proofReplaceText: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: typography.body,
  },
  proofRemove: {
    padding: spacing.sm,
  },
  btnFinal: {
    backgroundColor: Colors.primary,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    elevation: 4,
  },
  btnFinalText: {
    color: 'white',
    fontWeight: '800',
    fontSize: typography.bodyStrong,
  },
  btnDisabled: {
    backgroundColor: '#CCC',
    elevation: 0,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  confirmIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  confirmIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 28,
  },
  confirmDetails: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: 28,
  },
  confirmDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  confirmDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  confirmDetailLabel: {
    fontSize: typography.body,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmDetailValue: {
    fontSize: typography.bodyStrong,
    fontWeight: '800',
    color: '#1E293B',
  },
  confirmDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: spacing.md,
  },
  confirmTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmTotalLabel: {
    fontSize: typography.bodyStrong,
    fontWeight: '800',
    color: '#1E293B',
  },
  confirmTotalValue: {
    fontSize: typography.headline,
    fontWeight: '900',
    color: Colors.primary,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  confirmBtnCancel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#F1F5F9',
    gap: spacing.xs,
  },
  confirmBtnCancelText: {
    fontSize: typography.body,
    fontWeight: '800',
    color: '#64748B',
  },
  confirmBtnConfirm: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: Colors.primary,
    gap: spacing.xs,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  confirmBtnConfirmText: {
    fontSize: typography.body,
    fontWeight: '800',
    color: 'white',
  },
});
