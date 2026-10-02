import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { useReducedMotion } from "../../theme/useReducedMotion";
import { AnimatedEmoji } from "./AnimatedEmoji";

const NATIVE = Platform.OS !== "web";

export type ToastTone = "neutral" | "success" | "error";
export interface ToastOptions {
  emoji?: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
  message: string;
}

const ToastContext = createContext<{ show: (message: string, opts?: ToastOptions) => void } | null>(null);

/** Lightweight toast host. Mounted once at the app root, above all screens. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const show = useCallback((message: string, opts?: ToastOptions) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, message, ...opts }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts?.duration ?? 2600);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.stack}>
          {toasts.map((t) => (
            <ToastView key={t.id} toast={t} />
          ))}
        </View>
      </View>
    </ToastContext.Provider>
  );
}

function ToastView({ toast }: { toast: ToastItem }) {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [t] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: reduced ? 0 : theme.motion.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start();
  }, [reduced, t, theme.motion.base]);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  const toneColor =
    toast.tone === "success" ? c.success : toast.tone === "error" ? c.danger : c.text;
  const toneSoft =
    toast.tone === "success" ? c.successSoft : toast.tone === "error" ? c.dangerSoft : c.surfaceAlt;

  return (
    <Animated.View
      style={[
        styles.toast,
        theme.shadowLg,
        {
          backgroundColor: c.bgElevated,
          borderColor: c.border,
          opacity: t,
          transform: [{ translateY }, { scale }],
          marginBottom: insets.bottom + 96,
        },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      {toast.emoji ? (
        <AnimatedEmoji size={20} trigger={toast.id}>
          {toast.emoji}
        </AnimatedEmoji>
      ) : (
        <View style={[styles.dot, { backgroundColor: toneSoft, borderColor: toneColor }]} />
      )}
      <Text style={[styles.text, { color: c.text }]} numberOfLines={2}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return (
    ctx ?? {
      show: () => {
        /* no provider mounted */
      },
    }
  );
}

const styles = StyleSheet.create({
  stack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    gap: 8,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: 420,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  text: { fontSize: 14, fontWeight: "600", flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
});
