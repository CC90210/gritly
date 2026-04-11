import { NextResponse } from "next/server";
import { hasUnsafeJsonKeys, isPlainObject } from "@/lib/api/validation";

interface ParseBodyOptions {
  allowEmpty?: boolean;
  maxBytes?: number;
  requireObject?: boolean;
}

function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) return false;

  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return normalized === "application/json" || normalized.endsWith("+json");
}

/**
 * Safely parses the JSON body of a request.
 * Rejects invalid/missing JSON content types and prototype-polluting payloads.
 */
export async function parseBody<T = Record<string, unknown>>(
  req: Request,
  options: ParseBodyOptions = {},
): Promise<T | NextResponse> {
  const allowEmpty = options.allowEmpty ?? true;
  const maxBytes = options.maxBytes ?? 1_000_000;
  const requireObject = options.requireObject ?? true;

  if (!isJsonContentType(req.headers.get("content-type"))) {
    return NextResponse.json(
      { error: "Content-Type must be application/json" },
      { status: 415 },
    );
  }

  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Unable to read request body" }, { status: 400 });
  }

  if (Buffer.byteLength(rawBody, "utf8") > maxBytes) {
    return NextResponse.json({ error: "JSON body is too large" }, { status: 413 });
  }

  if (rawBody.trim().length === 0) {
    if (!allowEmpty) {
      return NextResponse.json({ error: "Request body is required" }, { status: 400 });
    }

    return {} as T;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (requireObject && !isPlainObject(parsed)) {
    return NextResponse.json({ error: "JSON body must be an object" }, { status: 422 });
  }

  if (hasUnsafeJsonKeys(parsed)) {
    return NextResponse.json(
      { error: "JSON body contains unsupported keys" },
      { status: 400 },
    );
  }

  return parsed as T;
}
