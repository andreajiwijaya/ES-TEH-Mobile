import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { authAPI } from '../../services/api';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Peringatan', 'Mohon isi username dan password.');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login(username, password);

      if (response.error) {
        setLoading(false);
        Alert.alert('Login Gagal', response.error);
        return;
      }

      const token = response.data?.token || response.data?.access_token;
      const user = response.data?.user;

      if (!response.data || !user || !token) {
        setLoading(false);
        Alert.alert('Error', 'Data tidak lengkap dari server.');
        return;
      }

      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@user_data', JSON.stringify(user));

      const role = user.role?.toLowerCase();
      switch (role) {
        case 'karyawan': 
            router.replace('/(kasir)/transaksi'); 
            break;
        case 'gudang': 
            router.replace('/(gudang)/beranda'); 
            break;
        case 'owner': 
            router.replace('/(owner)/beranda'); 
            break;
        default:
          setLoading(false);
          await AsyncStorage.multiRemove(['@auth_token', '@user_data']);
          Alert.alert('Akses Ditolak', `Role tidak dikenali: ${role}`);
      }
      
    } catch (error: any) {
      setLoading(false);
      console.error("Login Error:", error);
      Alert.alert('Error Aplikasi', error.message || 'Terjadi kesalahan tidak terduga.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Background Decorations */}
      <View style={styles.backgroundDecor}>
        <View style={styles.leafDecor1}>
          <Ionicons name="leaf" size={120} color={Colors.primary} style={{ opacity: 0.08, transform: [{ rotate: '25deg' }] }} />
        </View>
        <View style={styles.leafDecor2}>
          <Ionicons name="leaf" size={80} color={Colors.primary} style={{ opacity: 0.06, transform: [{ rotate: '-45deg' }] }} />
        </View>
        <View style={styles.leafDecor3}>
          <Ionicons name="leaf" size={100} color={Colors.primary} style={{ opacity: 0.05, transform: [{ rotate: '60deg' }] }} />
        </View>
      </View>

      {/* FIX: KeyboardAvoidingView membungkus ScrollView */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" // Memungkinkan klik tombol saat keyboard terbuka
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.logoWrapper}>
              <View style={styles.logoCircle}>
                <Image 
                  source={require('../../assets/images/logo-esteh.png')} 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.logoGlow} />
            </View>
            
            <View style={styles.brandContainer}>
              <Text style={styles.brandTitle}>Es Teh Favorit Indonesia</Text>
              <View style={styles.divider} />
              <Text style={styles.brandSubtitle}>Integrated Business Platform</Text>
            </View>
          </View>

          {/* Login Form Card */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Masuk ke Sistem</Text>
              <Text style={styles.formSubtitle}>Silakan login untuk melanjutkan</Text>
            </View>

            {/* Username Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Username</Text>
              <View style={[
                styles.inputContainer,
                focusedInput === 'username' && styles.inputContainerFocused
              ]}>
                <View style={styles.inputIconBox}>
                  <Ionicons 
                    name="person" 
                    size={20} 
                    color={focusedInput === 'username' ? Colors.primary : '#9CA3AF'} 
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan username"
                  placeholderTextColor="#D1D5DB"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  editable={!loading}
                  onFocus={() => setFocusedInput('username')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[
                styles.inputContainer,
                focusedInput === 'password' && styles.inputContainerFocused
              ]}>
                <View style={styles.inputIconBox}>
                  <Ionicons 
                    name="lock-closed" 
                    size={20} 
                    color={focusedInput === 'password' ? Colors.primary : '#9CA3AF'} 
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan password"
                  placeholderTextColor="#D1D5DB"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!passwordVisible}
                  editable={!loading}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={passwordVisible ? 'eye-off' : 'eye'} 
                    size={20} 
                    color="#9CA3AF" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.loadingText}>Memproses...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.loginButtonText}>Login</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerDivider} />
            <Text style={styles.footerText}>© 2025 Es Teh Favorit Indonesia</Text>
            <Text style={styles.footerSubtext}>v1.0.0 • Powered by Innovation</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundDecor: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  leafDecor1: { position: 'absolute', top: 40, right: -20 },
  leafDecor2: { position: 'absolute', top: 200, left: -10 },
  leafDecor3: { position: 'absolute', bottom: 100, right: 20 },

  scrollContent: {
    flexGrow: 1,
    padding: 24,
    // Menghilangkan justifyContent: 'center' saat keyboard aktif agar tidak mental
    justifyContent: 'center', 
  },
  
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: Platform.OS === 'android' ? 40 : 0,
  },
  logoWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    opacity: 0.1,
    top: 0,
    left: 0,
  },
  logoImage: {
    width: '75%',
    height: '75%',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginVertical: 8,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  formCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    marginBottom: 24,
  },
  formHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },

  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 56,
  },
  inputContainerFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.primary,
  },
  inputIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    paddingVertical: 10, // Menambah area sentuh
  },
  eyeButton: {
    padding: 8,
  },

  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },

  footer: {
    alignItems: 'center',
    marginTop: 16,
    paddingBottom: 20,
  },
  footerDivider: {
    width: 80,
    height: 2,
    backgroundColor: '#E5E7EB',
    borderRadius: 1,
    marginBottom: 16,
  },
  footerText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  footerSubtext: {
    textAlign: 'center',
    color: '#D1D5DB',
    fontSize: 11,
    fontWeight: '500',
  },
});