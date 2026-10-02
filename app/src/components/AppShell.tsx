import React, { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mascot } from "./mascot/Mascot";
import { emitPointer, emitPointerAway } from "./mascot/pointer";
import { AIChatSheet } from "./AIChatSheet";
import { NotificationCenter } from "./NotificationCenter";
import { useTheme } from "../theme/ThemeProvider";
import { useFinePointer } from "../theme/useReducedMotion";
import { useI18n } from "../i18n";
import { useSettings } from "../store/settings";
import { useData } from "../store/data";
import { useNotifications } from "../store/notifications";
import { toDayKey } from "../domain/achievements";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onOpenChat } from "../ai/bus";

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
  const finePointer = useFinePointer();
  const { t } = useI18n();
  const { unread, push: notify } = useNotifications();
  const { notifyEnabled, notifyReminder, notifyReminderTime } = useSettings();
  const { stats } = useData();
  const [chatOpen, setChatOpen] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);
  const [bellOpen, setBellOpen] = useState(false);

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

  // One gentle in-app nudge per day, once the reader's reminder time has passed
  // and they still haven't logged anything.
  useEffect(() => {
    if (!notifyEnabled || !notifyReminder || stats.todayMinutes > 0) return;
    const key = `tracebook.reminder.${toDayKey(new Date())}`;
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then((seen) => {
        if (seen || cancelled) return;
        const [h, m] = notifyReminderTime.split(":").map(Number);
        const now = new Date();
        if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
        AsyncStorage.setItem(key, "1").catch(() => undefined);
        void notify({ kind: "reminder", titleKey: "notif.reminderTitle", bodyKey: "notif.reminderBody", emoji: "⏰" });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [notify, notifyEnabled, notifyReminder, notifyReminderTime, stats.todayMinutes]);

  // Any screen can ask the coach to open, optionally with a seeded question.
  useEffect(
    () =>
      onOpenChat((s) => {
        setSeed(s ?? null);
        setChatOpen(true);
      }),
    [],
  );

  return (
    <View style={styles.root} onTouchStart={report} onTouchMove={report} onTouchEnd={emitPointerAway}>
      <View style={styles.fill}>{children}</View>

      {/* Notification bell: out of the way of content, always reachable. */}
      <View pointerEvents="box-none" style={[styles.bellSlot, { top: insets.top + 8 }]}>
        <Pressable
          onPress={() => setBellOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t("notif.bell")}
          style={[styles.bell, { backgroundColor: c.bgElevated, borderColor: c.border }, theme.shadow]}
        >
          <Text style={{ fontSize: 18 }}>🔔</Text>
          {unread > 0 ? (
            <View style={[styles.bellBadge, { backgroundColor: c.danger, borderColor: c.bgElevated }]}>
              <Text style={styles.bellBadgeText}>{unread > 9 ? "9+" : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Floating mascot: quick entry point to the AI coach. */}
      <View pointerEvents="box-none" style={[styles.mascotSlot, { bottom: insets.bottom + 84 }]}>
        <View
          style={[
            styles.mascotHalo,
            { backgroundColor: c.primarySoft, borderColor: c.border },
            theme.shadow,
          ]}
        >
          <Mascot size={96} onPress={() => setChatOpen(true)} />
        </View>
        {finePointer ? (
          <View style={[styles.hint, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
            <Text style={{ fontSize: 10.5, color: c.textMuted, fontWeight: "700" }}>AI</Text>
          </View>
        ) : null}
      </View>

      <NotificationCenter visible={bellOpen} onClose={() => setBellOpen(false)} />

      <AIChatSheet
        visible={chatOpen}
        seed={seed}
        onClose={() => {
          setChatOpen(false);
          setSeed(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  bellSlot: { position: "absolute", right: 14 },
  bell: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  mascotSlot: { position: "absolute", left: 16 },
  mascotHalo: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  hint: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

