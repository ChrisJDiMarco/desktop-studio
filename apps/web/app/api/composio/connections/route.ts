import { NextRequest, NextResponse } from "next/server";
import { Composio } from "@composio/core";

// Featured toolkits shown in the Connected Apps panel
const FEATURED_TOOLKITS = [
  { slug: "twitter", name: "X (Twitter)", color: "#000000", emoji: "🐦" },
  { slug: "linkedin", name: "LinkedIn", color: "#0A66C2", emoji: "💼" },
  { slug: "notion", name: "Notion", color: "#000000", emoji: "📝" },
  { slug: "gmail", name: "Gmail", color: "#EA4335", emoji: "📧" },
  { slug: "slack", name: "Slack", color: "#4A154B", emoji: "💬" },
  { slug: "github", name: "GitHub", color: "#181717", emoji: "🐙" },
  { slug: "googlesheets", name: "Google Sheets", color: "#34A853", emoji: "📊" },
  { slug: "googledocs", name: "Google Docs", color: "#4285F4", emoji: "📄" },
  { slug: "discord", name: "Discord", color: "#5865F2", emoji: "🎮" },
  { slug: "airtable", name: "Airtable", color: "#18BFFF", emoji: "🗃️" },
  { slug: "instagram", name: "Instagram", color: "#E4405F", emoji: "📸" },
  { slug: "youtube", name: "YouTube", color: "#FF0000", emoji: "▶️" },
];

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) {
    try {
      const parsed = JSON.parse(err.message);
      return parsed?.error?.message || parsed?.message || err.message;
    } catch {
      return err.message;
    }
  }
  return fallback;
}

function getComposio() {
  const apiKey = (process.env.COMPOSIO_API_KEY || "").trim();
  if (!apiKey || apiKey.startsWith("your-")) return null;
  return new Composio({ apiKey });
}

// GET — list connections for a user
export async function GET(request: NextRequest) {
  const composio = getComposio();
  if (!composio) {
    return NextResponse.json(
      { error: "COMPOSIO_API_KEY not configured. Add it to .env.local and restart the dev server.", toolkits: [] },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "desktop-studio-user";

  try {
    const session = await composio.create(userId);
    const { items } = await session.toolkits({ limit: 50 });

    // Map to a simple structure the UI can consume
    const statusMap = new Map(
      items.map((t: {slug: string; connection?: {isActive?: boolean; connectedAccount?: {id: string}}}) => [
        t.slug,
        {
          isConnected: t.connection?.isActive ?? false,
          connectedAccountId: t.connection?.connectedAccount?.id ?? null,
        },
      ])
    );

    const toolkits = FEATURED_TOOLKITS.map((f) => {
      const status = statusMap.get(f.slug);
      return {
        ...f,
        isConnected: status?.isConnected ?? false,
        connectedAccountId: status?.connectedAccountId ?? null,
      };
    });

    return NextResponse.json({ toolkits });
  } catch (err) {
    const message = getErrorMessage(err, "Failed to fetch connections");
    console.error("Composio connections GET error:", err);
    return NextResponse.json({ error: message, toolkits: [] }, { status: 500 });
  }
}

// POST — initiate OAuth for a toolkit, OR check status of a single toolkit
export async function POST(request: NextRequest) {
  const composio = getComposio();
  if (!composio) {
    return NextResponse.json(
      { error: "COMPOSIO_API_KEY not configured." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      toolkit?: unknown;
      userId?: unknown;
      callbackUrl?: unknown;
    };

    const userId = typeof body.userId === "string" && body.userId ? body.userId : "desktop-studio-user";
    const action = typeof body.action === "string" ? body.action : "connect";
    const toolkit = typeof body.toolkit === "string" ? body.toolkit.trim() : "";

    // Lightweight status check — avoids fetching the entire toolkits list.
    // Used by the Connect-flow poller after OAuth so we can resolve the
    // Thinklet promise the moment the connection lands.
    if (action === "status") {
      if (!toolkit) {
        return NextResponse.json({ error: "toolkit is required" }, { status: 400 });
      }
      const session = await composio.create(userId);
      const { items } = await session.toolkits({ limit: 50 });
      const match = (items || []).find(
        (t: { slug?: string }) => typeof t?.slug === "string" && t.slug === toolkit
      ) as { slug?: string; connection?: { isActive?: boolean; connectedAccount?: { id?: string } } } | undefined;
      return NextResponse.json({
        toolkit,
        isConnected: match?.connection?.isActive ?? false,
        connectedAccountId: match?.connection?.connectedAccount?.id ?? null,
      });
    }

    if (!toolkit) {
      return NextResponse.json({ error: "toolkit is required" }, { status: 400 });
    }

    const callbackUrl = typeof body.callbackUrl === "string" ? body.callbackUrl : undefined;

    const session = await composio.create(userId);
    const connectionRequest = await session.authorize(toolkit, {
      ...(callbackUrl ? { callbackUrl } : {}),
    });

    const connection = connectionRequest as { redirectUrl?: string; id?: string; status?: string };
    return NextResponse.json({
      redirectUrl: connection.redirectUrl,
      connectedAccountId: connection.id,
      status: connection.status,
    });
  } catch (err) {
    const message = getErrorMessage(err, "Failed to initiate connection");
    console.error("Composio connections POST error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — disconnect a connected account
export async function DELETE(request: NextRequest) {
  const composio = getComposio();
  if (!composio) {
    return NextResponse.json({ error: "COMPOSIO_API_KEY not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { connectedAccountId?: unknown };
    const id = typeof body.connectedAccountId === "string" ? body.connectedAccountId.trim() : "";
    if (!id) {
      return NextResponse.json({ error: "connectedAccountId is required" }, { status: 400 });
    }

    await composio.connectedAccounts.delete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = getErrorMessage(err, "Failed to disconnect");
    console.error("Composio connections DELETE error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
