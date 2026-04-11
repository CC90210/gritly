import { NextResponse } from "next/server";

export interface Pagination {
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
}

interface PaginationOptions {
  defaultPageSize?: number;
  maxPageSize?: number;
}

function parsePositiveInteger(value: string | null): number | null {
  if (value == null) return null;
  if (!/^\d+$/.test(value)) return null;

  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parsePagination(
  searchParams: URLSearchParams,
  options: PaginationOptions = {},
): Pagination | NextResponse | null {
  const defaultPageSize = options.defaultPageSize ?? 50;
  const maxPageSize = options.maxPageSize ?? 200;

  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");
  const limitParam = searchParams.get("limit");

  if (!pageParam && !pageSizeParam && !limitParam) {
    return null;
  }

  const page = pageParam ? parsePositiveInteger(pageParam) : 1;
  const pageSize = pageSizeParam
    ? parsePositiveInteger(pageSizeParam)
    : limitParam
      ? parsePositiveInteger(limitParam)
      : defaultPageSize;

  if (!page) {
    return NextResponse.json({ error: "page must be a positive integer" }, { status: 422 });
  }

  if (!pageSize) {
    return NextResponse.json({ error: "pageSize must be a positive integer" }, { status: 422 });
  }

  if (pageSize > maxPageSize) {
    return NextResponse.json(
      { error: `pageSize cannot exceed ${maxPageSize}` },
      { status: 422 },
    );
  }

  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}
