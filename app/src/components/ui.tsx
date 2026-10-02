import React, { useEffect, useState } from "react";
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text, TextInput } from "./Text";
import { useTheme } from "../theme/ThemeProvider";
import { useReducedMotion, useFinePointer } from "../theme/useReducedMotion";
import { focusRing } from "./layout";

const NATIVE = Platform.OS !== "web";

/* ── Card ─────────────────────────────────────────────────────────────────── */

export function Card({
  children,
  style,
  elevated,
  interactive,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  /** Adds hover/press feedback and makes the whole card a button. */
  interactive?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const c = theme.colors;
  const fine = useFinePointer();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [press] = useState(() => new Animated.Value(0));

  const shell: StyleProp<ViewStyle> = [
    styles.card,
    { backgroundColor: hovered && interactive ? c.surfaceHover : c.surface, borderColor: c.border },
    elevated ? theme.elevation.lg : theme.elevation.sm,
    focused && focusRing(c.primary),
    style,
  ];

  if (!interactive) {
    return <View style={shell}>{children}</View>;
  }

  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPointerEnter={fine ? () => setHovered(true) : undefined}
        onPointerLeave={fine ? () => setHovered(false) : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPressIn={() => press.setValue(1)}
        onPressOut={() => press.setValue(0)}
        style={shell}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/* ── Button ───────────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle" | "gradient" | "premium";
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
  const fine = useFinePointer();
  const [press] = useState(() => new Animated.Value(0));
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: c.primary, fg: c.onPrimary, border: "transparent" },
    secondary: { bg: c.surfaceAlt, fg: c.text, border: c.border },
    ghost: { bg: "transparent", fg: c.text, border: c.border },
    subtle: { bg: "transparent", fg: c.primary, border: "transparent" },
    danger: { bg: c.danger, fg: c.onPrimary, border: "transparent" },
    gradient: { bg: c.violet, fg: "#FFFFFF", border: "transparent" },
    premium: { bg: c.premium, fg: theme.mode === "dark" ? "#241B00" : "#FFFFFF", border: "transparent" },
  };
  const p = palette[variant];
  const dims = { sm: { h: 40, px: 14, fs: 13.5 }, md: { h: 50, px: 18, fs: 15.5 }, lg: { h: 58, px: 24, fs: 17 } }[size];

  const animate = (to: number) => {
    if (reduced) return;
    Animated.timing(press, { toValue: to, duration: theme.motion.fast, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }).start();
  };

  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });
  const gradient = variant === "gradient" ? theme.gradient.hero : null;

  const body = (
    <>
      {loading ? (
        <ActivityIndicator color={p.fg} size="small" />
      ) : (
        <>
          {icon}
          <Text style={{ color: p.fg, fontSize: dims.fs, fontWeight: "800" }}>{label}</Text>
        </>
      )}
    </>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth && { alignSelf: "stretch" }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animate(1)}
        onPressOut={() => animate(0)}
        onPointerEnter={fine ? () => setHovered(true) : undefined}
        onPointerLeave={fine ? () => setHovered(false) : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
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
          overflow: "hidden",
          backgroundColor: gradient ? "transparent" : p.bg,
          borderWidth: variant === "ghost" || variant === "secondary" ? 1 : 0,
          borderColor: p.border,
          opacity: disabled ? 0.45 : 1,
          // Hover darkens flat buttons; the gradient gets a translucent scrim.
          ...(hovered && !disabled
            ? gradient
              ? { shadowColor: c.violet, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 }
              : { opacity: 0.92 }
            : null),
        }}
      >
        {gradient ? (
          <LinearGradient
            colors={[gradient[0], gradient[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, focused && focusRing(c.primary)]}
          />
        ) : null}
        {focused && !gradient ? <View style={[StyleSheet.absoluteFill, focusRing(c.primary)]} /> : null}
        {body}
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
  sticker,
}: {
  text: string;
  tone?: "primary" | "accent" | "success" | "danger" | "neutral" | "premium";
  emoji?: string;
  /** Slightly rotated, hard-shadowed "sticker" look. */
  sticker?: boolean;
}) {
  const c = useTheme().colors;
  const map = {
    primary: { bg: c.primarySoft, fg: c.primary },
    accent: { bg: c.accentSoft, fg: c.accent },
    success: { bg: c.successSoft, fg: c.success },
    danger: { bg: c.dangerSoft, fg: c.danger },
    neutral: { bg: c.surfaceAlt, fg: c.textMuted },
    premium: { bg: c.premiumSoft, fg: c.premium },
  }[tone];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: map.bg },
        sticker && { borderWidth: 1, borderColor: map.fg, transform: [{ rotate: "-2.5deg" }] },
      ]}
    >
      {emoji ? <Text style={{ fontSize: 12 }}>{emoji}</Text> : null}
      <Text style={[styles.badgeText, { color: map.fg }]}>{text}</Text>
    </View>
  );
}

/* ── Chip ─────────────────────────────────────────────────────────────────── */

/** Selectable pill used for filters, goals and weekday pickers. */
export function Chip({
  label,
  emoji,
  selected,
  onPress,
  tone = "primary",
  accessibilityLabel,
}: {
  label: string;
  emoji?: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: "primary" | "accent";
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const c = theme.colors;
  const fine = useFinePointer();
  const [hovered, setHovered] = useState(false);
  const active = selected ? (tone === "accent" ? c.accent : c.primary) : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: Boolean(selected) }}
      onPointerEnter={fine ? () => setHovered(true) : undefined}
      onPointerLeave={fine ? () => setHovered(false) : undefined}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: active ?? c.border,
          backgroundColor: active ? (tone === "accent" ? c.accentSoft : c.primarySoft) : hovered ? c.surfaceHover : "transparent",
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      {emoji ? <Text style={{ fontSize: 15 }}>{emoji}</Text> : null}
      <Text style={{ color: active ?? c.textMuted, fontSize: 13, fontWeight: "700" }}>{label}</Text>
    </Pressable>
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
  const fine = useFinePointer();
  const [hovered, setHovered] = useState<T | null>(null);
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
            onPointerEnter={fine ? () => setHovered(o.value) : undefined}
            onPointerLeave={fine ? () => setHovered(null) : undefined}
            style={[
              styles.segmentItem,
              { borderRadius: theme.radius.sm },
              active
                ? [{ backgroundColor: c.surface }, theme.elevation.sm]
                : hovered === o.value && { backgroundColor: c.surfaceHover },
            ]}
          >
            <Text style={{ color: active ? c.text : c.textMuted, fontWeight: "800", fontSize: 13.5 }}>
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
  card: { borderRadius: 24, borderWidth: 1.5, padding: 18 },
  input: { borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  inputMultiline: { minHeight: 84, textAlignVertical: "top", paddingTop: 12 },
  label: { fontSize: 12.5, fontWeight: "700", marginBottom: 6 },
  help: { fontSize: 12, marginTop: 5 },
  track: { overflow: "hidden" },
  fill: { height: "100%" },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: "800" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  segment: { flexDirection: "row", padding: 4, gap: 4 },
  segmentItem: { flex: 1, paddingVertical: 9, alignItems: "center" },
  statTile: { flex: 1, alignItems: "center", paddingVertical: 16, paddingHorizontal: 8, gap: 2 },
  statValue: { fontSize: 24, fontWeight: "900" },
  statLabel: { fontSize: 11.5, textAlign: "center" },
});
