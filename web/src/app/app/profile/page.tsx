"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import Link from "next/link";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { useData } from "@/store/data";
import { useAuth } from "@/store/auth";
import { useI18n } from "@/i18n/provider";
import { PageHeader, Section } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { LANGUAGES } from "@/i18n";
import { RITUAL_DRINKS } from "@/data/types";
import { HHMM, cn } from "@/lib/utils";
import { PaywallDialog } from "@/components/paywall-dialog";
import { syncAll } from "@/lib/sync";
import { checkAdmin } from "@/lib/admin";

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Profile — grouped, thumb-sized controls. */
export default function ProfilePage() {
  const { t, lang, setLang } = useI18n();
  const { preferences, setPreferences, stats, clearAll } = useData();
  const { reader, cloudAvailable, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [confirmClear, setConfirmClear] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [admin, setAdmin] = useState(false);

  const isPro = preferences.plan === "pro";
  const dark = resolvedTheme === "dark";

  // The console link is only rendered once the server confirms admin status.
  useEffect(() => {
    let cancelled = false;
    if (!reader) {
      setAdmin(false);
      return;
    }
    checkAdmin()
      .then((ok) => !cancelled && setAdmin(ok))
      .catch(() => !cancelled && setAdmin(false));
    return () => {
      cancelled = true;
    };
  }, [reader]);

  const runSync = async () => {
    setSyncing(true);
    try {
      const { pushed, pulled } = await syncAll();
      toast.success(`↑${pushed} · ↓${pulled}`, { icon: "🔄" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <PageHeader title={t("profile.title")} accent="rose" />

      {/* Identity + plan. */}
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-2xl" aria-hidden>
            📖
          </div>
          <p className="font-semibold">{reader?.displayName ?? reader?.email ?? t("profile.reader")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">{reader ? reader.email : t("profile.guest")}</Badge>
            <Badge variant={isPro ? "default" : "outline"}>
              {isPro ? `✨ ${t("profile.memberPro")}` : t("profile.memberFree")}
            </Badge>
          </div>
          {!isPro ? (
            <Button className="mt-1 w-full" variant="default" onClick={() => setPaywallOpen(true)}>
              {t("profile.upgrade")}
            </Button>
          ) : null}
          {!reader ? <p className="text-xs text-muted-foreground">{t("profile.guestHint")}</p> : null}
        </CardContent>
      </Card>

      {/* Account + sync. Only meaningful when Supabase is configured. */}
      {cloudAvailable ? (
        <Section title={t("profile.account")} accent="indigo">
          <Card>
            <CardContent className="grid gap-3 p-4">
              {reader ? (
                <>
                  <Button variant="outline" className="w-full" onClick={runSync} disabled={syncing}>
                    <RefreshCw className={cn("mr-1.5 h-4 w-4", syncing && "animate-spin")} aria-hidden />
                    {syncing ? t("common.loading") : t("profile.signIn")}
                  </Button>
                  {/* Only rendered once the server confirms the caller is an admin. */}
                  {admin ? (
                    <Button variant="secondary" className="w-full" asChild>
                      <Link href="/admin">
                        <ShieldCheck className="mr-1.5 h-4 w-4" aria-hidden />
                        Admin console
                      </Link>
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => void logout()}
                  >
                    {t("profile.signOut")}
                  </Button>
                </>
              ) : (
                <SignInForm />
              )}
            </CardContent>
          </Card>
        </Section>
      ) : null}

      <Section title={t("profile.appearance")} accent="violet">
        <Card>
          <CardContent className="divide-y divide-border p-4">
            <Row label={t("profile.darkMode")}>
              <Switch checked={dark} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
            </Row>
            <Row label={t("profile.reduceMotion")}>
              <Switch
                checked={preferences.reduceMotion}
                onCheckedChange={(v) => void setPreferences({ reduceMotion: v })}
              />
            </Row>
          </CardContent>
        </Card>
      </Section>

      <Section title={t("profile.language")}>
        <div className="flex gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              aria-pressed={lang === l.code}
              className={cn(
                "min-h-11 flex-1 rounded-lg border px-4 text-sm font-medium transition-colors",
                lang === l.code ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
              )}
            >
              {l.native}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("profile.readingGoal")} accent="teal">
        <Card>
          <CardContent className="grid gap-4 p-4">
            <p className="text-sm text-muted-foreground">
              {t("profile.dailyTarget", { count: preferences.dailyGoalMinutes })}
            </p>
            <div className="flex flex-wrap gap-2">
              {[15, 20, 30, 45, 60].map((m) => (
                <Chip
                  key={m}
                  active={preferences.dailyGoalMinutes === m}
                  onClick={() => void setPreferences({ dailyGoalMinutes: m })}
                >
                  {m}m
                </Chip>
              ))}
            </div>

            <div className="grid gap-2">
              <Label className="text-sm text-muted-foreground">{t("profile.shelfGoal")}</Label>
              <div className="flex flex-wrap gap-2">
                {[150, 250, 320, 450, 600].map((p) => (
                  <Chip
                    key={p}
                    active={preferences.shelfGoalPages === p}
                    onClick={() => void setPreferences({ shelfGoalPages: p })}
                  >
                    {p}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-sm text-muted-foreground">{t("profile.dailyPages")}</Label>
              <p className="text-xs text-muted-foreground">{t("profile.dailyPagesHint")}</p>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 15, 20, 30, 50].map((p) => (
                  <Chip
                    key={p}
                    active={preferences.dailyPagesGoal === p}
                    onClick={() => void setPreferences({ dailyPagesGoal: p })}
                  >
                    {t("profile.pagesChip", { count: p })}
                  </Chip>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title={t("profile.reviewDays")} accent="indigo">
        <Card>
          <CardContent className="grid gap-3 p-4">
            <p className="text-xs text-muted-foreground">{t("profile.reviewDaysHint")}</p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d, i) => (
                <Chip
                  key={d}
                  active={preferences.reviewDays.includes(i)}
                  onClick={() => void setPreferences({ reviewDays: toggle(preferences.reviewDays, i) })}
                >
                  {t(`weekday.${d}` as never)}
                </Chip>
              ))}
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title={t("profile.restDays")} accent="rose">
        <Card>
          <CardContent className="grid gap-3 p-4">
            <p className="text-xs text-muted-foreground">{t("profile.restDaysHint")}</p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d, i) => (
                <Chip
                  key={d}
                  active={preferences.restDays.includes(i)}
                  onClick={() => void setPreferences({ restDays: toggle(preferences.restDays, i) })}
                >
                  {t(`weekday.${d}` as never)}
                </Chip>
              ))}
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title={t("profile.ritual")} accent="violet">
        <Card>
          <CardContent className="grid gap-4 p-4">
            <div className="flex flex-wrap gap-2">
              {RITUAL_DRINKS.map((d) => (
                <Chip
                  key={d.id}
                  active={preferences.ritualDrink === d.id}
                  onClick={() => void setPreferences({ ritualDrink: d.id })}
                >
                  {d.emoji} {lang === "ar" ? d.ar : d.en}
                </Chip>
              ))}
            </div>
            <TimeField
              id="reading-time"
              label={t("profile.readingTime")}
              value={preferences.readingTime}
              onCommit={(v) => void setPreferences({ readingTime: v })}
              placeholder="22:30"
            />
          </CardContent>
        </Card>
      </Section>

      <Section title={t("profile.yourNumbers")} accent="amber">
        <Card>
          <CardContent className="divide-y divide-border p-4">
            {[
              { label: t("profile.currentStreak"), value: t("profile.daysValue", { count: stats.streak }) },
              { label: t("profile.bestStreak"), value: t("profile.daysValue", { count: stats.bestStreak }) },
              {
                label: t("profile.totalReading"),
                value: t("profile.hoursValue", { count: Math.round(stats.totalMinutes / 60) }),
              },
              { label: t("profile.pagesRead"), value: `${stats.totalPages}` },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className="text-sm font-medium tabular-nums">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </Section>

      <Section title={t("profile.account")}>
        <Card>
          <CardContent className="grid gap-3 p-4">
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={async () => {
                if (!confirmClear) {
                  setConfirmClear(true);
                  return;
                }
                await clearAll();
                setConfirmClear(false);
                toast.success(t("common.done"), { icon: "🗑️" });
              }}
            >
              {confirmClear ? t("profile.eraseConfirm") : t("profile.erase")}
            </Button>
          </CardContent>
        </Card>
      </Section>

      <p className="mt-8 text-center text-xs text-muted-foreground">{t("app.footer")}</p>

      <PaywallDialog open={paywallOpen} onOpenChange={setPaywallOpen} />
    </div>
  );
}

function toggle(list: number[], value: number): number[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value].sort();
}

/**
 * Email + password sign-in / sign-up.
 *
 * Optional: the app works fully as a guest, so this is only rendered when a
 * Supabase project is configured.
 */
function SignInForm() {
  const { t } = useI18n();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(email.trim(), password);
      toast.success(t("profile.signIn"), { icon: "✅" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex rounded-lg border border-border p-1">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={cn(
              "min-h-9 flex-1 rounded-md text-sm font-medium transition-colors",
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {m === "login" ? t("profile.signIn") : t("profile.signIn")}
          </button>
        ))}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="auth-email">{t("addBook.title")}</Label>
        <Input
          id="auth-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="auth-password">{t("addBook.title")}</Label>
        <Input
          id="auth-password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button className="w-full" onClick={submit} disabled={busy}>
        {t("profile.signIn")}
      </Button>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <Label className="text-sm font-normal">{label}</Label>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** `HH:MM` field that only commits a valid 24-hour time. */
function TimeField({
  id,
  label,
  value,
  onCommit,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(value);
  const [seed, setSeed] = useState(value);
  const [invalid, setInvalid] = useState(false);

  // Re-seed during render when the store changes, rather than in an effect.
  if (value !== seed) {
    setSeed(value);
    setDraft(value);
    setInvalid(false);
  }

  const commit = () => {
    if (HHMM.test(draft)) {
      setInvalid(false);
      setSeed(draft);
      onCommit(draft);
    } else {
      setInvalid(true);
      setDraft(value);
    }
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        placeholder={placeholder}
        inputMode="numeric"
        aria-invalid={invalid}
        className={cn("w-32 font-medium", invalid && "border-destructive")}
      />
      {invalid ? <p className="text-xs text-destructive">{t("profile.timeInvalid")}</p> : null}
    </div>
  );
}
