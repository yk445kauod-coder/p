import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, useThemeMode } from "../theme/ThemeProvider";
import { useSettings } from "../store/settings";
import { useAuth } from "../store/auth";
import { useData } from "../store/data";
import { Card, SectionTitle, Button, Badge } from "../components/ui";
import { Logo } from "../components/Logo";
import { GridBackground } from "../components/visuals";
import { useI18n } from "../i18n";
import { LANGUAGES, applyRtl } from "../i18n";
import { usePwaInstall } from "../pwa/install";

export function ProfileScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const { mode, toggle } = useThemeMode();
  const { dailyGoalMinutes, setDailyGoalMinutes, reduceMotion, setReduceMotion, lang, setLang } = useSettings();
  const { t } = useI18n();
  const { user, logout, offline } = useAuth();
  const { stats, clearAll, sync, syncing, lastSync } = useData();
  const insets = useSafeAreaInsets();
  const [confirmClear, setConfirmClear] = useState(false);
  const { available: canInstall, installed, manual: manualInstall, promptInstall } = usePwaInstall();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GridBackground />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 140, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: c.text }]}>{t("profile.title")}</Text>

        <Card style={{ marginTop: 14, alignItems: "center", gap: 8, paddingVertical: 24 }}>
          <Logo size={64} animated />
          <Text style={[styles.name, { color: c.text }]}>{user?.displayName ?? t("profile.reader")}</Text>
          <Text style={{ color: c.textMuted, fontSize: 13 }}>{user?.email ?? t("profile.localDevice")}</Text>
          <Badge text={offline ? t("profile.offlineMode") : syncing ? t("profile.syncing") : t("profile.synced")} tone={offline ? "accent" : "primary"} />
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
                  <Button label={t("profile.install")} onPress={() => { void promptInstall(); }} />
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
                    // RTL needs a restart to take effect; the choice is persisted first.
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

        <SectionTitle>{t("profile.readingGoal")}</SectionTitle>
        <Card>
          <Text style={{ color: c.textMuted, fontSize: 13, marginBottom: 12 }}>
            {t("profile.dailyTarget", { count: dailyGoalMinutes })}
          </Text>
          <View style={styles.goalRow}>
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
                  <Text style={{ color: active ? c.primary : c.textMuted, fontWeight: "700", fontSize: 13 }}>
                    {m}m
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
            {lastSync
              ? t("profile.lastSync", { when: new Date(lastSync).toLocaleString() })
              : t("profile.notSynced")}
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

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const c = useTheme().colors;
  return (
    <View style={styles.toggleRow}>
      <Text style={{ color: c.text, fontSize: 15 }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: c.primary, false: c.surfaceAlt }}
        thumbColor="#fff"
      />
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
  goalRow: { flexDirection: "row", gap: 8 },
  goalChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  langRow: { flexDirection: "row", gap: 10 },
  langChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
  statRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
  footer: { textAlign: "center", fontSize: 11.5, marginTop: 26 },
});
