import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Switch, View } from "react-native";
import { Text, TextInput } from "./Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useData } from "../store/data";
import { useSettings } from "../store/settings";
import { Logo } from "./Logo";
import { useI18n } from "../i18n";
import { useAuth } from "../store/auth";
import { useEntitlements } from "../store/entitlements";
import { askAgent, streamAgent, AgentError, type AgentToolCall, type ChatTurn } from "../api/agent";
import { openPaywall } from "../ai/bus";
import { useToast } from "./motion/Toast";
import { useConfetti } from "./motion/Confetti";
import { AnimatedEmoji } from "./motion/AnimatedEmoji";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools?: AgentToolCall[];
  pending?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Seeds the conversation, e.g. from a Stats "analyse my month" button. */
  seed?: string | null;
}

const SUGGESTION_KEYS = ["ai.suggest1", "ai.suggest2", "ai.suggest3", "ai.suggest4", "ai.suggest5"] as const;

/** Turns a tool call into a short, human line for the action timeline. */
function describeTool(call: AgentToolCall, lang: "en" | "ar"): string {
  const a = call.args ?? {};
  const n = (k: string) => (typeof a[k] === "number" || typeof a[k] === "string" ? String(a[k]) : undefined);
  const map: Record<string, { en: string; ar: string }> = {
    get_reading_stats: { en: `Read your stats${n("days") ? ` (${n("days")}d)` : ""}`, ar: `قرا إحصائياتك${n("days") ? ` (${n("days")} يوم)` : ""}` },
    list_books: { en: "Looked at your shelf", ar: "بص على رفّك" },
    list_recent_sessions: { en: "Read recent sessions", ar: "قرا الجلسات الأخيرة" },
    list_goals: { en: "Checked your goals", ar: "شاف أهدافك" },
    list_quotes: { en: "Read your quotes", ar: "قرا اقتباساتك" },
    log_session: { en: `Logged ${n("minutes") ?? "?"} min`, ar: `سجّل ${n("minutes") ?? "؟"} دقيقة` },
    add_book: { en: `Added “${n("title") ?? "a book"}”`, ar: `ضاف “${n("title") ?? "كتاب"}”` },
    set_goal: { en: `Set a ${n("target") ?? "?"} ${n("kind") ?? "goal"}`, ar: `حدّد هدف ${n("target") ?? "؟"} ${n("kind") ?? ""}` },
  };
  const entry = map[call.name];
  if (!entry) return call.name.replace(/_/g, " ");
  return lang === "ar" ? entry.ar : entry.en;
}

const TOOL_EMOJI: Record<string, string> = {
  get_reading_stats: "📊",
  list_books: "📚",
  list_recent_sessions: "⏱️",
  list_goals: "🎯",
  list_quotes: "✍️",
  log_session: "✅",
  add_book: "➕",
  set_goal: "🎯",
};

export function AIChatSheet({ visible, onClose, seed }: Props) {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { stats, books, sessions, goals, sync } = useData();
  const { dailyGoalMinutes } = useSettings();
  const { offline } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();
  const confetti = useConfetti();
  const { canSendAI, aiMessagesLeft, isPro, recordAIMessage } = useEntitlements();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowActions, setAllowActions] = useState(true);
  const listRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const seedSent = useRef<string | null>(null);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => inputRef.current?.focus(), 320);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const buildContext = useCallback(() => {
    const current = books.find((b) => b.status === "reading");
    return [
      `streak=${stats.streak}d`,
      `today=${stats.todayMinutes}min/${dailyGoalMinutes}min`,
      `week=${stats.weekMinutes}min`,
      `books=${books.length}`,
      `sessions=${sessions.length}`,
      `goals=${goals.length}`,
      current ? `reading="${current.title}" (page ${current.current_page}/${current.total_pages})` : "no book in progress",
      `lang=${lang}`,
    ].join(", ");
  }, [books, dailyGoalMinutes, goals.length, lang, sessions.length, stats.streak, stats.todayMinutes, stats.weekMinutes]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;

      // Free readers get a daily coach allowance; hitting it opens the paywall
      // instead of failing silently.
      if (!offline && !canSendAI) {
        openPaywall();
        return;
      }

      const userMsg: Message = { id: `${Date.now()}u`, role: "user", content };
      const assistantId = `${Date.now()}a`;
      const history: ChatTurn[] = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "", pending: true, tools: [] },
      ]);
      setInput("");
      setBusy(true);
      setError(null);
      recordAIMessage();

      const patch = (fn: (m: Message) => Message) =>
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)));

      // Guests have no cloud session, so the agent (which needs auth) is skipped.
      if (offline) {
        patch((m) => ({
          ...m,
          pending: false,
          content: t("ai.guestNoAgent"),
        }));
        setBusy(false);
        return;
      }

      let wrote = false;
      try {
        await streamAgent(
          { messages: history, context: buildContext(), allowActions },
          {
            onToken: (chunk) => patch((m) => ({ ...m, content: m.content + chunk, pending: false })),
            onTool: (call) => {
              if (["log_session", "add_book", "set_goal"].includes(call.name) && call.ok) wrote = true;
              patch((m) => ({ ...m, tools: [...(m.tools ?? []), call] }));
            },
          },
        );
        patch((m) => ({ ...m, pending: false }));
        if (wrote) {
          await sync();
          confetti.burst({ emojis: ["✅", "📚", "✨"], count: 14 });
          toast.show(t("ai.dataUpdated"), { emoji: "✅", tone: "success" });
        }
      } catch (e) {
        const code = e instanceof AgentError ? e.message : "";
        if (code === "unauthorized") {
          // Session lapsed mid-conversation; fall back so the user still gets an answer.
          try {
            const reply = await askAgent({ messages: history, context: buildContext(), allowActions: false });
            patch((m) => ({ ...m, content: reply.content, pending: false, tools: reply.toolCalls }));
          } catch {
            setError(t("ai.error"));
            patch((m) => ({ ...m, pending: false, content: "" }));
          }
        } else {
          setError(t("ai.error"));
          patch((m) => ({ ...m, pending: false }));
        }
      } finally {
        setBusy(false);
      }
    },
    [allowActions, buildContext, busy, canSendAI, confetti, messages, offline, recordAIMessage, sync, t, toast],
  );

  // A seed prompt (e.g. from Stats) is sent once when the sheet opens.
  useEffect(() => {
    if (!visible || !seed) {
      seedSent.current = null;
      return;
    }
    if (seedSent.current === seed) return;
    seedSent.current = seed;
    send(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, seed]);

  const renderItem = ({ item }: { item: Message }) => {
    const mine = item.role === "user";
    return (
      <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
        {!mine && (
          <View style={styles.avatar}>
            <Logo size={26} markOnly />
          </View>
        )}
        <View style={styles.bubbleCol}>
          {item.tools && item.tools.length > 0 ? (
            <View style={[styles.toolsBox, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <Text style={[styles.toolsTitle, { color: c.textMuted }]}>{t("ai.tools")}</Text>
              {item.tools.map((tool, i) => (
                <View key={`${tool.name}-${i}`} style={styles.toolRow}>
                  <Text style={{ fontSize: 13 }}>{TOOL_EMOJI[tool.name] ?? "🔧"}</Text>
                  <Text style={[styles.toolText, { color: tool.ok === false ? c.danger : c.text }]} numberOfLines={1}>
                    {describeTool(tool, lang)}
                  </Text>
                  <Text style={{ fontSize: 12 }}>{tool.ok === false ? "⚠️" : "✓"}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {item.pending && !item.content ? (
            <View style={[styles.bubble, { backgroundColor: c.surfaceAlt, borderTopLeftRadius: 6 }]}>
              <View style={styles.thinkingInline}>
                <ActivityIndicator size="small" color={c.primary} />
                <Text style={{ color: c.textMuted, fontSize: 13 }}>{t("ai.thinking")}</Text>
              </View>
            </View>
          ) : item.content ? (
            <View
              style={[
                styles.bubble,
                mine
                  ? { backgroundColor: c.primary, borderTopRightRadius: 6 }
                  : { backgroundColor: c.surfaceAlt, borderTopLeftRadius: 6 },
              ]}
            >
              <Text style={[styles.bubbleText, { color: mine ? c.onPrimary : c.text }]}>{item.content}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: c.overlay }]}>
        <Pressable style={styles.backdropTouch} onPress={onClose} accessibilityLabel="Close chat" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.sheet, theme.shadowLg, { backgroundColor: c.bgElevated, paddingBottom: Math.max(insets.bottom, 12) }]}
        >
          <View style={[styles.handle, { backgroundColor: c.border }]} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <AnimatedEmoji size={26} loop>🔖</AnimatedEmoji>
              <View>
                <Text style={[styles.title, { color: c.text }]}>{t("ai.title")}</Text>
                <Text style={[styles.subtitle, { color: c.textMuted }]}>{t("ai.subtitle")}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              {messages.length > 0 ? (
                <Pressable onPress={() => setMessages([])} hitSlop={10} accessibilityLabel={t("ai.clear")}>
                  <Text style={[styles.headerAction, { color: c.textMuted }]}>{t("ai.clear")}</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={t("common.close")}>
                <Text style={[styles.close, { color: c.textMuted }]}>✕</Text>
              </Pressable>
            </View>
          </View>

          {/* Agent capability switch */}
          <View style={[styles.agentRow, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}>
            <Text style={{ fontSize: 14 }}>{allowActions ? "🛠️" : "👀"}</Text>
            <Text style={[styles.agentText, { color: c.textMuted }]}>
              {allowActions ? t("ai.actionsOn") : t("ai.actionsOff")}
            </Text>
            <Switch
              value={allowActions}
              onValueChange={setAllowActions}
              trackColor={{ true: c.primary, false: c.border }}
              thumbColor="#fff"
            />
          </View>

          {messages.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: c.text }]}>{t("ai.emptyTitle")}</Text>
              <Text style={[styles.emptyBody, { color: c.textMuted }]}>{t("ai.emptyBody")}</Text>
              <View style={styles.chips}>
                {SUGGESTION_KEYS.map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => send(t(k))}
                    style={[styles.chip, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}
                  >
                    <Text style={[styles.chipText, { color: c.text }]}>{t(k)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            />
          )}

          {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}

          {/* Free readers see how much coach time is left; Pro sees nothing. */}
          {!offline && !isPro ? (
            canSendAI ? (
              <Text style={[styles.quota, { color: c.textFaint }]}>
                {t("ai.quotaLeft", { count: aiMessagesLeft })}
              </Text>
            ) : (
              <Pressable onPress={openPaywall} accessibilityRole="button" style={styles.quotaCta}>
                <Text style={{ color: c.premium, fontSize: 12.5, fontWeight: "800" }}>
                  {t("ai.quotaOut")}
                </Text>
              </Pressable>
            )
          ) : null}

          <View style={[styles.inputRow, { borderColor: c.border, backgroundColor: c.surface }]}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder={t("ai.placeholder")}
              placeholderTextColor={c.textFaint}
              style={[styles.input, { color: c.text }]}
              multiline
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
            />
            <Pressable
              onPress={() => send(input)}
              disabled={!input.trim() || busy}
              style={[styles.send, { backgroundColor: input.trim() && !busy ? c.primary : c.surfaceAlt }]}
              accessibilityLabel="Send message"
            >
              <Text style={{ color: input.trim() && !busy ? c.onPrimary : c.textFaint, fontSize: 18 }}>↑</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  backdropTouch: { flex: 1 },
  sheet: { maxHeight: "86%", minHeight: "58%", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10 },
  handle: { width: 44, height: 5, borderRadius: 999, alignSelf: "center", marginBottom: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 14 },
  headerAction: { fontSize: 12.5, fontWeight: "700" },
  title: { fontSize: 17, fontWeight: "700" },
  subtitle: { fontSize: 12 },
  close: { fontSize: 18, paddingHorizontal: 6 },
  agentRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8 },
  agentText: { flex: 1, fontSize: 12.5, fontWeight: "600" },
  empty: { flex: 1, justifyContent: "center", gap: 8, paddingVertical: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyBody: { fontSize: 14, lineHeight: 20 },
  chips: { marginTop: 14, gap: 8 },
  chip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  chipText: { fontSize: 13.5 },
  list: { paddingVertical: 8, gap: 12 },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, maxWidth: "94%" },
  bubbleRowMine: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  bubbleCol: { gap: 6, flexShrink: 1 },
  avatar: { marginBottom: 2 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleText: { fontSize: 14.5, lineHeight: 21 },
  thinkingInline: { flexDirection: "row", alignItems: "center", gap: 8 },
  toolsBox: { borderWidth: 1, borderRadius: 14, padding: 10, gap: 6 },
  toolsTitle: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  toolRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  toolText: { flex: 1, fontSize: 13 },
  error: { fontSize: 13, paddingVertical: 6 },
  quota: { fontSize: 11.5, paddingTop: 8, textAlign: "center" },
  quotaCta: { paddingTop: 8, paddingBottom: 2, alignItems: "center" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, borderWidth: 1, borderRadius: 22, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, marginTop: 6 },
  input: { flex: 1, fontSize: 15, maxHeight: 110, paddingVertical: 8 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
