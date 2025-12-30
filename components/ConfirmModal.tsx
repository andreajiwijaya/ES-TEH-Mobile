import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { radius, spacing, typography } from '../constants/DesignSystem';

export type ConfirmAction = {
  label: string;
  onPress: () => void | Promise<void>;
  type?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
};

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  actions: ConfirmAction[];
  onClose: () => void;
}
const { width } = Dimensions.get('window');

const ConfirmModal: React.FC<ConfirmModalProps> = ({ visible, title, message, actions, onClose }) => {
  const slideAnim = useRef(new Animated.Value(250)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const palette = useMemo(() => {
    const hasDanger = actions.some(a => a.type === 'danger');
    const hasPrimary = actions.some(a => a.type === 'primary');
    if (hasDanger) {
      return {
        gradient: ['#EF4444', '#DC2626'] as const,
        icon: 'alert-circle' as const,
      };
    }
    if (hasPrimary) {
      return {
        gradient: ['#3B82F6', '#2563EB'] as const,
        icon: 'help-circle' as const,
      };
    }
    return {
      gradient: ['#0EA5E9', '#0284C7'] as const,
      icon: 'help-circle' as const,
    };
  }, [actions]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 90, friction: 10, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(250);
      scaleAnim.setValue(0.85);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, scaleAnim, fadeAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <Animated.View
          style={[
            styles.contentWrapper,
            {
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={palette.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBadge}
          >
            <Ionicons name={palette.icon} size={32} color="white" />
          </LinearGradient>

          <View style={styles.content}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <View style={styles.closeInner}>
                <Ionicons name="close" size={18} color="#64748B" />
              </View>
            </TouchableOpacity>

            <Text style={styles.title}>{title}</Text>
            {!!message && <Text style={styles.subtitle}>{message}</Text>}

            <View style={styles.actionsContainer}>
              {actions.map((act, idx) => {
                const isPrimary = act.type === 'primary';
                const isDanger = act.type === 'danger';
                const gradient = isDanger
                  ? ['#EF4444', '#DC2626']
                  : isPrimary
                  ? ['#3B82F6', '#2563EB']
                  : ['#E5E7EB', '#E5E7EB'];
                const textColor = isPrimary || isDanger ? 'white' : '#0F172A';

                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.9}
                    disabled={act.disabled || act.loading}
                    onPress={act.onPress}
                    style={styles.actionWrapper}
                  >
                    <LinearGradient
                      colors={gradient as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.actionBtn, (act.disabled || act.loading) && styles.actionDisabled]}
                    >
                      {act.loading ? (
                        <ActivityIndicator color={textColor} size="small" />
                      ) : (
                        <Text style={[styles.actionText, { color: textColor }]}>{act.label}</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
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
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  contentWrapper: {
    width: width * 0.9,
    maxWidth: 420,
  },
  iconBadge: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 18,
      },
      android: { elevation: 8 },
    }),
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: spacing.xl,
    paddingTop: spacing.xl + 6,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
  },
  closeInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  actionsContainer: {
    width: '100%',
    gap: spacing.sm,
  },
  actionWrapper: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  actionBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontWeight: '800',
    fontSize: typography.body,
    letterSpacing: 0.3,
  },
  actionDisabled: {
    opacity: 0.7,
  },
});

export default ConfirmModal;
