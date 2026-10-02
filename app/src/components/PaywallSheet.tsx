import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { SheetFrame } from "./SheetFrame";
import { Button, Badge } from "./ui";
import { useTheme } from "../theme/ThemeProvider";
import { useI18n } from "../i18n";
import { useEntitlements, FREE_AI_MESSAGES_PER_DAY, FREE_ACTIVE_BOOKS, FREE_HISTORY_DAYS } from "../store/entitlements";
import { useToast } from "./motion/Toast";
import { useConfetti } from "./motion/Confetti";

/**
 * The upgrade moment.
 *
 * A value table rather than a nag: it names exactly what changes and lets the
 * reader leave. "Start Pro" is wired to the local entitlement switch so the
 * gated features unlock immediately; a real Stripe checkout would replace the
 * body of `upgrade()` without touching this UI.
 */
export function PaywallSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const c = theme.colors;
  const { t } = useI18n();
  const { isPro, plan, setPlan } = useEntitlements();
  const toast = useToast();
  const confetti = useConfetti();
  const [busy, setBusy] = useState(false);

  const rows: { icon: string; label: string; free: string; pro: string }[] = [
    { icon: "💬", label: t("paywall.aiCoach"), free: t("paywall.aiFree", { count: FREE_AI_MESSAGES_PER_DAY }), pro: t("paywall.unlimited") },
    { icon: "📚", label: t("paywall.books"), free: t("paywall.booksFree", { count: FREE_ACTIVE_BOOKS }), pro: t("paywall.unlimited") },
    { icon: "📈", label: t("paywall.history"), free: t("paywall.historyFree", { count: FREE_HISTORY_DAYS }), pro: t("paywall.historyPro") },
    { icon: "🔁", label: t("paywall.reviews"), free: t("paywall.reviewsFree"), pro: t("paywall.reviewsPro") },
    { icon: "💾", label: t("paywall.export"), free: "—", pro: t("paywall.exportPro") },
  ];

  const upgrade = async () => {
    setBusy(true);
    try {
      await setPlan("pro");
      confetti.burst({ emojis: ["✨", "👑", "💜", "🚀"], count: 28 });
      toast.show(t("paywall.welcome"), { emoji: "👑", tone: "success" });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetFrame visible={visible} onClose={onClose} scroll maxHeight="94%">
      <View style={styles.hero}>
        <View style={[styles.crown, { backgroundColor: c.premiumSoft, borderColor: c.premium }]}>
          <Text style={{ fontSize: 30 }}>👑</Text>
        </View>
        <Text style={[styles.title, { color: c.text }]}>{t("paywall.title")}</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>{t("paywall.subtitle")}</Text>
        <Badge
          text={isPro ? t("paywall.currentPro") : t("paywall.currentFree")}
          tone={isPro ? "premium" : "neutral"}
          emoji={isPro ? "✨" : undefined}
          sticker
        />
      </View>

      {/* Value table: what changes, side by side. */}
      <View style={[styles.table, { borderColor: c.border }]}>
        <View style={[styles.headerRow, { borderBottomColor: c.border }]}>
          <Text style={[styles.cellLabel, styles.cellHead, { color: c.textFaint }]}> </Text>
          <Text style={[styles.cellHead, { color: c.textMuted }]}>{t("paywall.free")}</Text>
          <Text style={[styles.cellHead, { color: c.premium, fontWeight: "800" }]}>{t("paywall.pro")}</Text>
        </View>
        {rows.map((r, i) => (
          <View
            key={r.label}
            style={[styles.row, i < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}
          >
            <View style={styles.labelCell}>
              <Text style={{ fontSize: 15 }}>{r.icon}</Text>
              <Text style={{ color: c.text, fontSize: 13.5, fontWeight: "700" }} numberOfLines={1}>
                {r.label}
              </Text>
            </View>
            <Text style={[styles.cell, { color: c.textMuted }]} numberOfLines={2}>
              {r.free}
            </Text>
            <Text style={[styles.cell, { color: c.premium, fontWeight: "800" }]} numberOfLines={2}>
              {r.pro}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.priceRow, { borderColor: c.premium, backgroundColor: c.premiumSoft }]}>
        <Text style={{ color: c.premium, fontSize: 26, fontWeight: "900", letterSpacing: -0.8 }}>
          {t("paywall.price")}
        </Text>
        <Text style={{ color: c.premium, fontSize: 12.5, fontWeight: "700" }}>{t("paywall.priceNote")}</Text>
      </View>

      {isPro ? (
        <Button label={t("paywall.manage")} variant="ghost" fullWidth onPress={onClose} style={{ marginTop: 14 }} />
      ) : (
        <Button
          label={t("paywall.cta")}
          variant="premium"
          size="lg"
          fullWidth
          loading={busy}
          onPress={upgrade}
          style={{ marginTop: 14 }}
        />
      )}

      <Pressable onPress={onClose} accessibilityRole="button" style={styles.later}>
        <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "700" }}>{t("paywall.later")}</Text>
      </Pressable>
      <Text style={[styles.fine, { color: c.textFaint }]}>{t("paywall.fine")}</Text>
      {plan === "free" ? null : null}
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: 8, paddingTop: 4 },
  crown: { width: 66, height: 66, borderRadius: 22, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 27, fontWeight: "900", letterSpacing: -0.8, textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 8 },
  table: { marginTop: 18, borderWidth: 1.5, borderRadius: 20, overflow: "hidden" },
  headerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1.5 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingHorizontal: 12 },
  labelCell: { flex: 1.35, flexDirection: "row", alignItems: "center", gap: 7, paddingRight: 6 },
  cellLabel: { flex: 1.35 },
  cellHead: { flex: 1, fontSize: 12, fontWeight: "800", textAlign: "center" },
  cell: { flex: 1, fontSize: 12, textAlign: "center" },
  priceRow: {
    marginTop: 16,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    gap: 2,
  },
  later: { alignItems: "center", paddingVertical: 14 },
  fine: { fontSize: 11.5, textAlign: "center", lineHeight: 16, paddingBottom: 6 },
});
