import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { ownerAPI } from '../../services/api';
import { Outlet } from '../../types';

type SkeletonProps = {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: any;
};

const SkeletonShimmer = ({ width = '100%', height = 16, radius = 12, style }: SkeletonProps) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translate = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-120, 120] });
  const baseStyle = typeof width === 'number' ? { width } : { width };

  return (
    <View style={[styles.skeletonBase, baseStyle, { height, borderRadius: radius }, style]}>
      <Animated.View
        style={[
          styles.skeletonHighlight,
          {
            transform: [{ translateX: translate }],
          },
        ]}
      />
    </View>
  );
};

export default function OutletScreen() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [user, setUser] = useState<any>(null);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);

  const [formData, setFormData] = useState({
    nama: '',
    alamat: '',
    is_active: true,
  });

  const loadOutlets = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const userData = await AsyncStorage.getItem('@user_data');
      if (userData) setUser(JSON.parse(userData));

      const response = await ownerAPI.getOutlets();
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }

      const raw: any = response.data;
      const rawData = Array.isArray(raw) ? raw : (raw && (raw.data ?? raw.items ?? [])) ?? [];

      if (!Array.isArray(rawData)) {
        setOutlets([]);
        return;
      }

      const mappedOutlets: Outlet[] = rawData.map((o: any) => ({
        id: Number(o.id),
        nama: String(o.nama ?? 'Outlet Tanpa Nama'),
        alamat: String(o.alamat ?? '-'),
        is_active: o.is_active === true || o.is_active === 1 || o.is_active === '1' || o.is_active === 'true',
        users_count: Number(o.users_count ?? 0),
        created_at: o.created_at ?? undefined,
        updated_at: o.updated_at ?? undefined,
      }));

      setOutlets(mappedOutlets);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Gagal memuat outlet');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOutlets(false);
    }, [loadOutlets])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadOutlets(true);
  };

  const resetForm = () => {
    setFormData({ nama: '', alamat: '', is_active: true });
    setSelectedOutlet(null);
  };

  const filteredOutlets = useMemo(() => {
    return outlets.filter((o) =>
      o.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.alamat.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [outlets, searchQuery]);

  const stats = useMemo(() => {
    const total = outlets.length;
    const aktif = outlets.filter((o) => o.is_active).length;
    const tutup = total - aktif;
    return { total, aktif, tutup };
  }, [outlets]);

  const handleAdd = async () => {
    if (!formData.nama.trim() || !formData.alamat.trim()) {
      Alert.alert('Validasi', 'Nama dan alamat outlet harus diisi');
      return;
    }
    setProcessing(true);
    try {
      const response = await ownerAPI.createOutlet({
        nama: formData.nama.trim(),
        alamat: formData.alamat.trim(),
        is_active: formData.is_active,
      });
      if (response.error) {
        Alert.alert('Gagal', response.error);
      } else {
        Alert.alert('Sukses', 'Outlet berhasil ditambahkan');
        setShowAddModal(false);
        resetForm();
        loadOutlets(true);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Gagal menambahkan outlet');
    } finally {
      setProcessing(false);
    }
  };

  const openEditModal = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setFormData({
      nama: outlet.nama ?? '',
      alamat: outlet.alamat ?? '',
      is_active: !!outlet.is_active,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedOutlet) return;
    if (!formData.nama.trim() || !formData.alamat.trim()) {
      Alert.alert('Validasi', 'Nama dan alamat harus diisi');
      return;
    }
    setProcessing(true);
    try {
      const response = await ownerAPI.updateOutlet(selectedOutlet.id, {
        nama: formData.nama.trim(),
        alamat: formData.alamat.trim(),
        is_active: formData.is_active,
      });
      if (response.error) {
        Alert.alert('Gagal', response.error);
      } else {
        Alert.alert('Sukses', 'Data outlet berhasil diperbarui');
        setShowEditModal(false);
        resetForm();
        loadOutlets(true);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Gagal mengupdate outlet');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: number) => {
    Alert.alert('Hapus Outlet', 'Yakin ingin menghapus outlet ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await ownerAPI.deleteOutlet(id);
            if (response.error) Alert.alert('Gagal', response.error);
            else {
              Alert.alert('Sukses', 'Outlet berhasil dihapus');
              loadOutlets(true);
            }
          } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Gagal menghapus outlet');
          }
        },
      },
    ]);
  };

  const renderHeaderStats = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <SkeletonShimmer width={60} height={22} />
            <SkeletonShimmer width={50} height={10} style={{ marginTop: 10 }} />
          </View>
          <View style={styles.vDivider} />
          <View style={styles.statBox}>
            <SkeletonShimmer width={60} height={22} />
            <SkeletonShimmer width={50} height={10} style={{ marginTop: 10 }} />
          </View>
          <View style={styles.vDivider} />
          <View style={styles.statBox}>
            <SkeletonShimmer width={60} height={22} />
            <SkeletonShimmer width={50} height={10} style={{ marginTop: 10 }} />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.statsCard}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{stats.total}</Text>
          <Text style={styles.statLab}>TOTAL</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: '#22C55E' }]}>{stats.aktif}</Text>
          <Text style={styles.statLab}>BUKA</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: '#EF4444' }]}>{stats.tutup}</Text>
          <Text style={styles.statLab}>TUTUP</Text>
        </View>
      </View>
    );
  };

  const renderListContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.listSkeletonWrapper}>
          {[1, 2, 3].map((key) => (
            <View key={key} style={styles.outletCard}>
              <View style={styles.cardHeader}>
                <View style={styles.nameRow}>
                  <SkeletonShimmer width={18} height={18} radius={9} />
                  <SkeletonShimmer width="60%" height={16} />
                </View>
                <SkeletonShimmer width={70} height={20} radius={10} />
              </View>
              <SkeletonShimmer width="90%" height={14} style={{ marginBottom: 12 }} />
              <SkeletonShimmer width="75%" height={14} />
              <View style={styles.cardDivider} />
              <View style={styles.cardFooter}>
                <SkeletonShimmer width={110} height={20} radius={10} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <SkeletonShimmer width={40} height={36} radius={12} />
                  <SkeletonShimmer width={40} height={36} radius={12} />
                </View>
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (!filteredOutlets.length) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="business-outline" size={26} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>Belum ada cabang</Text>
          <Text style={styles.emptySubtitle}>Tambah outlet baru atau ubah filter pencarian.</Text>
        </View>
      );
    }

    return filteredOutlets.map((item) => {
      const isActive = !!item.is_active;
      return (
        <View key={item.id} style={styles.outletCard}>
          <View style={styles.cardHeader}>
            <View style={styles.nameRow}>
              <View style={[styles.statusLamp, { backgroundColor: isActive ? '#22C55E' : '#EF4444' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.outletName} numberOfLines={1}>
                  {item.nama}
                </Text>
                <Text style={styles.outletMeta} numberOfLines={1}>
                  {item.updated_at ? 'Diperbarui ' + item.updated_at.substring(0, 10) : 'Outlet aktif'}
                </Text>
              </View>
            </View>
            <View style={[styles.statusPill, { backgroundColor: isActive ? '#F0FDF4' : '#FEF2F2' }]}>
              <Text style={[styles.pillText, { color: isActive ? '#16A34A' : '#DC2626' }]}>
                {isActive ? 'BUKA' : 'TUTUP'}
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color="#94A3B8" />
              <Text style={styles.alamatText} numberOfLines={2}>
                {item.alamat}
              </Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cardFooter}>
            <View style={styles.staffBadge}>
              <Ionicons name="people-outline" size={14} color="#0F172A" />
              <Text style={styles.staffCount}>{item.users_count} Karyawan</Text>
            </View>
            <View style={styles.footerBtns}>
              <TouchableOpacity style={styles.footerIconBtn} onPress={() => openEditModal(item)}>
                <Ionicons name="create-outline" size={20} color="#0F172A" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerIconBtn} onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Manajemen Cabang</Text>
            <Text style={styles.headerSubtitle}>Pantau performa cabang secara real-time</Text>
          </View>
          <View style={styles.headerAvatar}>
            <Text style={styles.avatarText}>
              {user?.username ? user.username.substring(0, 2).toUpperCase() : 'PT'}
            </Text>
          </View>
        </View>

        {renderHeaderStats()}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        style={styles.mainContent}
        contentContainerStyle={styles.scrollPadding}
      >
        <View style={styles.actionRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari nama atau lokasi..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLabelWrap}>
              <Text style={styles.sectionHeading}>Daftar Cabang</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{filteredOutlets.length} cabang</Text>
              </View>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.pulse} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          {renderListContent()}
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={() => {
          resetForm();
          setShowAddModal(true);
        }}
      >
        <Ionicons name="add" size={26} color="white" />
      </TouchableOpacity>

      <Modal visible={showAddModal || showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{showAddModal ? 'Tambah Outlet' : 'Edit Outlet'}</Text>
                <Text style={styles.modalSubtitle}>Lengkapi detail operasional cabang</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
              >
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Cabang</Text>
                <TextInput
                  style={styles.input}
                  value={formData.nama}
                  onChangeText={(t) => setFormData({ ...formData, nama: t })}
                  placeholder="Contoh: Outlet Sudirman"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Alamat Lengkap</Text>
                <TextInput
                  style={[styles.input, { height: 92, textAlignVertical: 'top' }]}
                  value={formData.alamat}
                  onChangeText={(t) => setFormData({ ...formData, alamat: t })}
                  multiline
                  placeholder="Tulis alamat lengkap cabang"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.switchContainer}>
                <View>
                  <Text style={styles.inputLabel}>Status Operasional</Text>
                  <Text style={styles.switchSub}>
                    {formData.is_active ? 'Outlet Aktif/Buka' : 'Outlet Non-Aktif'}
                  </Text>
                </View>
                <Switch
                  value={formData.is_active}
                  onValueChange={(v) => setFormData({ ...formData, is_active: v })}
                  trackColor={{ false: '#CBD5E1', true: '#A5D6A7' }}
                  thumbColor={formData.is_active ? '#22C55E' : '#f4f3f4'}
                />
              </View>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={showAddModal ? handleAdd : handleUpdate}
                disabled={processing}
              >
                {processing ? (
                  <View style={styles.loadingRow}>
                    <Animated.View style={styles.loadingDot} />
                    <Animated.View style={styles.loadingDot} />
                    <Animated.View style={styles.loadingDot} />
                    <Text style={styles.saveBtnText}>Menyimpan...</Text>
                  </View>
                ) : (
                  <Text style={styles.saveBtnText}>Simpan Data</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerContainer: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 80,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    zIndex: 10,
    elevation: 10,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '900', letterSpacing: -0.3 },
  headerSubtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '600', marginTop: 4 },
  headerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarText: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },

  statsCard: {
    position: 'absolute',
    bottom: -42,
    left: 24,
    right: 24,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  statLab: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8, marginTop: 6 },
  vDivider: { width: 1, height: '70%', backgroundColor: '#F1F5F9', alignSelf: 'center' },

  mainContent: { flex: 1 },
  // Tetap clear dari header + stats card, sedikit lebih rapat
  scrollPadding: { paddingTop: 65, paddingHorizontal: 24 },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 54,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#0F172A', fontWeight: '600' },

  listSection: { marginTop: 6 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionHeading: { fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: -0.2 },
  sectionLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  sectionBadgeText: { fontSize: 12, fontWeight: '800', color: '#4F46E5' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  liveText: { fontSize: 10, fontWeight: '900', color: '#15803D', letterSpacing: 0.6 },

  listSkeletonWrapper: { gap: 12 },

  outletCard: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 22,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  statusLamp: { width: 12, height: 12, borderRadius: 6 },
  outletName: { fontSize: 17, fontWeight: '900', color: '#0F172A' },
  outletMeta: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginTop: 2 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  pillText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  cardBody: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alamatText: { fontSize: 13, color: '#475569', fontWeight: '600', flex: 1, lineHeight: 18 },

  cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  staffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  staffCount: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  footerBtns: { flexDirection: 'row', gap: 10 },
  footerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  emptySubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center' },

  fab: {
    position: 'absolute',
    bottom: 92,
    right: 22,
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', padding: 22 },
  modalContent: { backgroundColor: 'white', borderRadius: 26, padding: 22, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  modalSubtitle: { fontSize: 12, color: '#64748B', marginTop: 4 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
    padding: 14,
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  switchSub: { fontSize: 11, color: '#15803D', fontWeight: '700' },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnText: { color: 'white', fontWeight: '900', fontSize: 15 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    opacity: 0.8,
  },

  skeletonBase: { backgroundColor: '#E2E8F0', overflow: 'hidden' },
  skeletonHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '45%',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
});