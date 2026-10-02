import React, { forwardRef } from "react";
import {
  Animated,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type StyleProp,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import { useI18n } from "../i18n";
import { fontFor, normalizeFamily, weightFrom, type Weight } from "../theme/typography";

/**
 * Language-aware typography.
 *
 * Arabic copy has to render in IBM Plex Sans Arabic, Latin copy in IBM Plex
 * Sans — and a single screen usually contains both. Rather than branch at every
 * call site, `Text` and `TextInput` resolve the family per rendered string from
 * the active language and, when the string contains Arabic script, per text run.
 *
 * Two details make this work in React Native:
 *
 * - Custom fonts do not synthesise bold. `fontWeight` is translated into the
 *   matching registered family and then removed from the style, so "700" picks
 *   IBMPlexSans_700Bold instead of silently staying regular.
 * - In RTL, a nested `<Text>` inherits its parent's family on some platforms but
 *   not others. Arabic-script runs are therefore wrapped in their own nested
 *   `<Text>` carrying the Arabic family explicitly.
 */

const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function styleToObject(style: StyleProp<TextStyle>): TextStyle {
  return (StyleSheet.flatten(style) ?? {}) as TextStyle;
}

/** Registered family for a style object, honouring an explicit `fontFamily`. */
function familyFor(style: TextStyle, arabic: boolean): string {
  const explicit = normalizeFamily(style.fontFamily);
  if (explicit) return explicit;
  return fontFor(weightFrom(style.fontWeight), arabic);
}

/** Style with the weight folded into the family, so bold actually renders. */
function applyFamily(style: TextStyle, arabic: boolean): TextStyle {
  const next: TextStyle = { ...style, fontFamily: familyFor(style, arabic) };
  delete (next as { fontWeight?: unknown }).fontWeight;
  return next;
}

function splitArabicRuns(text: string): { text: string; arabic: boolean }[] {
  if (!ARABIC_SCRIPT.test(text)) return [{ text, arabic: false }];
  const runs: { text: string; arabic: boolean }[] = [];
  let buffer = "";
  let current = ARABIC_SCRIPT.test(text[0]);
  for (const ch of text) {
    const isAr = ARABIC_SCRIPT.test(ch);
    if (isAr === current) {
      buffer += ch;
    } else {
      runs.push({ text: buffer, arabic: current });
      buffer = ch;
      current = isAr;
    }
  }
  if (buffer) runs.push({ text: buffer, arabic: current });
  return runs;
}

export const Text = forwardRef<React.ComponentRef<typeof RNText>, TextProps>(function Text(
  { style, children, ...rest },
  ref,
) {
  const { lang } = useI18n();
  const arabic = lang === "ar";
  const base = styleToObject(style);
  const finalStyle = applyFamily(base, arabic);

  // One run of text: style it directly. No nesting, so text measurement and
  // accessibility stay exactly as the caller expects.
  if (typeof children === "string") {
    return (
      <RNText ref={ref} {...rest} style={finalStyle}>
        {children}
      </RNText>
    );
  }

  // Mixed content. Nested `<Text>` inherits the parent style, so only the
  // Arabic-script runs need an explicit override.
  const arFamily = fontFor(weightFrom(base.fontWeight), true);
  const latinFamily = fontFor(weightFrom(base.fontWeight), false);

  const wrap = (nodes: React.ReactNode): React.ReactNode => {
    if (!Array.isArray(nodes)) return nodes;
    return nodes.map((node, i) => {
      if (typeof node !== "string") return node;
      const runs = splitArabicRuns(node);
      if (runs.length <= 1) {
        const only = runs[0];
        if (!only) return node;
        return (
          <RNText key={i} style={{ fontFamily: only.arabic ? arFamily : latinFamily }}>
            {only.text}
          </RNText>
        );
      }
      return runs.map((run, j) => (
        <RNText key={`${i}-${j}`} style={{ fontFamily: run.arabic ? arFamily : latinFamily }}>
          {run.text}
        </RNText>
      ));
    });
  };

  return (
    <RNText ref={ref} {...rest} style={finalStyle}>
      {wrap(children)}
    </RNText>
  );
});

export const TextInput = forwardRef<React.ComponentRef<typeof RNTextInput>, TextInputProps>(
  function TextInput({ style, ...rest }, ref) {
    const { lang } = useI18n();
    const finalStyle = applyFamily(styleToObject(style), lang === "ar");
    return <RNTextInput ref={ref} {...rest} style={finalStyle} />;
  },
);

// `Animated.Text` renders the *native* Text directly, bypassing the family
// resolution above, so it needs an Arabic-aware variant of its own.
const AnimatedRNText = Animated.createAnimatedComponent(RNText);

export const AnimatedText = forwardRef<React.ComponentRef<typeof RNText>, TextProps>(
  function AnimatedText({ style, children, ...rest }, ref) {
    const { lang } = useI18n();
    const arabic = lang === "ar";
    const base = styleToObject(style);
    const finalStyle = applyFamily(base, arabic);
    const arFamily = fontFor(weightFrom(base.fontWeight), true);
    const latinFamily = fontFor(weightFrom(base.fontWeight), false);

    let content: React.ReactNode = children;
    if (typeof children !== "string" && Array.isArray(children)) {
      content = children.map((node, i) => {
        if (typeof node !== "string") return node;
        const runs = splitArabicRuns(node);
        return runs.map((run, j) => (
          <RNText key={`${i}-${j}`} style={{ fontFamily: run.arabic ? arFamily : latinFamily }}>
            {run.text}
          </RNText>
        ));
      });
    }

    return (
      <AnimatedRNText ref={ref} {...rest} style={finalStyle}>
        {content}
      </AnimatedRNText>
    );
  },
);

export type { Weight };
