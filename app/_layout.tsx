import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, TextInput } from 'react-native';

export default function RootLayout() {
  // Matikan scaling font dari OS agar ukuran teks konsisten
  useEffect(() => {
    (Text as any).defaultProps = (Text as any).defaultProps || {};
    (Text as any).defaultProps.allowFontScaling = false;
    (TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
    (TextInput as any).defaultProps.allowFontScaling = false;
  }, []);

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