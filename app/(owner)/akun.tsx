import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  Platform, 
  StatusBar,
  Dimensions,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { authAPI, ownerAPI } from '../../services/api';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalType, setModalType] = useState<'username' | 'password'>('username');
  const [formData, setFormData] = useState({ value: '' });

  const loadUser = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem('@user_data');
      if (data) setUser(JSON.parse(data));
    } catch {
      console.error("Gagal load user data");
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

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* PROFILE FLOATING CARD */}
        <View style={styles.profileCard}>
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
          <Text style={styles.profileRole}>Administrator / Pemilik Bisnis</Text>
          <View style={styles.verifiedPill}>
            <View style={styles.dot} />
            <Text style={styles.verifiedText}>Akun Terverifikasi</Text>
          </View>
        </View>

        {/* MENU AREA */}
        <View style={styles.contentArea}>
          <Text style={styles.groupLabel}>DETAIL INFORMASI</Text>
          <View style={styles.menuGroup}>
            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="person-outline" size={22} color="#1565C0" />
              </View>
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Username</Text>
                <Text style={styles.infoValue}>{user?.username || '-'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#2E7D32" />
              </View>
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Hak Akses</Text>
                <Text style={styles.infoValue}>Owner (Akses Penuh)</Text>
              </View>
            </View>
          </View>

          <Text style={styles.groupLabel}>KEAMANAN & SISTEM</Text>
          <View style={styles.menuGroup}>
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
            <View style={styles.divider} />
            <View style={styles.menuItem}>
              <Ionicons name="git-branch-outline" size={22} color="#64748B" />
              <Text style={styles.menuItemText}>Versi Aplikasi</Text>
              <Text style={styles.versionLabel}>v1.5.0 stable</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="power" size={22} color="white" />
            <Text style={styles.logoutBtnText}>Keluar dari Aplikasi</Text>
          </TouchableOpacity>

          <Text style={styles.copyright}>© 2025 Esteh Indonesia System</Text>
          <View style={{ height: 40 }} />
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
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    alignItems: 'center',
  },
  headerTitleMain: { color: 'white', fontSize: 24, fontWeight: '900' },
  scrollView: { flex: 1, marginTop: -height * 0.1 }, // Menarik konten naik ke area header
  
  profileCard: {
    backgroundColor: 'white',
    marginHorizontal: 25,
    borderRadius: 30,
    padding: 25,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarContainer: { marginBottom: 15 },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  avatarText: { fontSize: 38, fontWeight: '900', color: Colors.primary },
  onlineBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: 'white', borderRadius: 15 },
  
  profileName: { fontSize: 22, fontWeight: '900', color: '#1E293B', marginBottom: 4 },
  profileRole: { fontSize: 14, color: '#64748B', fontWeight: '600', marginBottom: 15 },
  verifiedPill: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', 
    paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E', marginRight: 8 },
  verifiedText: { fontSize: 12, fontWeight: '800', color: '#15803D' },

  contentArea: { paddingHorizontal: 25, marginTop: 25 },
  groupLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 12, marginLeft: 5 },
  menuGroup: { backgroundColor: 'white', borderRadius: 25, padding: 10, marginBottom: 25, borderWidth: 1, borderColor: '#F1F5F9' },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoTexts: { flex: 1 },
  infoLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '800', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  divider: { height: 1, backgroundColor: '#F8FAFC', marginHorizontal: 15 },

  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  menuItemText: { flex: 1, marginLeft: 15, fontSize: 15, fontWeight: '700', color: '#475569' },
  versionLabel: { fontSize: 12, color: '#CBD5E1', fontWeight: '700' },

  logoutBtn: { 
    backgroundColor: '#EF4444', padding: 20, borderRadius: 22, flexDirection: 'row', 
    justifyContent: 'center', alignItems: 'center', gap: 12, elevation: 5 
  },
  logoutBtnText: { color: 'white', fontSize: 16, fontWeight: '900' },
  copyright: { textAlign: 'center', color: '#CBD5E1', fontSize: 11, marginTop: 30, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'center', padding: 25 },
  modalContent: { backgroundColor: 'white', borderRadius: 32, padding: 25 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  inputArea: { marginBottom: 25 },
  inputLabel: { fontSize: 14, fontWeight: '800', color: '#64748B', marginBottom: 10 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 15, padding: 18, fontSize: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  btnSave: { backgroundColor: Colors.primary, padding: 20, borderRadius: 20, alignItems: 'center' },
  btnSaveText: { color: 'white', fontWeight: '900', fontSize: 16 }
});