import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type View as ViewType,
} from "react-native";
import { useIdentityAuth } from "identity-sdk";
import { useTheme } from "../theme-context";

const chrome = {
  light: {
    navActive: "#d3e3fd",
    navActiveText: "#041e49",
    border: "#c8c8c8",
    surfaceElevated: "#dcdcdc",
    text: "#000000",
    muted: "#555555",
    iconHover: "rgba(0, 0, 0, 0.1)",
    shadow: "rgba(0, 0, 0, 0.22)",
  },
  dark: {
    navActive: "#0842a0",
    navActiveText: "#d3e3fd",
    border: "#3a3a3a",
    surfaceElevated: "#2a2a2a",
    text: "#eeeeee",
    muted: "#aaaaaa",
    iconHover: "rgba(238, 238, 238, 0.12)",
    shadow: "rgba(0, 0, 0, 0.5)",
  },
} as const;

const radii = {
  popover: 28,
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
  const fontFamily = typography.fontFamily;
  const { session, signOut, ready } = useIdentityAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<ViewType | null>(null);
  const email = session?.email ?? "admin";
  const initial = initialFromEmail(session?.email);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const onPointer = (event: MouseEvent) => {
      const node = rootRef.current as unknown as {
        contains?: (n: Node) => boolean;
      } | null;
      const target = event.target as Node | null;
      if (node?.contains && target && !node.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!ready || !session) return null;

  return (
    <View
      ref={rootRef}
      {...({ className: "ic-chrome-menu" } as object)}
      style={[styles.root, { zIndex: 1001 }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Account menu"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
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
              fontSize: 14,
              fontWeight: "600",
              color: colors.navActiveText,
            }}
          >
            {initial}
          </Text>
        </View>
      </Pressable>

      {open ? (
        <View
          style={[
            styles.popover,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              borderRadius: radii.popover,
              boxShadow: `0 8px 28px ${colors.shadow}`,
            } as object,
          ]}
        >
          <View style={styles.topBar}>
            <View style={{ width: 40 }} />
            <Text
              style={{
                flex: 1,
                fontFamily,
                fontSize: 13,
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
                { backgroundColor: pressed ? colors.iconHover : "transparent" },
              ]}
            >
              <Text
                style={{
                  fontFamily,
                  fontSize: 22,
                  lineHeight: 24,
                  color: colors.muted,
                  fontWeight: "300",
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
                  fontSize: 32,
                  fontWeight: "600",
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
                void signOut();
              }}
              style={({ pressed }) => [
                styles.signOutBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.iconHover : "transparent",
                  borderRadius: radii.pill,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily,
                  fontSize: 14,
                  fontWeight: "500",
                  color: colors.text,
                }}
              >
                Sign out
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
  popover: {
    position: "absolute",
    top: 48,
    right: 0,
    width: 354,
    maxWidth: "92vw" as unknown as number,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 1002,
    paddingBottom: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    paddingHorizontal: 8,
    minHeight: 44,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 8,
  },
  avatarLg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  footerActions: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  signOutBtn: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
});
