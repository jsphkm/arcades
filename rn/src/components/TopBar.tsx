import { Pressable, StyleSheet, Text, View } from "react-native";
import { useIdentityAuth } from "identity-sdk";
import { useTheme } from "../theme-context";
import { snakeAuthConfig } from "../auth/config";
import { ProfileMenu } from "./ProfileMenu";

function SignInButton({ onPress }: { onPress: () => void }) {
  const { typography } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sign In"
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.signInBtn,
        {
          backgroundColor: pressed ? "#2145e6" : hovered ? "#2f4de8" : "#3858e9",
        },
      ]}
    >
      <Text
        style={{
          fontFamily: typography.fontFamily,
          fontSize: 14,
          fontWeight: "600",
          color: "#ffffff",
        }}
      >
        Sign In
      </Text>
    </Pressable>
  );
}

function AccountSlot() {
  const { session, signIn, ready } = useIdentityAuth();

  if (!ready) return null;
  if (session) return <ProfileMenu />;
  return <SignInButton onPress={() => void signIn()} />;
}

export function TopBar() {
  const { colors, scheme, typography } = useTheme();
  const authEnabled = snakeAuthConfig() !== null;
  const titleColor = scheme === "dark" ? "#ffffff" : "#000000";

  return (
    <View
      style={[
        styles.toolbar,
        {
          backgroundColor: colors.page,
          zIndex: 1000,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: typography.fontFamily,
          fontSize: 18,
          fontWeight: "600",
          color: titleColor,
        }}
      >
        Snake
      </Text>
      <View style={styles.toolbarActions}>
        {authEnabled ? <AccountSlot /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    minHeight: 56,
    paddingVertical: 8,
    paddingHorizontal: 20,
    gap: 12,
  },
  toolbarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  signInBtn: {
    minHeight: 36,
    paddingHorizontal: 18,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
});
