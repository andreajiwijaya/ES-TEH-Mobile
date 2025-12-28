import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // FIX: Ditambahkan untuk sinkronisasi
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { spacing } from '../../constants/DesignSystem';
import { ownerAPI } from '../../services/api';
import { Outlet, User } from '../../types';

export default function KaryawanScreen() {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + spacing.lg;

  const [employees, setEmployees] = useState<User[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState<any>(null); // State User Baru untuk Header Dynamic

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'karyawan' as 'karyawan' | 'gudang' | 'supervisor',
    outlet_id: '',
  });

  // --- LOGIKA FETCH DATA UTUH ---
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // SINKRONISASI DATA USER LOGIN UNTUK HEADER
      const userData = await AsyncStorage.getItem('@user_data');
      if (userData) setUser(JSON.parse(userData));

      const [usersResponse, outletsResponse] = await Promise.all([
        ownerAPI.getUsers(),
        ownerAPI.getOutlets(),
      ]);

      if (usersResponse.data) {
        const rawUsers = Array.isArray(usersResponse.data) 
          ? usersResponse.data 
          : ((usersResponse.data as any).data || []);

        if (Array.isArray(rawUsers)) {
            const mappedUsers: User[] = rawUsers.map((u: any) => ({
              id: u.id,
              username: u.username || 'Unknown',
              role: u.role || 'karyawan',
              outlet_id: u.outlet_id,
              outlet: u.outlet, 
            }));
            setEmployees(mappedUsers);
        }
      }

      if (outletsResponse.data) {
        const rawOutlets = Array.isArray(outletsResponse.data) 
          ? outletsResponse.data 
          : ((outletsResponse.data as any).data || []);
        if (Array.isArray(rawOutlets)) setOutlets(rawOutlets);
      }
    } catch {
      Alert.alert('Error', 'Gagal menyinkronkan data terbaru');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => 
      e.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [employees, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: employees.length,
      staff: employees.filter(e => e.role === 'karyawan').length,
      gudang: employees.filter(e => e.role === 'gudang').length
    };
  }, [employees]);

  const getOutletName = (outletId?: number | null) => {
    if (!outletId) return '-';
    const outlet = outlets.find(o => o.id === outletId);
    return outlet ? outlet.nama : `Outlet #${outletId}`;
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', role: 'karyawan', outlet_id: '' });
    setSelectedEmployee(null);
    setShowPassword(false);
  };

  // Skeleton shimmer component
  type SkeletonProps = { width?: number | string; height?: number; radius?: number; style?: any };
  const SkeletonShimmer = ({ width = '100%', height = 16, radius = 12, style }: SkeletonProps) => {
    const shimmer = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      const loop = Animated.loop(
        Animated.timing(shimmer, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true })
      );
      loop.start();
      return () => loop.stop();
    }, [shimmer]);
    const translate = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-120, 120] });
    const baseStyle = typeof width === 'number' ? { width } : { width };
    return (
      <View style={[styles.skeletonBase, baseStyle, { height, borderRadius: radius }, style]}>
        <Animated.View style={[styles.skeletonHighlight, { transform: [{ translateX: translate }] }]} />
      </View>
    );
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
          <Text style={[styles.statVal, { color: Colors.primary }]}>{stats.staff}</Text>
          <Text style={styles.statLab}>OUTLET</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: '#F59E0B' }]}>{stats.gudang}</Text>
          <Text style={styles.statLab}>GUDANG</Text>
        </View>
      </View>
    );
  };

  const renderListContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.listSkeletonWrapper}>
          {[1, 2, 3].map((key) => (
            <View key={key} style={styles.employeeCard}>
              <View style={styles.cardHeader}>
                <View style={styles.nameRow}>
                  <SkeletonShimmer width={48} height={48} radius={24} />
                  <View style={{ flex: 1 }}>
                    <SkeletonShimmer width="55%" height={16} />
                    <SkeletonShimmer width={80} height={12} style={{ marginTop: 8 }} />
                  </View>
                </View>
                <SkeletonShimmer width={28} height={24} radius={6} />
              </View>
              <SkeletonShimmer width="80%" height={12} style={{ marginBottom: 12 }} />
              <View style={styles.cardDivider} />
              <View style={styles.cardFooter}>
                <SkeletonShimmer width={90} height={14} />
                <SkeletonShimmer width={24} height={24} radius={8} />
              </View>
            </View>
          ))}
        </View>
      );
    }

    if (!filteredEmployees.length) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="person-outline" size={22} color="#94A3B8" />
          </View>
          <Text style={styles.emptyText}>Belum ada karyawan</Text>
        </View>
      );
    }

    return filteredEmployees.map((item) => (
      <View key={item.id} style={styles.employeeCard}>
        <View style={styles.cardHeader}>
          <View style={styles.nameRow}>
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor:
                    item.role === 'owner' ? Colors.primary : item.role === 'gudang' ? '#F59E0B' : '#10B981',
                },
              ]}
            >
              <Text style={styles.avatarLetter}>{item.username.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.identityContainer}>
              <Text style={styles.usernameText} numberOfLines={1}>
                {item.username}
              </Text>
              <View style={[styles.rolePill, { backgroundColor: item.role === 'gudang' ? '#FFFBEB' : '#F0FDF4' }]}>
                <Text style={[styles.rolePillText, { color: item.role === 'gudang' ? '#B45309' : '#15803D' }]}>
                  {item.role.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => {
              setSelectedEmployee(item);
              setFormData({
                username: item.username,
                password: '',
                role: item.role as any,
                outlet_id: item.outlet_id?.toString() || '',
              });
              setShowEditModal(true);
            }}
          >
            <Ionicons name="create-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color="#94A3B8" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.role === 'karyawan'
                ? `Penempatan: ${getOutletName(item.outlet_id)}`
                : 'Akses Gudang Pusat'}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <Text style={styles.idText}>ID: USR-{item.id}</Text>
          {item.role !== 'owner' && (
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    ));
  };

  const handleAdd = async () => {
    if (!formData.username || !formData.password) {
      Alert.alert('Validasi', 'Username dan password wajib diisi');
      return;
    }
    setProcessing(true);
    try {
      const payload: any = { username: formData.username, password: formData.password, role: formData.role };
      if (formData.role === 'karyawan' && formData.outlet_id) {
        payload.outlet_id = parseInt(formData.outlet_id);
      }
      const response = await ownerAPI.createUser(payload);
      if (response.error) Alert.alert('Gagal', response.error);
      else {
        setShowAddModal(false);
        resetForm();
        await loadData(true);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedEmployee) return;
    setProcessing(true);
    try {
      const payload: any = { username: formData.username, role: formData.role };
      if (formData.password) payload.password = formData.password;
      if (formData.role === 'karyawan') {
        payload.outlet_id = formData.outlet_id ? parseInt(formData.outlet_id) : null;
      } else {
        payload.outlet_id = null;
      }
      const response = await ownerAPI.updateUser(selectedEmployee.id, payload);
      if (response.error) Alert.alert('Gagal', response.error);
      else {
        setShowEditModal(false);
        resetForm();
        await loadData(true);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Hapus Akun', 'Cabut akses user ini secara permanen?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
          await ownerAPI.deleteUser(id);
          loadData(true);
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      <View style={styles.premiumHeader}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Manajemen Karyawan</Text>
            <Text style={styles.headerSubtitle}>Status operasional tim lapangan</Text>
          </View>
          <View style={styles.headerAvatar}>
            {/* FIX: Avatar Inisial Dinamis Mengikuti User Login */}
            <Text style={styles.avatarText}>
              {user?.username ? user.username.substring(0, 2).toUpperCase() : 'PT'}
            </Text>
          </View>
        </View>

        {renderHeaderStats()}
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        style={styles.mainContent}
        contentContainerStyle={[styles.scrollPadding, { paddingBottom: bottomPad }]}
      >
        <View style={styles.actionRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari karyawan..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLabelWrap}>
              <Text style={styles.sectionHeading}>Daftar Tim Aktif</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{filteredEmployees.length} orang</Text>
              </View>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.pulse} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          {renderListContent()}
        </View>
        <View style={{height: 100}} />
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

      {/* MODAL ADD / EDIT */}
      <Modal visible={showAddModal || showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{showAddModal ? 'Tambah Akun' : 'Edit Akun'}</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setShowEditModal(false); }}>
                <Ionicons name="close-circle" size={28} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput style={styles.input} value={formData.username} onChangeText={(t) => setFormData({...formData, username: t})} placeholder="Username login..." autoCapitalize="none" />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{showEditModal ? 'Password Baru (Opsional)' : 'Password'}</Text>
                <View style={styles.passwordWrapper}>
                    <TextInput 
                        style={styles.passwordInput} 
                        value={formData.password} 
                        onChangeText={(t) => setFormData({...formData, password: t})} 
                        placeholder="Minimal 6 karakter..." 
                        secureTextEntry={!showPassword} 
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#94A3B8" />
                    </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Role Akses</Text>
                <View style={styles.roleGrid}>
                  {['karyawan', 'gudang'].map((r) => (
                    <TouchableOpacity key={r} style={[styles.roleCard, formData.role === r && styles.roleCardActive]} onPress={() => setFormData({...formData, role: r as any})}>
                      <Ionicons name={r === 'karyawan' ? 'storefront' : 'cube'} size={22} color={formData.role === r ? Colors.primary : '#CBD5E1'} />
                      <Text style={[styles.roleCardText, formData.role === r && styles.roleCardTextActive]}>{r.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {formData.role === 'karyawan' && (
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Lokasi Penempatan</Text>
                    <TouchableOpacity style={styles.selectBtn} onPress={() => setShowOutletModal(true)}>
                        <Text style={styles.selectBtnText}>{formData.outlet_id ? getOutletName(parseInt(formData.outlet_id)) : 'Pilih Cabang...'}</Text>
                        <Ionicons name="chevron-down" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={showAddModal ? handleAdd : handleUpdate} disabled={processing}>
                {processing ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Simpan Data</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MODAL PILIH OUTLET */}
      <Modal visible={showOutletModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, {maxHeight: '60%'}]}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Daftar Outlet</Text>
                    <TouchableOpacity onPress={() => setShowOutletModal(false)}>
                        <Ionicons name="close" size={24} color="#1E293B" />
                    </TouchableOpacity>
                </View>
                <ScrollView>
                    {outlets.map((o) => (
                        <TouchableOpacity key={o.id} style={styles.outletOption} onPress={() => { setFormData({...formData, outlet_id: o.id.toString()}); setShowOutletModal(false); }}>
                            <Text style={[styles.optionText, formData.outlet_id === o.id.toString() && {color: Colors.primary, fontWeight:'bold'}]}>{o.nama}</Text>
                            {formData.outlet_id === o.id.toString() && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  premiumHeader: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 70,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 24, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  headerAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 16, fontWeight: '900' },

  statsCard: {
    position: 'absolute',
    bottom: -35,
    left: 25,
    right: 25,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 24,
    paddingVertical: 20,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
  statLab: { fontSize: 8, fontWeight: '900', color: '#94A3B8', letterSpacing: 1, marginTop: 4 },
  vDivider: { width: 1, height: '60%', backgroundColor: '#F1F5F9', alignSelf: 'center' },

  mainContent: { flex: 1 },
  scrollPadding: { paddingTop: 60, paddingHorizontal: 25 },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 18, paddingHorizontal: 15, height: 56, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#1E293B', fontWeight: '600' },
  // FAB replaces inline add button

  listSection: { marginTop: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionHeading: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  sectionLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  sectionBadgeText: { fontSize: 12, fontWeight: '800', color: '#4F46E5' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  pulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  liveText: { fontSize: 10, fontWeight: '900', color: '#15803D', letterSpacing: 0.6 },
  listSkeletonWrapper: { gap: 12 },
  
  employeeCard: { backgroundColor: 'white', padding: 20, borderRadius: 30, marginBottom: 15, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  identityContainer: { gap: 4 },
  usernameText: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  rolePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  rolePillText: { fontSize: 10, fontWeight: '900' },
  settingsBtn: { padding: 4 },

  cardBody: { marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationText: { fontSize: 13, color: '#64748B', fontWeight: '500' },

  cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 15 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  idText: { fontSize: 11, color: '#CBD5E1', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'center', padding: 25 },
  modalContent: { backgroundColor: 'white', borderRadius: 32, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 15, padding: 18, fontSize: 15, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
  
  passwordWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  passwordInput: { flex: 1, padding: 18, fontSize: 15, color: '#1E293B' },
  eyeIcon: { paddingHorizontal: 15 },

  roleGrid: { flexDirection: 'row', gap: 8 },
  roleCard: { flex: 1, paddingVertical: 15, paddingHorizontal: 5, borderWidth: 1.5, borderColor: '#F1F5F9', borderRadius: 18, alignItems: 'center', gap: 5, backgroundColor: '#F8FAFC' },
  roleCardActive: { borderColor: Colors.primary, backgroundColor: '#F0FDF4' },
  roleCardText: { fontSize: 9, fontWeight: '800', color: '#94A3B8' },
  roleCardTextActive: { color: Colors.primary },

  selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 18, borderRadius: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  selectBtnText: { fontSize: 15, color: '#475569', fontWeight: '600' },
  
  saveBtn: { backgroundColor: Colors.primary, padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: 'white', fontWeight: '900', fontSize: 16 },

  outletOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  optionText: { fontSize: 16, color: '#475569' },

  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#94A3B8', fontWeight: '600', marginTop: 10 }
  ,emptyIconWrap: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },

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
    zIndex: 20,
  },

  skeletonBase: { backgroundColor: '#E2E8F0', overflow: 'hidden' },
  skeletonHighlight: { position: 'absolute', top: 0, bottom: 0, width: '45%', backgroundColor: 'rgba(255,255,255,0.55)' },
});