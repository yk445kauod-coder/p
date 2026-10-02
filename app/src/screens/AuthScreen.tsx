import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useAuth, AuthError } from "../store/auth";
import { Button, Card } from "../components/ui";
import { Logo } from "../components/Logo";
import { GridBackground, AuroraBackdrop, ReadingConstellation } from "../components/visuals";
import { useI18n } from "../i18n";
import { Lottie } from "../components/motion/Lottie";
import { useConfetti } from "../components/motion/Confetti";
import { supabaseConfigured } from "../lib/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Mode = "login" | "register";

function passwordScore(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

export function AuthScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { login, register, signInLocal } = useAuth();
  const { t } = useI18n();
  const confetti = useConfetti();

  const [mode, setMode] = useState<Mode>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [success, setSuccess] = useState(false);

  const emailError = touched.email && email.length > 0 && !EMAIL_RE.test(email.trim()) ? t("auth.emailInvalid") : null;
  const passwordError =
    touched.password && password.length > 0 && password.length < 8 ? t("auth.passwordMin") : null;

  const strength = useMemo(() => passwordScore(password), [password]);
  const strengthLabels = [t("auth.strengthWeak"), t("auth.strengthFair"), t("auth.strengthGood"), t("auth.strengthStrong")];
  const strengthColors = [c.danger, c.warning, c.warning, c.success];

  const canSubmit =
    EMAIL_RE.test(email.trim()) && password.length >= 8 && (mode === "login" || name.trim().length > 0 || true);

  const submit = async () => {
    setTouched({ email: true, password: true });
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(email.trim(), password, name.trim() || undefined);
      confetti.burst({ emojis: ["🎉", "📚", "✨", "🔥"], count: 24 });
      setSuccess(true);
    } catch (e) {
      const code = e instanceof AuthError ? e.code : (e as Error).message;
      const map: Record<string, string> = {
        email_taken: t("auth.errTaken"),
        invalid_credentials: t("auth.errCredentials"),
        weak_password: t("auth.errWeak"),
        invalid_email: t("auth.errEmail"),
        email_unconfirmed: t("auth.confirmEmail"),
        rate_limited: t("auth.errNetwork"),
        cloud_unavailable: t("auth.errNetwork"),
        network: t("auth.errNetwork"),
      };
      setError(map[code] ?? t("auth.errNetwork"));
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <GridBackground />
        <Lottie source={require("../../assets/lottie/success.json")} size={180} />
        <Text style={[styles.successTitle, { color: c.text }]}>{t("auth.success")}</Text>
        <Text style={{ color: c.textMuted, fontSize: 14 }}>{t("auth.successBody")}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GridBackground />
      <AuroraBackdrop />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 36, paddingBottom: 40, paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Logo size={88} animated />
            <Text style={[styles.brand, { color: c.text }]}>TraceBook</Text>
            <Text style={[styles.tagline, { color: c.textMuted }]}>
              {mode === "login" ? t("auth.signInSubtitle") : t("auth.createSubtitle")}
            </Text>
          </View>

          <View style={styles.constellation}>
            <ReadingConstellation size={120} />
          </View>

          <Card style={{ marginTop: 18 }} elevated>
            <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]}>
              {(["register", "login"] as Mode[]).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => {
                    setMode(m);
                    setError(null);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: mode === m }}
                  style={[styles.segmentItem, mode === m && { backgroundColor: c.surface }]}
                >
                  <Text style={{ color: mode === m ? c.text : c.textMuted, fontWeight: "700", fontSize: 14 }}>
                    {m === "register" ? t("auth.createAccount") : t("auth.signIn")}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mode === "register" && (
              <>
                <Text style={[styles.label, { color: c.textMuted }]}>{t("auth.name")}</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={t("auth.namePlaceholder")}
                  placeholderTextColor={c.textFaint}
                  autoComplete="name"
                  style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                />
              </>
            )}

            <Text style={[styles.label, { color: c.textMuted }]}>{t("auth.email")}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              onBlur={() => setTouched((v) => ({ ...v, email: true }))}
              placeholder="you@example.com"
              placeholderTextColor={c.textFaint}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
              style={[
                styles.input,
                {
                  color: c.text,
                  borderColor: emailError ? c.danger : c.border,
                  backgroundColor: c.surface,
                },
              ]}
            />
            {emailError ? <Text style={[styles.help, { color: c.danger }]}>{emailError}</Text> : null}

            <Text style={[styles.label, { color: c.textMuted }]}>{t("auth.password")}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                onBlur={() => setTouched((v) => ({ ...v, password: true }))}
                placeholder={t("auth.passwordPlaceholder")}
                placeholderTextColor={c.textFaint}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    color: c.text,
                    borderColor: passwordError ? c.danger : c.border,
                    backgroundColor: c.surface,
                  },
                ]}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                style={styles.eye}
              >
                <Text style={{ fontSize: 16 }}>{showPassword ? "🙈" : "👁️"}</Text>
              </Pressable>
            </View>
            {passwordError ? <Text style={[styles.help, { color: c.danger }]}>{passwordError}</Text> : null}

            {mode === "register" && password.length > 0 ? (
              <View style={styles.strengthRow}>
                <View style={styles.strengthBars}>
                  {[0, 1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthBar,
                        { backgroundColor: i < strength ? strengthColors[strength - 1] : c.surfaceAlt },
                      ]}
                    />
                  ))}
                </View>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>
                  {strengthLabels[Math.max(0, strength - 1)]}
                </Text>
              </View>
            ) : null}

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: c.dangerSoft, borderColor: c.danger }]}>
                <Text style={{ color: c.danger, fontSize: 13 }}>{error}</Text>
              </View>
            ) : null}

            <Button
              label={mode === "login" ? t("auth.signIn") : t("auth.createAccount")}
              onPress={submit}
              loading={busy}
              disabled={!canSubmit}
              fullWidth
              style={{ marginTop: 16 }}
            />

            {supabaseConfigured ? (
              <>
                <View style={styles.dividerRow}>
                  <View style={[styles.divider, { backgroundColor: c.border }]} />
                  <Text style={{ color: c.textFaint, fontSize: 12 }}>{t("auth.or")}</Text>
                  <View style={[styles.divider, { backgroundColor: c.border }]} />
                </View>
                <Button label={t("auth.continueGuest")} variant="ghost" onPress={signInLocal} fullWidth />
                <Text style={[styles.guestHint, { color: c.textFaint }]}>{t("auth.guestNotice")}</Text>
              </>
            ) : (
              <Button
                label={t("auth.continueGuest")}
                variant="ghost"
                onPress={signInLocal}
                fullWidth
                style={{ marginTop: 12 }}
              />
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  successTitle: { fontSize: 24, fontWeight: "800", marginTop: 8 },
  hero: { alignItems: "center", gap: 8 },
  brand: { fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  tagline: { fontSize: 14.5, textAlign: "center", maxWidth: 300 },
  constellation: { alignItems: "center", marginTop: 16 },
  segment: { flexDirection: "row", borderRadius: 14, padding: 4, gap: 4, marginBottom: 10 },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: "center" },
  label: { fontSize: 12.5, fontWeight: "600", marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  passwordRow: { position: "relative", justifyContent: "center" },
  passwordInput: { paddingRight: 46 },
  eye: { position: "absolute", right: 12, padding: 6 },
  help: { fontSize: 12, marginTop: 5 },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  strengthBars: { flexDirection: "row", gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 5, borderRadius: 999 },
  errorBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 14 },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  guestHint: { fontSize: 11.5, textAlign: "center", marginTop: 8 },
});
