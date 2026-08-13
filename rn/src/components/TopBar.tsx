import { Link, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useIdentityAuth } from "identity-sdk";
import { useTheme } from "../theme-context";
import { arcadesAuthConfig } from "../auth/config";
import { ProfileMenu } from "./ProfileMenu";

type TopBarProps = {
  /** Product brand in the bar. */
  title?: string;
  /** When set, show a High scores link (Snake routes). */
  highScoresHref?: Href;
};

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

export function TopBar({
  title = "Arcades",
  highScoresHref,
}: TopBarProps = {}) {
  const { colors, scheme, typography } = useTheme();
  const authEnabled = arcadesAuthConfig() !== null;
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
      <Link href="/" asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Arcades home"
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Text
            style={{
              fontFamily: typography.fontFamily,
              fontSize: 18,
              fontWeight: "600",
              color: titleColor,
            }}
          >
            {title}
          </Text>
        </Pressable>
      </Link>
      <View style={styles.toolbarActions}>
        {highScoresHref ? (
          <Link href={highScoresHref} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="High scores"
              style={({ pressed }) => [
                styles.navLink,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text
                style={{
                  fontFamily: typography.fontFamily,
                  fontSize: 14,
                  fontWeight: "600",
                  color: titleColor,
                }}
              >
                High scores
              </Text>
            </Pressable>
          </Link>
        ) : null}
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
    gap: 12,
  },
  navLink: {
    minHeight: 36,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  signInBtn: {
    minHeight: 36,
    paddingHorizontal: 18,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
});
