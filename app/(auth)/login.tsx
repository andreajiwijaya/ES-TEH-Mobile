import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
// Import AsyncStorage untuk menyimpan sesi
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { authAPI } from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

// Logo Component
const LogoComponent = () => {
  return (
    <View style={styles.logoContainer}>
      <View style={styles.logoShapes}>
        <View style={[styles.logoShape, styles.logoShapeRed]}>
          <View style={styles.logoShapeInner} />
        </View>
        <View style={[styles.logoShape, styles.logoShapeGreen]}>
          <View style={styles.logoShapeInner} />
        </View>
        <View style={[styles.logoShape, styles.logoShapeYellow]}>
          <View style={styles.logoShapeInner} />
        </View>
      </View>
      <View style={styles.logoTextContainer}>
        <View style={styles.logoTextRow}>
          <Text style={styles.logoTextGreen}>Es-Teh</Text>
          <Text style={styles.logoTextRed}> Favorit</Text>
        </View>
        <Text style={styles.logoTextIndonesia}>INDONESIA</Text>
      </View>
    </View>
  );
};

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    // 1. Validasi Input
    if (!username.trim() || !password.trim()) {
      Alert.alert('Peringatan', 'Mohon isi username dan password.');
      return;
    }

    setLoading(true);

    try {
      // 2. Panggil API Login
      console.log('Attempting login for:', username);
      const response = await authAPI.login(username, password);

      // 3. Cek Error dari API (Network error, wrong password, etc)
      if (response.error) {
        setLoading(false);
        Alert.alert('Login Gagal', response.error);
        return;
      }

      // 4. Validasi Data Response (Menangani format 'token' atau 'access_token')
      // Backend kamu menggunakan 'token', tapi kita jaga-jaga cek 'access_token' juga
      const token = response.data?.token || response.data?.access_token;
      const user = response.data?.user;

      if (!response.data || !user || !token) {
        setLoading(false);
        console.error('Missing token/user in response:', response.data);
        Alert.alert('Error', 'Data tidak lengkap dari server (Token hilang).');
        return;
      }

      // ============================================================
      // 5. SIMPAN SESI KE ASYNC STORAGE
      // ============================================================
      try {
        await AsyncStorage.setItem('@auth_token', token);
        await AsyncStorage.setItem('@user_data', JSON.stringify(user));
        
        console.log('Login Success! Token Saved.');
        console.log('User Role:', user.role);
      } catch (storageError) {
        console.error('Failed to save session:', storageError);
        Alert.alert('Error', 'Gagal menyimpan sesi login.');
        setLoading(false);
        return;
      }

      // 6. Routing Berdasarkan Role
      const role = user.role?.toLowerCase();
      switch (role) {
        case 'karyawan':
          router.replace('/(employee)/transaksi'); 
          break;
        case 'gudang':
          router.replace('/(warehouse)/overview'); 
          break;
        case 'owner':
          router.replace('/(owner)/dashboard'); 
          break;
        default:
          setLoading(false);
          // Hapus token jika role tidak dikenal agar tidak terjebak
          await AsyncStorage.multiRemove(['@auth_token', '@user_data']);
          Alert.alert('Akses Ditolak', `Role tidak dikenali: ${role}`);
          return;
      }
      
    } catch (error: any) {
      console.error('Login Exception:', error);
      setLoading(false);
      Alert.alert('Error Aplikasi', 'Terjadi kesalahan tidak terduga.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <LogoComponent />

          <Text style={styles.welcomeText}>Selamat Datang Kembali</Text>
          <Text style={styles.subtitleText}>
            Silakan masuk untuk mengelola outlet.
          </Text>

          {/* Hint Credentials (Bisa dihapus nanti) */}
          <View style={styles.credentialsHint}>
            <Text style={styles.hintTitle}>Akun Demo:</Text>
            <Text style={styles.hintText}>• Karyawan: kasir1 / 123456</Text>
            <Text style={styles.hintText}>• Owner: owner / 123</Text>
            <Text style={styles.hintText}>• Gudang: gudang / 123</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan username anda"
              placeholderTextColor={Colors.textSecondary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { paddingRight: 44 }]}
                placeholder="Masukkan password anda"
                placeholderTextColor={Colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
                editable={!loading}
              />
              <TouchableOpacity
                accessibilityLabel={passwordVisible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                style={styles.passwordToggle}
                onPress={() => setPasswordVisible(!passwordVisible)}
              >
                <Ionicons name={passwordVisible ? 'eye-off' : 'eye'} size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.backgroundLight} />
            ) : (
              <Text style={styles.loginButtonText}>Masuk Sistem</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: isSmallScreen ? 15 : 20,
    paddingVertical: isSmallScreen ? 20 : 30,
  },
  card: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: isSmallScreen ? 16 : 24,
    padding: isSmallScreen ? 20 : 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    maxWidth: 450,
    alignSelf: 'center',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: isSmallScreen ? 30 : 40,
  },
  logoShapes: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: isSmallScreen ? 15 : 20,
    height: isSmallScreen ? 60 : 80,
    position: 'relative',
  },
  logoShape: {
    width: isSmallScreen ? 40 : 50,
    height: isSmallScreen ? 55 : 70,
    borderRadius: isSmallScreen ? 20 : 25,
    position: 'absolute',
    borderWidth: 3,
    borderColor: Colors.backgroundLight,
  },
  logoShapeRed: {
    backgroundColor: Colors.logoRed,
    left: '25%',
    transform: [{ rotate: '-15deg' }],
    zIndex: 3,
  },
  logoShapeGreen: {
    backgroundColor: Colors.logoGreen,
    left: '50%',
    marginLeft: isSmallScreen ? -20 : -25,
    transform: [{ rotate: '0deg' }],
    zIndex: 2,
    height: isSmallScreen ? 60 : 75,
  },
  logoShapeYellow: {
    backgroundColor: Colors.logoYellow,
    left: '75%',
    marginLeft: isSmallScreen ? -20 : -25,
    transform: [{ rotate: '15deg' }],
    zIndex: 1,
    height: isSmallScreen ? 50 : 65,
  },
  logoShapeInner: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.backgroundLight,
    margin: 2,
  },
  logoTextContainer: {
    alignItems: 'center',
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  logoTextGreen: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: Colors.logoGreen,
    letterSpacing: 1,
  },
  logoTextRed: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: Colors.logoRed,
    letterSpacing: 1,
  },
  logoTextIndonesia: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
    color: Colors.logoGreen,
    letterSpacing: 2,
  },
  welcomeText: {
    fontSize: isSmallScreen ? 22 : 26,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: Colors.textSecondary,
    marginBottom: isSmallScreen ? 20 : 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: isSmallScreen ? 14 : 16,
    fontSize: isSmallScreen ? 15 : 16,
    backgroundColor: Colors.backgroundLight,
    color: Colors.text,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -11,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: isSmallScreen ? 16 : 18,
    alignItems: 'center',
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loginButtonText: {
    color: Colors.backgroundLight,
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  credentialsHint: {
    backgroundColor: Colors.primaryLight + '20',
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  hintTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primaryDark,
    marginBottom: 8,
  },
  hintText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
    lineHeight: 16,
  },
});