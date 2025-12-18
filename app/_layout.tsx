import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View } from "react-native";
// Import Colors dihapus karena tidak digunakan

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      {/* StatusBar: Mengatur warna ikon baterai/jam di atas HP */}
      <StatusBar style="dark" backgroundColor="transparent" />

      {/* Stack: Tumpukan halaman aplikasi */}
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="splash" options={{ animation: 'none' }} />
        
        {/* Group Routes */}
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(employee)" />
        <Stack.Screen name="(owner)" />
        <Stack.Screen name="(warehouse)" />
      </Stack>
    </View>
  );
}