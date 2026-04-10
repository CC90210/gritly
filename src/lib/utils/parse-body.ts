import { NextResponse } from "next/server";

/**
 * Safely parses the JSON body of a request.
 * Returns a NextResponse with status 400 if parsing fails.
 */
export async function parseBody<T = Record<string, unknown>>(
  req: Request
): Promise<T | NextResponse> {
  try {
    return (await req.json()) as T;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
