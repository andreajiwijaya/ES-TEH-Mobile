import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
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
  View,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { authAPI, gudangAPI } from '../../services/api';
import { Kategori, User } from '../../types';

// Skeleton Shimmer Component
const SkeletonShimmer = ({ width = '100%', height = 12, borderRadius = 8 }: { width?: string | number; height?: number; borderRadius?: number }) => {
  const shimmerAnim = React.useMemo(() => new Animated.Value(-200), []);

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 200, duration: 1000, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shimmerAnim, { toValue: -200, duration: 0, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const skeletonStyle: any = {
    width,
    height,
    borderRadius,
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  };

  return (
    <View style={skeletonStyle}>
      <Animated.View
        style={[
          {
            width: '30%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
          },
          { transform: [{ translateX: shimmerAnim }] },
        ]}
      />
    </View>
  );
};

export default function KategoriScreen() {
  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [kategoriList, setKategoriList] = useState<Kategori[]>([]);
  const [filteredList, setFilteredList] = useState<Kategori[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
    nama: '',
  });

  // --- HELPER FUNCTIONS ---
  const getAvatarColor = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
    const username = user?.username || 'Guest';
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getUserInitial = () => {
    const username = user?.username || 'G';
    return username.charAt(0).toUpperCase();
  };

  // --- LOAD USER DATA ---
  const loadUserData = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      if (response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Gagal memuat data user:', error);
    }
  }, []);

  // --- LOAD DATA ---
  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      await loadUserData();

      const response = await gudangAPI.getKategori();
      if (response.data && Array.isArray(response.data)) {
        const sortedData = response.data.sort((a: any, b: any) => b.id - a.id);
        setKategoriList(sortedData);
        setFilteredList(sortedData);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal memuat data kategori');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadUserData]);

  // --- USE FOCUS EFFECT ---
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // --- SEARCH FILTER ---
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredList(kategoriList);
    } else {
      const filtered = kategoriList.filter((item) =>
        item.nama.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredList(filtered);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  // --- ACTIONS ---
  const openCreateModal = () => {
    setIsEditMode(false);
    setFormData({ nama: '' });
    setSelectedId(null);
    setShowModal(true);
  };

  const openEditModal = (item: Kategori) => {
    setIsEditMode(true);
    setSelectedId(item.id);
    setFormData({
      nama: item.nama,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.nama.trim()) {
      Alert.alert('Validasi', 'Nama kategori wajib diisi!');
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        nama: formData.nama.trim(),
      };

      let response;
      if (isEditMode && selectedId) {
        response = await gudangAPI.updateKategori(selectedId, payload);
      } else {
        response = await gudangAPI.createKategori(payload);
      }

      if (response.error) throw new Error(response.error);

      Alert.alert('Sukses', `Kategori berhasil ${isEditMode ? 'diperbarui' : 'ditambahkan'}`);
      setShowModal(false);
      loadData(true);
    } catch (error: any) {
      Alert.alert('Gagal', error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Hapus Kategori', 'Yakin ingin menghapus kategori ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            const res = await gudangAPI.deleteKategori(id);
            if (res.error) throw new Error(res.error);
            Alert.alert('Terhapus', 'Kategori berhasil dihapus.');
            loadData(true);
          } catch (error: any) {
            setLoading(false);
            Alert.alert('Gagal', error.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Manajemen Kategori</Text>
            <Text style={styles.headerTitle}>Katalog Kategori</Text>
          </View>
          <View style={[styles.avatarCircle, { backgroundColor: getAvatarColor() }]}>
            <Text style={styles.avatarText}>{getUserInitial()}</Text>
          </View>
        </View>

        {/* SEARCH BOX */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari kategori..."
            placeholderTextColor="#AAA"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        {loading && !refreshing ? (
          <View>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={`skeleton-${i}`} style={styles.card}>
                <View style={styles.cardContent}>
                  <View style={styles.categoryInfo}>
                    <SkeletonShimmer width={48} height={48} borderRadius={12} />
                    <View style={{ flex: 1, gap: 6, marginLeft: 12 }}>
                      <SkeletonShimmer width="60%" height={16} borderRadius={4} />
                      <SkeletonShimmer width="40%" height={12} borderRadius={4} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <SkeletonShimmer width={36} height={36} borderRadius={10} />
                    <SkeletonShimmer width={36} height={36} borderRadius={10} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={filteredList}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="pricetags-outline" size={64} color="#E0E0E0" />
                <Text style={styles.emptyText}>Belum ada kategori</Text>
                <Text style={styles.emptySubText}>Tap tombol + untuk menambahkan</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardContent}>
                  <View style={styles.categoryInfo}>
                    <View style={styles.iconBox}>
                      <Ionicons name="pricetag" size={22} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.nama}
                      </Text>
                      <Text style={styles.cardSubTitle}>ID: {item.id}</Text>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
                      <Ionicons name="pencil" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.deleteBtnBg]} onPress={() => handleDelete(item.id)}>
                      <Ionicons name="trash" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* MODAL FORM */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditMode ? 'Edit Kategori' : 'Tambah Kategori Baru'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nama Kategori *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Makanan, Minuman, dll"
                  placeholderTextColor="#AAA"
                  value={formData.nama}
                  onChangeText={(t) => setFormData({ ...formData, nama: t })}
                />
              </View>

              <Text style={styles.helperText}>* Wajib diisi</Text>
            </ScrollView>

            <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={processing}>
              {processing ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.btnSaveText}>{isEditMode ? 'Update Kategori' : 'Simpan Kategori'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  cardSubTitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnBg: {
    backgroundColor: '#FEE2E2',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    fontWeight: '700',
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 13,
    color: '#BBB',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
  },
  modalBody: {
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#F9FAFB',
    color: '#333',
    fontWeight: '500',
  },
  helperText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  btnSave: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  btnSaveText: {
    fontSize: 16,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
  },
});
