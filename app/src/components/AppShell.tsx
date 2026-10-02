import React, { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View, type GestureResponderEvent } from "react-native";
import { Text } from "./Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mascot } from "./mascot/Mascot";
import { emitPointer, emitPointerAway } from "./mascot/pointer";
import { AIChatSheet } from "./AIChatSheet";
import { PaywallSheet } from "./PaywallSheet";
import { NotificationCenter } from "./NotificationCenter";
import { ReadingAlarm } from "./ReadingAlarm";
import { LogSessionSheet } from "./LogSessionSheet";
import { useTheme } from "../theme/ThemeProvider";
import { useFinePointer } from "../theme/useReducedMotion";
import { ChromeSlot, useResponsive } from "./layout";
import { useI18n } from "../i18n";
import { useSettings } from "../store/settings";
import { useData } from "../store/data";
import { useNotifications } from "../store/notifications";
import { useEntitlements } from "../store/entitlements";
import { toDayKey } from "../domain/achievements";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onOpenChat, onOpenPaywall } from "../ai/bus";

/**
 * App chrome shared by every signed-in screen.
 *
 * Reports pointer/touch positions to the mascot bus (without claiming the touch
 * responder, so all UI stays pressable) and hosts the mascot + AI chat sheet.
 * Floating chrome is aligned to the content column (`ChromeSlot`) so it never
 * drifts to the window edge on a wide screen, and never covers a card.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const finePointer = useFinePointer();
  const { wide, compact } = useResponsive();
  const { t } = useI18n();
  const { unread, push: notify } = useNotifications();
  const { notifyEnabled, notifyReminder, notifyReminderTime } = useSettings();
  const { stats } = useData();
  const { isPro } = useEntitlements();
  const [chatOpen, setChatOpen] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

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

  // Any screen can ask the coach (or the paywall) to open.
  useEffect(() => {
    const offChat = onOpenChat((s) => {
      setSeed(s ?? null);
      setChatOpen(true);
    });
    const offPaywall = onOpenPaywall(() => setPaywallOpen(true));
    return () => {
      offChat();
      offPaywall();
    };
  }, []);

  // Mascot sits lower on phones (above the tab bar) and higher on wide screens.
  const mascotBottom = wide ? insets.bottom + 24 : insets.bottom + 84;

  return (
    <View style={styles.root} onTouchStart={report} onTouchMove={report} onTouchEnd={emitPointerAway}>
      <View style={styles.fill}>{children}</View>

      {/* Notification bell: inside the content column, clear of the FAB row. */}
      <ChromeSlot align="right" offset={compact ? 14 : 22} style={{ top: insets.top + 8 }}>
        <Pressable
          onPress={() => setBellOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t("notif.bell")}
          style={[styles.bell, { backgroundColor: c.bgElevated, borderColor: c.border }, theme.elevation.md]}
        >
          <Text style={{ fontSize: 18 }}>🔔</Text>
          {unread > 0 ? (
            <View style={[styles.bellBadge, { backgroundColor: c.danger, borderColor: c.bgElevated }]}>
              <Text style={styles.bellBadgeText}>{unread > 9 ? "9+" : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      </ChromeSlot>

      {/* Pro badge: only shown to paying readers, so it reads as a status chip. */}
      {isPro ? (
        <ChromeSlot align="left" offset={compact ? 16 : 24} style={{ top: insets.top + 10 }}>
          <View style={[styles.proChip, { backgroundColor: c.premiumSoft, borderColor: c.premium }]}>
            <Text style={{ fontSize: 11 }}>✨</Text>
            <Text style={{ color: c.premium, fontSize: 11, fontWeight: "800" }}>{t("paywall.pro")}</Text>
          </View>
        </ChromeSlot>
      ) : null}

      {/* Floating mascot: quick entry point to the AI coach. */}
      <ChromeSlot align="left" offset={compact ? 16 : 24} style={{ bottom: mascotBottom }}>
        <View
          style={[styles.mascotHalo, { backgroundColor: c.primarySoft, borderColor: c.border }, theme.elevation.md]}
        >
          <Mascot size={compact ? 84 : 96} onPress={() => setChatOpen(true)} />
        </View>
        {finePointer ? (
          <View style={[styles.hint, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
            <Text style={{ fontSize: 10.5, color: c.textMuted, fontWeight: "800" }}>AI</Text>
          </View>
        ) : null}
      </ChromeSlot>

      <NotificationCenter visible={bellOpen} onClose={() => setBellOpen(false)} />

      {/* In-app reading alarm: rings once a day at the reader's chosen time. */}
      <ReadingAlarm onLog={() => setLogOpen(true)} />

      <LogSessionSheet visible={logOpen} onClose={() => setLogOpen(false)} />

      <PaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />

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
  bell: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
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
  proChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  mascotHalo: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
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

