import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useSettings } from "../store/settings";
import { useData } from "../store/data";
import { useI18n } from "../i18n";
import { useReducedMotion } from "../theme/useReducedMotion";
import { toDayKey } from "../domain/achievements";

const NATIVE = Platform.OS !== "web";

/**
 * The in-app reading alarm.
 *
 * Rings once a day at the reader's chosen time, as a dismissible banner that
 * also offers a one-tap shortcut into logging a session. It fires at most once
 * per day and only while the app is open — no background daemon, no permission
 * prompt, nothing that can silently fail.
 */
export function ReadingAlarm({ onLog }: { onLog: () => void }) {
  const c = useTheme().colors;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { alarmEnabled, alarmTime } = useSettings();
  const { stats } = useData();
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const [ringing, setRinging] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));
  const dismissedFor = useRef<string | null>(null);

  useEffect(() => {
    const dayKey = toDayKey(new Date());

    const check = () => {
      if (!alarmEnabled || dismissedFor.current === dayKey) {
        setRinging(false);
        return;
      }
      // Already read today: the nudge has done its job.
      if (stats.todayMinutes > 0) {
        setRinging(false);
        return;
      }
      const [h, m] = alarmTime.split(":").map(Number);
      if (!Number.isFinite(h) || !Number.isFinite(m)) return;
      const now = new Date();
      setRinging(now.getHours() * 60 + now.getMinutes() >= h * 60 + m);
    };

    check();
    const timer = setInterval(check, 20_000);
    return () => clearInterval(timer);
  }, [alarmEnabled, alarmTime, stats.todayMinutes]);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: ringing ? 1 : 0,
      duration: reduced ? 0 : theme.motion.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    }).start();
  }, [anim, ringing, reduced, theme.motion.base]);

  if (!ringing) return null;

  const dismiss = () => {
    dismissedFor.current = toDayKey(new Date());
    setRinging(false);
  };

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] });

  return (
    <Animated.View
      style={[
        styles.wrap,
        theme.shadowLg,
        {
          backgroundColor: c.bgElevated,
          borderColor: c.accent,
          top: insets.top + 8,
          opacity: anim,
          transform: [{ translateY }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <View style={[styles.emoji, { backgroundColor: c.accentSoft }]}>
        <Text style={{ fontSize: 20 }}>⏰</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: c.text }]}>{t("alarm.title")}</Text>
        <Text style={{ color: c.textMuted, fontSize: 12.5, marginTop: 2 }}>{t("alarm.body")}</Text>
      </View>
      <Pressable
        onPress={() => {
          dismiss();
          onLog();
        }}
        accessibilityRole="button"
        accessibilityLabel={t("alarm.read")}
        style={[styles.cta, { backgroundColor: c.primary }]}
      >
        <Text style={{ color: c.onPrimary, fontSize: 13, fontWeight: "700" }}>{t("alarm.read")}</Text>
      </Pressable>
      <Pressable
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel={t("alarm.later")}
        hitSlop={8}
        style={styles.close}
      >
        <Text style={{ color: c.textFaint, fontSize: 15, fontWeight: "700" }}>✕</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  emoji: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14.5, fontWeight: "800" },
  cta: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  close: { paddingHorizontal: 2 },
});
