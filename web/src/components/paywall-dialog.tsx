"use client";

import { useState } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { useData } from "@/store/data";
import { useI18n } from "@/i18n/provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Free-tier limits, mirrored from the Expo app's entitlements. */
const FREE_AI_MESSAGES = 10;
const FREE_ACTIVE_BOOKS = 3;
const FREE_HISTORY_DAYS = 30;

/**
 * The upgrade moment.
 *
 * A value table rather than a nag: it names exactly what changes and lets the
 * reader leave. Billing is not wired yet, so `upgrade()` flips the local plan
 * (and would POST to Stripe Checkout once keys exist).
 */
export function PaywallDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { preferences, setPreferences } = useData();
  const [busy, setBusy] = useState(false);

  const isPro = preferences.plan === "pro";

  const rows: { icon: string; label: string; free: string; pro: string }[] = [
    { icon: "💬", label: t("paywall.aiCoach"), free: t("paywall.aiFree", { count: FREE_AI_MESSAGES }), pro: t("paywall.unlimited") },
    { icon: "📚", label: t("paywall.books"), free: t("paywall.booksFree", { count: FREE_ACTIVE_BOOKS }), pro: t("paywall.unlimited") },
    { icon: "📈", label: t("paywall.history"), free: t("paywall.historyFree", { count: FREE_HISTORY_DAYS }), pro: t("paywall.historyPro") },
    { icon: "🔁", label: t("paywall.reviews"), free: t("paywall.reviewsFree"), pro: t("paywall.reviewsPro") },
    { icon: "💾", label: t("paywall.export"), free: "—", pro: t("paywall.exportPro") },
  ];

  const upgrade = async () => {
    setBusy(true);
    try {
      await setPreferences({ plan: "pro" });
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });
      toast.success(t("paywall.welcome"), { icon: "👑" });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-2xl" aria-hidden>
            👑
          </div>
          <DialogTitle className="mt-2 text-xl">{t("paywall.title")}</DialogTitle>
          <DialogDescription>{t("paywall.subtitle")}</DialogDescription>
          <Badge variant={isPro ? "default" : "outline"} className="mx-auto mt-1">
            {isPro ? t("paywall.currentPro") : t("paywall.currentFree")}
          </Badge>
        </DialogHeader>

        <div className="overflow-hidden rounded-xl border border-border">
          <div className="grid grid-cols-[1.3fr_1fr_1fr] border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold">
            <span />
            <span className="text-center text-muted-foreground">{t("paywall.free")}</span>
            <span className="text-center text-primary">{t("paywall.pro")}</span>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.label}
              className={cn(
                "grid grid-cols-[1.3fr_1fr_1fr] items-center px-3 py-2.5 text-xs",
                i < rows.length - 1 && "border-b border-border",
              )}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span aria-hidden>{r.icon}</span>
                <span className="truncate font-medium">{r.label}</span>
              </span>
              <span className="text-center text-muted-foreground">{r.free}</span>
              <span className="text-center font-semibold text-primary">{r.pro}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-primary/30 bg-primary/5 py-3 text-center">
          <div className="text-xl font-bold tracking-tight text-primary">{t("paywall.price")}</div>
          <div className="text-xs text-muted-foreground">{t("paywall.priceNote")}</div>
        </div>

        <DialogFooter className="mt-1 flex-col gap-2 sm:flex-col">
          {isPro ? (
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              {t("paywall.manage")}
            </Button>
          ) : (
            <Button size="lg" className="w-full" onClick={upgrade} disabled={busy}>
              {t("paywall.cta")}
            </Button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="py-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t("paywall.later")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
