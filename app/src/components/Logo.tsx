import React, { useEffect, useState } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";

interface LogoProps {
  size?: number;
  animated?: boolean;
  /** Render just the bookmark, without the book base. */
  markOnly?: boolean;
}

/**
 * TraceBook mark: Fahm, the living bookmark, resting on an open book.
 *
 * Drawn in SVG so it stays crisp at any size and follows the theme palette.
 * The face is intentionally blank here — the mascot component is the one that
 * emotes, and a logo that blinks would be a distraction in a header.
 */
export function Logo({ size = 48, animated = false, markOnly = false }: LogoProps) {
  const theme = useTheme();
  const c = theme.colors;
  const [bob] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animated, bob]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });

  return (
    <Animated.View style={{ transform: [{ translateY: animated ? translateY : 0 }] }}>
      <View accessibilityRole="image" accessibilityLabel="TraceBook logo">
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <Defs>
            <LinearGradient id="tbBookmark" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.primary} />
              <Stop offset="1" stopColor={c.accent} />
            </LinearGradient>
          </Defs>

          {!markOnly && (
            <G>
              {/* Open book base */}
              <Path
                d="M8 42 C19 37 27 38 32 41 C37 38 45 37 56 42 L56 55 C45 50 37 51 32 54 C27 51 19 50 8 55 Z"
                fill={c.surfaceAlt}
                stroke={c.border}
                strokeWidth={1.2}
              />
              <Path d="M32 41 L32 54" stroke={c.border} strokeWidth={1.2} />
            </G>
          )}

          {/* Bookmark body: rounded top, notched tail. */}
          <Path d="M25 8 Q20 8 20 13 L20 47 L32 38 L44 47 L44 13 Q44 8 39 8 Z" fill="url(#tbBookmark)" />
          <Circle cx={32} cy={16} r={3.1} fill={c.bgElevated} opacity={0.92} />
        </Svg>
      </View>
    </Animated.View>
  );
}
