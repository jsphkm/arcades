import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type View as ViewType,
} from "react-native";
import * as Linking from "expo-linking";
import { useIdentityAuth } from "identity-sdk";
import { arcade } from "../arcadeTheme";
import { config } from "../config";
import { useTheme } from "../theme-context";

const chrome = {
  light: {
    navActive: arcade.accentSoftHot,
    navActiveText: arcade.brand,
    border: arcade.border,
    surfaceElevated: arcade.surface,
    text: arcade.text,
    muted: arcade.muted,
    iconHover: arcade.hover,
    shadow: "rgba(0, 0, 0, 0.55)",
  },
  dark: {
    navActive: arcade.accentSoftHot,
    navActiveText: arcade.brand,
    border: arcade.border,
    surfaceElevated: arcade.surface,
    text: arcade.text,
    muted: arcade.muted,
    iconHover: arcade.hover,
    shadow: "rgba(0, 0, 0, 0.55)",
  },
} as const;

const radii = {
  popover: 10,
  pill: 100,
};

function initialFromEmail(email?: string): string {
  if (!email) return "A";
  const ch = email.trim().charAt(0);
  return ch ? ch.toUpperCase() : "A";
}

export function ProfileMenu() {
  const { scheme, typography } = useTheme();
  const colors = chrome[scheme];
  const fontFamily = typography.pixelFamily;
  const { session, signOut, ready } = useIdentityAuth();
  const { width: windowWidth } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 56, right: 12 });
  const triggerRef = useRef<ViewType | null>(null);
  const email = session?.email ?? "admin";
  const initial = initialFromEmail(session?.email);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const openMenu = () => {
    const node = triggerRef.current;
    if (node?.measureInWindow) {
      node.measureInWindow((x, y, w, h) => {
        setMenuPos({
          top: y + h + 8,
          right: Math.max(8, windowWidth - x - w),
        });
        setOpen(true);
      });
      return;
    }
    setOpen(true);
  };

  if (!ready || !session) return null;

  return (
    <View style={styles.root}>
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account menu"
          accessibilityState={{ expanded: open }}
          onPress={() => (open ? setOpen(false) : openMenu())}
          style={({ pressed }) => [
            styles.trigger,
            {
              backgroundColor:
                pressed || open ? colors.iconHover : "transparent",
            },
          ]}
        >
          <View
            style={[
              styles.triggerAvatar,
              {
                backgroundColor: colors.navActive,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={{
                fontFamily,
                fontSize: 10,
                color: colors.navActiveText,
              }}
            >
              {initial}
            </Text>
          </View>
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss account menu"
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.popover,
              {
                top: menuPos.top,
                right: menuPos.right,
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderRadius: radii.popover,
                boxShadow: `0 8px 28px ${colors.shadow}`,
              } as object,
            ]}
          >
            <View style={styles.topBar}>
              <View style={{ width: 32 }} />
              <Text
                style={{
                  flex: 1,
                  fontFamily,
                  fontSize: 8,
                  letterSpacing: 0.3,
                  color: colors.text,
                  textAlign: "center",
                }}
                numberOfLines={1}
              >
                {email}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close account menu"
                onPress={() => setOpen(false)}
                style={({ pressed }) => [
                  styles.closeBtn,
                  {
                    backgroundColor: pressed ? colors.iconHover : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily,
                    fontSize: 14,
                    lineHeight: 16,
                    color: colors.muted,
                  }}
                >
                  ×
                </Text>
              </Pressable>
            </View>

            <View style={styles.identity}>
              <View
                style={[
                  styles.avatarLg,
                  {
                    backgroundColor: colors.navActive,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily,
                    fontSize: 18,
                    color: colors.navActiveText,
                  }}
                >
                  {initial}
                </Text>
              </View>
            </View>

            <View style={styles.footerActions}>
              <Pressable
                onPress={() => {
                  setOpen(false);
                  const base = config.accountUrl();
                  if (!base) return;
                  // Force Account to retry Cognito silent SSO for this visit.
                  void Linking.openURL(`${base}/?sso=1`);
                }}
                style={({ pressed }) => [
                  styles.signOutBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: pressed
                      ? colors.iconHover
                      : colors.surfaceElevated,
                    borderRadius: radii.pill,
                    marginBottom: 8,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily,
                    fontSize: 9,
                    letterSpacing: 1,
                    color: colors.text,
                  }}
                >
                  ACCOUNT
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setOpen(false);
                  void signOut();
                }}
                style={({ pressed }) => [
                  styles.signOutBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: pressed
                      ? colors.iconHover
                      : "transparent",
                    borderRadius: radii.pill,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily,
                    fontSize: 9,
                    letterSpacing: 1,
                    color: colors.text,
                  }}
                >
                  SIGN OUT
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "relative",
  },
  trigger: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  triggerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalRoot: {
    flex: 1,
  },
  popover: {
    position: "absolute",
    width: 280,
    maxWidth: "92vw" as unknown as number,
    borderWidth: 1,
    overflow: "hidden",
    paddingBottom: 12,
    zIndex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingHorizontal: 8,
    minHeight: 36,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 6,
  },
  avatarLg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  footerActions: {
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  signOutBtn: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
});

