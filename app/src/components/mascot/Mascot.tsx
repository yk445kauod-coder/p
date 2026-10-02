import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from "react-native-svg";
import { useTheme } from "../../theme/ThemeProvider";
import { useSettings } from "../../store/settings";
import { useFinePointer } from "../../theme/useReducedMotion";
import { onPointer, type Point } from "./pointer";
import { useI18n } from "../../i18n";

/**
 * Fahm, the TraceBook mascot.
 *
 * A bookmark that came to life: a tall silhouette with a notched tail, drawn in
 * SVG so it inherits the theme palette and stays crisp at any size. It leans and
 * looks toward the cursor, blinks, and plays a reaction when tapped — which is
 * also the shortcut into the AI chat.
 *
 * Direction is one of nine discrete gazes, not a continuous value: the component
 * only re-renders when the gaze actually changes, so a moving cursor costs a
 * handful of renders instead of one per event.
 */

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
  | "happy"
  | "thinking"
  | "sleepy"
  | "dizzy";

const SECTOR = (Math.PI * 2) / CLOCKWISE.length;
const DEAD_ZONE = 64;

/** Pupil offset in SVG units for each gaze. */
const GAZE: Record<Direction, { x: number; y: number }> = {
  center: { x: 0, y: 0 },
  up: { x: 0, y: -1.5 },
  down: { x: 0, y: 1.5 },
  left: { x: -1.5, y: 0 },
  right: { x: 1.5, y: 0 },
  "up-left": { x: -1.1, y: -1.1 },
  "up-right": { x: 1.1, y: -1.1 },
  "down-left": { x: -1.1, y: 1.1 },
  "down-right": { x: 1.1, y: 1.1 },
};

/** How far the body leans toward the cursor, in degrees. */
const LEAN: Record<Direction, number> = {
  center: 0,
  up: 0,
  down: 0,
  left: -5,
  right: 5,
  "up-left": -3.5,
  "up-right": 3.5,
  "down-left": -4,
  "down-right": 4,
};

type EyeShape = "open" | "closed" | "happy" | "wide" | "dizzy";

interface FaceState {
  eye: EyeShape;
  /** Overrides the gaze for reactions that look away on purpose. */
  gaze?: { x: number; y: number };
  /** The left eye closes for a wink. */
  wink?: boolean;
  mouth: "smile" | "grin" | "o" | "small";
  cheeks: boolean;
  extra: "none" | "hearts" | "sparkles" | "dots" | "zzz" | "swirl";
}

const REACTIONS: Record<Reaction, FaceState> = {
  blink: { eye: "closed", mouth: "smile", cheeks: false, extra: "none" },
  heart: { eye: "happy", mouth: "grin", cheeks: true, extra: "hearts" },
  sparkle: { eye: "happy", mouth: "grin", cheeks: true, extra: "sparkles" },
  surprised: { eye: "wide", mouth: "o", cheeks: false, extra: "none" },
  wink: { eye: "open", wink: true, mouth: "grin", cheeks: true, extra: "none" },
  happy: { eye: "happy", mouth: "grin", cheeks: true, extra: "none" },
  thinking: { eye: "open", gaze: { x: 0, y: -1.7 }, mouth: "small", cheeks: false, extra: "dots" },
  sleepy: { eye: "closed", mouth: "small", cheeks: false, extra: "zzz" },
  dizzy: { eye: "dizzy", mouth: "o", cheeks: false, extra: "swirl" },
};

const IDLE_FACE: FaceState = { eye: "open", mouth: "smile", cheeks: false, extra: "none" };

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
      const payoff: Reaction[] = ["heart", "sparkle", "happy"];
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

  // Touch-only devices keep a centred gaze; a coarse pointer is not a cursor.
  const shown = finePointer ? direction : "center";
  const face = reaction ? REACTIONS[reaction] : IDLE_FACE;
  const gaze = face.gaze ?? GAZE[shown];

  const scaleY = squash.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 0.88, 1.05] });
  const scaleX = squash.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 1.08, 0.98] });
  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -2.5] });
  const lean = reduceMotion ? 0 : LEAN[shown];

  // useId keeps the SVG gradient reference unique and stable across renders.
  const gradientId = `fahm${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

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
      <Animated.View
        style={[styles.inner, { transform: [{ translateY }, { scaleX }, { scaleY }, { rotate: `${lean}deg` }] }]}
      >
        <Svg width={size} height={size} viewBox="0 0 64 72">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.primary} />
              <Stop offset="1" stopColor={c.accent} />
            </LinearGradient>
          </Defs>

          {/* Bookmark body: rounded top, notched tail. */}
          <Path d="M25 8 Q20 8 20 13 L20 65 L32 54 L44 65 L44 13 Q44 8 39 8 Z" fill={`url(#${gradientId})`} />

          {/* Ribbon hole. */}
          <Circle cx={32} cy={16} r={3.1} fill={c.bgElevated} opacity={0.92} />

          <Face face={face} gaze={gaze} />
          <Extras extra={face.extra} />
        </Svg>
      </Animated.View>

      {/* Soft contact shadow so the bookmark reads as resting, not floating. */}
      <View
        style={[
          styles.shadow,
          { backgroundColor: c.primary, width: size * 0.42, opacity: theme.mode === "dark" ? 0.18 : 0.12 },
        ]}
      />
    </Pressable>
  );
}

/** Eyes and mouth, laid out to match the gaze and reaction. */
function Face({ face, gaze }: { face: FaceState; gaze: { x: number; y: number } }) {
  const c = useTheme().colors;
  const eyeY = 30;
  const leftX = 26;
  const rightX = 38;

  return (
    <G>
      {/* Cheeks sit under the eyes so a grin reads at a glance. */}
      {face.cheeks ? (
        <>
          <Circle cx={19.5} cy={37} r={3.1} fill={c.bgElevated} opacity={0.34} />
          <Circle cx={44.5} cy={37} r={3.1} fill={c.bgElevated} opacity={0.34} />
        </>
      ) : null}

      <Eye x={leftX} y={eyeY} shape={face.wink ? "closed" : face.eye} gaze={gaze} />
      <Eye x={rightX} y={eyeY} shape={face.eye} gaze={gaze} />

      <Mouth kind={face.mouth} />
    </G>
  );
}

function Eye({ x, y, shape, gaze }: { x: number; y: number; shape: EyeShape; gaze: { x: number; y: number } }) {
  const c = useTheme().colors;

  if (shape === "closed" || shape === "happy") {
    // A downward-opening arc reads as a closed or smiling eye.
    const lift = shape === "happy" ? 1.2 : 0.4;
    return (
      <Path
        d={`M${x - 4.6} ${y + lift} Q${x} ${y - 3.6} ${x + 4.6} ${y + lift}`}
        stroke={c.bgElevated}
        strokeWidth={2.1}
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  if (shape === "dizzy") {
    return (
      <Path
        d={`M${x - 3.6} ${y - 3.2} Q${x + 1.4} ${y} ${x - 3.6} ${y + 3.2} Q${x - 7} ${y} ${x - 3.6} ${y - 3.2}`}
        stroke={c.bgElevated}
        strokeWidth={1.7}
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  const r = shape === "wide" ? 6.6 : 5.6;
  const pupil = shape === "wide" ? 2.1 : 2.5;

  return (
    <G>
      <Circle cx={x} cy={y} r={r} fill={c.bgElevated} />
      <Circle cx={x + gaze.x} cy={y + gaze.y} r={pupil} fill={c.text} />
      <Circle cx={x + gaze.x + 0.9} cy={y + gaze.y - 0.9} r={0.85} fill={c.bgElevated} />
    </G>
  );
}

function Mouth({ kind }: { kind: FaceState["mouth"] }) {
  const c = useTheme().colors;
  if (kind === "o") {
    return <Circle cx={32} cy={44} r={3.4} fill={c.text} opacity={0.72} />;
  }
  if (kind === "grin") {
    return (
      <Path d="M26 42 Q32 49.5 38 42" stroke={c.text} strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.8} />
    );
  }
  if (kind === "small") {
    return (
      <Path d="M29.5 43.5 Q32 45.5 34.5 43.5" stroke={c.text} strokeWidth={1.9} strokeLinecap="round" fill="none" opacity={0.7} />
    );
  }
  return <Path d="M27.5 42.5 Q32 46.5 36.5 42.5" stroke={c.text} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.72} />;
}

/** Reaction flourishes drawn around the head. */
function Extras({ extra }: { extra: FaceState["extra"] }) {
  const c = useTheme().colors;
  switch (extra) {
    case "hearts":
      return (
        <G>
          <Path
            d="M17 13 q-2.4 -3 0 -4.4 q2.4 1.4 0 4.4 z"
            fill={c.accent}
          />
          <Circle cx={50} cy={16} r={2.2} fill={c.accent} />
          <Circle cx={13} cy={23} r={1.5} fill={c.accent} opacity={0.7} />
        </G>
      );
    case "sparkles":
      return (
        <G>
          <Path d="M12 18 l1.4 3.2 l3.2 1.4 l-3.2 1.4 l-1.4 3.2 l-1.4 -3.2 l-3.2 -1.4 l3.2 -1.4 z" fill={c.warning} />
          <Path d="M52 14 l1.1 2.6 l2.6 1.1 l-2.6 1.1 l-1.1 2.6 l-1.1 -2.6 l-2.6 -1.1 l2.6 -1.1 z" fill={c.warning} />
        </G>
      );
    case "dots":
      return (
        <G opacity={0.85}>
          <Circle cx={46} cy={10} r={1.5} fill={c.bgElevated} />
          <Circle cx={51} cy={7} r={1.9} fill={c.bgElevated} />
          <Circle cx={57} cy={4.5} r={2.3} fill={c.bgElevated} />
        </G>
      );
    case "zzz":
      return (
        <G opacity={0.85}>
          <Path d="M47 12 h6 l-6 6 h6" stroke={c.bgElevated} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          <Path d="M56 4 h4 l-4 4 h4" stroke={c.bgElevated} strokeWidth={1.3} fill="none" strokeLinecap="round" />
        </G>
      );
    case "swirl":
      return (
        <Path
          d="M50 12 q3 -3 6 0 q3 3 0 6 q-3 3 -6 0"
          stroke={c.warning}
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
        />
      );
    default:
      return null;
  }
}


const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "flex-end" },
  inner: { width: "100%", height: "100%" },
  shadow: { position: "absolute", bottom: 0, height: 6, borderRadius: 999 },
});
