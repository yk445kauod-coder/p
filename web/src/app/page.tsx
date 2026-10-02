"use client";

import Link from "next/link";
import {
  BookOpen,
  Flame,
  LineChart,
  Sparkles,
  Target,
  Timer,
  WifiOff,
  Check,
} from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wordmark } from "@/components/book-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { TranslationKey } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Marketing page.
 *
 * Server-renderable content with a client shell for i18n/theme. Mobile-first:
 * one column, generous tap targets, and a sticky header that stays out of the
 * way. Copy comes from the same deck as the app, so nothing drifts.
 */
export default function LandingPage() {
  const { t } = useI18n();

  const features: {
    Icon: typeof BookOpen;
    title: TranslationKey;
    body: TranslationKey;
    accent: "amber" | "teal" | "violet" | "rose" | "indigo";
  }[] = [
    { Icon: BookOpen, title: "landing.f1t", body: "landing.f1b", accent: "amber" },
    { Icon: Flame, title: "landing.f2t", body: "landing.f2b", accent: "rose" },
    { Icon: LineChart, title: "landing.f3t", body: "landing.f3b", accent: "teal" },
    { Icon: Timer, title: "landing.f4t", body: "landing.f4b", accent: "violet" },
    { Icon: Sparkles, title: "landing.f5t", body: "landing.f5b", accent: "indigo" },
    { Icon: Target, title: "landing.f6t", body: "landing.f6b", accent: "teal" },
  ];

  /** Icon chip + hover ring per accent, so cards read as distinct blocks. */
  const FEATURE_TONE: Record<string, { chip: string; card: string }> = {
    amber: { chip: "bg-primary-soft text-primary-strong", card: "hover:border-primary/40" },
    teal: { chip: "bg-teal-soft text-teal-strong", card: "hover:border-teal/40" },
    violet: { chip: "bg-violet-soft text-violet-strong", card: "hover:border-violet/40" },
    rose: { chip: "bg-rose-soft text-rose-strong", card: "hover:border-rose/40" },
    indigo: { chip: "bg-indigo-soft text-indigo-strong", card: "hover:border-indigo/40" },
  };

  const freePlan: TranslationKey[] = [
    "landing.planFree1",
    "landing.planFree2",
    "landing.planFree3",
    "landing.planFree4",
  ];
  const proPlan: TranslationKey[] = [
    "landing.planPro1",
    "landing.planPro2",
    "landing.planPro3",
    "landing.planPro4",
  ];
  const faqs: { q: TranslationKey; a: TranslationKey }[] = [
    { q: "landing.faq1q", a: "landing.faq1a" },
    { q: "landing.faq2q", a: "landing.faq2a" },
    { q: "landing.faq3q", a: "landing.faq3a" },
    { q: "landing.faq4q", a: "landing.faq4a" },
  ];

  return (
    <div className="min-h-dvh bg-background">
      {/* Sticky header, sized for a phone. */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <Link href="/" className="flex items-center">
            <Wordmark size={26} />
          </Link>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
            <Button size="sm" className="rounded-full" asChild>
              <Link href="/app">{t("nav.openApp")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero. */}
      <section className="relative isolate overflow-hidden">
        <div className="bg-hero pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto max-w-5xl px-4 pb-14 pt-12 text-center sm:pt-20">
          <Badge variant="amber" className="mx-auto mb-5 gap-1.5">
            <WifiOff className="h-3.5 w-3.5" aria-hidden />
            {t("landing.pill")}
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            {t("landing.h1a")} <span className="text-gradient">{t("landing.h1b")}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("landing.lede")}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="w-full rounded-full shadow-lift sm:w-auto" asChild>
              <Link href="/app">{t("landing.openApp")}</Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full rounded-full sm:w-auto" asChild>
              <a href="#features">{t("landing.seeFeatures")}</a>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("landing.openAppSub")}</p>

          <ul className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {(["landing.meta1", "landing.meta2", "landing.meta3", "landing.meta4"] as TranslationKey[]).map(
              (k, i) => (
                <li key={k} className="flex items-center gap-1.5">
                  <Check
                    className={cn(
                      "h-3.5 w-3.5",
                      ["text-primary", "text-rose", "text-teal", "text-violet"][i % 4],
                    )}
                    aria-hidden
                  />
                  {t(k)}
                </li>
              ),
            )}
          </ul>
        </div>
      </section>

      {/* Features. */}
      <section id="features" className="border-y border-border/50 bg-muted/25 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              {t("landing.featuresEyebrow")}
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{t("landing.featuresTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.featuresLede")}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ Icon, title, body, accent }) => {
              const tone = FEATURE_TONE[accent];
              return (
                <Card key={title} className={cn("transition-colors", tone.card)}>
                  <CardContent className="p-5">
                    <div className={cn("mb-3 grid h-10 w-10 place-items-center rounded-xl", tone.chip)} aria-hidden>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">{t(title)}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(body)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing. */}
      <section id="pricing" className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              {t("landing.pricingEyebrow")}
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{t("landing.pricingTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.pricingLede")}</p>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            {/* Free */}
            <Card className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-semibold">{t("landing.planFreeName")}</h3>
                <div className="mt-2 text-3xl font-bold tracking-tight">{t("landing.planFreePrice")}</div>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {freePlan.map((k) => (
                    <li key={k} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden />
                      {t(k)}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="mt-6 w-full" asChild>
                  <Link href="/app">{t("landing.openApp")}</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="relative flex flex-col border-primary/40 bg-hero shadow-lift">
              <Badge variant="amber" className="absolute -top-3 left-6">
                {t("landing.planPopular")}
              </Badge>
              <CardContent className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-semibold">{t("landing.planProName")}</h3>
                <div className="mt-2 text-3xl font-bold tracking-tight text-gradient">
                  {t("landing.planProPrice")}
                  <span className="text-base font-medium text-muted-foreground">{t("landing.planPerMonth")}</span>
                </div>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {proPlan.map((k) => (
                    <li key={k} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {t(k)}
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full shadow-lift" asChild>
                  <Link href="/app/profile">{t("landing.planProCta")}</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Install. */}
      <section id="install" className="border-y border-border/50 bg-muted/25 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              {t("landing.installEyebrow")}
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{t("landing.installTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("landing.installLede")}</p>
          </div>

          <ol className="mt-10 grid gap-4 sm:grid-cols-3">
            {([1, 2, 3] as const).map((n) => (
              <li key={n}>
                <Card className="h-full">
                  <CardContent className="p-5">
                    <div
                      className={cn(
                        "mb-3 grid h-9 w-9 place-items-center rounded-xl text-sm font-bold",
                        [
                          "bg-primary text-primary-foreground",
                          "bg-violet text-violet-foreground",
                          "bg-teal text-teal-foreground",
                        ][n - 1],
                      )}
                    >
                      {n}
                    </div>
                    <h3 className="font-semibold">{t(`landing.s${n}t` as TranslationKey)}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {t(`landing.s${n}b` as TranslationKey)}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ. */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">{t("landing.faqTitle")}</h2>
          <Accordion type="single" collapsible className="mt-8 space-y-3">
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`} className="rounded-lg border px-4">
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                  {t(f.q)}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {t(f.a)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA. */}
      <section className="px-4 pb-16">
        <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-8 text-center sm:p-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("landing.ctaTitle")}</h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">{t("landing.ctaBody")}</p>
          <Button size="lg" className="mt-6 rounded-full px-8" asChild>
            <Link href="/app">{t("landing.ctaButton")}</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/50 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 text-center text-sm text-muted-foreground">
          <Wordmark size={24} labelClassName="text-sm" />
          <p>{t("app.tagline")}</p>
          <p className="text-xs">{t("landing.footerNote")}</p>
        </div>
      </footer>
    </div>
  );
}
