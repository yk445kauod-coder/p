import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useAuth } from "../store/auth";
import { Button, Card } from "../components/ui";
import { Logo } from "../components/Logo";
import { GridBackground, AuroraBackdrop, ReadingConstellation } from "../components/visuals";
import { API_BASE } from "../api/client";
import { useI18n } from "../i18n";

export function AuthScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { login, register, signInLocal } = useAuth();
  const { t } = useI18n();

  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(email.trim(), password, name.trim() || undefined);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("email_taken")) setError(t("auth.errTaken"));
      else if (msg.includes("invalid_credentials")) setError(t("auth.errCredentials"));
      else if (msg.includes("weak_password")) setError(t("auth.errWeak"));
      else if (msg.includes("invalid_email")) setError(t("auth.errEmail"));
      else setError(t("auth.errNetwork"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GridBackground />
      <AuroraBackdrop />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 40,
            paddingBottom: 40,
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <Logo size={96} animated />
            <Text style={[styles.brand, { color: c.text }]}>TraceBook</Text>
            <Text style={[styles.tagline, { color: c.textMuted }]}>{t("app.tagline")}</Text>
          </View>

          <View style={styles.constellation}>
            <ReadingConstellation size={140} />
          </View>

          <Card style={{ marginTop: 20 }}>
            <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]}>
              {(["register", "login"] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
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
                  style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                />
              </>
            )}

            <Text style={[styles.label, { color: c.textMuted }]}>{t("auth.email")}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={c.textFaint}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
            />

            <Text style={[styles.label, { color: c.textMuted }]}>{t("auth.password")}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.passwordPlaceholder")}
              placeholderTextColor={c.textFaint}
              secureTextEntry
              style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
            />

            {error && <Text style={{ color: c.danger, fontSize: 13, marginTop: 10 }}>{error}</Text>}

            <Button
              label={mode === "login" ? t("auth.signIn") : t("auth.createAccount")}
              onPress={submit}
              loading={busy}
              disabled={!email.trim() || password.length < 8}
              style={{ marginTop: 16 }}
            />
            <Pressable onPress={signInLocal} style={{ marginTop: 14, alignItems: "center" }}>
              <Text style={{ color: c.primary, fontSize: 13.5, fontWeight: "600" }}>
                {t("auth.continueOffline")}
              </Text>
            </Pressable>
          </Card>

          <Text style={[styles.apiHint, { color: c.textFaint }]}>
            API: {API_BASE}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: 8 },
  brand: { fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  tagline: { fontSize: 14.5, textAlign: "center" },
  constellation: { alignItems: "center", marginTop: 18 },
  segment: { flexDirection: "row", borderRadius: 14, padding: 4, gap: 4, marginBottom: 10 },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: "center" },
  label: { fontSize: 12.5, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  apiHint: { textAlign: "center", fontSize: 11, marginTop: 18 },
});
