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

      // Simpan sesi
      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@user_data', JSON.stringify(user));

      // LOGIKA NAVIGASI (Sesuai Struktur Folder Baru)
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F0F4F8" />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* HEADER LOGO SECTION */}
        <View style={styles.headerSection}>
          {/* LOGO CIRCLE */}
          <View style={styles.logoCircleContainer}>
            <Image 
              source={require('../../assets/images/logo-esteh.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.brandTitle}>Es Teh Favorit Indonesia</Text>
          <Text style={styles.brandSubtitle}>Integrated Business App</Text>
        </View>

        {/* LOGIN CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selamat Datang</Text>
          <Text style={styles.cardSubtitle}>Silakan masuk ke akun Anda</Text>

          {/* INPUT USERNAME */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Masukkan username"
                placeholderTextColor="#BDBDBD"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
          </View>

          {/* INPUT PASSWORD */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Masukkan kata sandi"
                placeholderTextColor="#BDBDBD"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setPasswordVisible(!passwordVisible)}
              >
                <Ionicons 
                  name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color={Colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* LOGIN BUTTON */}
          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>Masuk Sistem</Text>
            )}
          </TouchableOpacity>

        </View>

        <Text style={styles.footerText}>© 2025 Es Teh Favorit Indonesia</Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8', 
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  
  // HEADER
  headerSection: {
    alignItems: 'center',
    marginBottom: 32, 
  },
  logoCircleContainer: {
    width: 120, 
    height: 120, 
    borderRadius: 60,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  logoImage: {
    width: '75%', 
    height: '75%', 
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 16,
    fontWeight: '500', 
    color: Colors.textSecondary,
    letterSpacing: 1.2, 
  },

  // CARD
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },

  // INPUTS
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  eyeIcon: {
    padding: 8,
  },

  // BUTTON
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16, 
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  // FOOTER
  footerText: {
    textAlign: 'center',
    marginTop: 32,
    color: '#9E9E9E',
    fontSize: 12,
  },
});