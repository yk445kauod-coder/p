import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { useSettings } from "../../store/settings";
import { useFinePointer } from "../../theme/useReducedMotion";
import { onPointer, type Point } from "./pointer";
import { useI18n } from "../../i18n";

/**
 * Fahm, the TraceBook mascot.
 *
 * Uses the page-mascot fox sprite sheets: two 3x3 atlases (nine head directions
 * and nine reactions). The pointer's angle picks a direction cell; a tap plays a
 * reaction and then fires `onPress` so the caller can open the AI chat.
 *
 * Direction is one of nine discrete gazes, not a continuous value, so the
 * component only re-renders when the gaze actually changes — a moving cursor
 * costs a handful of renders instead of one per event.
 */

const SHEETS = {
  directions: require("../../../assets/mascots/fox-directions.webp"),
  reactions: require("../../../assets/mascots/fox-reactions.webp"),
};

const CLOCKWISE = [
  "right",
  "down-right",
  "down",
  "down-left",
  "left",
  "up-left",
  "up",
  "up-right",
] as const;
type Direction = (typeof CLOCKWISE)[number] | "center";

type Reaction =
  | "blink"
  | "heart"
  | "sparkle"
  | "surprised"
  | "wink"
  | "bashful"
  | "sleepy"
  | "dizzy"
  | "delighted";

/** Cell index inside a 3x3 atlas, laid out left-to-right, top-to-bottom. */
const DIRECTION_INDEX: Record<Direction, number> = {
  "up-left": 0,
  up: 1,
  "up-right": 2,
  left: 3,
  center: 4,
  right: 5,
  "down-left": 6,
  down: 7,
  "down-right": 8,
};

const REACTION_INDEX: Record<Reaction, number> = {
  blink: 0,
  heart: 1,
  sparkle: 2,
  surprised: 3,
  wink: 4,
  bashful: 5,
  sleepy: 6,
  dizzy: 7,
  delighted: 8,
};

const SECTOR = (Math.PI * 2) / CLOCKWISE.length;
const DEAD_ZONE = 64;

interface MascotProps {
  size?: number;
  onPress?: () => void;
  label?: string;
}

export function Mascot({ size = 116, onPress, label }: MascotProps) {
  const theme = useTheme();
  const c = theme.colors;
  const { reduceMotion } = useSettings();
  const finePointer = useFinePointer();
  const { t } = useI18n();

  const [direction, setDirection] = useState<Direction>("center");
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [box, setBox] = useState({ x: 0, y: 0, w: size, h: size });

  const [squash] = useState(() => new Animated.Value(0));
  const [bob] = useState(() => new Animated.Value(0));
  const wrapRef = useRef<View>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const boops = useRef({ count: 0, at: 0 });

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // Idle breathing, skipped entirely when reduced motion is on.
  useEffect(() => {
    if (reduceMotion) {
      bob.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, reduceMotion]);

  // Window coordinates (not parent-relative) so the gaze angle matches the
  // pointer, which is reported in window space.
  const measure = useCallback(() => {
    wrapRef.current?.measureInWindow((x, y, w, h) => {
      if (w && h) setBox({ x, y, w, h });
    });
  }, []);

  const onLayout = useCallback((_e: LayoutChangeEvent) => measure(), [measure]);

  useEffect(() => {
    // Touch-only devices have no cursor to follow, so the gaze stays centred
    // instead of jumping to wherever the last tap landed.
    if (!finePointer) return;

    const aim = (p: Point) => {
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      const dx = p.x - cx;
      const dy = p.y - cy;
      if (Math.hypot(dx, dy) < DEAD_ZONE) {
        setDirection("center");
        return;
      }
      const angle = Math.atan2(dy, dx);
      const idx = (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
      setDirection(CLOCKWISE[idx]);
    };

    return onPointer(aim);
  }, [box, finePointer]);

  const playReaction = useCallback(
    (r: Reaction, holdMs: number, next: Reaction | null, nextAfterMs?: number) => {
      setReaction(r);
      timers.current.push(
        setTimeout(() => {
          if (next) {
            setReaction(next);
            timers.current.push(setTimeout(() => setReaction(null), (nextAfterMs ?? 380) + 200));
          } else {
            setReaction(null);
          }
        }, holdMs),
      );
    },
    [],
  );

  const handlePress = useCallback(() => {
    clearTimers();
    const now = Date.now();
    const b = boops.current;
    b.count = now - b.at < 1600 ? b.count + 1 : 1;
    b.at = now;

    if (b.count >= 4) {
      b.count = 0;
      playReaction("dizzy", 1000, null);
    } else {
      const payoff: Reaction[] = ["heart", "sparkle", "delighted"];
      playReaction("blink", 110, payoff[(b.count - 1) % payoff.length], 420);
    }

    if (!reduceMotion) {
      squash.setValue(0);
      Animated.sequence([
        Animated.timing(squash, { toValue: 1, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(squash, { toValue: 2, duration: 150, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(squash, { toValue: 0, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start();
    }

    onPress?.();
  }, [clearTimers, playReaction, reduceMotion, squash, onPress]);

  const scaleY = squash.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 0.86, 1.06] });
  const scaleX = squash.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 1.1, 0.97] });
  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });

  // Touch-only devices keep a centred gaze; a coarse pointer is not a cursor.
  const shown = finePointer ? direction : "center";
  const dirCell = useMemo(() => DIRECTION_INDEX[shown], [shown]);
  const reactCell = REACTION_INDEX[reaction ?? "blink"];

  const cellStyle = (index: number) => ({
    left: -((index % 3) * size),
    top: -(Math.floor(index / 3) * size),
  });

  return (
    <Pressable
      ref={wrapRef as never}
      onLayout={onLayout}
      onPress={handlePress}
      onPressIn={measure}
      accessibilityRole="button"
      accessibilityLabel={label ?? t("ai.mascotLabel")}
      style={[styles.wrap, { width: size, height: size }]}
    >
      <Animated.View style={[styles.inner, { transform: [{ translateY }, { scaleX }, { scaleY }] }]}>
        <View style={styles.atlas}>
          <Image
            source={SHEETS.directions}
            style={[styles.sheet, cellStyle(dirCell), { opacity: reaction ? 0 : 1 }]}
            resizeMode="stretch"
          />
          <Image
            source={SHEETS.reactions}
            style={[styles.sheet, cellStyle(reactCell), { opacity: reaction ? 1 : 0 }]}
            resizeMode="stretch"
          />
        </View>
      </Animated.View>

      {/* Soft contact shadow so Fahm reads as perched, not floating. */}
      <View
        style={[
          styles.shadow,
          { backgroundColor: c.primary, width: size * 0.44, opacity: theme.mode === "dark" ? 0.18 : 0.12 },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "flex-end" },
  inner: { width: "100%", height: "100%", transformOrigin: "50% 78%" } as never,
  atlas: { flex: 1, width: "100%", height: "100%", overflow: "hidden" },
  sheet: { position: "absolute", width: "300%", height: "300%" },
  shadow: { position: "absolute", bottom: -2, height: 6, borderRadius: 999 },
});
