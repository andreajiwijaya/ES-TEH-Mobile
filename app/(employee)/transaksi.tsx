import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { OrderItem, Product } from '../../types';
import { karyawanAPI } from '../../services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

export default function TransaksiScreen() {
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'tunai' | 'qris' | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Fetch products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await karyawanAPI.getProduk();
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      if (response.data) {
        // Ensure response.data is an array
        const productsData = Array.isArray(response.data) ? response.data : [];
        // Map API response to Product type
        const mappedProducts = productsData.map((p: any) => ({
          id: p.id.toString(),
          outlet_id: p.outlet_id?.toString() || '1',
          nama: p.nama,
          harga: p.harga,
          is_available: p.is_available !== false,
          category: p.category || 'Lainnya',
        }));
        setProducts(mappedProducts);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  };

  // Extract unique categories from products
  const categories = ['Semua', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const filteredProducts = selectedCategory === 'Semua'
    ? products.filter(p => p.is_available)
    : products.filter(p => p.category === selectedCategory && p.is_available);

  const addToOrder = (product: Product) => {
    const existingItem = orderItems.find(item => item.produk_id === product.id);
    if (existingItem) {
      setOrderItems(orderItems.map(item =>
        item.id === existingItem.id
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

  const removeFromOrder = (id: string) => {
    setOrderItems(orderItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setOrderItems(orderItems.map(item => {
      if (item.id === id) {
        const product = products.find(p => p.id === item.produk_id);
        if (product) {
          const newQuantity = item.quantity + delta;
          const qty = newQuantity > 0 ? newQuantity : 1;
          return { ...item, quantity: qty, subtotal: product.harga * qty };
        }
      }
      return item;
    }));
  };

  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal;
  const itemCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const getProductName = (produkId: string) => {
    return products.find(p => p.id === produkId)?.nama || 'Unknown';
  };

  const handlePay = async () => {
    if (orderItems.length === 0) {
      Alert.alert('Error', 'Tidak ada item dalam pesanan');
      return;
    }
    if (!selectedPayment) {
      setShowOrderModal(true);
      return;
    }

    setProcessing(true);
    try {
      const now = new Date();
      const tanggal = now.toISOString().slice(0, 19).replace('T', ' ');
      
      const items = orderItems.map(item => ({
        produk_id: parseInt(item.produk_id),
        quantity: item.quantity,
      }));

      const response = await karyawanAPI.createTransaksi({
        tanggal,
        metode_bayar: selectedPayment,
        items,
      });

      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      Alert.alert('Sukses', 'Transaksi berhasil dibuat', [
        {
          text: 'OK',
          onPress: () => {
            setOrderItems([]);
            setSelectedPayment(null);
            setShowOrderModal(false);
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal membuat transaksi');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Favorit POS</Text>
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

      <View style={styles.content}>
        <View style={styles.categoryTabs}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryTab,
                  selectedCategory === category && styles.categoryTabActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === category && styles.categoryTabTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Memuat produk...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            numColumns={2}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.productsGrid}
            columnWrapperStyle={styles.productRow}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Tidak ada produk tersedia</Text>
              </View>
            }
            renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => addToOrder(item)}
            >
              <View style={styles.productImage}>
                <Ionicons name="image-outline" size={40} color={Colors.textSecondary} />
              </View>
              <Text style={styles.productName} numberOfLines={2}>{item.nama}</Text>
              <Text style={styles.productPrice}>Rp {item.harga.toLocaleString('id-ID')}</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => addToOrder(item)}
              >
                <Ionicons name="add" size={20} color={Colors.backgroundLight} />
              </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Floating Order Summary Button */}
      {orderItems.length > 0 && (
        <TouchableOpacity
          style={styles.floatingOrderButton}
          onPress={() => setShowOrderModal(true)}
        >
          <View style={styles.floatingOrderContent}>
            <View style={styles.floatingOrderInfo}>
              <Text style={styles.floatingOrderText}>{itemCount} Item</Text>
              <Text style={styles.floatingOrderTotal}>
                Rp {total.toLocaleString('id-ID')}
              </Text>
            </View>
            <Ionicons name="chevron-up" size={24} color={Colors.backgroundLight} />
          </View>
        </TouchableOpacity>
      )}

      {/* Order Details Modal */}
      <Modal
        visible={showOrderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOrderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Detail Pesanan</Text>
                <Text style={styles.orderNumber}>#TX-{Date.now().toString().slice(-6)}</Text>
                <Text style={styles.customerText}>Pelanggan: Walk-in</Text>
              </View>
              <TouchableOpacity onPress={() => setShowOrderModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {orderItems.map(item => (
                <View key={item.id} style={styles.orderItem}>
                  <View style={styles.orderItemInfo}>
                    <Text style={styles.orderItemName}>{getProductName(item.produk_id)}</Text>
                    {item.notes && (
                      <Text style={styles.orderItemNotes}>{item.notes}</Text>
                    )}
                    <Text style={styles.orderItemPrice}>
                      Rp {item.subtotal.toLocaleString('id-ID')}
                    </Text>
                  </View>
                  <View style={styles.orderItemControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.id, -1)}
                    >
                      <Ionicons name="remove" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>x{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.id, 1)}
                    >
                      <Ionicons name="add" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFromOrder(item.id)}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.orderSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>
                    Rp {subtotal.toLocaleString('id-ID')}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Pajak</Text>
                  <Text style={styles.summaryValue}>Rp 0</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>
                    Rp {total.toLocaleString('id-ID')}
                  </Text>
                </View>
              </View>

              <View style={styles.paymentOptions}>
                <TouchableOpacity
                  style={[
                    styles.paymentButton,
                    selectedPayment === 'tunai' && styles.paymentButtonActive
                  ]}
                  onPress={() => setSelectedPayment('tunai')}
                >
                  <Ionicons
                    name="wallet-outline"
                    size={20}
                    color={selectedPayment === 'tunai' ? Colors.backgroundLight : Colors.primary}
                  />
                  <Text style={[
                    styles.paymentButtonText,
                    selectedPayment === 'tunai' && styles.paymentButtonTextActive
                  ]}>
                    Tunai
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.paymentButton,
                    selectedPayment === 'qris' && styles.paymentButtonActive
                  ]}
                  onPress={() => setSelectedPayment('qris')}
                >
                  <Ionicons
                    name="qr-code-outline"
                    size={20}
                    color={selectedPayment === 'qris' ? Colors.backgroundLight : Colors.primary}
                  />
                  <Text style={[
                    styles.paymentButtonText,
                    selectedPayment === 'qris' && styles.paymentButtonTextActive
                  ]}>
                    QRIS
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.payButton, (!selectedPayment || processing) && styles.payButtonDisabled]}
                onPress={handlePay}
                disabled={!selectedPayment || processing}
              >
                {processing ? (
                  <ActivityIndicator color={Colors.backgroundLight} />
                ) : (
                  <Text style={styles.payButtonText}>Bayar Sekarang</Text>
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
    flexShrink: 1,
  },
  avatar: {
    width: isSmallScreen ? 35 : 40,
    height: isSmallScreen ? 35 : 40,
    borderRadius: isSmallScreen ? 17.5 : 20,
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isSmallScreen ? 8 : 10,
  },
  avatarText: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  userName: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
    color: Colors.backgroundLight,
  },
  userRole: {
    fontSize: isSmallScreen ? 10 : 12,
    color: Colors.backgroundLight,
    opacity: 0.8,
  },
  content: {
    flex: 1,
  },
  categoryTabs: {
    paddingVertical: isSmallScreen ? 12 : 15,
    paddingHorizontal: isSmallScreen ? 12 : 15,
    backgroundColor: Colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryTab: {
    paddingHorizontal: isSmallScreen ? 12 : 15,
    paddingVertical: isSmallScreen ? 6 : 8,
    borderRadius: 20,
    marginRight: isSmallScreen ? 8 : 10,
    backgroundColor: Colors.background,
  },
  categoryTabActive: {
    backgroundColor: Colors.primaryLight,
  },
  categoryTabText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  categoryTabTextActive: {
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  productsGrid: {
    padding: isSmallScreen ? 8 : 10,
    paddingBottom: 100,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: Colors.primaryLight,
    borderRadius: isSmallScreen ? 10 : 12,
    padding: isSmallScreen ? 10 : 12,
    marginBottom: isSmallScreen ? 12 : 15,
    minHeight: isSmallScreen ? 140 : 160,
  },
  productImage: {
    width: '100%',
    height: isSmallScreen ? 70 : 80,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 8 : 10,
  },
  productName: {
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 5,
    minHeight: isSmallScreen ? 32 : 36,
  },
  productPrice: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
    color: Colors.primaryDark,
  },
  addButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingOrderButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  floatingOrderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingOrderInfo: {
    flex: 1,
  },
  floatingOrderText: {
    fontSize: 14,
    color: Colors.backgroundLight,
    opacity: 0.9,
    marginBottom: 4,
  },
  floatingOrderTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.backgroundLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.backgroundLight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: isSmallScreen ? 15 : 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 5,
    flex: 1,
    marginRight: 10,
  },
  orderNumber: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 5,
  },
  customerText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  modalBody: {
    maxHeight: screenHeight * 0.5,
    padding: isSmallScreen ? 15 : 20,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  orderItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  orderItemNotes: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  orderItemPrice: {
    fontSize: 14,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  orderItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    padding: 6,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  orderSummary: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.text,
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primaryDark,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  paymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 8,
  },
  paymentButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paymentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  paymentButtonTextActive: {
    color: Colors.backgroundLight,
  },
  payButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: Colors.border,
    opacity: 0.6,
  },
  payButtonText: {
    color: Colors.backgroundLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
});
