import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import AlertModal from '../../components/AlertModal';
import ConfirmModal from '../../components/ConfirmModal';
import { Colors } from '../../constants/Colors';
import { radius, spacing, typography } from '../../constants/DesignSystem';
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
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmActions, setConfirmActions] = useState<
    { label: string; onPress: () => void | Promise<void>; type?: 'primary' | 'secondary' | 'danger'; loading?: boolean; disabled?: boolean }[]
  >([]);

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const showConfirm = (
    title: string,
    message: string,
    actions: { label: string; onPress: () => void | Promise<void>; type?: 'primary' | 'secondary' | 'danger'; loading?: boolean; disabled?: boolean }[]
  ) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmActions(actions);
    setConfirmVisible(true);
  };

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
        showAlert('Error', response.error, 'error');
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
      showAlert('Error', err?.message ?? 'Gagal memuat outlet', 'error');
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
      showAlert('Validasi', 'Nama dan alamat outlet harus diisi', 'warning');
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
        showAlert('Gagal', response.error, 'error');
      } else {
        showAlert('Sukses', 'Outlet berhasil ditambahkan', 'success');
        setShowAddModal(false);
        resetForm();
        loadOutlets(true);
      }
    } catch (err: any) {
      showAlert('Error', err?.message ?? 'Gagal menambahkan outlet', 'error');
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
      showAlert('Validasi', 'Nama dan alamat harus diisi', 'warning');
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
        showAlert('Gagal', response.error, 'error');
      } else {
        showAlert('Sukses', 'Data outlet berhasil diperbarui', 'success');
        setShowEditModal(false);
        resetForm();
        loadOutlets(true);
      }
    } catch (err: any) {
      showAlert('Error', err?.message ?? 'Gagal mengupdate outlet', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: number) => {
    showConfirm('Hapus Outlet', 'Yakin ingin menghapus outlet ini?', [
      { label: 'Batal', type: 'secondary', onPress: () => setConfirmVisible(false) },
      {
        label: 'Hapus',
        type: 'danger',
        onPress: async () => {
          setConfirmVisible(false);
          try {
            const response = await ownerAPI.deleteOutlet(id);
            if (response.error) {
              showAlert('Gagal', response.error, 'error');
            } else {
              showAlert('Sukses', 'Outlet berhasil dihapus', 'success');
              loadOutlets(true);
            }
          } catch (err: any) {
            showAlert('Error', err?.message ?? 'Gagal menghapus outlet', 'error');
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
            <SkeletonShimmer width={50} height={10} style={{ marginTop: spacing.sm }} />
          </View>
          <View style={styles.vDivider} />
          <View style={styles.statBox}>
            <SkeletonShimmer width={60} height={22} />
            <SkeletonShimmer width={50} height={10} style={{ marginTop: spacing.sm }} />
          </View>
          <View style={styles.vDivider} />
          <View style={styles.statBox}>
            <SkeletonShimmer width={60} height={22} />
            <SkeletonShimmer width={50} height={10} style={{ marginTop: spacing.sm }} />
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
              <SkeletonShimmer width="90%" height={14} style={{ marginBottom: spacing.md }} />
              <SkeletonShimmer width="75%" height={14} />
              <View style={styles.cardDivider} />
              <View style={styles.cardFooter}>
                <SkeletonShimmer width={110} height={20} radius={10} />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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

      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
      />
      <ConfirmModal
        visible={confirmVisible}
        title={confirmTitle}
        message={confirmMessage}
        actions={confirmActions}
        onClose={() => setConfirmVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerContainer: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 80,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    zIndex: 10,
    elevation: 10,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: typography.headline, fontWeight: '900', letterSpacing: -0.3 },
  headerSubtitle: { color: 'rgba(255,255,255,0.78)', fontSize: typography.body, fontWeight: '600', marginTop: spacing.xs },
  headerAvatar: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarText: { color: 'white', fontSize: typography.bodyStrong, fontWeight: '900', letterSpacing: 0.5 },

  statsCard: {
    position: 'absolute',
    bottom: -42,
    left: 24,
    right: 24,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: radius.lg,
    paddingVertical: 18,
    paddingHorizontal: spacing.sm,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: typography.headline, fontWeight: '900', color: '#0F172A' },
  statLab: { fontSize: typography.caption, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8, marginTop: spacing.xs },
  vDivider: { width: 1, height: '70%', backgroundColor: '#F1F5F9', alignSelf: 'center' },

  mainContent: { flex: 1 },
  // Tetap clear dari header + stats card, sedikit lebih rapat
  scrollPadding: { paddingTop: 65, paddingHorizontal: spacing.lg },

  actionRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 54,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: typography.bodyStrong, color: '#0F172A', fontWeight: '600' },

  listSection: { marginTop: spacing.xs },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionHeading: { fontSize: typography.title, fontWeight: '900', color: '#0F172A', letterSpacing: -0.2 },
  sectionLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.md },
  sectionBadgeText: { fontSize: typography.caption, fontWeight: '800', color: '#4F46E5' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  pulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  liveText: { fontSize: typography.caption, fontWeight: '900', color: '#15803D', letterSpacing: 0.6 },

  listSkeletonWrapper: { gap: spacing.sm },

  outletCard: {
    backgroundColor: 'white',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.sm },
  statusLamp: { width: 12, height: 12, borderRadius: radius.sm },
  outletName: { fontSize: typography.bodyStrong, fontWeight: '900', color: '#0F172A' },
  outletMeta: { fontSize: typography.caption, fontWeight: '700', color: '#94A3B8', marginTop: spacing.xs },
  statusPill: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.lg },
  pillText: { fontSize: typography.caption, fontWeight: '900', letterSpacing: 0.5 },

  cardBody: { marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  alamatText: { fontSize: typography.body, color: '#475569', fontWeight: '600', flex: 1, lineHeight: 18 },

  cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: spacing.sm },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  staffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  staffCount: { fontSize: typography.caption, fontWeight: '800', color: '#0F172A' },
  footerBtns: { flexDirection: 'row', gap: spacing.sm },
  footerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },

  emptyState: { alignItems: 'center', paddingVertical: spacing.xl * 2, gap: spacing.xs },
  emptyIconWrap: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: typography.bodyStrong, fontWeight: '800', color: '#0F172A' },
  emptySubtitle: { fontSize: typography.body, color: '#64748B', textAlign: 'center' },

  fab: {
    position: 'absolute',
    bottom: 92,
    right: spacing.md,
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', padding: spacing.md },
  modalContent: { backgroundColor: 'white', borderRadius: radius.xl, padding: spacing.lg, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: typography.title, fontWeight: '900', color: '#0F172A' },
  modalSubtitle: { fontSize: typography.caption, color: '#64748B', marginTop: spacing.xs },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: { fontSize: typography.body, fontWeight: '800', color: '#0F172A', marginBottom: spacing.xs },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: typography.bodyStrong,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    padding: spacing.sm,
    backgroundColor: '#F0FDF4',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  switchSub: { fontSize: typography.caption, color: '#15803D', fontWeight: '700' },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  saveBtnText: { color: 'white', fontWeight: '900', fontSize: typography.bodyStrong },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: radius.sm,
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