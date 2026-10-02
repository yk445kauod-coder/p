import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { ResponsivePie } from "@nivo/pie";
import { Text } from "../Text";
import { useTheme } from "../../theme/ThemeProvider";
import { useI18n } from "../../i18n";
import { categoryLabel } from "../../domain/achievements";
import { buildNivoTheme, genreColors } from "./theme";
import type { GenreDatum } from "./types";

export interface GenreDistributionChartProps {
  data: GenreDatum[];
  /** Hides the label column for tighter layouts. */
  compact?: boolean;
}

interface SliceDatum {
  id: string;
  label: string;
  value: number;
  icon: string;
  color: string;
}

/**
 * Donut chart of pages read per genre.
 *
 * Labels come from the shared category table so they translate with the rest of
 * the app. The legend is rendered in React Native (not Nivo) so it can flow into
 * a responsive grid and keep the same typography as the surrounding cards.
 */
export function GenreDistributionChart({ data, compact }: GenreDistributionChartProps) {
  const theme = useTheme();
  const c = theme.colors;
  const { t, lang } = useI18n();
  const { width } = useWindowDimensions();
  const [active, setActive] = useState<string | null>(null);

  const nivoTheme = useMemo(() => buildNivoTheme(theme, lang === "ar"), [theme, lang]);
  const colors = genreColors(theme);

  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  const slices: SliceDatum[] = useMemo(
    () =>
      data.map((d, i) => {
        const cat = categoryLabel(d.id, lang);
        return {
          id: d.id,
          label: d.label ?? (lang === "ar" ? cat?.ar : cat?.en) ?? d.id,
          value: d.value,
          icon: cat?.icon ?? "📚",
          color: colors[i % colors.length],
        };
      }),
    [data, lang, colors],
  );

  const labelOf = useCallback((id: string) => slices.find((s) => s.id === id)?.label ?? id, [slices]);
  const pct = useCallback(
    (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0),
    [total],
  );

  const Tooltip = useMemo(() => {
    function GenreTooltip({ datum }: { datum: { id: string | number; value: number; color: string } }) {
      return (
        <View style={[styles.tip, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
          <View style={[styles.tipDot, { backgroundColor: datum.color }]} />
          <View>
            <Text style={[styles.tipValue, { color: c.text }]}>
              {labelOf(String(datum.id))} · {pct(datum.value)}%
            </Text>
            <Text style={[styles.tipDay, { color: c.textMuted }]}>
              {t("analytics.pagesValue", { count: datum.value })}
            </Text>
          </View>
        </View>
      );
    }
    return GenreTooltip;
  }, [c, t, labelOf, pct]);

  const size = compact ? Math.min(width - 80, 200) : Math.min(width - 80, 240);
  const stacked = !compact && width < 420;
  const activeSlice = active ? slices.find((s) => s.id === active) : undefined;

  return (
    <View>
      <View style={[styles.row, stacked && styles.rowStacked]}>
        <View style={{ width: size, height: size, alignSelf: "center" }}>
          <ResponsivePie
            data={slices}
            theme={nivoTheme}
            colors={slices.map((s) => s.color)}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
            innerRadius={0.62}
            padAngle={2}
            cornerRadius={6}
            activeOuterRadiusOffset={10}
            activeInnerRadiusOffset={2}
            borderWidth={0}
            valueFormat={(v) => String(v)}
            enableArcLabels={false}
            enableArcLinkLabels={false}
            sortByValue
            isInteractive
            activeId={active}
            onActiveIdChange={(id) => setActive(id === null ? null : String(id))}
            tooltip={Tooltip}
            motionConfig="gentle"
            role="img"
          />
          {/* Centre readout: total pages, or the hovered slice's share. */}
          <View pointerEvents="none" style={styles.center}>
            {activeSlice ? (
              <>
                <Text style={[styles.centerPct, { color: c.primary }]}>{pct(activeSlice.value)}%</Text>
                <Text style={[styles.centerLabel, { color: c.textMuted }]} numberOfLines={1}>
                  {activeSlice.label}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.centerPct, { color: c.text }]}>{total.toLocaleString()}</Text>
                <Text style={[styles.centerLabel, { color: c.textMuted }]}>
                  {t("analytics.pagesShort")}
                </Text>
              </>
            )}
          </View>
        </View>

        {!compact ? (
          <View style={styles.legend}>
            {slices.map((s) => (
              <Pressable
                key={s.id}
                onHoverIn={() => setActive(s.id)}
                onHoverOut={() => setActive(null)}
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
  tip: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 11 },
  tipDot: { width: 9, height: 9, borderRadius: 3 },
  tipValue: { fontSize: 12.5, fontWeight: "700" },
  tipDay: { fontSize: 11, marginTop: 1 },
});
