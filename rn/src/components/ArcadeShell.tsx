import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, usePathname, type Href } from "expo-router";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useIdentityAuth } from "identity-sdk";
import { arcade } from "../arcadeTheme";
import { arcadesAuthConfig } from "../auth/config";
import { USE_NATIVE_DRIVER } from "../platform";
import { useTheme } from "../theme-context";
import { GameList } from "./GameList";
import { ProfileMenu } from "./ProfileMenu";

type ArcadeShellProps = {
  children?: ReactNode;
  highScoresHref?: Href;
};

export const ARCADE_SIDEBAR_W = 280;

const OPEN_MS = 240;
const CLOSE_MS = 200;

type ShellChrome = {
  rail: string;
  shell: string;
  surface: string;
  text: string;
  muted: string;
  activeBg: string;
  activeHoverBg: string;
  activeText: string;
  hoverBg: string;
  pressedBg: string;
  focusRing: string;
  brand: string;
  scrim: string;
};

type ShellLayout = {
  sidebarW: number;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const ArcadeShellLayoutContext = createContext<ShellLayout>({
  sidebarW: 0,
  open: false,
  setOpen: () => {},
});

export function useArcadeShellLayout(): ShellLayout {
  return useContext(ArcadeShellLayoutContext);
}

const SHELL: ShellChrome = {
  rail: arcade.rail,
  shell: arcade.bg,
  surface: arcade.bg,
  text: arcade.text,
  muted: arcade.muted,
  activeBg: arcade.accentSoft,
  activeHoverBg: arcade.accentSoftHot,
  activeText: arcade.brand,
  hoverBg: arcade.hover,
  pressedBg: arcade.pressed,
  focusRing: "rgba(232,234,237,0.35)",
  brand: arcade.brand,
  scrim: arcade.scrim,
};

function MenuGlyph({ color }: { color: string }) {
  return (
    <View style={styles.menuGlyph} accessibilityElementsHidden>
      <View style={[styles.menuBar, { backgroundColor: color }]} />
      <View style={[styles.menuBar, { backgroundColor: color }]} />
      <View style={[styles.menuBar, { backgroundColor: color }]} />
    </View>
  );
}

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
          backgroundColor: pressed
            ? arcade.accentSoftHot
            : hovered
              ? arcade.accentSoft
              : "transparent",
          borderColor: arcade.brand,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: typography.pixelFamily,
          fontSize: 9,
          letterSpacing: 1,
          color: arcade.brand,
        }}
      >
        SIGN IN
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

function DrawerNav({
  c,
  fontFamily,
  onNavigate,
  scheme,
}: {
  c: ShellChrome;
  fontFamily: string;
  onNavigate: () => void;
  scheme: "light" | "dark";
}) {
  const [brandFocused, setBrandFocused] = useState(false);

  return (
    <>
      <Link href="/" asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Arcades home"
          onPress={onNavigate}
          onFocus={() => setBrandFocused(true)}
          onBlur={() => setBrandFocused(false)}
          style={({ pressed, hovered }) => [
            styles.brandRow,
            {
              backgroundColor: pressed
                ? c.pressedBg
                : hovered || brandFocused
                  ? c.hoverBg
                  : "transparent",
              cursor: "pointer" as const,
              outlineStyle: "solid" as const,
              outlineWidth: brandFocused ? 2 : 0,
              outlineColor: c.focusRing,
              outlineOffset: 2,
            },
          ]}
        >
          <Text
            style={{
              fontFamily,
              fontSize: 14,
              color: c.brand,
              letterSpacing: 1,
            }}
            numberOfLines={1}
          >
            ARCADES
          </Text>
        </Pressable>
      </Link>

      <GameList
        fontFamily={fontFamily}
        onNavigate={onNavigate}
        scheme={scheme}
        activeBg={c.activeBg}
        activeText={c.activeText}
        text={c.text}
      />
    </>
  );
}

export function ArcadeShell({ children, highScoresHref }: ArcadeShellProps) {
  const { scheme, typography } = useTheme();
  const c = SHELL;
  const authEnabled = arcadesAuthConfig() !== null;
  const fontFamily = typography.pixelFamily;
  const { width } = useWindowDimensions();
  const drawerW = Math.min(ARCADE_SIDEBAR_W, Math.max(240, width * 0.85));
  const compact = width < 640;

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const translateX = useRef(new Animated.Value(-drawerW)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const drawerWRef = useRef(drawerW);
  drawerWRef.current = drawerW;

  const close = useCallback(() => setOpen(false), []);
  const openDrawer = useCallback(() => setOpen(true), []);

  const layout = useMemo(
    () => ({ sidebarW: 0, open, setOpen }),
    [open],
  );

  const pathname = usePathname();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -drawerWRef.current,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(scrimOpacity, {
        toValue: 0,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [open, mounted, translateX, scrimOpacity]);

  useEffect(() => {
    if (!open || !mounted) return;
    translateX.setValue(-drawerWRef.current);
    scrimOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(scrimOpacity, {
        toValue: 1,
        duration: OPEN_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  }, [open, mounted, translateX, scrimOpacity]);

  return (
    <ArcadeShellLayoutContext.Provider value={layout}>
      <View style={[styles.root, { backgroundColor: c.shell }]}>
        <View
          style={[styles.mainWrap, compact && styles.mainWrapCompact]}
        >
          <View
            style={[
              styles.mainCard,
              { backgroundColor: c.surface },
              compact && styles.mainCardCompact,
            ]}
          >
            <View style={styles.mainToolbar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={open ? "Close menu" : "Open menu"}
                onPress={open ? close : openDrawer}
                style={({ pressed, hovered }) => [
                  styles.menuBtn,
                  (pressed || hovered) && { backgroundColor: c.hoverBg },
                ]}
              >
                <MenuGlyph color={c.text} />
              </Pressable>
              <Link href="/" asChild>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Arcades home"
                  style={({ pressed, hovered }) => [
                    styles.brandHeader,
                    (pressed || hovered) && { opacity: 0.75 },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily,
                      fontSize: 12,
                      color: c.brand,
                      letterSpacing: 1,
                    }}
                    numberOfLines={1}
                  >
                    ARCADES
                  </Text>
                </Pressable>
              </Link>
              <View style={styles.toolbarSpacer} />
              <View style={styles.toolbarActions}>
                {highScoresHref ? (
                  <Link href={highScoresHref} asChild>
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel="High scores"
                      style={({ pressed, hovered }) => [
                        styles.toolLink,
                        (pressed || hovered) && { backgroundColor: c.hoverBg },
                      ]}
                    >
                      <Text
                        style={{
                          fontFamily,
                          fontSize: 9,
                          letterSpacing: 1,
                          color: c.text,
                        }}
                      >
                        HIGH SCORES
                      </Text>
                    </Pressable>
                  </Link>
                ) : null}
                {authEnabled ? <AccountSlot /> : null}
              </View>
            </View>
            <View style={styles.mainBody}>{children}</View>
          </View>
        </View>

        {mounted ? (
          <View
            style={[styles.overlayRoot, { pointerEvents: "box-none" }]}
            accessibilityViewIsModal
          >
            <Animated.View
              style={[
                styles.scrim,
                { backgroundColor: c.scrim, opacity: scrimOpacity },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close menu"
                onPress={close}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <Animated.View
              style={[
                styles.drawer,
                {
                  width: drawerW,
                  backgroundColor: c.rail,
                  transform: [{ translateX }],
                },
              ]}
            >
              <DrawerNav
                c={c}
                fontFamily={fontFamily}
                onNavigate={close}
                scheme={scheme}
              />
            </Animated.View>
          </View>
        ) : null}
      </View>
    </ArcadeShellLayoutContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: "100%",
  },
  mainWrap: {
    flex: 1,
    padding: 8,
    minWidth: 0,
  },
  mainWrapCompact: {
    padding: 0,
  },
  mainCard: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  mainCardCompact: {
    borderRadius: 0,
  },
  mainToolbar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: 12,
    gap: 12,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menuGlyph: {
    width: 18,
    height: 14,
    justifyContent: "space-between",
  },
  menuBar: {
    height: 2,
    borderRadius: 1,
    width: "100%",
  },
  toolbarSpacer: { flex: 1 },
  toolbarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toolLink: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  mainBody: {
    flex: 1,
    minHeight: 0,
  },
  signInBtn: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayRoot: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    elevation: 1000,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 12,
    zIndex: 1001,
  },
  brandHeader: {
    minHeight: 40,
    paddingVertical: 6,
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 28,
    marginBottom: 36,
  },
});
