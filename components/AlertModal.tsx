import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Dimensions, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { spacing } from '../constants/DesignSystem';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: AlertType;
  onClose: () => void;
  closing?: boolean;
}

const { width } = Dimensions.get('window');

const AlertModal: React.FC<AlertModalProps> = ({ visible, title, message, type = 'info', onClose, closing = false }) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      slideAnim.setValue(300);
      scaleAnim.setValue(0.3);
      fadeAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [visible, slideAnim, scaleAnim, fadeAnim, pulseAnim]);

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          gradientColors: ['#10B981', '#059669'] as const,
          lightColor: '#D1FAE5',
          glowColor: 'rgba(16, 185, 129, 0.3)',
          particleColor: '#34D399',
        };
      case 'error':
        return {
          icon: 'close-circle' as const,
          gradientColors: ['#EF4444', '#DC2626'] as const,
          lightColor: '#FEE2E2',
          glowColor: 'rgba(239, 68, 68, 0.3)',
          particleColor: '#F87171',
        };
      case 'warning':
        return {
          icon: 'alert-circle' as const,
          gradientColors: ['#F59E0B', '#D97706'] as const,
          lightColor: '#FEF3C7',
          glowColor: 'rgba(245, 158, 11, 0.3)',
          particleColor: '#FBBF24',
        };
      default:
        return {
          icon: 'information-circle' as const,
          gradientColors: ['#3B82F6', '#2563EB'] as const,
          lightColor: '#DBEAFE',
          glowColor: 'rgba(59, 130, 246, 0.3)',
          particleColor: '#60A5FA',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.contentWrapper,
            {
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {/* Decorative glow effect */}
          <View style={[styles.glowEffect, { backgroundColor: config.glowColor }]} />
          
          <View style={styles.content}>
            {/* Close button with modern design */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <View style={styles.closeButtonInner}>
                <Ionicons name="close" size={20} color="#64748B" />
              </View>
            </TouchableOpacity>

            {/* Animated Icon with gradient background */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <LinearGradient
                colors={config.gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconContainer}
              >
                <View style={styles.iconGlow}>
                  <Ionicons name={config.icon} size={48} color="white" />
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Decorative accent bar */}
            <LinearGradient
              colors={config.gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentBar}
            />

            {/* Title with modern typography */}
            <Text style={styles.title}>{title}</Text>

            {/* Message with better readability */}
            <Text style={styles.message}>{message}</Text>

            {/* Modern action button */}
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={onClose} 
              disabled={closing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={config.gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                {closing ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>Mengerti</Text>
                    <Ionicons name="checkmark" size={20} color="white" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  contentWrapper: {
    width: width * 0.88,
    maxWidth: 400,
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: -30,
    left: -30,
    right: -30,
    bottom: -30,
    borderRadius: 40,
    opacity: 0.4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 40,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: spacing.xl + 4,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 25,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
  },
  actionButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default AlertModal;
