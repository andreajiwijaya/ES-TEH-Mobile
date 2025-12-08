import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;

const LogoMark = () => {
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

export default function SplashScreen() {
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();

    const timeout = setTimeout(() => {
      router.replace('/(auth)/login' as any);
    }, 1400);
    return () => clearTimeout(timeout);
  }, [router, opacity, scale]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <LogoMark />
      </Animated.View>
      <ActivityIndicator style={styles.spinner} color={Colors.primary} />
      <Text style={styles.tagline}>Menyajikan yang terbaik setiap hari</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: isSmallScreen ? 20 : 24,
  },
  spinner: {
    marginTop: 18,
  },
  tagline: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: isSmallScreen ? 12 : 13,
    letterSpacing: 0.3,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoShapes: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: isSmallScreen ? 12 : 16,
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
    marginBottom: 6,
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
});

