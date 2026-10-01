import React, { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mascot } from "./mascot/Mascot";
import { emitPointer, emitPointerAway } from "./mascot/pointer";
import { AIChatSheet } from "./AIChatSheet";
import { useTheme } from "../theme/ThemeProvider";

/**
 * App chrome shared by every signed-in screen.
 *
 * Reports pointer/touch positions to the mascot bus (without claiming the touch
 * responder, so all UI stays pressable) and hosts the mascot + AI chat sheet.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [chatOpen, setChatOpen] = useState(false);

  const report = useCallback((e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    emitPointer({ x: pageX, y: pageY });
  }, []);

  // React Native Web does not surface mousemove through onTouchMove, so wire the
  // DOM listener directly on web for true cursor tracking.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onMove = (e: MouseEvent) => emitPointer({ x: e.clientX, y: e.clientY });
    const onLeave = () => emitPointerAway();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <View
      style={styles.root}
      onTouchStart={report}
      onTouchMove={report}
      onTouchEnd={emitPointerAway}
    >
      <View style={styles.fill}>{children}</View>

      {/* Floating mascot: quick entry point to the AI coach. */}
      <View
        pointerEvents="box-none"
        style={[styles.mascotSlot, { bottom: insets.bottom + 84 }]}
      >
        <View style={[styles.mascotHalo, { backgroundColor: c.primarySoft, borderColor: c.border }]}>
          <Mascot size={96} onPress={() => setChatOpen(true)} />
        </View>
      </View>

      <AIChatSheet visible={chatOpen} onClose={() => setChatOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  mascotSlot: { position: "absolute", left: 16 },
  mascotHalo: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
