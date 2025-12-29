// constants/DesignSystem.ts
// Material-like design tokens + responsive scaling helpers

import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Baseline guidelines (Material typical phones)
const guidelineBaseWidth = 360; // dp
const guidelineBaseHeight = 800; // dp

export const scale = (size: number) => (width / guidelineBaseWidth) * size;
export const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

// Font helper: respects our app baseline and ignores system font scaling via allowFontScaling=false
export const ms = (size: number, factor = 0.5) => moderateScale(size, factor);

// Material Design tokens
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const typography = {
  caption: ms(11),
  body: ms(13),
  bodyStrong: ms(14),
  title: ms(18),
  headline: ms(22),
  display: ms(32),
};

export const touchTargetMin = 48; // dp per Material

export const gridUnit = 8; // dp grid

export const layout = {
  screenPadding: spacing.lg,
};