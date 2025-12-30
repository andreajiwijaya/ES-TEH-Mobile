import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { authAPI } from '../../services/api';

const { width, height } = Dimensions.get('window');

// Alert Dialog Component
const AlertDialog = ({ 
  visible, 
  onClose, 
  title, 
  message, 
  type = 'error' 
}: { 
  visible: boolean; 
  onClose: () => void; 
  title: string; 
  message: string;
  type?: 'error' | 'success';
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      if (type === 'error') {
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      shakeAnim.setValue(0);
    }
  }, [visible, type, scaleAnim, fadeAnim, shakeAnim]);

  const iconName = type === 'error' ? 'close-circle' : 'checkmark-circle';
  const iconColor = type === 'error' ? '#EF4444' : Colors.primary;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.alertOverlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.alertContent,
            {
              transform: [
                { scale: scaleAnim },
                { translateX: shakeAnim }
              ],
            },
          ]}
        >
          <View style={[styles.alertIconContainer, { backgroundColor: `${iconColor}15` }]}>
            <Ionicons name={iconName} size={60} color={iconColor} />
          </View>

          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>

          <View style={styles.alertDivider} />

          <TouchableOpacity 
            style={[styles.alertButton, { backgroundColor: iconColor }]} 
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.alertButtonText}>
              {type === 'success' ? 'Lanjutkan' : 'Tutup'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  
  // Alert states
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'error' as 'error' | 'success',
  });

  const router = useRouter();

  // Animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(50)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const leafFloat1 = useRef(new Animated.Value(0)).current;
  const leafFloat2 = useRef(new Animated.Value(0)).current;
  const leafFloat3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance animation
    Animated.spring(logoScale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Form entrance animation
    Animated.parallel([
      Animated.timing(formSlide, {
        toValue: 0,
        duration: 600,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating leaves animation
    const floatAnimation = (animValue: Animated.Value, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1,
            duration: duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    floatAnimation(leafFloat1, 3000);
    floatAnimation(leafFloat2, 4000);
    floatAnimation(leafFloat3, 3500);
  }, [logoScale, formSlide, formOpacity, leafFloat1, leafFloat2, leafFloat3]);

  const showAlert = (title: string, message: string, type: 'error' | 'success' = 'error') => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      showAlert('Peringatan', 'Mohon isi username dan password.', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login(username, password);

      if (response.error) {
        setLoading(false);
        showAlert('Login Gagal', response.error, 'error');
        return;
      }

      const token = response.data?.token || response.data?.access_token;
      const user = response.data?.user;

      if (!response.data || !user || !token) {
        setLoading(false);
        showAlert('Error', 'Data tidak lengkap dari server.', 'error');
        return;
      }

      await AsyncStorage.setItem('@auth_token', token);
      await AsyncStorage.setItem('@user_data', JSON.stringify(user));

      setLoading(false);
      showAlert(
        'Login Berhasil!', 
        `Selamat datang kembali, ${user.username || username}`, 
        'success'
      );

      // Navigate after alert closes
      setTimeout(() => {
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
            AsyncStorage.multiRemove(['@auth_token', '@user_data']);
            showAlert('Akses Ditolak', `Role tidak dikenali: ${role}`, 'error');
        }
      }, 2000);
    } catch (error: any) {
      setLoading(false);
      console.error('Login Error:', error);
      showAlert('Error Aplikasi', error.message || 'Terjadi kesalahan tidak terduga.', 'error');
    }
  };

  const leaf1Transform = leafFloat1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const leaf2Transform = leafFloat2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const leaf3Transform = leafFloat3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Curved Background */}
      <View style={styles.topBackground}>
        <View style={styles.curvedShape} />

        {/* Animated Floating Leaves */}
        <Animated.View
          style={[
            styles.leafDecor1,
            { transform: [{ translateY: leaf1Transform }] },
          ]}
        >
          <Ionicons name="leaf" size={80} color="rgba(255,255,255,0.15)" style={{ transform: [{ rotate: '25deg' }] }} />
        </Animated.View>
        <Animated.View
          style={[
            styles.leafDecor2,
            { transform: [{ translateY: leaf2Transform }] },
          ]}
        >
          <Ionicons name="leaf" size={60} color="rgba(255,255,255,0.12)" style={{ transform: [{ rotate: '-45deg' }] }} />
        </Animated.View>
        <Animated.View
          style={[
            styles.leafDecor3,
            { transform: [{ translateY: leaf3Transform }] },
          ]}
        >
          <Ionicons name="leaf" size={70} color="rgba(255,255,255,0.1)" style={{ transform: [{ rotate: '60deg' }] }} />
        </Animated.View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={styles.helloText}>Hello!</Text>
            <Text style={styles.welcomeSubtitle}>Welcome to Es Teh Favorit Indonesia</Text>
          </View>

          {/* Decorative Plant Image */}
          <View style={styles.plantImageContainer}>
            <Image
              source={require('../../assets/images/daun.png')}
              style={styles.plantImage}
              resizeMode="contain"
            />
          </View>

          {/* Login Form */}
          <Animated.View
            style={[
              styles.formContainer,
              {
                transform: [{ translateY: formSlide }],
                opacity: formOpacity,
              },
            ]}
          >
            <Text style={styles.formTitle}>Login</Text>

            {/* Username Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Username</Text>
              <View
                style={[
                  styles.inputContainer,
                  focusedInput === 'username' && styles.inputContainerFocused,
                ]}
              >
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
                  placeholderTextColor="#C7C7C7"
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
              <View
                style={[
                  styles.inputContainer,
                  focusedInput === 'password' && styles.inputContainerFocused,
                ]}
              >
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
                  placeholderTextColor="#C7C7C7"
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
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2025 Es Teh Favorit Indonesia</Text>
            <Text style={styles.footerSubtext}>v1.0.0 • Powered by Innovation</Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Alert Dialog */}
      <AlertDialog
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  topBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
    backgroundColor: Colors.primary,
    zIndex: 0,
  },
  curvedShape: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
  leafDecor1: {
    position: 'absolute',
    top: 60,
    right: 30,
  },
  leafDecor2: {
    position: 'absolute',
    top: 150,
    left: 20,
  },
  leafDecor3: {
    position: 'absolute',
    top: 100,
    right: -10,
  },

  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: width * 0.06,
    justifyContent: 'space-between',
  },

  headerSection: {
    alignItems: 'flex-start',
    zIndex: 10,
    marginTop: height * 0.02,
    marginBottom: height * 0.18,
  },
  helloText: {
    fontSize: width * 0.13,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  welcomeSubtitle: {
    fontSize: width * 0.042,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.3,
  },

  plantImageContainer: {
    position: 'absolute',
    right: width * 0.05,
    top: height * 0.18,
    width: width * 0.45,
    height: height * 0.25,
    zIndex: 8,
  },
  plantImage: {
    width: '100%',
    height: '100%',
  },

  formContainer: {
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  formTitle: {
    fontSize: width * 0.085,
    fontWeight: '900',
    color: Colors.primary,
    marginBottom: height * 0.03,
  },

  inputWrapper: {
    marginBottom: height * 0.022,
  },
  inputLabel: {
    fontSize: width * 0.037,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: height * 0.012,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: width * 0.055,
    paddingHorizontal: width * 0.04,
    height: height * 0.065,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
  },
  inputIconBox: {
    width: width * 0.1,
    height: width * 0.1,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: width * 0.03,
  },
  input: {
    flex: 1,
    fontSize: width * 0.04,
    fontWeight: '500',
    color: '#1F2937',
    paddingVertical: 10,
  },
  eyeButton: {
    padding: width * 0.025,
  },

  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: width * 0.055,
    height: height * 0.065,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: height * 0.015,
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: 'white',
    fontSize: width * 0.045,
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
    fontSize: width * 0.04,
    fontWeight: '600',
  },

  footer: {
    alignItems: 'center',
    paddingBottom: height * 0.02,
  },
  footerText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: width * 0.035,
    fontWeight: '600',
    marginBottom: 4,
  },
  footerSubtext: {
    textAlign: 'center',
    color: '#C7C7C7',
    fontSize: width * 0.03,
    fontWeight: '500',
  },

  // Alert Dialog Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContent: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  alertIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  alertTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  alertDivider: {
    width: 60,
    height: 3,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 24,
  },
  alertButton: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 40,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    minWidth: 140,
  },
  alertButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
});