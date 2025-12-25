import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';

export default function SplashScreen() {
  const router = useRouter();

  // Animated Values
  const logoScale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(30)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // SEQUENCE ANIMASI INTRO
    Animated.sequence([
      // Logo Pop
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      
      // Text Slide Up
      Animated.parallel([
        Animated.spring(textTranslate, {
          toValue: 0,
          friction: 8,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Shimmer Effect Loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, {
            toValue: 1,
            duration: 2500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(shimmer, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // CHECK SESSION
    const checkSession = async () => {
      try {
        const minWait = new Promise(resolve => setTimeout(resolve, 3000));
        
        const [token, userDataRaw] = await Promise.all([
          AsyncStorage.getItem('@auth_token'),
          AsyncStorage.getItem('@user_data'),
          minWait 
        ]);
  
        if (token && userDataRaw) {
          const user = JSON.parse(userDataRaw);
          const role = user.role?.toLowerCase();
          
          if (role === 'karyawan') {
            router.replace('/(kasir)/transaksi' as any);
          } else if (role === 'gudang') {
            router.replace('/(gudang)/beranda' as any);
          } else if (role === 'owner') {
            router.replace('/(owner)/beranda' as any);
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
  }, [opacity, router, logoScale, textTranslate, textOpacity, shimmer]);

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View style={styles.container}>
      
      {/* Subtle Background Gradient */}
      <View style={styles.backgroundGradient}>
        <Animated.View 
          style={[
            styles.gradientCircle,
            {
              opacity: opacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.08],
              }),
            },
          ]}
        />
      </View>

      {/* Center Content */}
      <View style={styles.centerContent}>
        
        {/* Logo Container */}
        <Animated.View 
          style={[
            styles.logoWrapper,
            { 
              opacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          {/* Subtle Glow */}
          <View style={styles.logoGlow} />
          
          {/* Main Logo Circle */}
          <View style={styles.logoCircle}>
            {/* Shimmer Overlay */}
            <Animated.View 
              style={[
                styles.shimmerOverlay,
                {
                  transform: [{ translateX: shimmerTranslate }],
                },
              ]}
            />
            
            <Image 
              source={require('../assets/images/logo-esteh.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Text Container */}
        <Animated.View 
          style={[
            styles.textContainer,
            { 
              opacity: textOpacity,
              transform: [{ translateY: textTranslate }],
            },
          ]}
        >
          <Text style={styles.brandTitle}>Es Teh Favorit Indonesia</Text>
          <View style={styles.divider} />
          <Text style={styles.brandSubtitle}>Integrated Business Platform</Text>
        </Animated.View>

      </View>

      {/* Footer with Loading */}
      <Animated.View style={[styles.footerContainer, { opacity }]}>
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Memuat aplikasi...</Text>
        </View>
        
        <Text style={styles.version}>Version 1.0.0  •  © 2025 Es Teh Indonesia</Text>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Background
  backgroundGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientCircle: {
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: Colors.primary,
  },

  // Center Content
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Logo Wrapper
  logoWrapper: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 48,
  },
  logoGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.primary,
    opacity: 0.12,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    borderWidth: 3,
    borderColor: Colors.primary,
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    width: 80,
    height: '180%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ rotate: '25deg' }],
  },
  logoImage: {
    width: '70%',
    height: '70%',
    zIndex: 1,
  },

  // Text Styles
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 16,
  },
  divider: {
    width: 50,
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: 1,
    marginBottom: 16,
    opacity: 0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // Footer
  footerContainer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  loadingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  version: {
    fontSize: 11,
    fontWeight: '500',
    color: '#D1D5DB',
    letterSpacing: 0.5,
  },
});