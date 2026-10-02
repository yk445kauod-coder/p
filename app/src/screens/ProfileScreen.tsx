import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, useThemeMode } from "../theme/ThemeProvider";
import { useSettings, RITUAL_DRINKS } from "../store/settings";
import { useAuth } from "../store/auth";
import { useData } from "../store/data";
import { Card, SectionTitle, Button, Badge } from "../components/ui";
import { Logo } from "../components/Logo";
import { GridBackground } from "../components/visuals";
import { useI18n, LANGUAGES, applyRtl } from "../i18n";
import { usePwaInstall } from "../pwa/install";
import { currentPushStatus, pushConfigured, pushSupported, subscribeToPush, unsubscribeFromPush, type PushStatus } from "../pwa/push";
import { useNotifications } from "../store/notifications";
import { useToast } from "../components/motion/Toast";
import { AnimatedEmoji } from "../components/motion/AnimatedEmoji";

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Monday-anchored start of the current week, as an ISO day key. */
function weekStart(d = new Date()): string {
  const date = new Date(d);
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}

function weekEnd(startKey: string): string {
  const d = new Date(`${startKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

export function ProfileScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const { mode, toggle } = useThemeMode();
  const {
    dailyGoalMinutes,
    setDailyGoalMinutes,
    reduceMotion,
    setReduceMotion,
    lang,
    setLang,
    restDays,
    toggleRestDay,
    ritualDrink,
    setRitualDrink,
    readingTime,
    setReadingTime,
    shelfGoalPages,
    setShelfGoalPages,
    notifyEnabled,
    setNotifyEnabled,
    notifyReminder,
    setNotifyReminder,
    notifyReminderTime,
    setNotifyReminderTime,
  } = useSettings();
  const { t } = useI18n();
  const { user, logout, offline, cloudAvailable } = useAuth();
  const { stats, clearAll, sync, syncing, lastSync, weeklyReviews, saveWeeklyReview } = useData();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [confirmClear, setConfirmClear] = useState(false);
  const { available: canInstall, installed, manual: manualInstall, promptInstall } = usePwaInstall();
  const { push: notify } = useNotifications();
  const [pushStatus, setPushStatus] = useState<PushStatus>("default");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    currentPushStatus().then((st) => {
      if (!cancelled) setPushStatus(st);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const togglePush = async () => {
    setPushBusy(true);
    try {
      const next = pushStatus === "subscribed" ? await unsubscribeFromPush() : await subscribeToPush();
      setPushStatus(next);
      if (next === "subscribed") toast.show(t("notif.profile.pushOn"), { emoji: "🔔", tone: "success" });
    } finally {
      setPushBusy(false);
    }
  };

  const start = weekStart();
  const existing = useMemo(() => weeklyReviews.find((w) => w.week_start === start), [start, weeklyReviews]);
  const [good, setGood] = useState(existing?.good ?? "");
  const [improve, setImprove] = useState(existing?.to_improve ?? "");
  const [savingReview, setSavingReview] = useState(false);

  const saveReview = async () => {
    setSavingReview(true);
    await saveWeeklyReview({ week_start: start, week_end: weekEnd(start), good, to_improve: improve });
    setSavingReview(false);
    toast.show(t("review.saved"), { emoji: "📝", tone: "success" });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GridBackground />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 150, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: c.text }]}>{t("profile.title")}</Text>

        <Card style={{ marginTop: 14, alignItems: "center", gap: 8, paddingVertical: 24 }}>
          <Logo size={64} animated />
          <Text style={[styles.name, { color: c.text }]}>{user?.displayName ?? t("profile.reader")}</Text>
          <Text style={{ color: c.textMuted, fontSize: 13 }}>{user?.email ?? t("profile.localDevice")}</Text>
          <Badge
            text={offline ? t("profile.guestMode") : syncing ? t("profile.syncing") : t("profile.synced")}
            tone={offline ? "accent" : "primary"}
          />
          {offline && cloudAvailable ? (
            <Text style={{ color: c.textMuted, fontSize: 12, textAlign: "center", marginTop: 4 }}>
              {t("profile.guestHint")}
            </Text>
          ) : null}
        </Card>

        <SectionTitle>{t("profile.appearance")}</SectionTitle>
        <Card>
          <ToggleRow label={t("profile.darkMode")} value={mode === "dark"} onValueChange={toggle} />
          <ToggleRow label={t("profile.reduceMotion")} value={reduceMotion} onValueChange={setReduceMotion} />
        </Card>

        {(canInstall || installed || manualInstall) && (
          <>
            <SectionTitle>{t("profile.install")}</SectionTitle>
            <Card style={{ gap: 12 }}>
              {installed ? (
                <Text style={{ color: c.textMuted, fontSize: 13 }}>{t("profile.installed")}</Text>
              ) : manualInstall ? (
                <Text style={{ color: c.textMuted, fontSize: 13 }}>{t("profile.installIos")}</Text>
              ) : (
                <>
                  <Text style={{ color: c.textMuted, fontSize: 13 }}>{t("profile.installHint")}</Text>
                  <Button label={t("profile.install")} onPress={() => void promptInstall()} />
                </>
              )}
            </Card>
          </>
        )}

        <SectionTitle>{t("profile.language")}</SectionTitle>
        <Card>
          <View style={styles.langRow}>
            {LANGUAGES.map((l) => {
              const active = lang === l.code;
              return (
                <Pressable
                  key={l.code}
                  onPress={() => {
                    setLang(l.code);
                    // RTL resolves at startup, so reload once the choice is persisted.
                    if (applyRtl(l.code) && typeof window !== "undefined") window.location.reload();
                  }}
                  style={[
                    styles.langChip,
                    { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : "transparent" },
                  ]}
                >
                  <Text style={{ color: active ? c.primary : c.textMuted, fontWeight: "700", fontSize: 13.5 }}>
                    {l.native}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <SectionTitle>{t("notif.profile.title")}</SectionTitle>
        <Card style={{ gap: 12 }}>
          <Text style={{ color: c.textMuted, fontSize: 13 }}>{t("notif.profile.hint")}</Text>
          <ToggleRow label={t("notif.profile.enable")} value={notifyEnabled} onValueChange={setNotifyEnabled} />
          <ToggleRow label={t("notif.profile.reminder")} value={notifyReminder} onValueChange={setNotifyReminder} />
          <View>
            <Text style={[styles.subLabel, { color: c.textMuted }]}>{t("notif.profile.reminderTime")}</Text>
            <TextInput
              value={notifyReminderTime}
              onChangeText={setNotifyReminderTime}
              placeholder="21:30"
              placeholderTextColor={c.textFaint}
              style={[styles.timeInput, { color: c.text, borderColor: c.border, backgroundColor: c.surfaceAlt }]}
            />
          </View>

          {pushSupported() && pushConfigured() ? (
            <>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: c.text, fontSize: 15 }}>{t("notif.profile.push")}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                    {pushStatus === "denied"
                      ? t("notif.profile.pushBlocked")
                      : pushStatus === "subscribed"
                        ? t("notif.profile.pushOn")
                        : t("notif.profile.pushHint")}
                  </Text>
                </View>
                <Switch
                  value={pushStatus === "subscribed"}
                  disabled={pushBusy || pushStatus === "denied"}
                  onValueChange={() => void togglePush()}
                  trackColor={{ true: c.primary, false: c.surfaceAlt }}
                  thumbColor="#fff"
                />
              </View>
              <Button
                label={t("notif.profile.test")}
                variant="ghost"
                size="sm"
                onPress={() =>
                  void notify({ kind: "reminder", titleKey: "notif.reminderTitle", bodyKey: "notif.reminderBody", emoji: "⏰" })
                }
              />
            </>
          ) : null}
        </Card>

        <SectionTitle>{t("profile.readingGoal")}</SectionTitle>
        <Card>
          <Text style={{ color: c.textMuted, fontSize: 13, marginBottom: 12 }}>
            {t("profile.dailyTarget", { count: dailyGoalMinutes })}
          </Text>
          <View style={styles.chipRow}>
            {[15, 20, 30, 45, 60].map((m) => {
              const active = dailyGoalMinutes === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => setDailyGoalMinutes(m)}
                  style={[
                    styles.goalChip,
                    { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : "transparent" },
                  ]}
                >
                  <Text style={{ color: active ? c.primary : c.textMuted, fontWeight: "700", fontSize: 13 }}>{m}m</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.subLabel, { color: c.textMuted }]}>{t("profile.shelfGoal")}</Text>
          <View style={styles.chipRow}>
            {[150, 250, 320, 450, 600].map((p) => {
              const active = shelfGoalPages === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setShelfGoalPages(p)}
                  style={[
                    styles.goalChip,
                    { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : "transparent" },
                  ]}
                >
                  <Text style={{ color: active ? c.primary : c.textMuted, fontWeight: "700", fontSize: 13 }}>{p}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Rest days */}
        <SectionTitle>{t("profile.restDays")}</SectionTitle>
        <Card>
          <Text style={{ color: c.textMuted, fontSize: 12.5, marginBottom: 12 }}>{t("profile.restDaysHint")}</Text>
          <View style={styles.chipRow}>
            {WEEKDAYS.map((d, i) => {
              const active = restDays.includes(i);
              return (
                <Pressable
                  key={d}
                  onPress={() => toggleRestDay(i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.dayChip,
                    { borderColor: active ? c.accent : c.border, backgroundColor: active ? c.accentSoft : "transparent" },
                  ]}
                >
                  <Text style={{ color: active ? c.accent : c.textMuted, fontSize: 12.5, fontWeight: "700" }}>
                    {t(`weekday.${d}` as never)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Ritual */}
        <SectionTitle>{t("profile.ritual")}</SectionTitle>
        <Card>
          <Text style={{ color: c.textMuted, fontSize: 12.5, marginBottom: 12 }}>{t("profile.ritualHint")}</Text>
          <View style={styles.chipRow}>
            {RITUAL_DRINKS.map((d) => {
              const active = ritualDrink === d.id;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setRitualDrink(d.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.drinkChip,
                    { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : "transparent" },
                  ]}
                >
                  <Text style={{ fontSize: 15 }}>{d.emoji}</Text>
                  <Text style={{ color: active ? c.primary : c.textMuted, fontSize: 12.5, fontWeight: "600" }}>
                    {lang === "ar" ? d.ar : d.en}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.subLabel, { color: c.textMuted }]}>{t("profile.readingTime")}</Text>
          <TextInput
            value={readingTime}
            onChangeText={setReadingTime}
            placeholder="22:30"
            placeholderTextColor={c.textFaint}
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
          />
        </Card>

        {/* Weekly review */}
        <SectionTitle right={<AnimatedEmoji size={18}>📝</AnimatedEmoji>}>{t("review.title")}</SectionTitle>
        <Card>
          <Text style={{ color: c.textMuted, fontSize: 12.5, marginBottom: 12 }}>{t("review.subtitle")}</Text>
          <Text style={[styles.subLabel, { color: c.textMuted }]}>{t("review.good")}</Text>
          <TextInput
            value={good}
            onChangeText={setGood}
            placeholder={t("review.goodPlaceholder")}
            placeholderTextColor={c.textFaint}
            multiline
            style={[styles.input, styles.multiline, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
          />
          <Text style={[styles.subLabel, { color: c.textMuted }]}>{t("review.improve")}</Text>
          <TextInput
            value={improve}
            onChangeText={setImprove}
            placeholder={t("review.improvePlaceholder")}
            placeholderTextColor={c.textFaint}
            multiline
            style={[styles.input, styles.multiline, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
          />
          <Button
            label={t("review.save")}
            onPress={saveReview}
            loading={savingReview}
            disabled={!good.trim() && !improve.trim()}
            style={{ marginTop: 14 }}
          />

          {weeklyReviews.length > 0 ? (
            <View style={{ marginTop: 18, gap: 10 }}>
              <Text style={{ color: c.textMuted, fontSize: 12.5, fontWeight: "700" }}>{t("review.history")}</Text>
              {weeklyReviews.slice(0, 4).map((r) => (
                <View key={r.id} style={[styles.reviewItem, { borderColor: c.border }]}>
                  <Text style={{ color: c.text, fontSize: 13, fontWeight: "700" }}>
                    {t("review.week", { date: r.week_start.slice(5) })}
                  </Text>
                  {r.good ? <Text style={{ color: c.textMuted, fontSize: 12.5, marginTop: 2 }}>＋ {r.good}</Text> : null}
                  {r.to_improve ? (
                    <Text style={{ color: c.textMuted, fontSize: 12.5, marginTop: 2 }}>→ {r.to_improve}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </Card>

        <SectionTitle>{t("profile.yourNumbers")}</SectionTitle>
        <Card>
          <StatRow label={t("profile.currentStreak")} value={t("profile.daysValue", { count: stats.streak })} />
          <StatRow label={t("profile.bestStreak")} value={t("profile.daysValue", { count: stats.bestStreak })} />
          <StatRow label={t("profile.totalReading")} value={t("profile.hoursValue", { count: Math.round(stats.totalMinutes / 60) })} />
          <StatRow label={t("profile.pagesRead")} value={`${stats.totalPages}`} />
        </Card>

        <SectionTitle>{t("profile.account")}</SectionTitle>
        <Card style={{ gap: 12 }}>
          {!offline && (
            <Button
              label={syncing ? t("profile.syncing") : t("profile.syncNow")}
              variant="ghost"
              onPress={sync}
              loading={syncing}
            />
          )}
          <Text style={{ color: c.textFaint, fontSize: 12 }}>
            {lastSync ? t("profile.lastSync", { when: new Date(lastSync).toLocaleString() }) : t("profile.notSynced")}
          </Text>
          <Button label={t("profile.signOut")} variant="ghost" onPress={logout} />
          <Button
            label={confirmClear ? t("profile.eraseConfirm") : t("profile.erase")}
            variant="danger"
            onPress={() => {
              if (confirmClear) {
                clearAll();
                setConfirmClear(false);
              } else setConfirmClear(true);
            }}
          />
        </Card>

        <Text style={[styles.footer, { color: c.textFaint }]}>{t("app.footer")}</Text>
      </ScrollView>
    </View>
  );
}

function ToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const c = useTheme().colors;
  return (
    <View style={styles.toggleRow}>
      <Text style={{ color: c.text, fontSize: 15 }}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: c.primary, false: c.surfaceAlt }} thumbColor="#fff" />
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  const c = useTheme().colors;
  return (
    <View style={styles.statRow}>
      <Text style={{ color: c.textMuted, fontSize: 13.5 }}>{label}</Text>
      <Text style={{ color: c.text, fontSize: 14, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.6 },
  name: { fontSize: 19, fontWeight: "800" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  goalChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  dayChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, minWidth: 52, alignItems: "center" },
  drinkChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  langRow: { flexDirection: "row", gap: 10 },
  langChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
  subLabel: { fontSize: 12.5, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  timeInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  multiline: { minHeight: 68, textAlignVertical: "top" },
  reviewItem: { borderLeftWidth: 3, borderColor: "transparent", paddingLeft: 12, paddingVertical: 6 },
  statRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
  footer: { textAlign: "center", fontSize: 11.5, marginTop: 26 },
});
