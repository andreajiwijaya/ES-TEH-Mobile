import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const isSmallScreen = SCREEN_WIDTH < 375;
export const isMediumScreen = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
export const isLargeScreen = SCREEN_WIDTH >= 414;

export const responsiveFontSize = (small: number, medium: number = small, large: number = medium) => {
  if (isSmallScreen) return small;
  if (isMediumScreen) return medium;
  return large;
};

export const responsivePadding = (small: number, medium: number = small, large: number = medium) => {
  if (isSmallScreen) return small;
  if (isMediumScreen) return medium;
  return large;
};

export const responsiveMargin = (small: number, medium: number = small, large: number = medium) => {
  if (isSmallScreen) return small;
  if (isMediumScreen) return medium;
  return large;
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };

