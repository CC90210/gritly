"use client";

import { useState, useRef, useCallback } from "react";
// Import uses /api/import endpoint
import { useOrgStore } from "@/lib/store/org";
import {
  Upload, FileText, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, Loader2, X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportFormat = "jobber" | "housecall" | "generic";

interface ColumnMapping {
  csvHeader: string;
  gritlyField: string;
}

interface ImportResult {
  clients: number;
  jobs: number;
  invoices: number;
  skipped: number;
  errors: string[];
}

const GRITLY_CLIENT_FIELDS = [
  { value: "", label: "— skip —" },
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "company_name", label: "Company Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "billing_address", label: "Billing Address" },
  { value: "billing_city", label: "City" },
  { value: "billing_state", label: "State / Province" },
  { value: "billing_zip", label: "ZIP / Postal Code" },
  { value: "notes", label: "Notes" },
];

// Known header mappings for Jobber and Housecall Pro
const PRESET_MAPPINGS: Record<ImportFormat, Record<string, string>> = {
  jobber: {
    "First Name": "first_name",
    "Last Name": "last_name",
    "Company": "company_name",
    "Email": "email",
    "Phone": "phone",
    "Address": "billing_address",
    "City": "billing_city",
    "Province/State": "billing_state",
    "Postal/Zip Code": "billing_zip",
    "Notes": "notes",
  },
  housecall: {
    "customer_first_name": "first_name",
    "customer_last_name": "last_name",
    "company": "company_name",
    "email": "email",
    "mobile_number": "phone",
    "street": "billing_address",
    "city": "billing_city",
    "state": "billing_state",
    "zip": "billing_zip",
  },
  generic: {},
};

// ─── CSV parsing ──────────────────────────────────────────────────────────────

/**
 * RFC 4180-compliant CSV parser.
 * Handles: quoted fields with embedded newlines, escaped quotes (doubled ""),
 * CRLF/LF line endings, and trailing newlines.
 */
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const records: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  // Normalise CRLF → LF then strip trailing newline
  const data = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n$/, "");

  while (i < data.length) {
    const ch = data[i];

    if (inQuotes) {
      if (ch === '"') {
        if (data[i + 1] === '"') {
          // Escaped double-quote
          field += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        current.push(field.trim());
        field = "";
        i++;
      } else if (ch === "\n") {
        current.push(field.trim());
        field = "";
        if (current.some((f) => f !== "")) records.push(current);
        current = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Last field / last record
  current.push(field.trim());
  if (current.some((f) => f !== "")) records.push(current);

  if (records.length === 0) return { headers: [], rows: [] };

  const headers = records[0];
  const rows = records.slice(1);
  return { headers, rows };
}

function detectFormat(headers: string[]): ImportFormat {
  const headerSet = new Set(headers);
  if (headerSet.has("Province/State") || headerSet.has("Postal/Zip Code")) return "jobber";
  if (headerSet.has("customer_first_name") || headerSet.has("mobile_number")) return "housecall";
  return "generic";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const { org } = useOrgStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [allRows, setAllRows] = useState<string[][]>([]);
  const [format, setFormat] = useState<ImportFormat>("generic");
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function applyFile(f: File) {
    setFile(f);
    setResult(null);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows } = parseCSV(text);
      const detectedFormat = detectFormat(h);
      const preset = PRESET_MAPPINGS[detectedFormat];

      setHeaders(h);
      setPreviewRows(rows.slice(0, 5));
      setAllRows(rows);
      setFormat(detectedFormat);
      setMappings(
        h.map((header) => ({
          csvHeader: header,
          gritlyField: preset[header] ?? "",
        }))
      );
      setShowMapping(true);
    };
    reader.readAsText(f);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith(".csv")) {
      applyFile(dropped);
    }
  }, []);

  function updateMapping(csvHeader: string, gritlyField: string) {
    setMappings((prev) =>
      prev.map((m) =>
        m.csvHeader === csvHeader ? { ...m, gritlyField } : m
      )
    );
  }

  async function handleImport() {
    if (!org || allRows.length === 0) return;
    setImporting(true);
    setProgress(0);
    setImportError(null);

    const result: ImportResult = { clients: 0, jobs: 0, invoices: 0, skipped: 0, errors: [] };

    const fieldMap: Record<string, string> = {};
    mappings.forEach((m) => {
      if (m.gritlyField) fieldMap[m.csvHeader] = m.gritlyField;
    });

    // Map CSV rows to client records
    const mappedRows = allRows.map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, idx) => {
        const field = fieldMap[header];
        if (field && row[idx]) {
          record[field] = row[idx];
        }
      });
      return record;
    });

    const BATCH_SIZE = 50;

    for (let i = 0; i < mappedRows.length; i += BATCH_SIZE) {
      const batch = mappedRows.slice(i, i + BATCH_SIZE);

      try {
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: batch }),
        });

        if (res.ok) {
          const data = await res.json();
          result.clients += data.imported ?? 0;
          result.skipped += data.skipped ?? 0;
          if (data.errors?.length) result.errors.push(...data.errors);
        } else {
          result.errors.push(`Batch ${i + 1}–${i + batch.length}: Server error`);
        }
      } catch {
        result.errors.push(`Batch ${i + 1}–${i + BATCH_SIZE}: Network error`);
      }

      setProgress(Math.round(((i + batch.length) / mappedRows.length) * 100));
    }

    setProgress(100);
    setResult(result);
    setImporting(false);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Import Data</h1>
        <p className="text-sm text-[#6b7280] mt-0.5">
          Import clients from Jobber, Housecall Pro, or any CSV file.
        </p>
      </div>

      {/* Supported formats banner */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["jobber", "housecall", "generic"] as const).map((fmt) => (
          <span
            key={fmt}
            className="px-3 py-1 bg-[#111111] border border-[#1f1f1f] rounded-full text-xs text-[#9ca3af]"
          >
            {fmt === "jobber" ? "Jobber CSV" : fmt === "housecall" ? "Housecall Pro CSV" : "Generic CSV"}
          </span>
        ))}
      </div>

      {/* Drop zone */}
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
            dragging
              ? "border-orange-500 bg-orange-500/5"
              : "border-[#1f1f1f] hover:border-[#374151]"
          )}
        >
          <Upload className="w-10 h-10 text-[#4b5563] mx-auto mb-4" />
          <p className="text-white font-medium mb-1">Drop your CSV here</p>
          <p className="text-sm text-[#6b7280]">or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && applyFile(e.target.files[0])}
          />
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          {/* File info */}
          <div className="px-4 py-3 border-b border-[#1f1f1f] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-sm text-white font-medium">{file.name}</p>
                <p className="text-xs text-[#6b7280]">
                  {allRows.length} rows detected •{" "}
                  <span className="text-orange-400">
                    {format === "jobber" ? "Jobber" : format === "housecall" ? "Housecall Pro" : "Generic"} format
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => { setFile(null); setHeaders([]); setAllRows([]); setResult(null); }}
              className="text-[#6b7280] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preview */}
          {previewRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1f1f1f]">
                    {headers.map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-[#6b7280] font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-b border-[#1f1f1f]/50">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 text-[#9ca3af] whitespace-nowrap max-w-[140px] truncate">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-[#4b5563] px-3 py-2">
                Showing first {previewRows.length} of {allRows.length} rows
              </p>
            </div>
          )}

          {/* Column mapping toggle */}
          <div className="border-t border-[#1f1f1f]">
            <button
              onClick={() => setShowMapping((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-[#9ca3af] hover:text-white transition-colors"
            >
              <span>Column mapping</span>
              {showMapping ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showMapping && (
              <div className="px-4 pb-4 space-y-2">
                {mappings.map((mapping) => (
                  <div key={mapping.csvHeader} className="flex items-center gap-3">
                    <span className="text-xs text-[#6b7280] w-40 truncate shrink-0">
                      {mapping.csvHeader}
                    </span>
                    <span className="text-[#374151] text-xs">→</span>
                    <select
                      value={mapping.gritlyField}
                      onChange={(e) => updateMapping(mapping.csvHeader, e.target.value)}
                      className="flex-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                    >
                      {GRITLY_CLIENT_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Progress */}
          {importing && (
            <div className="px-4 pb-4 border-t border-[#1f1f1f] pt-4">
              <div className="flex items-center justify-between text-xs text-[#6b7280] mb-2">
                <span>Importing...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="border-t border-[#1f1f1f] p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white mb-1">Import complete</p>
                  <p className="text-xs text-[#6b7280]">
                    {result.clients} clients imported
                    {result.skipped > 0 && `, ${result.skipped} rows skipped (no name)`}
                  </p>
                  {result.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {result.errors.slice(0, 3).map((err, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-red-400">
                          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                          {err}
                        </div>
                      ))}
                      {result.errors.length > 3 && (
                        <p className="text-xs text-[#6b7280]">+{result.errors.length - 3} more errors</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {importError && (
            <div className="border-t border-[#1f1f1f] p-4">
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {importError}
              </div>
            </div>
          )}

          {/* Import button */}
          {!importing && !result && (
            <div className="border-t border-[#1f1f1f] px-4 py-4">
              <button
                onClick={handleImport}
                disabled={mappings.every((m) => !m.gritlyField)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  !mappings.every((m) => !m.gritlyField)
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : "bg-[#1f1f1f] text-[#4b5563] cursor-not-allowed"
                )}
              >
                {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                Import {allRows.length.toLocaleString()} clients
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
