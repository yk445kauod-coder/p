import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";

/**
 * Shared bottom-sheet chrome.
 *
 * Every sheet in the app uses this so the backdrop, drag handle, keyboard
 * behaviour, and safe-area padding stay identical. `scroll` wraps the content in
 * a ScrollView for forms that can grow taller than the viewport.
 */
export function SheetFrame({
  visible,
  onClose,
  children,
  scroll = false,
  maxHeight = "92%",
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  scroll?: boolean;
  maxHeight?: string | number;
}) {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const body = (
    <>
      <View style={[styles.handle, { backgroundColor: c.border }]} />
      {children}
    </>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: c.overlay }]}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Close" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {scroll ? (
            <ScrollView
              style={[
                styles.sheet,
                theme.shadowLg,
                { backgroundColor: c.bgElevated, maxHeight: maxHeight as never, paddingBottom: Math.max(insets.bottom, 16) },
              ]}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {body}
            </ScrollView>
          ) : (
            <View
              style={[
                styles.sheet,
                theme.shadowLg,
                { backgroundColor: c.bgElevated, paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              {body}
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  dismiss: { flex: 1 },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10 },
  content: { paddingBottom: 8 },
  handle: { width: 44, height: 5, borderRadius: 999, alignSelf: "center", marginBottom: 14 },
});
