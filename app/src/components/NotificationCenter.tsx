import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SheetFrame } from "./SheetFrame";
import { Button, Separator } from "./ui";
import { useTheme } from "../theme/ThemeProvider";
import { useI18n } from "../i18n";
import { useNotifications, type Notification } from "../store/notifications";

const KIND_EMOJI: Record<string, string> = {
  reminder: "⏰",
  streak: "🔥",
  achievement: "🏅",
  ai: "🦉",
  system: "🔔",
};

/** Compact "2h ago" style stamp; the full date is in the accessibility label. */
function relativeTime(iso: string, justNow: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return justNow;
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function Row({ item, onPress, justNow }: { item: Notification; onPress: () => void; justNow: string }) {
  const c = useTheme().colors;
  const unread = !item.read_at;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.body}`}
      style={[styles.row, { backgroundColor: unread ? c.primarySoft : "transparent" }]}
    >
      <View style={[styles.dot, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
        <Text style={{ fontSize: 20 }}>{item.emoji ?? KIND_EMOJI[item.kind] ?? "🔔"}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.rowTime, { color: c.textFaint }]}>{relativeTime(item.created_at, justNow)}</Text>
        </View>
        {item.body ? (
          <Text style={[styles.rowText, { color: c.textMuted }]} numberOfLines={2}>
            {item.body}
          </Text>
        ) : null}
      </View>
      {unread ? <View style={[styles.unreadDot, { backgroundColor: c.primary }]} /> : null}
    </Pressable>
  );
}

export function NotificationCenter({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useTheme().colors;
  const { t } = useI18n();
  const { items, unread, markRead, markAllRead, clear } = useNotifications();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <SheetFrame visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: c.text }]}>{t("notif.title")}</Text>
        {unread > 0 ? (
          <Text style={[styles.count, { color: c.textMuted }]}>{t("notif.unread", { count: unread })}</Text>
        ) : null}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 40 }}>🔔</Text>
          <Text style={[styles.emptyTitle, { color: c.text }]}>{t("notif.empty")}</Text>
          <Text style={[styles.emptyHint, { color: c.textMuted }]}>{t("notif.emptyHint")}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          style={styles.list}
          ItemSeparatorComponent={Separator}
          renderItem={({ item }) => (
            <Row item={item} justNow={t("notif.justNow")} onPress={() => void markRead(item.id)} />
          )}
        />
      )}

      {items.length > 0 ? (
        <View style={styles.actions}>
          <Button label={t("notif.markAll")} variant="ghost" size="sm" onPress={() => void markAllRead()} />
          <Button
            label={confirmClear ? t("notif.clearConfirm") : t("notif.clear")}
            variant="ghost"
            size="sm"
            onPress={() => {
              if (!confirmClear) {
                setConfirmClear(true);
                return;
              }
              setConfirmClear(false);
              void clear();
            }}
          />
        </View>
      ) : null}
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "800" },
  count: { fontSize: 12.5, fontWeight: "700" },
  list: { maxHeight: 420 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 14 },
  dot: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowTitle: { flex: 1, fontSize: 14.5, fontWeight: "700" },
  rowTime: { fontSize: 11.5, fontWeight: "600" },
  rowText: { fontSize: 13, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  empty: { alignItems: "center", gap: 6, paddingVertical: 40 },
  emptyTitle: { fontSize: 15.5, fontWeight: "700" },
  emptyHint: { fontSize: 13, textAlign: "center", paddingHorizontal: 24 },
  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
});
