import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../Text";
import { useTheme } from "../../theme/ThemeProvider";
import { useI18n } from "../../i18n";

/** Placeholder shown when a reader has no data for a chart yet. */
export function ChartEmpty({ icon = "📊", messageKey = "analytics.empty" as const }) {
  const c = useTheme().colors;
  const { t } = useI18n();
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.text, { color: c.textMuted }]}>{t(messageKey)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: 30, gap: 8 },
  icon: { fontSize: 26, opacity: 0.7 },
  text: { fontSize: 13, textAlign: "center", maxWidth: 260, lineHeight: 19 },
});
