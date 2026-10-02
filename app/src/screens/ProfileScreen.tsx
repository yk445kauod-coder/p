import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { Text, TextInput } from "../components/Text";
import { useTheme, useThemeMode } from "../theme/ThemeProvider";
import { useSettings, RITUAL_DRINKS } from "../store/settings";
import { useAuth } from "../store/auth";
import { useData } from "../store/data";
import { Card, SectionTitle, Button, Badge, Chip, SegmentedControl } from "../components/ui";
import { Logo } from "../components/Logo";
import { GradientMesh } from "../components/visuals";
import { useI18n, LANGUAGES, applyRtl } from "../i18n";
import { usePwaInstall } from "../pwa/install";
import { currentPushStatus, pushConfigured, pushSupported, subscribeToPush, unsubscribeFromPush, type PushStatus } from "../pwa/push";
import { useNotifications } from "../store/notifications";
import { useToast } from "../components/motion/Toast";
import { AnimatedEmoji } from "../components/motion/AnimatedEmoji";
import { Screen, Section } from "../components/layout";
import { useEntitlements } from "../store/entitlements";
import { openPaywall } from "../ai/bus";

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

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

type Tab = "general" | "reading" | "alerts" | "reviews" | "data";

/**
 * Profile - five grouped sub-pages instead of one ~15-section scroll.
 *
 * Everything is still one tap away, but the default view is a short summary so
 * the screen reads as settings rather than a wall of cards.
 */
export function ProfileScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const { mode, toggle } = useThemeMode();
  const settings = useSettings();
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
    dailyPagesGoal,
    setDailyPagesGoal,
    reviewDays,
    toggleReviewDay,
    alarmEnabled,
    setAlarmEnabled,
    alarmTime,
    setAlarmTime,
    notifyEnabled,
    setNotifyEnabled,
    notifyReminder,
    setNotifyReminder,
    notifyReminderTime,
    setNotifyReminderTime,
  } = settings;
  const { t } = useI18n();
  const { user, logout, offline, cloudAvailable } = useAuth();
  const { stats, clearAll, sync, syncing, lastSync, weeklyReviews, saveWeeklyReview } = useData();
  const toast = useToast();
  const { isPro } = useEntitlements();
  const [tab, setTab] = useState<Tab>("general");
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
    <View style={{ flex: 1 }}>
      <GradientMesh />
      <Screen topExtra={14}>
        <Text style={[styles.title, { color: c.text }]}>{t("profile.title")}</Text>

        {/* Identity + plan, always visible. */}
        <Card style={styles.identity}>
          <Logo size={60} animated />
          <Text style={[styles.name, { color: c.text }]}>{user?.displayName ?? t("profile.reader")}</Text>
          <Text style={{ color: c.textMuted, fontSize: 13 }}>{user?.email ?? t("profile.localDevice")}</Text>
          <View style={styles.badgeRow}>
            <Badge
              text={offline ? t("profile.guestMode") : syncing ? t("profile.syncing") : t("profile.synced")}
              tone={offline ? "accent" : "primary"}
            />
            <Badge
              text={isPro ? t("profile.memberPro") : t("profile.memberFree")}
              tone={isPro ? "premium" : "neutral"}
              emoji={isPro ? "✨" : undefined}
            />
          </View>
          {!isPro ? (
            <Button
              label={t("profile.upgrade")}
              variant="premium"
              size="sm"
              fullWidth
              onPress={openPaywall}
              style={{ marginTop: 10 }}
            />
          ) : null}
          {offline && cloudAvailable ? (
            <Text style={{ color: c.textMuted, fontSize: 12, textAlign: "center", marginTop: 4 }}>
              {t("profile.guestHint")}
            </Text>
          ) : null}
        </Card>

        <SegmentedControl
          style={{ marginTop: 16 }}
          value={tab}
          onChange={setTab}
          options={[
            { value: "general", label: t("profile.tabGeneral") },
            { value: "reading", label: t("profile.tabReading") },
            { value: "alerts", label: t("profile.tabNotifications") },
            { value: "reviews", label: t("profile.tabReviews") },
            { value: "data", label: t("profile.tabData") },
          ]}
        />

        {tab === "general" ? (
          <>
            <Section>
              <SectionTitle>{t("profile.appearance")}</SectionTitle>
              <Card>
                <ToggleRow label={t("profile.darkMode")} value={mode === "dark"} onValueChange={toggle} />
                <ToggleRow label={t("profile.reduceMotion")} value={reduceMotion} onValueChange={setReduceMotion} />
              </Card>
            </Section>

            {(canInstall || installed || manualInstall) && (
              <Section>
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
              </Section>
            )}

            <Section>
              <SectionTitle>{t("profile.language")}</SectionTitle>
              <Card>
                <View style={styles.chipRow}>
                  {LANGUAGES.map((l) => (
                    <Chip
                      key={l.code}
                      label={l.native}
                      selected={lang === l.code}
                      onPress={() => {
                        setLang(l.code);
                        // RTL resolves at startup, so reload once the choice is persisted.
                        if (applyRtl(l.code) && typeof window !== "undefined") window.location.reload();
                      }}
                    />
                  ))}
                </View>
              </Card>
            </Section>
          </>
        ) : null}

        {tab === "reading" ? (
          <>
            <Section>
              <SectionTitle>{t("profile.readingGoal")}</SectionTitle>
              <Card>
                <Text style={{ color: c.textMuted, fontSize: 13, marginBottom: 12 }}>
                  {t("profile.dailyTarget", { count: dailyGoalMinutes })}
                </Text>
                <View style={styles.chipRow}>
                  {[15, 20, 30, 45, 60].map((m) => (
                    <Chip key={m} label={`${m}m`} selected={dailyGoalMinutes === m} onPress={() => setDailyGoalMinutes(m)} />
                  ))}
                </View>

                <Text style={[styles.subLabel, { color: c.textMuted }]}>{t("profile.shelfGoal")}</Text>
                <View style={styles.chipRow}>
                  {[150, 250, 320, 450, 600].map((p) => (
                    <Chip key={p} label={`${p}`} selected={shelfGoalPages === p} onPress={() => setShelfGoalPages(p)} />
                  ))}
                </View>

                <Text style={[styles.subLabel, { color: c.textMuted }]}>{t("profile.dailyPages")}</Text>
                <Text style={{ color: c.textMuted, fontSize: 12.5, marginBottom: 8 }}>{t("profile.dailyPagesHint")}</Text>
                <View style={styles.chipRow}>
                  {[5, 10, 15, 20, 30, 50].map((p) => (
                    <Chip
                      key={p}
                      label={t("profile.pagesChip", { count: p })}
                      selected={dailyPagesGoal === p}
                      onPress={() => setDailyPagesGoal(p)}
                      tone="accent"
                    />
                  ))}
                </View>
              </Card>
            </Section>

            <Section>
              <SectionTitle>{t("profile.reviewDays")}</SectionTitle>
              <Card>
                <Text style={{ color: c.textMuted, fontSize: 12.5, marginBottom: 12 }}>{t("profile.reviewDaysHint")}</Text>
                <View style={styles.chipRow}>
                  {WEEKDAYS.map((d, i) => (
                    <Chip
                      key={d}
                      label={t(`weekday.${d}` as never)}
                      selected={reviewDays.includes(i)}
                      onPress={() => toggleReviewDay(i)}
                    />
                  ))}
                </View>
              </Card>
            </Section>

            <Section>
              <SectionTitle>{t("profile.restDays")}</SectionTitle>
              <Card>
                <Text style={{ color: c.textMuted, fontSize: 12.5, marginBottom: 12 }}>{t("profile.restDaysHint")}</Text>
                <View style={styles.chipRow}>
                  {WEEKDAYS.map((d, i) => (
                    <Chip
                      key={d}
                      label={t(`weekday.${d}` as never)}
                      selected={restDays.includes(i)}
                      onPress={() => toggleRestDay(i)}
                      tone="accent"
                    />
                  ))}
                </View>
              </Card>
            </Section>

            <Section>
              <SectionTitle>{t("profile.ritual")}</SectionTitle>
              <Card>
                <Text style={{ color: c.textMuted, fontSize: 12.5, marginBottom: 12 }}>{t("profile.ritualHint")}</Text>
                <View style={styles.chipRow}>
                  {RITUAL_DRINKS.map((d) => (
                    <Chip
                      key={d.id}
                      emoji={d.emoji}
                      label={lang === "ar" ? d.ar : d.en}
                      selected={ritualDrink === d.id}
                      onPress={() => setRitualDrink(d.id)}
                    />
                  ))}
                </View>
                <TimeField
                  label={t("profile.readingTime")}
                  value={readingTime}
                  onCommit={setReadingTime}
                  placeholder="22:30"
                />
              </Card>
            </Section>
          </>
        ) : null}

        {tab === "alerts" ? (
          <>
            <Section>
              <SectionTitle>{t("notif.profile.title")}</SectionTitle>
              <Card style={{ gap: 12 }}>
                <Text style={{ color: c.textMuted, fontSize: 13 }}>{t("notif.profile.hint")}</Text>
                <ToggleRow label={t("notif.profile.enable")} value={notifyEnabled} onValueChange={setNotifyEnabled} />
                <ToggleRow label={t("notif.profile.reminder")} value={notifyReminder} onValueChange={setNotifyReminder} />
                <TimeField
                  label={t("notif.profile.reminderTime")}
                  value={notifyReminderTime}
                  onCommit={setNotifyReminderTime}
                  placeholder="21:30"
                />

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
            </Section>

            <Section>
              <SectionTitle>{t("profile.alarm")}</SectionTitle>
              <Card style={{ gap: 12 }}>
                <Text style={{ color: c.textMuted, fontSize: 12.5 }}>{t("profile.alarmHint")}</Text>
                <ToggleRow label={t("profile.alarmEnable")} value={alarmEnabled} onValueChange={setAlarmEnabled} />
                {alarmEnabled ? (
                  <TimeField label={t("profile.alarmTime")} value={alarmTime} onCommit={setAlarmTime} placeholder="21:00" />
                ) : null}
              </Card>
            </Section>
          </>
        ) : null}

        {tab === "reviews" ? (
          <Section>
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
                  <Text style={{ color: c.textMuted, fontSize: 12.5, fontWeight: "800" }}>{t("review.history")}</Text>
                  {(isPro ? weeklyReviews : weeklyReviews.slice(0, 1)).map((r) => (
                    <View key={r.id} style={[styles.reviewItem, { borderColor: c.border }]}>
                      <Text style={{ color: c.text, fontSize: 13, fontWeight: "800" }}>
                        {t("review.week", { date: r.week_start.slice(5) })}
                      </Text>
                      {r.good ? <Text style={{ color: c.textMuted, fontSize: 12.5, marginTop: 2 }}>＋ {r.good}</Text> : null}
                      {r.to_improve ? (
                        <Text style={{ color: c.textMuted, fontSize: 12.5, marginTop: 2 }}>→ {r.to_improve}</Text>
                      ) : null}
                    </View>
                  ))}
                  {!isPro && weeklyReviews.length > 1 ? (
                    <Pressable onPress={openPaywall} accessibilityRole="button">
                      <Text style={{ color: c.premium, fontSize: 12.5, fontWeight: "800" }}>
                        {t("paywall.reviewsPro")} ›
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </Card>
          </Section>
        ) : null}

        {tab === "data" ? (
          <>
            <Section>
              <SectionTitle>{t("profile.yourNumbers")}</SectionTitle>
              <Card>
                <StatRow label={t("profile.currentStreak")} value={t("profile.daysValue", { count: stats.streak })} />
                <StatRow label={t("profile.bestStreak")} value={t("profile.daysValue", { count: stats.bestStreak })} />
                <StatRow
                  label={t("profile.totalReading")}
                  value={t("profile.hoursValue", { count: Math.round(stats.totalMinutes / 60) })}
                />
                <StatRow label={t("profile.pagesRead")} value={`${stats.totalPages}`} />
              </Card>
            </Section>

            <Section>
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
            </Section>

            <Text style={[styles.footer, { color: c.textFaint }]}>{t("app.footer")}</Text>
          </>
        ) : null}
      </Screen>
    </View>
  );
}

/** `HH:MM` field that only commits a valid 24-hour time. */
function TimeField({
  label,
  value,
  onCommit,
  placeholder,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
}) {
  const theme = useTheme();
  const c = theme.colors;
  const { t } = useI18n();
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);
  // Tracks the last committed value so a parent-driven change re-seeds the field
  // during render instead of in an effect.
  const [seed, setSeed] = useState(value);

  if (value !== seed) {
    setSeed(value);
    setDraft(value);
    setInvalid(false);
  }

  const commit = () => {
    if (HHMM.test(draft)) {
      setInvalid(false);
      setSeed(draft);
      onCommit(draft);
    } else {
      setInvalid(true);
      setDraft(value);
    }
  };

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={[styles.subLabel, { color: c.textMuted, marginTop: 0 }]}>{label}</Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onBlur={commit}
        onSubmitEditing={commit}
        placeholder={placeholder}
        placeholderTextColor={c.textFaint}
        keyboardType="numbers-and-punctuation"
        style={[
          styles.timeInput,
          { color: c.text, borderColor: invalid ? c.danger : c.border, backgroundColor: c.surfaceAlt },
        ]}
      />
      {invalid ? <Text style={{ color: c.danger, fontSize: 12, marginTop: 5 }}>{t("profile.timeInvalid")}</Text> : null}
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
      <Text style={{ color: c.text, fontSize: 14, fontWeight: "800" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: "900", letterSpacing: -1 },
  identity: { marginTop: 14, alignItems: "center", gap: 8, paddingVertical: 24 },
  name: { fontSize: 19, fontWeight: "900" },
  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  subLabel: { fontSize: 12.5, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  timeInput: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontWeight: "800" },
  input: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  multiline: { minHeight: 68, textAlignVertical: "top" },
  reviewItem: { borderLeftWidth: 3, borderColor: "transparent", paddingLeft: 12, paddingVertical: 6 },
  statRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
  footer: { textAlign: "center", fontSize: 11.5, marginTop: 26 },
});
