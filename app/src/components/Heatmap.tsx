import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import type { DayStat } from "../store/data";

/** 30-day reading heatmap, GitHub-contribution style. */
export function Heatmap({ days, onSelect }: { days: DayStat[]; onSelect?: (d: DayStat) => void }) {
  const theme = useTheme();
  const c = theme.colors;
  const max = Math.max(30, ...days.map((d) => d.minutes));

  const shade = (minutes: number) => {
    if (minutes <= 0) return c.surfaceAlt;
    const level = Math.min(1, minutes / max);
    return level > 0.66 ? c.primary : level > 0.33 ? `${c.primary}99` : `${c.primary}55`;
  };

  return (
    <View style={styles.grid}>
      {days.map((d) => (
        <Pressable
          key={d.date}
          onPress={() => onSelect?.(d)}
          accessibilityLabel={`${d.date}: ${d.minutes} minutes, ${d.pages} pages`}
          style={[styles.cell, { backgroundColor: shade(d.minutes), borderColor: c.border }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cell: { width: 20, height: 20, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth },
});
