import React, { useEffect, useRef } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import LottieView from "lottie-react-native";
import { useReducedMotion } from "../../theme/useReducedMotion";

interface Props {
  /** `require(".../file.json")` — bundled, so it works offline. */
  source: number;
  size?: number;
  loop?: boolean;
  autoPlay?: boolean;
  speed?: number;
  style?: StyleProp<ViewStyle>;
  onFinish?: () => void;
}

/**
 * Thin wrapper over `lottie-react-native` that respects reduced-motion.
 *
 * When motion is reduced the first frame is shown statically instead of playing,
 * which keeps the visual anchor without the movement.
 */
export function Lottie({
  source,
  size = 120,
  loop = false,
  autoPlay = true,
  speed = 1,
  style,
  onFinish,
}: Props) {
  const ref = useRef<LottieView>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      ref.current?.reset();
      return;
    }
    if (autoPlay) {
      ref.current?.reset();
      ref.current?.play();
    }
  }, [autoPlay, reduced, source]);

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]} pointerEvents="none">
      <LottieView
        ref={ref}
        source={source as never}
        autoPlay={autoPlay && !reduced}
        loop={loop && !reduced}
        speed={speed}
        resizeMode="contain"
        style={styles.fill}
        webStyle={styles.fill as never}
        onAnimationFinish={() => {
          if (!reduced) onFinish?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  fill: { width: "100%", height: "100%" },
});
