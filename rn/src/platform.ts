import { Platform } from "react-native";

/** Native driver is unavailable on web — avoid the Animated fallback warning. */
export const USE_NATIVE_DRIVER = Platform.OS !== "web";
