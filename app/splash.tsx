import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';

// Logo Component (Menggunakan Image Asli + Style Lingkaran)
const LogoMark = () => {
  return (
    <View style={styles.logoContainer}>
      <View style={styles.logoCircleContainer}>
        <Image 
          source={require('../assets/images/logo-esteh.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.brandTitle}>Es Teh Favorit Indonesia</Text>
        <Text style={styles.brandSubtitle}>Management System</Text>
      </View>
    </View>
  );
};

export default function SplashScreen() {
  const router = useRouter();
  // Animasi Value
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // 1. Jalankan Animasi Masuk
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Cek Sesi Login
    const checkSession = async () => {
      try {
        // Tunggu 2.5 detik agar animasi splash selesai dan user bisa lihat branding
        const minWait = new Promise(resolve => setTimeout(resolve, 2500));
        
        const [token, userDataRaw] = await Promise.all([
          AsyncStorage.getItem('@auth_token'),
          AsyncStorage.getItem('@user_data'),
          minWait 
        ]);
  
        if (token && userDataRaw) {
          const user = JSON.parse(userDataRaw);
          const role = user.role?.toLowerCase();
          
          if (role === 'karyawan') {
            router.replace('/(employee)/transaksi' as any);
          } else if (role === 'gudang') {
            router.replace('/(warehouse)/overview' as any);
          } else if (role === 'owner') {
            router.replace('/(owner)/dashboard' as any);
          } else {
            router.replace('/(auth)/login' as any);
          }
        } else {
          router.replace('/(auth)/login' as any);
        }
      } catch (error) {
        console.error('Splash Check Error:', error);
        router.replace('/(auth)/login' as any);
      }
    };

    checkSession();

  }, [opacity, scale, translateY, router]); 

  return (
    <View style={styles.container}>
      <Animated.View 
        style={{ 
          opacity, 
          transform: [
            { scale },
            { translateY }
          ],
          alignItems: 'center'
        }}
      >
        <LogoMark />
      </Animated.View>

      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color={Colors.primary} style={styles.spinner} />
        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  spinner: {
    marginBottom: 10,
  },
  version: {
    color: '#B0BEC5',
    fontSize: 11,
    fontWeight: '500',
  },
  
  // LOGO STYLES
  logoContainer: {
    alignItems: 'center',
  },
  logoCircleContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    
    // Shadow Effect
    elevation: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  logoImage: {
    width: '70%', 
    height: '70%', 
  },
  textContainer: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});