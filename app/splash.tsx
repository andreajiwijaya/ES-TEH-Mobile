import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';

export default function SplashScreen() {
  const router = useRouter();

  // --- ANIMATED VALUES ---
  const startScale = useRef(new Animated.Value(0)).current;  // Untuk Intro Pop
  const pulseScale = useRef(new Animated.Value(1)).current;  // Untuk efek Bernapas (Loop)
  const opacity = useRef(new Animated.Value(0)).current;     // Opacity Global
  const textTranslate = useRef(new Animated.Value(40)).current; // Teks naik dari bawah

  useEffect(() => {
    // 1. SEQUENCE ANIMASI INTRO
    Animated.parallel([
      // A. Logo Pop (Elastic Bounce)
      Animated.spring(startScale, {
        toValue: 1,
        friction: 4,      
        tension: 80,      
        useNativeDriver: true,
      }),
      // B. Fade In
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // C. Teks Slide Up
      Animated.sequence([
        Animated.delay(300), 
        Animated.spring(textTranslate, {
          toValue: 0,
          friction: 6,
          useNativeDriver: true,
        })
      ])
    ]).start(() => {
      // 2. SETELAH INTRO SELESAI -> JALANKAN EFEK "BERNAPAS" (LOOP)
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.08, 
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,    
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          })
        ])
      ).start();
    });

    // 3. LOGIC CEK SESI
    const checkSession = async () => {
      try {
        // Waktu tunggu 3.5 detik untuk animasi
        const minWait = new Promise(resolve => setTimeout(resolve, 3500));
        
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

    // FIX: Masukkan semua dependency ke array ini agar Linter senang
  }, [opacity, pulseScale, router, startScale, textTranslate]); 

  // Combine Scale: Menggabungkan animasi intro dengan loop
  const combinedScale = Animated.multiply(startScale, pulseScale);

  return (
    <View style={styles.container}>
      
      {/* CENTER CONTENT */}
      <View style={styles.centerContent}>
        
        {/* LOGO DENGAN EFEK GABUNGAN */}
        <Animated.View 
          style={[
            styles.logoContainer, 
            { 
              opacity, 
              transform: [{ scale: combinedScale }]
            }
          ]}
        >
          <View style={styles.logoCircleContainer}>
            <Image 
              source={require('../assets/images/logo-esteh.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* TEKS DENGAN EFEK SLIDE */}
        <Animated.View 
          style={[
            styles.textContainer, 
            { 
              opacity, 
              transform: [{ translateY: textTranslate }] 
            }
          ]}
        >
          <Text style={styles.brandTitle}>Es Teh Favorit Indonesia</Text>
          <Text style={styles.brandSubtitle}>Integrated Business App</Text>
        </Animated.View>

      </View>

      {/* FOOTER */}
      <Animated.View style={[styles.footerContainer, { opacity }]}>
        <ActivityIndicator size="small" color={Colors.primary} style={styles.spinner} />
        <Text style={styles.version}>v1.0.0</Text>
      </Animated.View>

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
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  spinner: {
    marginBottom: 10,
    transform: [{ scale: 0.8 }]
  },
  version: {
    color: '#B0BEC5',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
  },
  
  // LOGO STYLES
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircleContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    
    // Shadow Effect
    elevation: 15,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)'
  },
  logoImage: {
    width: '70%', 
    height: '70%', 
  },
  
  // TEXT STYLES
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