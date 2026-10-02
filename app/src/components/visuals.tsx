import React, { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import { useSettings } from "../store/settings";

/**
 * Bold Gen-Z backdrop: a saturated gradient mesh with drifting colour blobs.
 *
 * Replaces the old blueprint grid (which read as visual noise at 34px) with a
 * cheap, token-driven wash that survives both themes. Blobs drift on a slow loop
 * and freeze entirely when reduced motion is on.
 */
export function GradientMesh() {
  const theme = useTheme();
  const c = theme.colors;
  const { reduceMotion } = useSettings();
  const { width, height } = useWindowDimensions();
  const [drift] = useState(() => new Animated.Value(0));
  const dark = theme.mode === "dark";

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 11000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 11000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, reduceMotion]);

  const t1 = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const t2 = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 26] });
  const t3 = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="meshBase" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={dark ? "#0C0913" : "#F6F2FF"} />
            <Stop offset="1" stopColor={dark ? "#1A1030" : "#EFE8FF"} />
          </LinearGradient>
          <RadialGradient id="meshViolet" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={c.violet} stopOpacity={dark ? 0.5 : 0.32} />
            <Stop offset="1" stopColor={c.violet} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="meshPink" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={c.pink} stopOpacity={dark ? 0.42 : 0.26} />
            <Stop offset="1" stopColor={c.pink} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="meshCyan" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={c.cyan} stopOpacity={dark ? 0.4 : 0.24} />
            <Stop offset="1" stopColor={c.cyan} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#meshBase)" />
        <Circle cx={width * 0.12} cy={height * 0.08} r={Math.max(width, height) * 0.42} fill="url(#meshViolet)" />
        <Circle cx={width * 0.92} cy={height * 0.3} r={Math.max(width, height) * 0.4} fill="url(#meshPink)" />
        <Circle cx={width * 0.6} cy={height * 1.02} r={Math.max(width, height) * 0.46} fill="url(#meshCyan)" />
      </Svg>

      <Animated.View
        style={[styles.blob, styles.blobA, { backgroundColor: c.violet, opacity: dark ? 0.22 : 0.16, transform: [{ translateY: t1 }] }]}
      />
      <Animated.View
        style={[styles.blob, styles.blobB, { backgroundColor: c.pink, opacity: dark ? 0.2 : 0.14, transform: [{ translateY: t2 }] }]}
      />
      <Animated.View
        style={[styles.blob, styles.blobC, { backgroundColor: c.cyan, opacity: dark ? 0.18 : 0.12, transform: [{ translateY: t3 }] }]}
      />
    </View>
  );
}

/** A fine dot texture that gives the flat gradient some grain. */
export function DotTexture({ spacing = 22 }: { spacing?: number }) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const cols = Math.ceil(width / spacing);
  const rows = Math.ceil(height / spacing);
  const dots: React.ReactElement[] = [];
  for (let i = 0; i <= cols; i++) {
    for (let j = 0; j <= rows; j++) {
      dots.push(<Circle key={`${i}-${j}`} cx={i * spacing} cy={j * spacing} r={0.9} fill={theme.colors.gridLine} />);
    }
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        {dots}
      </Svg>
    </View>
  );
}

/** Backwards-compatible alias: the old name is still imported by a few screens. */
export const GridBackground = GradientMesh;

/** Retained alias so existing screens keep compiling; the mesh already drifts. */
export const AuroraBackdrop = GradientMesh;

/** Decorative reading "constellation" for empty states. */
export function ReadingConstellation({ size = 120 }: { size?: number }) {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path
        d="M18 74 C34 64 44 66 50 72 C56 66 66 64 82 74 L82 86 C66 78 56 80 50 84 C44 80 34 78 18 86 Z"
        fill={c.surfaceAlt}
        stroke={c.border}
        strokeWidth={1.4}
      />
      <Path d="M50 72 L50 84" stroke={c.border} strokeWidth={1.4} />
      <Circle cx={30} cy={30} r={2.6} fill={c.primary} />
      <Circle cx={52} cy={18} r={2} fill={c.accent} />
      <Circle cx={72} cy={34} r={2.4} fill={c.primary} />
      <Path d="M30 30 L52 18 L72 34" stroke={c.gridLine} strokeWidth={2} fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  blob: { position: "absolute", borderRadius: 9999 },
  blobA: { width: 320, height: 320, top: -110, left: -90 },
  blobB: { width: 260, height: 260, top: 120, right: -110 },
  blobC: { width: 300, height: 300, bottom: -120, left: "30%" },
});
