import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { Text } from "../Text";
import { useTheme } from "../../theme/ThemeProvider";
import { useI18n } from "../../i18n";
import { categoryLabel } from "../../domain/achievements";
import type { GenreDatum } from "./types";

export interface GenreDistributionChartProps {
  data: GenreDatum[];
  compact?: boolean;
}

const TAU = Math.PI * 2;

/** Donut slice path between two angles, with the inner radius cut out. */
function arcPath(cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number): string {
  const x0 = cx + rOuter * Math.cos(a0);
  const y0 = cy + rOuter * Math.sin(a0);
  const x1 = cx + rOuter * Math.cos(a1);
  const y1 = cy + rOuter * Math.sin(a1);
  const x2 = cx + rInner * Math.cos(a1);
  const y2 = cy + rInner * Math.sin(a1);
  const x3 = cx + rInner * Math.cos(a0);
  const y3 = cy + rInner * Math.sin(a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${x0} ${y0}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x1} ${y1}`,
    `L ${x2} ${y2}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x3} ${y3}`,
    "Z",
  ].join(" ");
}

/**
 * Native fallback for the genre donut.
 *
 * Draws the same chart with react-native-svg so the APK keeps parity with the
 * web build without shipping a DOM-only dependency.
 */
export function GenreDistributionChart({ data, compact }: GenreDistributionChartProps) {
  const theme = useTheme();
  const c = theme.colors;
  const { t, lang } = useI18n();
  const { width } = useWindowDimensions();
  const [active, setActive] = useState<string | null>(null);

  const colors = useMemo(
    () =>
      theme.mode === "dark"
        ? ["#7FBFA0", "#E8A87C", "#E5C066", "#A98FD8", "#63B4C4", "#D98BA0", "#9DBB6A", "#D9915F"]
        : ["#3F6B57", "#C4622D", "#C99A2E", "#7A5AA8", "#2F7E8C", "#8C4A5A", "#5E7A3A", "#A0522D"],
    [theme.mode],
  );

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const size = Math.min(width - 80, compact ? 200 : 240);
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 6;
  const rInner = rOuter * 0.62;

  const slices = useMemo(() => {
    const out: { id: string; label: string; icon: string; value: number; color: string; d: string }[] = [];
    let angle = -Math.PI / 2;
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const span = total > 0 ? (d.value / total) * TAU : 0;
      const a0 = angle;
      const a1 = angle + span;
      angle = a1;
      const cat = categoryLabel(d.id, lang);
      out.push({
        id: d.id,
        label: d.label ?? (lang === "ar" ? cat?.ar : cat?.en) ?? d.id,
        icon: cat?.icon ?? "📚",
        value: d.value,
        color: colors[i % colors.length],
        d: arcPath(cx, cy, rOuter, rInner, a0, a1 - 0.02),
      });
    }
    return out;
  }, [data, total, colors, lang, cx, cy, rOuter, rInner]);

  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
  const stacked = !compact && width < 420;

  return (
    <View style={[styles.row, stacked && styles.rowStacked]}>
      <View style={{ width: size, height: size, alignSelf: "center" }}>
        <Svg width={size} height={size}>
          {slices.map((s) => (
            <G key={s.id} opacity={active && active !== s.id ? 0.35 : 1}>
              <Path
                d={s.d}
                fill={s.color}
                stroke={c.bgElevated}
                strokeWidth={active === s.id ? 3 : 1.5}
                onPress={() => setActive(active === s.id ? null : s.id)}
              />
            </G>
          ))}
        </Svg>
        <View pointerEvents="none" style={styles.center}>
          {active ? (
            <>
              <Text style={[styles.centerPct, { color: c.primary }]}>
                {pct(slices.find((s) => s.id === active)?.value ?? 0)}%
              </Text>
              <Text style={[styles.centerLabel, { color: c.textMuted }]} numberOfLines={1}>
                {slices.find((s) => s.id === active)?.label}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.centerPct, { color: c.text }]}>{total.toLocaleString()}</Text>
              <Text style={[styles.centerLabel, { color: c.textMuted }]}>{t("analytics.pagesShort")}</Text>
            </>
          )}
        </View>
      </View>

      {!compact ? (
        <View style={styles.legend}>
          {slices.map((s) => (
            <Pressable
              key={s.id}
              onPressIn={() => setActive(s.id)}
              onPressOut={() => setActive(null)}
              style={[styles.legendRow, active === s.id && { backgroundColor: c.surfaceHover }]}
            >
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.legendName, { color: c.text }]} numberOfLines={1}>
                  {s.icon} {s.label}
                </Text>
                <Text style={[styles.legendMeta, { color: c.textMuted }]}>
                  {t("analytics.pagesValue", { count: s.value })}
                </Text>
              </View>
              <Text style={[styles.legendPct, { color: c.text }]}>{pct(s.value)}%</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 16 },
  rowStacked: { flexDirection: "column" },
  center: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  centerPct: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  centerLabel: { fontSize: 11.5, marginTop: 2, maxWidth: "80%", textAlign: "center" },
  legend: { flex: 1, gap: 2 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendName: { fontSize: 13, fontWeight: "600" },
  legendMeta: { fontSize: 11, marginTop: 1 },
  legendPct: { fontSize: 13, fontWeight: "700" },
});
