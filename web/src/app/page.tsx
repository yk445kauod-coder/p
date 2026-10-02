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
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { TranslationKey } from "@/i18n";

/**
 * Marketing page.
 *
 * Server-renderable content with a client shell for i18n/theme. Mobile-first:
 * one column, generous tap targets, and a sticky header that stays out of the
 * way. Copy comes from the same deck as the app, so nothing drifts.
 */
export default function LandingPage() {
  const { t } = useI18n();

  const features: { Icon: typeof BookOpen; title: TranslationKey; body: TranslationKey }[] = [
    { Icon: BookOpen, title: "landing.f1t", body: "landing.f1b" },
    { Icon: Flame, title: "landing.f2t", body: "landing.f2b" },
    { Icon: LineChart, title: "landing.f3t", body: "landing.f3b" },
    { Icon: Timer, title: "landing.f4t", body: "landing.f4b" },
    { Icon: Sparkles, title: "landing.f5t", body: "landing.f5b" },
    { Icon: Target, title: "landing.f6t", body: "landing.f6b" },
  ];

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
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden />
            {t("app.name")}
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
      <section className="mx-auto max-w-5xl px-4 pb-14 pt-12 text-center sm:pt-20">
        <Badge variant="secondary" className="mx-auto mb-5 gap-1.5">
          <WifiOff className="h-3.5 w-3.5" aria-hidden />
          {t("landing.pill")}
        </Badge>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
          {t("landing.h1a")}{" "}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t("landing.h1b")}
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t("landing.lede")}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="w-full rounded-full sm:w-auto" asChild>
            <Link href="/app">{t("landing.openApp")}</Link>
          </Button>
          <Button size="lg" variant="outline" className="w-full rounded-full sm:w-auto" asChild>
            <a href="#features">{t("landing.seeFeatures")}</a>
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("landing.openAppSub")}</p>

        <ul className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {(["landing.meta1", "landing.meta2", "landing.meta3", "landing.meta4"] as TranslationKey[]).map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
              {t(k)}
            </li>
          ))}
        </ul>
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
            {features.map(({ Icon, title, body }) => (
              <Card key={title}>
                <CardContent className="p-5">
                  <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary/10" aria-hidden>
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{t(title)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(body)}</p>
                </CardContent>
              </Card>
            ))}
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
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]" aria-hidden />
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
            <Card className="relative flex flex-col border-primary/40 shadow-md">
              <Badge className="absolute -top-3 left-6">{t("landing.planPopular")}</Badge>
              <CardContent className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-semibold">{t("landing.planProName")}</h3>
                <div className="mt-2 text-3xl font-bold tracking-tight">
                  {t("landing.planProPrice")}
                  <span className="text-base font-medium text-muted-foreground">{t("landing.planPerMonth")}</span>
                </div>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {proPlan.map((k) => (
                    <li key={k} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]" aria-hidden />
                      {t(k)}
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full" asChild>
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
                    <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                      {n}
                    </div>
                    <h3 className="font-semibold">
                      {t(`landing.s${n}t` as TranslationKey)}
                    </h3>
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
          <div className="flex items-center gap-2 font-medium text-foreground">
            <BookOpen className="h-4 w-4 text-primary" aria-hidden />
            {t("app.name")}
          </div>
          <p>{t("app.tagline")}</p>
          <p className="text-xs">{t("landing.footerNote")}</p>
        </div>
      </footer>
    </div>
  );
}
