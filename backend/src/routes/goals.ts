import type { Env } from "../types";
import { fail, ok, readJson } from "../lib/http";
import { getUser } from "../lib/auth";
import { uuid, now } from "../lib/crypto";
import { listItems, mutateItems, type GoalRecord } from "../lib/store";

interface GoalInput {
  kind?: string;
  target?: number;
  period?: string;
}

export async function goalRoutes(req: Request, env: Env, parts: string[]): Promise<Response> {
  const user = await getUser(req, env);
  if (!user) return fail(401, "unauthorized", env);

  const id = parts[0];

  if (req.method === "GET" && !id) {
    const goals = await listItems<GoalRecord>(env, "goals", user.id);
    goals.sort((a, b) => b.createdAt - a.createdAt);
    return ok({ goals }, env);
  }

  if (req.method === "POST" && !id) {
    const body = await readJson<GoalInput>(req);
    if (!body?.kind || !body?.target) return fail(400, "kind_and_target_required", env);
    const goal: GoalRecord = {
      id: uuid(),
      kind: body.kind,
      target: body.target,
      period: body.period ?? "daily",
      createdAt: now(),
    };
    await mutateItems<GoalRecord>(env, "goals", user.id, (items) => [goal, ...items]);
    return ok({ goal }, env);
  }

  if (id && req.method === "DELETE") {
    const updated = await mutateItems<GoalRecord>(env, "goals", user.id, (items) =>
      items.filter((g) => g.id !== id),
    );
    if (!updated) return fail(404, "not_found", env);
    return ok({ deleted: id }, env);
  }

  return fail(404, "not_found", env);
}
