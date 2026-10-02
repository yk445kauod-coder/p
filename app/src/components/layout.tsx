import React, { useCallback, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useFinePointer } from "../theme/useReducedMotion";

const WEB = Platform.OS === "web";

/** Viewport class derived from `theme.breakpoints`. */
export interface Responsive {
  width: number;
  /** True below `breakpoints.md` - the phone layout. */
  compact: boolean;
  /** True at/above `breakpoints.lg` - room for a rail/side chrome. */
  wide: boolean;
  /** Horizontal gutter for the content column. */
  gutter: number;
}

export function useResponsive(): Responsive {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const bp = theme.breakpoints;
  const compact = width < bp.md;
  const wide = width >= bp.lg;
  return {
    width,
    compact,
    wide,
    gutter: compact ? 16 : 28,
  };
}

/**
 * The one scrollable, centred content column every screen sits in.
 *
 * On a phone it is edge-to-edge with a comfortable gutter; on a desktop it is
 * capped at `theme.container.content` so text never stretches into unreadable
 * lines. `bottomInset` leaves room for the floating chrome (tab bar / FAB).
 */
export function Screen({
  children,
  contentStyle,
  style,
  bottomInset = 150,
  topExtra = 14,
  scroll = true,
}: {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** Extra bottom padding so floating chrome never covers the last row. */
  bottomInset?: number;
  topExtra?: number;
  scroll?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { gutter } = useResponsive();

  const inner: StyleProp<ViewStyle> = [
    {
      width: "100%",
      maxWidth: theme.container.content,
      alignSelf: "center",
      paddingTop: insets.top + topExtra,
      paddingBottom: insets.bottom + bottomInset,
      paddingHorizontal: gutter,
    },
    contentStyle,
  ];

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: theme.colors.bg }, style]}>
        <View style={[{ flex: 1 }, inner]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: theme.colors.bg }, style]}>
      <ScrollView
        contentContainerStyle={inner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** Vertical rhythm wrapper for a titled block inside a `Screen`. */
export function Section({
  children,
  style,
  gap = 12,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  return <View style={[{ marginTop: 22, gap }, style]}>{children}</View>;
}

/** Wraps an absolutely positioned overlay so it stays inside the content column. */
export function ChromeSlot({
  children,
  style,
  align = "left",
  offset = 16,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  align?: "left" | "right";
  offset?: number;
}) {
  const theme = useTheme();
  const { width, gutter } = useResponsive();
  // Keep floating chrome aligned to the content column edge once the viewport is
  // wider than the column, instead of pinning it to the window edge.
  const columnWidth = Math.min(width, theme.container.content);
  const edge = Math.max(gutter, (width - columnWidth) / 2 + gutter);
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.chrome,
        align === "left" ? { left: edge } : { right: edge },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Adds a hover state on devices with a fine pointer and exposes it to children.
 *
 * `onHoverIn`/`onHoverOut` exist on react-native-web but are absent from the
 * native types, so they are applied through a cast and only when a real mouse
 * is present - touch devices never pay for the extra state.
 */
export function Hoverable({
  children,
  style,
  hoverStyle,
  onHoverIn,
  onHoverOut,
  disabled,
  ...rest
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Style merged in while hovered. */
  hoverStyle?: StyleProp<ViewStyle>;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  disabled?: boolean;
} & Omit<React.ComponentProps<typeof View>, "style" | "children">) {
  const fine = useFinePointer();
  const [hovered, setHovered] = useState(false);

  const enter = useCallback(() => {
    setHovered(true);
    onHoverIn?.();
  }, [onHoverIn]);
  const leave = useCallback(() => {
    setHovered(false);
    onHoverOut?.();
  }, [onHoverOut]);

  if (!fine || disabled) {
    return (
      <View style={style} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <View
      style={[style, hovered && hoverStyle]}
      onPointerEnter={enter}
      onPointerLeave={leave}
      {...rest}
    >
      {children}
    </View>
  );
}

/** Imperative hover state for callers that need to drive their own styles. */
export function useHover(): { hovered: boolean; bind: { onPointerEnter: () => void; onPointerLeave: () => void } } {
  const fine = useFinePointer();
  const [hovered, setHovered] = useState(false);
  const bind = {
    onPointerEnter: () => fine && setHovered(true),
    onPointerLeave: () => setHovered(false),
  };
  return { hovered: fine && hovered, bind };
}

/**
 * Pressable row with a real hover wash and a keyboard focus ring on web.
 *
 * Used for list rows and cards that act as buttons, so the whole app gets
 * consistent affordances rather than each screen inventing its own.
 */
export function InteractiveRow({
  children,
  onPress,
  style,
  accessibilityLabel,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const fine = useFinePointer();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPointerEnter={fine ? () => setHovered(true) : undefined}
      onPointerLeave={fine ? () => setHovered(false) : undefined}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        style,
        hovered && { backgroundColor: theme.colors.surfaceHover },
        pressed && { backgroundColor: theme.colors.surfaceAlt, transform: [{ scale: 0.995 }] },
        focused && focusRing(theme.colors.primary),
      ]}
    >
      {children}
    </Pressable>
  );
}

/** Keyboard focus ring — a real outline on web, a border on native. */
export function focusRing(color: string): ViewStyle {
  return WEB
    ? ({ outlineStyle: "solid", outlineWidth: 2, outlineColor: color, outlineOffset: 2 } as unknown as ViewStyle)
    : { borderWidth: 2, borderColor: color };
}

const styles = StyleSheet.create({
  chrome: { position: "absolute" },
});
