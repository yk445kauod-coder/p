import React, { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import { useReducedMotion } from "../../theme/useReducedMotion";

interface Props {
  /** The emoji itself, e.g. "🔥". */
  children: string;
  size?: number;
  /** Play a short pop when this value changes (e.g. a new streak count). */
  trigger?: number | string;
  loop?: boolean;
  style?: object;
}

/**
 * Animated emoji ("animoji") used for celebratory feedback.
 *
 * Kept as a real Text glyph rather than an image so it inherits font rendering,
 * scales cleanly, and needs no asset. Motion is skipped when reduced motion is on.
 */
export function AnimatedEmoji({ children, size = 28, trigger, loop = false, style }: Props) {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const [rotate] = useState(() => new Animated.Value(0));
  const [bob] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) return;
    scale.setValue(0.4);
    rotate.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 220, friction: 10 }),
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start();
  }, [trigger, reduced, rotate, scale]);

  useEffect(() => {
    if (!loop || reduced) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [bob, loop, reduced]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.16] });
  const rotateDeg = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "14deg"] });

  return (
    <Animated.Text
      style={[
        styles.emoji,
        { fontSize: size, transform: [{ scale }, { translateY }, { rotate: rotateDeg }] },
        style as never,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {children}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  emoji: { includeFontPadding: false },
});
