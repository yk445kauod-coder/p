import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { useReducedMotion } from "../../theme/useReducedMotion";

const NATIVE = Platform.OS !== "web";

export interface BurstOptions {
  emojis?: string[];
  count?: number;
  origin?: { x: number; y: number };
}

interface Burst extends Required<Omit<BurstOptions, "origin">> {
  id: number;
  origin: { x: number; y: number };
}

const ConfettiContext = createContext<{ burst: (opts?: BurstOptions) => void } | null>(null);

const DEFAULT_EMOJIS = ["🎉", "📚", "🔥", "✨", "🎊", "⭐"];

/**
 * Emoji confetti overlay.
 *
 * Mounted once at the app root. The layer ignores pointer events entirely, so a
 * celebration can never block a tap. When reduced motion is on, bursts are
 * suppressed rather than shortened.
 */
export function ConfettiProvider({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [bursts, setBursts] = useState<Burst[]>([]);
  const seq = useRef(0);

  const burst = useCallback(
    (opts?: BurstOptions) => {
      if (reduced) return;
      const id = ++seq.current;
      const next: Burst = {
        id,
        emojis: opts?.emojis?.length ? opts.emojis : DEFAULT_EMOJIS,
        count: Math.max(6, Math.min(opts?.count ?? 18, 40)),
        origin: opts?.origin ?? { x: width / 2, y: height * 0.7 },
      };
      setBursts((b) => [...b, next]);
      setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 2400);
    },
    [height, reduced, width],
  );

  const value = useMemo(() => ({ burst }), [burst]);

  return (
    <ConfettiContext.Provider value={value}>
      {children}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {bursts.map((b) => (
          <ConfettiBurst key={b.id} burst={b} />
        ))}
      </View>
    </ConfettiContext.Provider>
  );
}

function ConfettiBurst({ burst }: { burst: Burst }) {
  // Randomised once, in state, so a re-render never re-rolls the particle spread.
  const [particles] = useState(() =>
    Array.from({ length: burst.count }, (_, i) => ({
      id: i,
      emoji: burst.emojis[i % burst.emojis.length],
      dx: (Math.random() - 0.5) * 300,
      dy: -(120 + Math.random() * 240),
      rot: (Math.random() - 0.5) * 720,
      delay: Math.random() * 220,
      size: 18 + Math.random() * 18,
      drift: (Math.random() - 0.5) * 90,
    })),
  );

  return (
    <View style={[StyleSheet.absoluteFill, { left: burst.origin.x, top: burst.origin.y }]}>
      {particles.map((p) => (
        <Particle key={p.id} {...p} />
      ))}
    </View>
  );
}

function Particle({
  emoji,
  dx,
  dy,
  rot,
  delay,
  size,
  drift,
}: {
  emoji: string;
  dx: number;
  dy: number;
  rot: number;
  delay: number;
  size: number;
  drift: number;
}) {
  const [t] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: 1500 + Math.random() * 500,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    });
    anim.start();
    return () => anim.stop();
  }, [delay, t]);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
  const translateX = t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, dx * 0.7, dx + drift] });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${rot}deg`] });
  const opacity = t.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] });
  const scale = t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.4, 1, 0.9] });

  return (
    <Animated.Text
      style={[
        styles.particle,
        { fontSize: size, opacity, transform: [{ translateX }, { translateY }, { rotate }, { scale }] },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

/** Fires a celebration burst. Safe to call from anywhere; a no-op without the provider. */
export function useConfetti() {
  const ctx = useContext(ConfettiContext);
  return (
    ctx ?? {
      burst: () => {
        /* no provider mounted */
      },
    }
  );
}

const styles = StyleSheet.create({
  particle: { position: "absolute", includeFontPadding: false },
});
