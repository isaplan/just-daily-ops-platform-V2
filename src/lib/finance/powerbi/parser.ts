import * as XLSX from "xlsx";
import { dutchMonthToNumber } from "@/lib/monthConverter";

export interface PowerBIPnLRecord {
  location_id: string;
  gl_account: string;
  category: string;
  subcategory: string | null;
  year: number;
  month: number;
  amount: number;
  import_id: string;
}

export interface ParseResult {
  records: PowerBIPnLRecord[];
  yearMonthCombinations: Set<string>;
}

/**
 * Robust PowerBI P&L parser
 * - Auto-detects header row and column indices (no fixed row numbers)
 * - Iterates all rows and extracts fields by matching
 * - Flexible month/year parsing (Dutch month strings or numbers)
 * - Robust amount parsing (handles comma/period formats)
 * - Deduplicates identical keys by summing amounts (prevents unique constraint conflicts)
 */
export const parsePowerBISheet = (
  workbook: XLSX.WorkBook,
  locationId: string,
  importId: string
): ParseResult => {
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

  const norm = (v: any): string => (v === null || v === undefined ? "" : v.toString().trim());
  const lower = (v: any): string => norm(v).toLowerCase();

  const parseAmount = (val: any): number => {
    if (typeof val === "number") return Number.isFinite(val) ? val : 0;
    const s = norm(val).replace(/\s+/g, "");
    if (!s) return 0;
    // Handle European formats: 1.234,56 -> 1234.56
    let normalized = s;
    if (/^-?[\d.,]+$/.test(s)) {
      if (s.includes(",") && s.includes(".")) {
        normalized = s.replace(/\./g, "").replace(",", ".");
      } else if (s.includes(",")) {
        normalized = s.replace(",", ".");
      }
    }
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  };

  // Detect header row by searching for typical column headers within first 15 rows
  let headerRowIndex = -1;
  let headerRow: any[] | undefined;
  for (let r = 0; r < Math.min(15, data.length); r++) {
    const row = data[r] || [];
    // Handle both array and single string cases
    const cells = Array.isArray(row) ? row.map(lower) : [lower(row)];
    const hasYear = cells.some((c) => /\bjaar\b|\byear\b/.test(c));
    const hasMonth = cells.some((c) => /\bmnd\b|\bmaand\b|\bmonth\b/.test(c));
    const hasRgs = cells.some((c) => /rgsniveau2|rgs niveau 2/.test(c));
    const hasGrootboek = cells.some((c) => /grootboek/.test(c));
    // Also check for the actual PowerBI column names
    const hasRgsSchema = cells.some((c) => /rgs-schema.*rgsniveau2/i.test(c));
    const hasGrootboekCol = cells.some((c) => /^grootboek$/i.test(c));
    // Check for PowerBI specific patterns
    const hasPowerBIHeaders = cells.some((c) => /rgs-schema.*rgsniveau2/i.test(c)) && 
                             cells.some((c) => /rgs-schema.*rgsniveau3/i.test(c)) &&
                             cells.some((c) => /^grootboek$/i.test(c));
    // Prioritize PowerBI headers over generic year/month detection
    // Only consider it a valid header if it's an array with proper PowerBI structure
    const isValidHeader = Array.isArray(row) && row.length > 3 && (
      hasPowerBIHeaders || 
      (hasRgsSchema && hasGrootboekCol) || 
      (hasRgs && hasGrootboek)
    );
    
    if (isValidHeader || (hasYear && hasMonth && Array.isArray(row) && row.length > 3)) {
      headerRowIndex = r;
      headerRow = row;
      break;
    }
  }

  // Default indices (legacy export)
  let glCol = 0;
  let categoryCol = 1;
  let subcategoryCol = 2;
  let yearCol = 4;
  let monthCol = 5;
  let amountCol = 6;

  if (headerRow) {
    const cells = headerRow.map(lower);
    const findIdx = (regex: RegExp) => cells.findIndex((c) => regex.test(c));

    const trySet = (current: number, idx: number) => (idx >= 0 ? idx : current);
    // Updated regex patterns to match PowerBI format
    glCol = trySet(glCol, findIdx(/rgs-schema.*rgsniveau2|rgsniveau2|gl.?account|rekening/i));
    categoryCol = trySet(categoryCol, findIdx(/rgs-schema.*rgsniveau3|rgsniveau3|categorie|category/i));
    subcategoryCol = trySet(subcategoryCol, findIdx(/^grootboek$|grootboek|subcat|subcategorie/i));
    yearCol = trySet(yearCol, findIdx(/kalender.*jaar|jaar|\byear\b/i));
    monthCol = trySet(monthCol, findIdx(/^mnd$|\bmnd\b|\bmaand\b|\bmonth\b/i));
    amountCol = trySet(amountCol, findIdx(/forecast|bedrag|amount|waarde|value|actueel|actual|omzet|spent|kosten/i));
  }

  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 2; // Skip possible filter + header rows

  console.log("=== PowerBI Parser Debug ===");
  console.log("Total rows in sheet:", data.length);
  console.log("Detected headerRowIndex:", headerRowIndex);
  console.log("Header row content:", headerRowIndex >= 0 ? data[headerRowIndex] : null);
  console.log("Start row:", startRow);
  console.log("Column indices used:", { glCol, categoryCol, subcategoryCol, yearCol, monthCol, amountCol });
  console.log("First data row sample:", data[startRow]);

  let records: PowerBIPnLRecord[] = [];
  const yearMonthCombinations = new Set<string>();
  const skippedRows: { index: number; reason: string }[] = [];

  // Iterate all data rows after the detected header
  for (let i = startRow; i < data.length; i++) {
    const row = data[i] || [];
    if (!row || row.length === 0) {
      skippedRows.push({ index: i, reason: "Empty row" });
      continue;
    }

    const glAccount = norm(row[glCol]);
    const category = norm(row[categoryCol]);
    const subcategoryVal = norm(row[subcategoryCol]);
    const subcategory = subcategoryVal || null;

    if (!glAccount) {
      skippedRows.push({ index: i, reason: "Missing GL account" });
      continue;
    }

    // Year detection: prefer designated column, else scan row for a 4-digit year
    let year: number | null = null;
    const yearRaw = row[yearCol];
    if (yearRaw !== undefined && yearRaw !== null) {
      const y = parseInt(norm(yearRaw));
      if (!Number.isNaN(y)) year = y;
    }
    if (year === null) {
      for (const cell of row) {
        const m = norm(cell).match(/\b(20\d{2})\b/);
        if (m) {
          year = parseInt(m[1]);
          break;
        }
      }
    }
    if (year === null || year < 2015 || year > 2035) {
      skippedRows.push({ index: i, reason: `Invalid year: ${norm(yearRaw)}` });
      continue;
    }

    // Month detection: number (1-12) or Dutch month name
    const monthCell = row[monthCol];
    let month = 0;
    if (typeof monthCell === "number") {
      month = Math.round(monthCell);
    } else {
      const mStr = lower(monthCell);
      if (mStr) month = dutchMonthToNumber(mStr);
    }
    if (!month) {
      // Fallback: scan row for any month-like cell
      for (const cell of row) {
        const c = lower(cell);
        if (!c) continue;
        const asNum = parseInt(c);
        if (!Number.isNaN(asNum) && asNum >= 1 && asNum <= 12) {
          month = asNum;
          break;
        }
        const asMon = dutchMonthToNumber(c);
        if (asMon) {
          month = asMon;
          break;
        }
      }
    }
    if (month < 1 || month > 12) {
      skippedRows.push({ index: i, reason: `Invalid month value in row` });
      continue;
    }

    // Amount parsing
    const amount = parseAmount(row[amountCol]);

    yearMonthCombinations.add(`${year}-${month}`);

    records.push({
      location_id: locationId,
      gl_account: glAccount,
      category,
      subcategory,
      year,
      month,
      amount,
      import_id: importId,
    });
  }

  // Deduplicate by unique constraint key (location_id, year, month, gl_account) and sum amounts
  const agg = new Map<string, PowerBIPnLRecord>();
  for (const r of records) {
    // CRITICAL: Key must match the unique constraint: (location_id, year, month, gl_account)
    const key = `${r.location_id}|${r.year}|${r.month}|${r.gl_account}`;
    const existing = agg.get(key);
    if (existing) {
      existing.amount += r.amount;
      // Keep first category/subcategory when aggregating
    } else {
      agg.set(key, { ...r });
    }
  }
  records = Array.from(agg.values());

  console.log("Parsing complete:", {
    totalRows: Math.max(0, data.length - startRow),
    parsedRecords: records.length,
    skippedRows: skippedRows.length,
    yearMonthCombinations: Array.from(yearMonthCombinations),
  });

  if (skippedRows.length > 0) {
    console.log("First 10 skipped rows:", skippedRows.slice(0, 10));
  }

  if (records.length === 0) {
    console.error("WARNING: No records parsed! Check column structure and data format.");
  }

  return { records, yearMonthCombinations };
};