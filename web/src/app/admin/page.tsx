"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BookOpen,
  Clock,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/store/auth";
import { useI18n } from "@/i18n/provider";
import { BookMark } from "@/components/book-mark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  checkAdmin,
  claimAdmin,
  fetchStats,
  fetchUsers,
  fetchSecrets,
  setPlan,
  deleteUser,
  setSecret,
  deleteSecret,
  revealSecret,
  KNOWN_SECRETS,
  NotAdminError,
  type AdminStats,
  type AdminUser,
  type AdminSecret,
} from "@/lib/admin";
import { cn, formatDay } from "@/lib/utils";

type Tab = "overview" | "users" | "secrets";

/**
 * Admin console.
 *
 * Authorisation is entirely server-side: every RPC re-checks `is_admin()`, so a
 * non-admin who reaches this route sees a warning and nothing else. The first
 * signed-in caller can claim the console once; after that it is closed.
 */
export default function AdminPage() {
  const { reader, ready } = useAuth();
  const { t } = useI18n();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [secrets, setSecrets] = useState<AdminSecret[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, u, k] = await Promise.all([fetchStats(), fetchUsers(search), fetchSecrets()]);
      setStats(s);
      setUsers(u);
      setSecrets(k);
      setIsAdmin(true);
    } catch (e) {
      if (e instanceof NotAdminError) {
        setIsAdmin(false);
        return;
      }
      toast.error((e as Error).message);
    }
  }, [search]);

  // Resolve admin status once the session settles.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    checkAdmin()
      .then((ok) => {
        if (cancelled) return;
        setIsAdmin(ok);
        if (ok) void load();
      })
      .catch(() => !cancelled && setIsAdmin(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, reader?.id]);

  // Re-run the user query when the search term changes (debounced).
  useEffect(() => {
    if (!isAdmin || tab !== "users") return;
    const id = setTimeout(() => void load(), 250);
    return () => clearTimeout(id);
  }, [search, tab, isAdmin, load]);

  const claim = async () => {
    setBusy(true);
    try {
      const ok = await claimAdmin();
      if (ok) {
        toast.success("You are now the admin", { icon: "🛡️" });
        await load();
      } else {
        toast.error("An admin already exists on this project.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!ready || isAdmin === null) {
    return <Shell><p className="text-sm text-muted-foreground">{t("common.loading")}</p></Shell>;
  }

  if (!isAdmin) {
    return (
      <Shell>
        <Card className="mx-auto max-w-lg">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-soft text-2xl" aria-hidden>
              🔒
            </div>
            <h1 className="text-lg font-semibold">Admin access required</h1>
            <p className="text-sm text-muted-foreground">
              This console is restricted to the project administrator. Every action
              is authorised on the server and audited.
            </p>
            {reader ? (
              <Button className="mt-2" onClick={claim} disabled={busy}>
                <ShieldCheck className="mr-1.5 h-4 w-4" aria-hidden />
                Claim admin (first run only)
              </Button>
            ) : (
              <Button className="mt-2" asChild>
                <a href="/app/profile">Sign in first</a>
              </Button>
            )}
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const TABS: { key: Tab; label: string; Icon: typeof LayoutDashboard }[] = [
    { key: "overview", label: "Overview", Icon: LayoutDashboard },
    { key: "users", label: "Users", Icon: Users },
    { key: "secrets", label: "Keys & secrets", Icon: KeyRound },
  ];

  return (
    <Shell>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BookMark size={44} />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Admin console</h1>
            <p className="text-xs text-muted-foreground">{reader?.email}</p>
          </div>
        </div>
        <Badge variant="teal">server-authorised</Badge>
      </header>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={cn(
              "flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors",
              tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && stats ? <Overview stats={stats} /> : null}
      {tab === "users" ? (
        <UsersTab
          users={users}
          search={search}
          onSearch={setSearch}
          onChanged={load}
        />
      ) : null}
      {tab === "secrets" ? <SecretsTab secrets={secrets} onChanged={load} /> : null}
    </Shell>
  );
}

/** Page chrome — deliberately separate from the reader shell. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}

function Overview({ stats }: { stats: AdminStats }) {
  const tiles: { icon: typeof Users; label: string; value: string; accent: string }[] = [
    { icon: Users, label: "Readers", value: `${stats.users}`, accent: "bg-primary-soft text-primary-strong" },
    { icon: Sparkles, label: "Pro members", value: `${stats.pro}`, accent: "bg-rose-soft text-rose-strong" },
    { icon: BookOpen, label: "Books", value: `${stats.books}`, accent: "bg-teal-soft text-teal-strong" },
    { icon: Activity, label: "Sessions", value: `${stats.sessions}`, accent: "bg-violet-soft text-violet-strong" },
    { icon: Clock, label: "Minutes read", value: `${Math.round(stats.minutes).toLocaleString()}`, accent: "bg-indigo-soft text-indigo-strong" },
    { icon: KeyRound, label: "Secrets stored", value: `${stats.secrets}`, accent: "bg-primary-soft text-primary-strong" },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tl) => (
          <Card key={tl.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", tl.accent)} aria-hidden>
                <tl.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-2xl font-bold tnum">{tl.value}</div>
                <div className="truncate text-xs text-muted-foreground">{tl.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-teal/20 bg-mint">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">New readers · 7 days</div>
            <div className="mt-1 text-xl font-bold tnum text-teal-strong">{stats.signups_7d}</div>
          </CardContent>
        </Card>
        <Card className="border-violet/20">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Sessions · 7 days</div>
            <div className="mt-1 text-xl font-bold tnum text-violet-strong">{stats.sessions_7d}</div>
          </CardContent>
        </Card>
        <Card className="border-indigo/20 bg-coach">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Coach messages</div>
            <div className="mt-1 text-xl font-bold tnum text-indigo-strong">{stats.agent_messages}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UsersTab({
  users,
  search,
  onSearch,
  onChanged,
}: {
  users: AdminUser[];
  search: string;
  onSearch: (v: string) => void;
  onChanged: () => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="grid gap-4">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search by name or email…"
        className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Search users"
      />

      {users.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">No readers found.</CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary-strong">
                  {(u.display_name ?? u.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{u.display_name ?? "—"}</p>
                    <Badge variant={u.plan === "pro" ? "rose" : "outline"} size="sm">
                      {u.plan}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{u.email ?? u.id}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="tnum">{u.books} books</span>
                  <span className="tnum">{u.sessions} sessions</span>
                  <span className="hidden tnum sm:inline">{Math.round(u.minutes)}m</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await setPlan(u.id, u.plan === "pro" ? "free" : "pro");
                        toast.success(`Plan set to ${u.plan === "pro" ? "free" : "pro"}`);
                        onChanged();
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    {u.plan === "pro" ? "Downgrade" : "Upgrade"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={async () => {
                      if (confirmId !== u.id) {
                        setConfirmId(u.id);
                        return;
                      }
                      try {
                        await deleteUser(u.id);
                        toast.success("Reader deleted");
                        setConfirmId(null);
                        onChanged();
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    {confirmId === u.id ? "Confirm?" : "Delete"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function SecretsTab({ secrets, onChanged }: { secrets: AdminSecret[]; onChanged: () => void }) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const stored = new Set(secrets.map((s) => s.key));

  const save = async () => {
    if (!key.trim() || !value.trim()) {
      toast.error("Both a name and a value are required.");
      return;
    }
    setBusy(true);
    try {
      await setSecret(key.trim(), value, description.trim());
      toast.success(`Saved ${key.trim()} to the vault`, { icon: "🔐" });
      setKey("");
      setValue("");
      setDescription("");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5">
      <Card>
        <CardContent className="grid gap-4 p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="font-semibold">Add or rotate a key</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Values are encrypted at rest in Supabase Vault. They are never sent to a
            browser except when you explicitly reveal one, and every reveal is
            written to the audit log.
          </p>

          <div className="grid gap-2">
            <label htmlFor="secret-key" className="text-xs font-medium text-muted-foreground">
              Key name
            </label>
            <input
              id="secret-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="OPENROUTER_API_KEY"
              className="h-11 rounded-xl border border-input bg-background px-3.5 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="secret-value" className="text-xs font-medium text-muted-foreground">
              Value
            </label>
            <input
              id="secret-value"
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="sk-…"
              autoComplete="off"
              className="h-11 rounded-xl border border-input bg-background px-3.5 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="secret-desc" className="text-xs font-medium text-muted-foreground">
              Description (optional)
            </label>
            <input
              id="secret-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this key is for"
              className="h-11 rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <Button onClick={save} disabled={busy} className="w-full sm:w-auto">
            Save to vault
          </Button>
        </CardContent>
      </Card>

      {/* Checklist of keys the platform consumes, so a gap is obvious. */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 font-semibold">Expected keys</h2>
          <div className="grid gap-2">
            {KNOWN_SECRETS.map((k) => {
              const have = stored.has(k.key);
              return (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => {
                    setKey(k.key);
                    setDescription(k.description);
                  }}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent"
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs",
                      have ? "bg-teal-soft text-teal-strong" : "bg-muted text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    {have ? "✓" : "–"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs">{k.key}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {k.label} · used by {k.usedBy}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Registry — values are never listed here. */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 font-semibold">Stored secrets</h2>
          {secrets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing in the vault yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {secrets.map((s) => (
                <div key={s.key} className="flex flex-wrap items-center gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs">{s.key}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.description || "—"} · updated {formatDay(s.updated_at.slice(0, 10), "en")}
                    </p>
                    {revealed[s.key] ? (
                      <p className="mt-1 break-all rounded-md bg-muted px-2 py-1 font-mono text-[11px]">
                        {revealed[s.key]}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const v = await revealSecret(s.key);
                          setRevealed((prev) => ({ ...prev, [s.key]: v ?? "" }));
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      Reveal
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={async () => {
                        try {
                          await deleteSecret(s.key);
                          toast.success("Secret deleted");
                          onChanged();
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
