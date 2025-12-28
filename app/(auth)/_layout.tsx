import { Stack } from 'expo-router';

export default function AuthLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + spacing.lg;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}