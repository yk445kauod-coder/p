import React, { useEffect, useState } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Path, Rect, G, Defs, LinearGradient, Stop } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";

interface LogoProps {
  size?: number;
  animated?: boolean;
  /** Render just the mark, without the book base. */
  markOnly?: boolean;
}

/**
 * TraceBook mark: an owl ("Hoot") perched on an open book.
 * Drawn in SVG so it stays crisp at any size and follows the theme palette.
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
            <LinearGradient id="tbBody" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.primary} />
              <Stop offset="1" stopColor={c.accent} />
            </LinearGradient>
          </Defs>

          {/* Ear tufts */}
          <Path d="M20 14 L16 4 L27 10 Z" fill={c.primary} />
          <Path d="M44 14 L48 4 L37 10 Z" fill={c.primary} />

          {/* Head */}
          <Rect x={13} y={9} width={38} height={38} rx={17} fill="url(#tbBody)" />

          {/* Eyes */}
          <Circle cx={25} cy={26} r={8} fill={c.bgElevated} />
          <Circle cx={39} cy={26} r={8} fill={c.bgElevated} />
          <Circle cx={25} cy={26} r={3.4} fill={c.text} />
          <Circle cx={39} cy={26} r={3.4} fill={c.text} />
          <Circle cx={26.4} cy={24.6} r={1.1} fill={c.bgElevated} />
          <Circle cx={40.4} cy={24.6} r={1.1} fill={c.bgElevated} />

          {/* Beak */}
          <Path d="M32 32 L28.6 37.4 L35.4 37.4 Z" fill={c.warning} />

          {!markOnly && (
            <G>
              {/* Open book base */}
              <Path
                d="M10 46 C20 41 28 42 32 45 C36 42 44 41 54 46 L54 57 C44 52 36 53 32 56 C28 53 20 52 10 57 Z"
                fill={c.surfaceAlt}
                stroke={c.border}
                strokeWidth={1.2}
              />
              <Path d="M32 45 L32 56" stroke={c.border} strokeWidth={1.2} />
            </G>
          )}
        </Svg>
      </View>
    </Animated.View>
  );
}
