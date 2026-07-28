import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { commitAppend } from "@/lib/github";
import type { DecathlonTask, DietEntry } from "@/lib/types";

export const runtime = "nodejs";

type Kind = "goal" | "diet";

const FILE_BY_KIND: Record<Kind, string> = {
  goal: "data/goals.json",
  diet: "data/diet.json",
};

const GOAL_STATUSES = ["on-track", "behind", "achieved"] as const;

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

type NewItem =
  | { kind: "goal"; item: Omit<DecathlonTask, "id" | "addedAt"> }
  | { kind: "diet"; item: Omit<DietEntry, "id" | "addedAt"> };

type ValidationResult = { ok: true; value: NewItem } | { ok: false; errors: string[] };

function validate(kind: Kind, payload: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (kind === "goal") {
    if (!isNonEmptyString(payload.description)) errors.push("description (non-empty string) is required");
    if (!isNonEmptyString(payload.requiredCapacity)) errors.push("requiredCapacity is required");
    if (!isNonEmptyString(payload.currentCapacity)) errors.push("currentCapacity is required");
    const progress = optionalNumber(payload.progress);
    if (progress === undefined || progress < 0 || progress > 100) errors.push("progress must be a number 0-100");
    const status = payload.status;
    if (typeof status !== "string" || !GOAL_STATUSES.includes(status as DecathlonTask["status"])) {
      errors.push(`status must be one of: ${GOAL_STATUSES.join(", ")}`);
    }
    if (errors.length > 0) return { ok: false, errors };
    return {
      ok: true,
      value: {
        kind,
        item: {
          description: payload.description as string,
          requiredCapacity: payload.requiredCapacity as string,
          currentCapacity: payload.currentCapacity as string,
          progress: progress as number,
          status: status as DecathlonTask["status"],
        },
      },
    };
  }

  // diet
  if (!isNonEmptyString(payload.meal)) errors.push("meal (non-empty string) is required");
  const date = isNonEmptyString(payload.date) ? payload.date : new Date().toISOString().slice(0, 10);
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      kind,
      item: {
        date,
        meal: payload.meal as string,
        ...(optionalNumber(payload.proteinG) !== undefined ? { proteinG: optionalNumber(payload.proteinG) } : {}),
        ...(optionalNumber(payload.calories) !== undefined ? { calories: optionalNumber(payload.calories) } : {}),
        ...(isNonEmptyString(payload.note) ? { note: payload.note } : {}),
      },
    },
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const writeToken = process.env.HUB_WRITE_TOKEN;
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;

  if (!writeToken || !bearer || !safeEqual(bearer, writeToken)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "body must be a JSON object" }, { status: 400 });
  }

  const kind = body.kind;
  if (kind !== "goal" && kind !== "diet") {
    return NextResponse.json({ error: 'kind must be one of: "goal", "diet"' }, { status: 400 });
  }

  if (!isRecord(body.payload)) {
    return NextResponse.json({ error: "payload must be a JSON object" }, { status: 400 });
  }

  const result = validate(kind, body.payload);
  if (!result.ok) {
    return NextResponse.json(
      { error: `invalid payload for kind "${kind}"`, fields: result.errors },
      { status: 400 },
    );
  }

  try {
    const path = FILE_BY_KIND[kind];
    const item = await commitAppend<{ id: string; addedAt: string }>(
      path,
      result.value.item,
      `longevity: add ${kind} via api`,
    );
    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
