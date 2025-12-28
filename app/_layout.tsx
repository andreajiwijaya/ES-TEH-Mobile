import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
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
          <Stack.Screen name="(kasir)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(owner)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(gudang)" options={{ animation: 'fade' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}