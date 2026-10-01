import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../api/client";
import { useTheme } from "../theme/ThemeProvider";
import { useData } from "../store/data";
import { Logo } from "./Logo";
import { useI18n } from "../i18n";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

const SUGGESTION_KEYS = ["ai.suggest1", "ai.suggest2", "ai.suggest3"] as const;

export function AIChatSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { stats, books } = useData();
  const { t } = useI18n();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => inputRef.current?.focus(), 320);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;
      const userMsg: Message = { id: `${Date.now()}u`, role: "user", content };
      const next = [...messages, userMsg];
      setMessages(next);
      setInput("");
      setBusy(true);
      setError(null);

      const currentBook = books.find((b) => b.status === "reading");
      const bookContext = [
        `streak=${stats.streak} days`,
        `today=${stats.todayMinutes} min`,
        `week=${stats.weekMinutes} min`,
        currentBook ? `currently reading="${currentBook.title}"` : null,
      ]
        .filter(Boolean)
        .join(", ");

      try {
        const { message } = await api.chat(
          next.map((m) => ({ role: m.role, content: m.content })),
          bookContext,
        );
        setMessages((prev) => [...prev, { id: `${Date.now()}a`, role: "assistant", content: message.content }]);
      } catch (e) {
        setError(t("ai.error"));
      } finally {
        setBusy(false);
      }
    },
    [busy, messages, books, stats, t],
  );

  const renderItem = ({ item }: { item: Message }) => {
    const mine = item.role === "user";
    return (
      <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
        {!mine && (
          <View style={styles.avatar}>
            <Logo size={26} markOnly />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            mine
              ? { backgroundColor: c.primary, borderTopRightRadius: 6 }
              : { backgroundColor: c.surfaceAlt, borderTopLeftRadius: 6 },
          ]}
        >
          <Text style={[styles.bubbleText, { color: mine ? c.bgElevated : c.text }]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onClose} accessibilityLabel="Close chat" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[
            styles.sheet,
            { backgroundColor: c.bgElevated, paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.border }]} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Logo size={30} markOnly animated />
              <View>
                <Text style={[styles.title, { color: c.text }]}>{t("ai.title")}</Text>
                <Text style={[styles.subtitle, { color: c.textMuted }]}>{t("ai.subtitle")}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <Text style={[styles.close, { color: c.textMuted }]}>✕</Text>
            </Pressable>
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

          {busy && (
            <View style={styles.thinking}>
              <ActivityIndicator size="small" color={c.primary} />
              <Text style={[styles.thinkingText, { color: c.textMuted }]}>{t("ai.thinking")}</Text>
            </View>
          )}
          {error && <Text style={[styles.error, { color: c.danger }]}>{error}</Text>}

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
              style={[
                styles.send,
                { backgroundColor: input.trim() && !busy ? c.primary : c.surfaceAlt },
              ]}
              accessibilityLabel="Send message"
            >
              <Text style={{ color: input.trim() && !busy ? c.bgElevated : c.textFaint, fontSize: 18 }}>
                ↑
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  backdropTouch: { flex: 1 },
  sheet: {
    maxHeight: "82%",
    minHeight: "55%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: { width: 44, height: 5, borderRadius: 999, alignSelf: "center", marginBottom: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 17, fontWeight: "700" },
  subtitle: { fontSize: 12 },
  close: { fontSize: 18, paddingHorizontal: 6 },
  empty: { flex: 1, justifyContent: "center", gap: 8, paddingVertical: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyBody: { fontSize: 14, lineHeight: 20 },
  chips: { marginTop: 14, gap: 8 },
  chip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  chipText: { fontSize: 13.5 },
  list: { paddingVertical: 8, gap: 12 },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, maxWidth: "92%" },
  bubbleRowMine: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  avatar: { marginBottom: 2 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleText: { fontSize: 14.5, lineHeight: 21 },
  thinking: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  thinkingText: { fontSize: 13 },
  error: { fontSize: 13, paddingVertical: 6 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderWidth: 1,
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    marginTop: 6,
  },
  input: { flex: 1, fontSize: 15, maxHeight: 110, paddingVertical: 8 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
