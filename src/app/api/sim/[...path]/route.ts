import { NextRequest, NextResponse } from "next/server";

/**
 * Thin proxy from the Next.js frontend to the Python (Flask) physics service.
 * All simulator API calls go through here so the browser only ever uses
 * same-origin, relative paths.
 *
 * Target resolution:
 * - Vercel Services injects PHYSICS_SERVICE_URL (internal flask service URL)
 *   via the service binding declared in vercel.json.
 * - Local dev / sandbox falls back to the Flask dev server on port 5001.
 */
function physicsBase(): string {
  const raw = process.env.PHYSICS_SERVICE_URL?.trim();
  if (!raw) return "http://127.0.0.1:5001";
  return /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
}

async function proxy(req: NextRequest, segments: string[]) {
  try {
    const upstreamUrl = new URL(
      `/api/${segments.join("/")}`,
      physicsBase(),
    );
    upstreamUrl.search = req.nextUrl.search;

    if (req.method === "GET") {
      const upstream = await fetch(upstreamUrl, { cache: "no-store" });
      const body = await upstream.text();
      return new NextResponse(body, {
        status: upstream.status,
        headers: { "content-type": "application/json" },
      });
    }

    // POST (JSON or multipart for the experiment CSV upload)
    const contentType = req.headers.get("content-type") ?? "application/json";
    let upstream: Response;
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      upstream = await fetch(upstreamUrl, { method: "POST", body: form });
    } else {
      const raw = await req.text();
      upstream = await fetch(upstreamUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: raw,
      });
    }
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { error: "Physics service unreachable. Is the Flask mini-service running on port 5001?" },
      { status: 502 }
    );
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
