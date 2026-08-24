import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { IdentityAuthProvider } from "identity-sdk";
import { arcade } from "../arcadeTheme";
import { ThemeProvider } from "../theme-context";
import { arcadesAuthConfig } from "../auth/config";

function ThemedStack() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(arcade.bg);
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: arcade.bg },
          fullScreenGestureEnabled: false,
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const authConfig = arcadesAuthConfig();

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        {authConfig ? (
          <IdentityAuthProvider config={authConfig}>
            <ThemedStack />
          </IdentityAuthProvider>
        ) : (
          <ThemedStack />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
