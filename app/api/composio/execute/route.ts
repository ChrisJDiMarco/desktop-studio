import { NextRequest, NextResponse } from "next/server";
import { Composio } from "@composio/core";

function getComposio() {
  const apiKey = (process.env.COMPOSIO_API_KEY || "").trim();
  if (!apiKey || apiKey.startsWith("your-")) return null;
  return new Composio({ apiKey });
}

type ComposioSession = {
  execute: (tool: string, args: Record<string, unknown>) => Promise<unknown>;
};

// Walk a Composio response payload and pull out the first id-shaped string
// from any of the requested keys. Composio (and the underlying providers)
// ship inconsistent shapes — sometimes top-level, sometimes under `data`,
// sometimes nested deeper — so we BFS to find it.
function pluckString(payload: unknown, keys: string[]): string | null {
  if (!payload || typeof payload !== "object") return null;
  const stack: unknown[] = [payload];
  const seen = new Set<unknown>();
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    const obj = node as Record<string, unknown>;
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === "string" && value.trim() && !value.includes(" ")) {
        return value.trim();
      }
      if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
      }
    }
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return null;
}

// Try a sequence of slugs and return the first one that returns the
// requested id field. Tolerates older catalog naming variations.
async function pluckFromSlugs(
  session: ComposioSession,
  slugs: string[],
  keys: string[]
): Promise<string | null> {
  for (const slug of slugs) {
    try {
      const result = await session.execute(slug, {});
      const id = pluckString(result, keys);
      if (id) return id;
    } catch {
      // Try next candidate.
    }
  }
  return null;
}

async function fetchLinkedInAuthorUrn(session: ComposioSession): Promise<string | null> {
  const id = await pluckFromSlugs(
    session,
    ["LINKEDIN_GET_MY_INFO", "LINKEDIN_GET_USER_INFO", "LINKEDIN_GET_CURRENT_USER_INFO"],
    ["id", "sub", "personId", "person_id"]
  );
  if (!id) return null;
  return id.startsWith("urn:li:") ? id : `urn:li:person:${id}`;
}

async function fetchTwitterUserId(session: ComposioSession): Promise<string | null> {
  return pluckFromSlugs(
    session,
    [
      "TWITTER_USER_LOOKUP_ME",
      "TWITTER_GET_AUTHENTICATED_USER",
      "TWITTER_GET_ME",
    ],
    ["id", "user_id", "userId", "id_str"]
  );
}

async function fetchGitHubUsername(session: ComposioSession): Promise<string | null> {
  return pluckFromSlugs(
    session,
    [
      "GITHUB_GET_THE_AUTHENTICATED_USER",
      "GITHUB_USERS_GET_AUTHENTICATED",
      "GITHUB_GET_AUTHENTICATED_USER",
    ],
    ["login", "username", "user_login"]
  );
}

async function fetchSlackSelfUserId(session: ComposioSession): Promise<string | null> {
  return pluckFromSlugs(
    session,
    [
      "SLACK_AUTH_TEST",
      "SLACK_USERS_INFO_ME",
      "SLACK_GET_CURRENT_USER",
    ],
    ["user_id", "user", "id"]
  );
}

async function fetchInstagramAccountId(session: ComposioSession): Promise<string | null> {
  return pluckFromSlugs(
    session,
    [
      "INSTAGRAM_GET_BUSINESS_ACCOUNT",
      "INSTAGRAM_GET_USER",
      "INSTAGRAM_GET_ME",
    ],
    ["instagram_business_account_id", "business_account_id", "id", "ig_id"]
  );
}

// Pre-flight: inject required platform fields the Thinklet may have omitted.
// Each branch is intentionally conservative — only fill when the user clearly
// didn't supply the value AND the field is identity-shaped (something only
// the platform can know). User-content fields (channel, recipient, body) are
// never auto-filled.
async function enrichToolArgs(
  session: ComposioSession,
  tool: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const out = { ...args };
  const upperTool = tool.toUpperCase();

  // ── LinkedIn ──────────────────────────────────────────────────────
  if (
    upperTool.startsWith("LINKEDIN_") &&
    (upperTool.includes("CREATE") || upperTool.includes("POST")) &&
    !out.author
  ) {
    const urn = await fetchLinkedInAuthorUrn(session);
    if (urn) out.author = urn;
  }
  if (upperTool.startsWith("LINKEDIN_") && upperTool.includes("POST")) {
    if (!out.visibility) out.visibility = "PUBLIC";
    if (!out.lifecycleState && !out.lifecycle_state) out.lifecycleState = "PUBLISHED";
  }

  // ── Twitter / X ───────────────────────────────────────────────────
  // Tools that operate on "the authenticated user" (lookups, follows,
  // bookmarks, lists, DMs) almost always need user_id; posting tweets does
  // NOT. We fill only when the field is genuinely a self-id.
  if (upperTool.startsWith("TWITTER_") && needsSelfUserId(upperTool) && !out.user_id && !out.userId) {
    const id = await fetchTwitterUserId(session);
    if (id) {
      out.user_id = id;
      out.userId = id;
    }
  }

  // ── GitHub ─────────────────────────────────────────────────────────
  // Issue/PR creation needs `owner`. If the Thinklet omitted it AND it
  // looks like the user is operating on their own repo (no other clue),
  // fill `owner` with the authenticated user's login.
  if (upperTool.startsWith("GITHUB_") && !out.owner && !out.org) {
    const login = await fetchGitHubUsername(session);
    if (login) out.owner = login;
  }

  // ── Google Calendar ────────────────────────────────────────────────
  // Almost every Google Calendar tool requires `calendar_id`; "primary" is
  // always valid for the authenticated user's main calendar.
  if (
    (upperTool.startsWith("GOOGLECALENDAR_") || upperTool.startsWith("GOOGLE_CALENDAR_") || upperTool.startsWith("CALENDAR_")) &&
    !out.calendar_id && !out.calendarId
  ) {
    out.calendar_id = "primary";
  }

  // ── Gmail ──────────────────────────────────────────────────────────
  // Gmail's "userId" param is "me" for the authenticated account.
  if (upperTool.startsWith("GMAIL_") && !out.user_id && !out.userId) {
    out.user_id = "me";
  }

  // ── Slack ──────────────────────────────────────────────────────────
  // Tools that look up the current user (rather than send to a channel)
  // need a user id. Channel sends are NEVER auto-filled — they require
  // the user's intended channel.
  if (
    upperTool.startsWith("SLACK_") &&
    (upperTool.includes("USER_INFO") || upperTool.includes("WHO_AM_I") || upperTool.includes("AUTH_TEST")) &&
    !out.user
  ) {
    const id = await fetchSlackSelfUserId(session);
    if (id) out.user = id;
  }

  // ── Instagram ──────────────────────────────────────────────────────
  if (
    upperTool.startsWith("INSTAGRAM_") &&
    (upperTool.includes("CREATE") || upperTool.includes("POST") || upperTool.includes("PUBLISH") || upperTool.includes("MEDIA")) &&
    !out.instagram_business_account_id && !out.business_account_id
  ) {
    const id = await fetchInstagramAccountId(session);
    if (id) out.instagram_business_account_id = id;
  }

  // ── YouTube ────────────────────────────────────────────────────────
  // YouTube list/search defaults — `mine: true` returns videos for the
  // authenticated channel without needing channelId.
  if (upperTool.startsWith("YOUTUBE_") && upperTool.includes("LIST") && !out.mine && !out.channelId && !out.channel_id) {
    out.mine = true;
  }

  return out;
}

// Twitter slugs that DO require user_id. Posting tools generally don't.
function needsSelfUserId(upperTool: string): boolean {
  if (upperTool.includes("POST_TWEET") || upperTool.includes("CREATION_OF_A_POST")) return false;
  return (
    upperTool.includes("USER_LOOKUP_ME") ||
    upperTool.includes("BOOKMARKS") ||
    upperTool.includes("FOLLOWS") ||
    upperTool.includes("LIKE") ||
    upperTool.includes("MUTED") ||
    upperTool.includes("BLOCKED") ||
    upperTool.includes("LISTS_OWNED") ||
    upperTool.includes("DM_") ||
    upperTool.includes("DIRECT_MESSAGE")
  );
}

// Last-chance recovery — Composio echoes the missing-field error verbatim,
// so we can parse it and reach for the right helper. Keeps Thinklets from
// hard-failing on platform-specific schema requirements.
async function tryRecoverFromError(
  session: ComposioSession,
  tool: string,
  args: Record<string, unknown>,
  errorMessage: string
): Promise<Record<string, unknown> | null> {
  const upperTool = tool.toUpperCase();
  const upperMsg = errorMessage.toUpperCase();
  const isMissing = (field: string) =>
    upperMsg.includes(field) && (upperMsg.includes("MISSING") || upperMsg.includes("REQUIRED") || upperMsg.includes("NOT PROVIDED"));

  // LinkedIn — author URN
  if (upperTool.startsWith("LINKEDIN_") && isMissing("AUTHOR") && !args.author) {
    const urn = await fetchLinkedInAuthorUrn(session);
    if (urn) return { ...args, author: urn };
  }
  // Twitter — user_id
  if (upperTool.startsWith("TWITTER_") && (isMissing("USER_ID") || isMissing("USERID")) && !args.user_id && !args.userId) {
    const id = await fetchTwitterUserId(session);
    if (id) return { ...args, user_id: id, userId: id };
  }
  // GitHub — owner
  if (upperTool.startsWith("GITHUB_") && isMissing("OWNER") && !args.owner) {
    const login = await fetchGitHubUsername(session);
    if (login) return { ...args, owner: login };
  }
  // Google Calendar — calendar_id
  if (
    (upperTool.startsWith("GOOGLECALENDAR_") || upperTool.startsWith("GOOGLE_CALENDAR_") || upperTool.startsWith("CALENDAR_")) &&
    (isMissing("CALENDAR_ID") || isMissing("CALENDARID")) &&
    !args.calendar_id && !args.calendarId
  ) {
    return { ...args, calendar_id: "primary" };
  }
  // Gmail — userId fallback
  if (upperTool.startsWith("GMAIL_") && (isMissing("USER_ID") || isMissing("USERID")) && !args.user_id && !args.userId) {
    return { ...args, user_id: "me" };
  }
  // Instagram — account id
  if (
    upperTool.startsWith("INSTAGRAM_") &&
    (isMissing("INSTAGRAM_BUSINESS_ACCOUNT_ID") || isMissing("BUSINESS_ACCOUNT_ID") || isMissing("ACCOUNT_ID")) &&
    !args.instagram_business_account_id && !args.business_account_id
  ) {
    const id = await fetchInstagramAccountId(session);
    if (id) return { ...args, instagram_business_account_id: id };
  }

  return null;
}

// Convert "INVALID REQUEST DATA PROVIDED - FOLLOWING FIELDS ARE MISSING:
// {'CHANNEL'}" into a sentence the Thinklet UI can show without further
// parsing. Falls back to the original message when no fields are detected.
function humanizeMissingFieldsError(message: string): string {
  const upper = message.toUpperCase();
  if (!upper.includes("MISSING") && !upper.includes("REQUIRED")) return message;
  const matches = message.match(/['"`]([A-Z_][A-Z0-9_]*)['"`]/gi);
  if (!matches || matches.length === 0) return message;
  const fields = matches
    .map(s => s.replace(/['"`]/g, "").trim())
    .filter(Boolean);
  if (fields.length === 0) return message;
  const fieldList = fields.map(f => `\`${f.toLowerCase()}\``).join(", ");
  return `Missing required field${fields.length > 1 ? "s" : ""}: ${fieldList}. Add ${fields.length > 1 ? "them" : "it"} to the tool arguments and try again.`;
}

function getExecutionError(result: unknown): { error: string; authRequired?: boolean } | null {
  if (!result || typeof result !== "object") return null;
  const payload = result as {
    error?: unknown;
    successful?: unknown;
    data?: { error?: unknown; message?: unknown };
  };

  let message: string | null = null;
  if (typeof payload.error === "string" && payload.error.trim()) {
    message = payload.error;
  } else if (payload.error && typeof payload.error === "object") {
    const errObj = payload.error as { message?: unknown };
    if (typeof errObj.message === "string") message = errObj.message;
  } else if (payload.successful === false) {
    const dataErr = payload.data?.error;
    const dataMsg = payload.data?.message;
    if (typeof dataErr === "string" && dataErr.trim()) message = dataErr;
    else if (typeof dataMsg === "string" && dataMsg.trim()) message = dataMsg;
    else message = "Composio tool execution failed.";
  }

  if (!message) return null;

  // Surface auth-required errors as a structured signal so the Thinklet can
  // pivot to the connect flow instead of treating it as a generic failure.
  const lower = message.toLowerCase();
  const authRequired =
    lower.includes("not connected") ||
    lower.includes("no connected account") ||
    lower.includes("connected account not found") ||
    lower.includes("auth not found") ||
    lower.includes("authentication required") ||
    lower.includes("unauthorized") ||
    lower.includes("connection required");

  return { error: message, ...(authRequired ? { authRequired: true } : {}) };
}

export async function POST(request: NextRequest) {
  const composio = getComposio();
  if (!composio) {
    return NextResponse.json(
      { error: "COMPOSIO_API_KEY not configured. Add it to .env.local and restart the dev server." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      tool?: unknown;
      arguments?: unknown;
      userId?: unknown;
      query?: unknown;
      toolkits?: unknown;
      limit?: unknown;
      proxy?: unknown;
    };

    const userId = typeof body.userId === "string" && body.userId ? body.userId : "desktop-studio-user";
    const action = typeof body.action === "string" ? body.action : "execute";
    const session = await composio.create(userId);

    if (action === "search") {
      const query = typeof body.query === "string" ? body.query.trim() : "";
      if (!query) {
        return NextResponse.json({ error: "query is required" }, { status: 400 });
      }
      const toolkits = Array.isArray(body.toolkits)
        ? body.toolkits.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        : undefined;
      const limit = typeof body.limit === "number" ? body.limit : undefined;
      const result = await session.search({
        query,
        ...(toolkits?.length ? { toolkits } : {}),
        ...(limit ? { limit } : {}),
      });
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "toolkits") {
      const limit = typeof body.limit === "number" ? body.limit : 100;
      const result = await session.toolkits({ limit });
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "schema") {
      // Lightweight tool schema lookup so Thinklets can inspect the
      // required/optional fields of a tool BEFORE calling execute. Removes
      // the need to guess at parameter names like commentary/text/body.
      const slug = typeof body.tool === "string" ? body.tool.trim() : "";
      if (!slug) {
        return NextResponse.json({ error: "tool is required" }, { status: 400 });
      }
      const composioWithTools = composio as unknown as {
        tools?: { getRawComposioToolBySlug?: (s: string) => Promise<unknown> };
      };
      if (!composioWithTools.tools?.getRawComposioToolBySlug) {
        return NextResponse.json({ error: "tool schema lookup unavailable in this Composio SDK version" }, { status: 501 });
      }
      try {
        const tool = await composioWithTools.tools.getRawComposioToolBySlug(slug);
        return NextResponse.json({ success: true, data: tool });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Tool schema lookup failed";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    if (action === "proxy") {
      const proxy = body.proxy && typeof body.proxy === "object" ? body.proxy as Record<string, unknown> : {};
      const endpoint = typeof proxy.endpoint === "string" ? proxy.endpoint.trim() : "";
      const method = typeof proxy.method === "string" ? proxy.method.trim().toUpperCase() : "";
      if (!endpoint || !method) {
        return NextResponse.json({ error: "proxy.endpoint and proxy.method are required" }, { status: 400 });
      }
      const result = await session.proxyExecute(proxy as Parameters<typeof session.proxyExecute>[0]);
      return NextResponse.json({ success: true, data: result });
    }

    const tool = typeof body.tool === "string" ? body.tool.trim() : "";
    if (!tool) {
      return NextResponse.json({ error: "tool is required" }, { status: 400 });
    }
    const args = body.arguments && typeof body.arguments === "object" ? body.arguments as Record<string, unknown> : {};

    // Best-effort schema enrichment so common posters "just work" — Thinklets
    // routinely call create-post tools without the platform-specific URN
    // fields that LinkedIn/Instagram require. Rather than push that knowledge
    // onto every generated app, we resolve them here once and inject.
    const enrichedArgs = await enrichToolArgs(session, tool, args);

    let result = await session.execute(tool, enrichedArgs);
    let executionError = getExecutionError(result);

    // If a known recoverable error fires (e.g. LinkedIn rejected because the
    // author URN is missing), try enriching once more from the live error
    // payload and retry. One retry only — never a loop.
    if (executionError) {
      const recovered = await tryRecoverFromError(session, tool, enrichedArgs, executionError.error);
      if (recovered) {
        result = await session.execute(tool, recovered);
        executionError = getExecutionError(result);
      }
    }

    if (executionError) {
      const friendly = humanizeMissingFieldsError(executionError.error);
      return NextResponse.json(
        {
          success: false,
          error: friendly,
          rawError: executionError.error,
          authRequired: !!executionError.authRequired,
          data: result,
        },
        { status: executionError.authRequired ? 401 : 502 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Composio execution failed";
    console.error("Composio execute error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
