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
import { spacing, radius, typography } from '../../constants/DesignSystem';
import { authAPI, gudangAPI } from '../../services/api';
import { Bahan, User } from '../../types';

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

export default function MasterBahanScreen() {
  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [bahanList, setBahanList] = useState<Bahan[]>([]);
  const [filteredList, setFilteredList] = useState<Bahan[]>([]);
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
    satuan: '',
    isi_per_satuan: '',
    berat_per_isi: '',
    stok_minimum_gudang: '',
    stok_minimum_outlet: '',
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

      const bahanRes = await gudangAPI.getBahan();

      if (bahanRes.data && Array.isArray(bahanRes.data)) {
        const sortedData = bahanRes.data.sort((a: any, b: any) => b.id - a.id);
        setBahanList(sortedData);
        setFilteredList(sortedData);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Gagal memuat data bahan');
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
      setFilteredList(bahanList);
    } else {
      const filtered = bahanList.filter((item) =>
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
    setFormData({
      nama: '',
      satuan: '',
      isi_per_satuan: '',
      berat_per_isi: '',
      stok_minimum_gudang: '',
      stok_minimum_outlet: '',
    });
    setSelectedId(null);
    setShowModal(true);
  };

  const openEditModal = (item: Bahan) => {
    setIsEditMode(true);
    setSelectedId(item.id);
    setFormData({
      nama: item.nama,
      satuan: item.satuan,
      isi_per_satuan: item.isi_per_satuan?.toString() || '',
      berat_per_isi: item.berat_per_isi?.toString() || '',
      stok_minimum_gudang: item.stok_minimum_gudang.toString(),
      stok_minimum_outlet: item.stok_minimum_outlet.toString(),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.nama || !formData.satuan) {
      Alert.alert('Validasi', 'Nama bahan dan satuan wajib diisi!');
      return;
    }
    if (!formData.isi_per_satuan || !formData.berat_per_isi) {
      Alert.alert('Validasi', 'Isi per satuan dan berat per isi wajib diisi!');
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        nama: formData.nama,
        satuan: formData.satuan,
        isi_per_satuan: parseFloat(formData.isi_per_satuan) || 0,
        berat_per_isi: parseFloat(formData.berat_per_isi) || 0,
        stok_minimum_gudang: parseInt(formData.stok_minimum_gudang) || 0,
        stok_minimum_outlet: parseInt(formData.stok_minimum_outlet) || 0,
      };

      let response;
      if (isEditMode && selectedId) {
        response = await gudangAPI.updateBahan(selectedId, payload);
      } else {
        response = await gudangAPI.createBahan(payload);
      }

      if (response.error) throw new Error(response.error);

      Alert.alert('Sukses', `Data bahan berhasil ${isEditMode ? 'diperbarui' : 'ditambahkan'}`);
      setShowModal(false);
      loadData(true);
    } catch (error: any) {
      Alert.alert('Gagal', error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Hapus Bahan', 'Yakin ingin menghapus bahan ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            const res = await gudangAPI.deleteBahan(id);
            if (res.error) throw new Error(res.error);
            Alert.alert('Terhapus', 'Data bahan berhasil dihapus.');
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
            <Text style={styles.greeting}>Manajemen Bahan</Text>
            <Text style={styles.headerTitle}>Katalog Bahan Baku</Text>
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
            placeholder="Cari bahan baku..."
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
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={`skeleton-${i}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.titleRow}>
                    <SkeletonShimmer width={48} height={48} borderRadius={12} />
                    <View style={{ flex: 1, gap: spacing.xs, marginLeft: 12 }}>
                      <SkeletonShimmer width="70%" height={16} borderRadius={4} />
                      <SkeletonShimmer width="50%" height={12} borderRadius={4} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <SkeletonShimmer width={36} height={36} borderRadius={10} />
                    <SkeletonShimmer width={36} height={36} borderRadius={10} />
                  </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <SkeletonShimmer width={60} height={10} borderRadius={4} />
                    <SkeletonShimmer width={80} height={14} borderRadius={4} style={{ marginTop: spacing.xs }} />
                  </View>
                  <View style={styles.statItem}>
                    <SkeletonShimmer width={60} height={10} borderRadius={4} />
                    <SkeletonShimmer width={80} height={14} borderRadius={4} style={{ marginTop: spacing.xs }} />
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
                <Ionicons name="cube-outline" size={64} color="#E0E0E0" />
                <Text style={styles.emptyText}>Belum ada data bahan</Text>
                <Text style={styles.emptySubText}>Tap tombol + untuk menambahkan</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.titleRow}>
                    <View style={styles.iconBox}>
                      <Ionicons name="cube" size={22} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.nama}
                      </Text>
                      <Text style={styles.cardSubTitle}>Satuan: {item.satuan}</Text>
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

                <View style={styles.divider} />

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Min. Gudang</Text>
                    <Text style={styles.statValue}>
                      {item.stok_minimum_gudang} {item.satuan}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Min. Outlet</Text>
                    <Text style={styles.statValue}>
                      {item.stok_minimum_outlet} {item.satuan}
                    </Text>
                  </View>
                </View>

                {(item.isi_per_satuan || item.berat_per_isi) && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                      <View style={styles.infoItem}>
                        <Ionicons name="layers-outline" size={14} color="#999" />
                        <Text style={styles.infoText}>
                          {item.isi_per_satuan ? `${item.isi_per_satuan} unit` : '-'}
                        </Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Ionicons name="barbell-outline" size={14} color="#999" />
                        <Text style={styles.infoText}>
                          {item.berat_per_isi ? `${item.berat_per_isi} gr` : '-'}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
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
              <Text style={styles.modalTitle}>{isEditMode ? 'Edit Bahan' : 'Tambah Bahan Baru'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nama Bahan *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Gula Pasir"
                  placeholderTextColor="#AAA"
                  value={formData.nama}
                  onChangeText={(t) => setFormData({ ...formData, nama: t })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Satuan *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="kg, pcs, liter, dll"
                  placeholderTextColor="#AAA"
                  value={formData.satuan}
                  onChangeText={(t) => setFormData({ ...formData, satuan: t })}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Isi per Satuan *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Contoh: 12"
                    placeholderTextColor="#AAA"
                    value={formData.isi_per_satuan}
                    onChangeText={(t) => setFormData({ ...formData, isi_per_satuan: t })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Berat per Isi (gr) *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Contoh: 250"
                    placeholderTextColor="#AAA"
                    value={formData.berat_per_isi}
                    onChangeText={(t) => setFormData({ ...formData, berat_per_isi: t })}
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Stok Min. Gudang</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#AAA"
                    value={formData.stok_minimum_gudang}
                    onChangeText={(t) => setFormData({ ...formData, stok_minimum_gudang: t })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Stok Min. Outlet</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#AAA"
                    value={formData.stok_minimum_outlet}
                    onChangeText={(t) => setFormData({ ...formData, stok_minimum_outlet: t })}
                  />
                </View>
              </View>

              <Text style={styles.helperText}>* Wajib diisi</Text>
            </ScrollView>

            <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={processing}>
              {processing ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.btnSaveText}>{isEditMode ? 'Update Bahan' : 'Simpan Bahan'}</Text>
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
    paddingHorizontal: spacing.lg,
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
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: typography.body,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: spacing.xs,
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
    fontSize: typography.title,
    fontWeight: '800',
    color: 'white',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
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
    fontSize: typography.body,
    fontWeight: '500',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: typography.bodyStrong,
    fontWeight: '700',
    color: '#333',
  },
  cardSubTitle: {
    fontSize: typography.caption,
    color: '#999',
    marginTop: 2,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnBg: {
    backgroundColor: '#FEE2E2',
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: typography.caption,
    color: '#999',
    marginBottom: spacing.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: typography.body,
    fontWeight: '700',
    color: '#555',
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontSize: typography.caption,
    color: '#777',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: typography.bodyStrong,
    color: '#999',
    fontWeight: '700',
  },
  emptySubText: {
    marginTop: spacing.sm,
    fontSize: typography.body,
    color: '#BBB',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: radius.xl,
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
    padding: spacing.lg,
    maxHeight: '85%',
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
    color: '#333',
  },
  modalBody: {
    marginBottom: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.body,
    fontWeight: '700',
    color: '#555',
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.bodyStrong,
    backgroundColor: '#F9FAFB',
    color: '#333',
    fontWeight: '500',
  },
  rowInputs: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  helperText: {
    fontSize: typography.caption,
    color: '#999',
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  btnSave: {
    backgroundColor: Colors.primary,
    padding: spacing.md,
    borderRadius: radius.lg,
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
    fontSize: typography.bodyStrong,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
  },
});