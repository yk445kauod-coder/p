import React, { useEffect, useState } from "react";
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { Text, TextInput } from "./Text";
import { useTheme } from "../theme/ThemeProvider";
import { useReducedMotion } from "../theme/useReducedMotion";

const NATIVE = Platform.OS !== "web";

/* ── Card ─────────────────────────────────────────────────────────────────── */

export function Card({
  children,
  style,
  elevated,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        elevated ? theme.shadowLg : theme.shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ── Button ───────────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type ButtonSize = "sm" | "md" | "lg";

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  icon,
  fullWidth,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const c = theme.colors;
  const reduced = useReducedMotion();
  const [press] = useState(() => new Animated.Value(0));

  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: c.primary, fg: c.onPrimary, border: "transparent" },
    secondary: { bg: c.surfaceAlt, fg: c.text, border: c.border },
    ghost: { bg: "transparent", fg: c.text, border: c.border },
    subtle: { bg: "transparent", fg: c.primary, border: "transparent" },
    danger: { bg: c.danger, fg: c.onPrimary, border: "transparent" },
  };
  const p = palette[variant];
  const dims = { sm: { h: 40, px: 14, fs: 13.5 }, md: { h: 50, px: 18, fs: 15.5 }, lg: { h: 56, px: 22, fs: 16.5 } }[size];

  const animate = (to: number) => {
    if (reduced) return;
    Animated.timing(press, { toValue: to, duration: theme.motion.fast, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }).start();
  };

  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] });

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth && { alignSelf: "stretch" }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animate(1)}
        onPressOut={() => animate(0)}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
        style={{
          height: dims.h,
          paddingHorizontal: dims.px,
          borderRadius: theme.radius.md,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          backgroundColor: p.bg,
          borderWidth: variant === "ghost" || variant === "secondary" ? 1 : 0,
          borderColor: p.border,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color={p.fg} size="small" />
        ) : (
          <>
            {icon}
            <Text style={{ color: p.fg, fontSize: dims.fs, fontWeight: "700" }}>{label}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

/* ── Input ────────────────────────────────────────────────────────────────── */

export function Input({
  label,
  error,
  hint,
  style,
  ...props
}: TextInputProps & { label?: string; error?: string | null; hint?: string; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const c = theme.colors;
  const borderColor = error ? c.danger : c.border;

  return (
    <View style={style}>
      {label ? <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text> : null}
      <TextInput
        {...props}
        placeholderTextColor={props.placeholderTextColor ?? c.textFaint}
        style={[
          styles.input,
          { color: c.text, borderColor, backgroundColor: c.surface, borderRadius: theme.radius.md },
          props.multiline ? styles.inputMultiline : null,
        ]}
        accessibilityLabel={label ?? props.placeholder}
      />
      {error ? (
        <Text style={[styles.help, { color: c.danger }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.help, { color: c.textFaint }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

/* ── ProgressBar ──────────────────────────────────────────────────────────── */

export function ProgressBar({
  value,
  color,
  height = 9,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const pct = Math.max(0, Math.min(1, value || 0));
  const [w] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(w, {
      toValue: pct,
      duration: reduced ? 0 : theme.motion.slow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, reduced, theme.motion.slow, w]);

  const width = w.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View
      style={[styles.track, { backgroundColor: theme.colors.surfaceAlt, height, borderRadius: height }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
    >
      <Animated.View
        style={[styles.fill, { width, backgroundColor: color ?? theme.colors.primary, borderRadius: height }]}
      />
    </View>
  );
}

/* ── Badge ────────────────────────────────────────────────────────────────── */

export function Badge({
  text,
  tone = "primary",
  emoji,
}: {
  text: string;
  tone?: "primary" | "accent" | "success" | "danger" | "neutral";
  emoji?: string;
}) {
  const c = useTheme().colors;
  const map = {
    primary: { bg: c.primarySoft, fg: c.primary },
    accent: { bg: c.accentSoft, fg: c.accent },
    success: { bg: c.successSoft, fg: c.success },
    danger: { bg: c.dangerSoft, fg: c.danger },
    neutral: { bg: c.surfaceAlt, fg: c.textMuted },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      {emoji ? <Text style={{ fontSize: 12 }}>{emoji}</Text> : null}
      <Text style={[styles.badgeText, { color: map.fg }]}>{text}</Text>
    </View>
  );
}

/* ── SectionTitle ─────────────────────────────────────────────────────────── */

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{children}</Text>
      {right}
    </View>
  );
}

/* ── SegmentedControl ─────────────────────────────────────────────────────── */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <View style={[styles.segment, { backgroundColor: c.surfaceAlt, borderRadius: theme.radius.md }, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              styles.segmentItem,
              { borderRadius: theme.radius.sm },
              active && { backgroundColor: c.surface },
            ]}
          >
            <Text style={{ color: active ? c.text : c.textMuted, fontWeight: "700", fontSize: 13.5 }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */

export function Skeleton({ width, height = 14, radius = 8, style }: { width?: number | string; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [shimmer] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
        Animated.timing(shimmer, { toValue: 0.4, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, shimmer]);

  return (
    <Animated.View
      style={[
        { width: width as never, height, borderRadius: radius, backgroundColor: theme.colors.surfaceAlt, opacity: shimmer },
        style,
      ]}
    />
  );
}

/* ── Separator ────────────────────────────────────────────────────────────── */

export function Separator({ style }: { style?: StyleProp<ViewStyle> }) {
  const c = useTheme().colors;
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }, style]} />;
}

/* ── StatTile ─────────────────────────────────────────────────────────────── */

export function StatTile({
  label,
  value,
  emoji,
  tone,
  style,
}: {
  label: string;
  value: string;
  emoji?: string;
  tone?: "primary" | "accent";
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme().colors;
  return (
    <Card style={[styles.statTile, style]}>
      {emoji ? <Text style={{ fontSize: 18 }}>{emoji}</Text> : null}
      <Text style={[styles.statValue, { color: tone === "accent" ? c.accent : c.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.textMuted }]}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 18 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  inputMultiline: { minHeight: 84, textAlignVertical: "top", paddingTop: 12 },
  label: { fontSize: 12.5, fontWeight: "600", marginBottom: 6 },
  help: { fontSize: 12, marginTop: 5 },
  track: { overflow: "hidden" },
  fill: { height: "100%" },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  segment: { flexDirection: "row", padding: 4, gap: 4 },
  segmentItem: { flex: 1, paddingVertical: 9, alignItems: "center" },
  statTile: { flex: 1, alignItems: "center", paddingVertical: 16, paddingHorizontal: 8, gap: 2 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11.5, textAlign: "center" },
});
