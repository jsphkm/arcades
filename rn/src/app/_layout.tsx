import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { IdentityAuthProvider } from "identity-sdk";
import { ThemeProvider, useTheme } from "../theme-context";
import { arcadesAuthConfig } from "../auth/config";

function ThemedStack() {
  const { colors } = useTheme();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.page);
  }, [colors.page]);

  return (
    <>
      <StatusBar style={colors.statusBar} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.page },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const authConfig = arcadesAuthConfig();

  return (
    <ThemeProvider>
      {authConfig ? (
        <IdentityAuthProvider config={authConfig}>
          <ThemedStack />
        </IdentityAuthProvider>
      ) : (
        <ThemedStack />
      )}
    </ThemeProvider>
  );
}
