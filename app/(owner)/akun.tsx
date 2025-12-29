import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { radius, spacing, typography } from '../../constants/DesignSystem';
import { authAPI, ownerAPI } from '../../services/api';

const { height } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalType, setModalType] = useState<'username' | 'password'>('username');
  const [formData, setFormData] = useState({ value: '' });

  // --- SKELETON SHIMMER ---
  const SkeletonShimmer = ({ width, height, style }: { width?: number | string; height?: number; style?: any }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true })
        ])
      );
      loop.start();
      return () => loop.stop();
    }, [anim]);

    const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] });
    return (
      <View style={[{ overflow: 'hidden', backgroundColor: '#E5E7EB', borderRadius: 12 }, style, width ? { width } : {}, height ? { height } : {}]}>
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%', opacity: 0.5, transform: [{ translateX }], backgroundColor: 'rgba(255,255,255,0.6)' }} />
      </View>
    );
  };

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AsyncStorage.getItem('@user_data');
      if (data) setUser(JSON.parse(data));
    } catch {
      console.error("Gagal load user data");
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadUser(); }, [loadUser]));

  const handleUpdateAccount = async () => {
    if (!formData.value.trim()) {
      Alert.alert('Validasi', 'Input tidak boleh kosong');
      return;
    }
    setProcessing(true);
    try {
      const payload: any = {};
      if (modalType === 'username') payload.username = formData.value;
      if (modalType === 'password') payload.password = formData.value;

      const res = await ownerAPI.updateUser(user.id, payload);
      if (res.error) {
        Alert.alert('Gagal', res.error);
      } else {
        Alert.alert('Sukses', `${modalType === 'username' ? 'Username' : 'Password'} diperbarui`);
        if (modalType === 'username') {
          const newUser = { ...user, username: formData.value };
          await AsyncStorage.setItem('@user_data', JSON.stringify(newUser));
          setUser(newUser);
        }
        setShowEditModal(false);
        setFormData({ value: '' });
      }
    } catch {
      Alert.alert('Error', 'Gagal menghubungi server');
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Konfirmasi', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => {
          await authAPI.logout();
          router.replace('/(auth)/login');
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* HEADER BACKGROUND SOLID */}
      <View style={styles.headerBg}>
        <Text style={styles.headerTitleMain}>Manajemen Akun</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* PROFILE FLOATING CARD */}
        <View style={styles.profileCard}>
          {loading ? (
            <>
              <SkeletonShimmer width={100} height={100} style={{ borderRadius: 50, marginBottom: 15 }} />
              <SkeletonShimmer width={160} height={24} style={{ marginBottom: 10 }} />
              <SkeletonShimmer width={200} height={14} style={{ marginBottom: 15 }} />
              <SkeletonShimmer width={140} height={28} style={{ borderRadius: 20 }} />
            </>
          ) : (
            <>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {user?.username ? user.username.substring(0, 2).toUpperCase() : 'OW'}
                  </Text>
                </View>
                <View style={styles.onlineBadge}>
                  <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                </View>
              </View>
              <Text style={styles.profileName}>{user?.username || 'Owner'}</Text>
              <Text style={styles.profileRole}>Pemilik Bisnis</Text>
            </>
          )}
        </View>

        {/* MENU AREA */}
        <View style={styles.contentArea}>
          <Text style={styles.groupLabel}>DETAIL INFORMASI</Text>
          <View style={styles.menuGroup}>
            {loading ? (
              <>
                <View style={{ padding: 15 }}>
                  <SkeletonShimmer width={44} height={44} style={{ borderRadius: 12, marginBottom: 12 }} />
                  <SkeletonShimmer width={80} height={10} style={{ marginBottom: 8 }} />
                  <SkeletonShimmer width={120} height={14} />
                </View>
              </>
            ) : (
              <View style={styles.infoRow}>
                <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="person-outline" size={22} color="#1565C0" />
                </View>
                <View style={styles.infoTexts}>
                  <Text style={styles.infoLabel}>Username</Text>
                  <Text style={styles.infoValue}>{user?.username || '-'}</Text>
                </View>
              </View>
            )}
            <View style={styles.divider} />
            {loading ? (
              <View style={{ padding: 15 }}>
                <SkeletonShimmer width={44} height={44} style={{ borderRadius: 12, marginBottom: 12 }} />
                <SkeletonShimmer width={80} height={10} style={{ marginBottom: 8 }} />
                <SkeletonShimmer width={120} height={14} />
              </View>
            ) : (
              <View style={styles.infoRow}>
                <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="shield-checkmark-outline" size={22} color="#2E7D32" />
                </View>
                <View style={styles.infoTexts}>
                  <Text style={styles.infoLabel}>Hak Akses</Text>
                  <Text style={styles.infoValue}>Owner (Akses Penuh)</Text>
                </View>
              </View>
            )}
          </View>

          <Text style={styles.groupLabel}>KEAMANAN & SISTEM</Text>
          <View style={styles.menuGroup}>
            {loading ? (
              <>
                <View style={{ padding: 18 }}>
                  <SkeletonShimmer width="100%" height={22} style={{ marginBottom: 15 }} />
                  <SkeletonShimmer width="100%" height={22} style={{ marginBottom: 15 }} />
                  <SkeletonShimmer width="100%" height={22} />
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setModalType('username'); setFormData({ value: user?.username || '' }); setShowEditModal(true); }}>
                  <Ionicons name="create-outline" size={22} color="#64748B" />
                  <Text style={styles.menuItemText}>Ubah Username</Text>
                  <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.menuItem} onPress={() => { setModalType('password'); setFormData({ value: '' }); setShowEditModal(true); }}>
                  <Ionicons name="lock-closed-outline" size={22} color="#64748B" />
                  <Text style={styles.menuItemText}>Ganti Password</Text>
                  <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              </>
            )}
          </View>

          {!loading && (
            <>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={22} color="white" />
                <Text style={styles.logoutBtnText}>Keluar dari Aplikasi</Text>
              </TouchableOpacity>

              <Text style={styles.copyright}>© 2025 Esteh Indonesia System</Text>
            </>
          )}
          <View style={{ height: 20 }} />
        </View>
      </ScrollView>

      {/* MODAL EDIT */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>{modalType === 'username' ? 'Edit Username' : 'Ubah Password'}</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}><Ionicons name="close-circle" size={28} color="#94A3B8" /></TouchableOpacity>
            </View>
            <View style={styles.inputArea}>
              <Text style={styles.inputLabel}>{modalType === 'username' ? 'Username Baru' : 'Password Baru'}</Text>
              <TextInput style={styles.input} value={formData.value} onChangeText={(t) => setFormData({ value: t })} secureTextEntry={modalType === 'password'} placeholder="Ketik di sini..." autoCapitalize="none" />
            </View>
            <TouchableOpacity style={styles.btnSave} onPress={handleUpdateAccount} disabled={processing}>
              {processing ? <ActivityIndicator color="white" /> : <Text style={styles.btnSaveText}>Simpan Perubahan</Text>}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerBg: {
    backgroundColor: Colors.primary,
    height: height * 0.22,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleMain: { color: 'white', fontSize: typography.headline, fontWeight: '900', textAlign: 'center' },
  scrollView: { flex: 1, marginTop: -height * 0.1 },
  scrollContent: { paddingBottom: 120 },
  
  profileCard: {
    backgroundColor: 'white',
    marginHorizontal: spacing.xl,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarContainer: { marginBottom: spacing.lg },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: radius.pill,
    backgroundColor: '#F0F4F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatarText: { fontSize: typography.display, fontWeight: '900', color: Colors.primary },
  onlineBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: 'white', borderRadius: 15, elevation: 3 },
  
  profileName: { fontSize: typography.title, fontWeight: '900', color: '#1E293B', marginBottom: spacing.xs },
  profileRole: { fontSize: typography.body, color: '#64748B', fontWeight: '600', marginBottom: spacing.md },
  verifiedPill: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', 
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: '#DCFCE7'
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginRight: spacing.xs },
  verifiedText: { fontSize: typography.caption, fontWeight: '800', color: '#15803D' },

  contentArea: { paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  groupLabel: { fontSize: typography.caption, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.5, marginBottom: spacing.md, marginLeft: spacing.xs, textTransform: 'uppercase' },
  menuGroup: { backgroundColor: 'white', borderRadius: radius.xl, padding: spacing.sm, marginBottom: spacing.xl, borderWidth: 1, borderColor: '#F1F5F9', elevation: 3 },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  iconBox: { width: 48, height: 48, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  infoTexts: { flex: 1 },
  infoLabel: { fontSize: typography.caption, color: '#94A3B8', fontWeight: '800', marginBottom: 4, textTransform: 'uppercase' },
  infoValue: { fontSize: typography.bodyStrong, fontWeight: '700', color: '#1E293B' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: spacing.md },

  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  menuItemText: { flex: 1, fontSize: typography.bodyStrong, fontWeight: '700', color: '#475569' },
  versionLabel: { fontSize: typography.caption, color: '#94A3B8', fontWeight: '700' },

  logoutBtn: { 
    backgroundColor: '#EF4444', 
    padding: spacing.lg, 
    borderRadius: radius.lg, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: spacing.sm, 
    elevation: 8,
    shadowColor: '#EF4444',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  logoutBtnText: { color: 'white', fontSize: typography.bodyStrong, fontWeight: '900' },
  copyright: { textAlign: 'center', color: '#CBD5E1', fontSize: typography.caption, marginTop: spacing.xl, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', padding: spacing.xl },
  modalContent: { backgroundColor: 'white', borderRadius: radius.xl, padding: spacing.xl },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: typography.headline, fontWeight: '900', color: '#1E293B' },
  inputArea: { marginBottom: spacing.xl },
  inputLabel: { fontSize: typography.body, fontWeight: '800', color: '#64748B', marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#F8FAFC', borderRadius: radius.lg, padding: spacing.md, fontSize: typography.bodyStrong, fontWeight: '600', borderWidth: 1.5, borderColor: '#E2E8F0', color: '#1E293B' },
  btnSave: { backgroundColor: Colors.primary, padding: spacing.lg, borderRadius: radius.lg, alignItems: 'center', elevation: 8 },
  btnSaveText: { color: 'white', fontWeight: '900', fontSize: typography.bodyStrong }
});