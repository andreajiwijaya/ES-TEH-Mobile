import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View } from "react-native";

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F0F4F8' }}>
      {/* StatusBar Transparan & Dark Content */}
      <StatusBar style="dark" backgroundColor="transparent" translucent />

      {/* Stack Navigator */}
      <Stack 
        screenOptions={{ 
          headerShown: false,
          // Background konsisten
          contentStyle: { backgroundColor: '#F0F4F8' }, 
          // FIX: Gunakan 'default' (bukan 'ios') untuk animasi standar native
          animation: 'default', 
        }}
      >
        {/* Entry Point */}
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="splash" options={{ animation: 'none' }} />
        
        {/* Group Routes (Modul Aplikasi) */}
        {/* Gunakan animasi 'fade' untuk perpindahan antar Role agar lebih smooth */}
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(employee)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(owner)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(warehouse)" options={{ animation: 'fade' }} />
      </Stack>
    </View>
  );
}