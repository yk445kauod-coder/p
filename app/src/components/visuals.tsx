import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import { useSettings } from "../store/settings";

const GRID = 34;

/** Faint blueprint grid used as the app's backdrop. */
export function GridBackground() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const cols = Math.ceil(width / GRID);
  const rows = Math.ceil(height / GRID);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        {Array.from({ length: cols + 1 }).map((_, i) => (
          <Line
            key={`v${i}`}
            x1={i * GRID}
            y1={0}
            x2={i * GRID}
            y2={height}
            stroke={theme.colors.gridLine}
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: rows + 1 }).map((_, i) => (
          <Line
            key={`h${i}`}
            x1={0}
            y1={i * GRID}
            x2={width}
            y2={i * GRID}
            stroke={theme.colors.gridLine}
            strokeWidth={1}
          />
        ))}
      </Svg>
    </View>
  );
}

/** Ambient glow orbs that drift slowly. Disabled when reduced motion is on. */
export function AuroraBackdrop() {
  const theme = useTheme();
  const { reduceMotion } = useSettings();
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, reduceMotion]);

  const t1 = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -26] });
  const t2 = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 22] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.orb,
          { backgroundColor: theme.colors.primary, opacity: theme.mode === "dark" ? 0.16 : 0.1, transform: [{ translateY: t1 }] },
        ]}
      />
      <Animated.View
        style={[
          styles.orb2,
          { backgroundColor: theme.colors.accent, opacity: theme.mode === "dark" ? 0.14 : 0.09, transform: [{ translateY: t2 }] },
        ]}
      />
    </View>
  );
}

/** Decorative reading "constellation" for empty states. */
export function ReadingConstellation({ size = 120 }: { size?: number }) {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M18 74 C34 64 44 66 50 72 C56 66 66 64 82 74 L82 86 C66 78 56 80 50 84 C44 80 34 78 18 86 Z" fill={c.surfaceAlt} stroke={c.border} strokeWidth={1.4} />
      <Path d="M50 72 L50 84" stroke={c.border} strokeWidth={1.4} />
      <Circle cx={30} cy={30} r={2.6} fill={c.primary} />
      <Circle cx={52} cy={18} r={2} fill={c.accent} />
      <Circle cx={72} cy={34} r={2.4} fill={c.primary} />
      <Path d="M30 30 L52 18 L72 34" stroke={c.gridLine} strokeWidth={2} fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  orb: { position: "absolute", width: 280, height: 280, borderRadius: 140, top: -60, left: -80 },
  orb2: { position: "absolute", width: 240, height: 240, borderRadius: 120, bottom: -40, right: -70 },
});
