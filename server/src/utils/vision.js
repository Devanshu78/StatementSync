import fs from "fs/promises";
import path from "path";
import XLSX from "xlsx";

// export async function extractTextSmart(buffer, originalName) {
//   const ext = path.extname(originalName).toLowerCase();

//   if (ext === ".pdf") {
//     throw new Error(
//       "PDF not supported. Please upload CSV or TXT files instead."
//     );
//   }

//   if (ext === ".csv" || ext === ".txt") {
//     return await buffer.toString("utf-8");
//   }

//   if (ext === ".xlsx" || ext === ".xls") {
//     const wb = XLSX.read(buffer, { type: "buffer" });
//     const sheetName = wb.SheetNames[0];
//     const sheet = wb.Sheets[sheetName];

//     const DATE_RE = /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\b/;
//     const AMT_RE = /[-+]?\b\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\b/;

//     const allLines = [];
//     for (const sheetName of wb.SheetNames) {
//       const sheet = wb.Sheets[sheetName];
//       if (!sheet) continue;
//       const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
//       if (!Array.isArray(rows) || rows.length === 0) continue;

//       // Find first data row: row containing a likely date and a number
//       let startIdx = 1; // default skip header row
//       for (let i = 0; i < Math.min(rows.length, 50); i++) {
//         const row = rows[i] || [];
//         const joined = row.map((c) => (c == null ? "" : String(c))).join(" ");
//         if (DATE_RE.test(joined) && AMT_RE.test(joined)) {
//           startIdx = i;
//           break;
//         }
//       }

//       for (let i = startIdx; i < rows.length; i++) {
//         const row = rows[i] || [];
//         const line = row
//           .map((cell) => (cell == null ? "" : String(cell)))
//           .join(" ")
//           .trim();
//         if (line) allLines.push(line);
//       }
//     }

//     return allLines.join("\n");
//   }

//   return await fs.readFile(filePath, "utf-8").catch(() => "");
// }

function toNumber(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[,\s]/g, "");
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

function normDateFromExcelCell(cell, opts = {}) {
  const { bankRange = null, date1904 = false, dayFirstDefault = true } = opts;

  if (cell == null || cell === "") return null;

  // --- helpers ---
  const toIsoFromYmdUTC = (y, m, d) => {
    // y: full year, m: 1..12, d: 1..31
    if (!isFinite(y) || !isFinite(m) || !isFinite(d)) return null;
    if (y < 100) y += 2000; // just-in-case for 2-digit routed here
    const dt = new Date(Date.UTC(y, m - 1, d));
    // Guard against overflow (e.g., 2025-02-31)
    if (
      dt.getUTCFullYear() !== y ||
      dt.getUTCMonth() + 1 !== m ||
      dt.getUTCDate() !== d
    )
      return null;
    const yyyy = String(y).padStart(4, "0");
    const mm = String(m).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const inBankRange = (iso) => {
    if (!bankRange || !iso) return false;
    return iso >= bankRange.start && iso <= bankRange.end;
  };

  const pickBest = (candidates) => {
    // Prefer inside bank range; then choose dayFirstDefault
    const inside = candidates.filter(inBankRange);
    if (inside.length) return inside[0];
    if (candidates.length === 2) {
      return dayFirstDefault ? candidates[0] : candidates[1];
    }
    return candidates[0] || null;
  };

  // --- 1) JS Date object from XLSX parser ---
  if (cell instanceof Date) {
    // Use UTC parts to avoid TZ off-by-one
    const yyyy = cell.getUTCFullYear();
    const mm = cell.getUTCMonth() + 1;
    const dd = cell.getUTCDate();
    return toIsoFromYmdUTC(yyyy, mm, dd);
  }

  // Normalize to string
  const s = String(cell).trim();

  // --- 2) Excel serial numbers (1900 / 1904 systems) ---
  // Accept integers/floats like 45567 or "45567.0"
  if (/^\d+(\.\d+)?$/.test(s)) {
    const serial = Number(s);
    if (serial > 0) {
      // Excel's 1900 system: day 1 is 1900-01-01, but Excel wrongly treats 1900-02-29 as valid (serial 60).
      // Common approach: for serial >= 60, subtract one day.
      let base = Date.UTC(1899, 11, 31); // 1899-12-31 (so serial 1 => Jan 1, 1900)
      if (date1904) {
        // 1904 system: serial 0 => 1904-01-01
        base = Date.UTC(1904, 0, 1);
      }
      let ms = base + Math.floor(serial) * 86400000;
      if (!date1904 && serial >= 60) ms -= 86400000; // leap-year bug adjustment
      const d = new Date(ms);
      return toIsoFromYmdUTC(
        d.getUTCFullYear(),
        d.getUTCMonth() + 1,
        d.getUTCDate()
      );
    }
  }

  // --- 3) Named month formats: dd-MMM-yy(yy) or MMM-dd-yy(yy) ---
  const monthMap = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    sept: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };

  // dd-MMM-yy(yy) e.g., 1-Aug-25 or 01 Aug 2025
  let m = s.match(/^(\d{1,2})[\s\-_.]([A-Za-z]+)[\s\-_.](\d{2,4})$/);
  if (m) {
    const dd = parseInt(m[1], 10);
    const mName = m[2].toLowerCase();
    const yStr = m[3];
    const yyyy =
      yStr.length === 2
        ? parseInt(yStr, 10) + (yStr < "70" ? 2000 : 1900)
        : parseInt(yStr, 10);
    const mmNum = monthMap[mName];
    if (mmNum) return toIsoFromYmdUTC(yyyy, mmNum, dd);
  }

  // MMM-dd-yy(yy) e.g., Aug-1-2025 or Aug 01 25
  m = s.match(/^([A-Za-z]+)[\s\-_.](\d{1,2})[\s\-_.](\d{2,4})$/);
  if (m) {
    const mName = m[1].toLowerCase();
    const dd = parseInt(m[2], 10);
    const yStr = m[3];
    const yyyy =
      yStr.length === 2
        ? parseInt(yStr, 10) + (yStr < "70" ? 2000 : 1900)
        : parseInt(yStr, 10);
    const mmNum = monthMap[mName];
    if (mmNum) return toIsoFromYmdUTC(yyyy, mmNum, dd);
  }

  // --- 4) ISO-like immediately (yyyy-mm-dd)
  m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const yyyy = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const dd = parseInt(m[3], 10);
    return toIsoFromYmdUTC(yyyy, mm, dd);
  }

  // --- 5) Ambiguous numeric dd/mm/yyyy vs mm/dd/yyyy
  // Capture (a,b,c) and try both interpretations if both plausible.
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    let yStr = m[3];
    let yyyy = parseInt(
      yStr.length === 2 ? (yStr < "70" ? `20${yStr}` : `19${yStr}`) : yStr,
      10
    );

    const candDayFirst = toIsoFromYmdUTC(yyyy, b, a); // dd/mm/yyyy  => (y, m=b, d=a)
    const candMonthFirst = toIsoFromYmdUTC(yyyy, a, b); // mm/dd/yyyy  => (y, m=a, d=b)

    // Filter out invalid dates (null). If both valid, prefer bankRange -> dayFirstDefault.
    const cands = [];
    if (candDayFirst) cands.push(candDayFirst);
    if (candMonthFirst && candMonthFirst !== candDayFirst)
      cands.push(candMonthFirst);

    if (cands.length === 1) return cands[0];
    if (cands.length === 2) {
      // Rank: inside bankRange first; then default
      const [df, mf] = cands; // we pushed day-first first
      if (inBankRange(df) && !inBankRange(mf)) return df;
      if (!inBankRange(df) && inBankRange(mf)) return mf;
      return dayFirstDefault ? df : mf;
    }
  }

  // --- 6) Month-name middle formats like 01 Aug 2025, 01-Aug-25 (already covered, but just in case with commas)
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{2,4})$/);
  if (m) {
    const dd = parseInt(m[1], 10);
    const mmNum = monthMap[m[2].toLowerCase()];
    const yStr = m[3];
    const yyyy =
      yStr.length === 2
        ? parseInt(yStr, 10) + (yStr < "70" ? 2000 : 1900)
        : parseInt(yStr, 10);
    if (mmNum) return toIsoFromYmdUTC(yyyy, mmNum, dd);
  }

  // Unrecognized
  return null;
}

// export async function extractExcelTransactions(filePath) {
//   const data = await fs.readFile(filePath);
//   const wb = XLSX.read(data, { type: "buffer", cellDates: true });

//   const preferredHeaders = {
//     date: ["date", "txn date", "transaction date"],
//     description: ["transaction details", "description", "narration", "details"],
//     debit: ["debit", "withdrawal", "dr"],
//     credit: ["credit", "deposit", "cr"],
//     balance: ["balance", "running balance"],
//     reference: ["cheque/reference#", "reference", "ref", "cheque no"],
//   };

//   function findColumnMap(headerRow) {
//     const map = {};
//     const cols = (headerRow || []).map((c) =>
//       c == null ? "" : String(c).trim().toLowerCase()
//     );
//     for (const key of Object.keys(preferredHeaders)) {
//       const aliases = preferredHeaders[key];
//       for (let i = 0; i < cols.length; i++) {
//         if (aliases.includes(cols[i])) {
//           map[key] = i;
//           break;
//         }
//       }
//     }
//     return map;
//   }

//   const transactions = [];
//   let openingBalance = null;
//   let closingBalance = null;
//   let sumDebit = 0;
//   let sumCredit = 0;

//   for (const sheetName of wb.SheetNames) {
//     const sheet = wb.Sheets[sheetName];
//     const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
//     if (!rows || rows.length === 0) continue;

//     // Detect header row by presence of expected columns
//     let headerIdx = 0;
//     let colMap = {};
//     for (let i = 0; i < Math.min(rows.length, 10); i++) {
//       const map = findColumnMap(rows[i]);
//       if (
//         Object.keys(map).length >= 2 &&
//         map.date != null &&
//         (map.debit != null || map.credit != null)
//       ) {
//         headerIdx = i;
//         colMap = map;
//         break;
//       }
//     }

//     for (let r = headerIdx + 1; r < rows.length; r++) {
//       const row = rows[r] || [];
//       const descRaw = row[colMap.description ?? -1];
//       const desc = descRaw == null ? "" : String(descRaw);
//       const isOpening = /opening balance/i.test(desc);

//       const date = normDateFromExcelCell(row[colMap.date ?? -1]);
//       const debit = toNumber(row[colMap.debit ?? -1]);
//       const credit = toNumber(row[colMap.credit ?? -1]);
//       const balance =
//         colMap.balance != null ? toNumber(row[colMap.balance]) : null;

//       if (isOpening) {
//         if (balance != null) openingBalance = balance;
//         // Do not count Opening Balance as a transaction row
//         continue;
//       }

//       // Skip empty rows
//       if (!date && !debit && !credit && !balance && !desc.trim()) continue;

//       // Use signed amount: debit negative, credit positive
//       let amount = 0;
//       if (debit && !credit) amount = -Math.abs(debit);
//       else if (credit && !debit) amount = Math.abs(credit);
//       else if (credit && debit) amount = credit - debit;

//       if (debit) sumDebit += Math.abs(debit);
//       if (credit) sumCredit += Math.abs(credit);

//       if (date) {
//         transactions.push({
//           date,
//           amount,
//           description: desc,
//           reference: row[colMap.reference ?? -1] ?? null,
//           balance,
//           debitRaw: debit || 0,
//           creditRaw: credit || 0,
//         });
//       }

//       if (balance != null) closingBalance = balance; // last seen balance
//     }
//   }

//   if (
//     openingBalance == null &&
//     (sumDebit || sumCredit) &&
//     closingBalance != null
//   ) {
//     // Derive opening if only closing present
//     openingBalance = closingBalance - sumCredit + sumDebit;
//   }

//   if (closingBalance == null && openingBalance != null) {
//     closingBalance = openingBalance + sumCredit - sumDebit;
//   }

//   return { transactions, openingBalance, closingBalance, sumDebit, sumCredit };
// }


export async function extractTextSmart(buffer, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === ".pdf") {
    throw new Error(
      "PDF not supported. Please upload CSV or TXT files instead."
    );
  }

  if (ext === ".csv" || ext === ".txt") {
    // ✅ Use buffer directly - no await needed for toString()
    return buffer.toString("utf-8");
  }

  if (ext === ".xlsx" || ext === ".xls") {
    // ✅ Use buffer directly instead of reading from file
    const wb = XLSX.read(buffer, { type: "buffer" });
    
    const DATE_RE = /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\b/;
    const AMT_RE = /[-+]?\b\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\b/;

    const allLines = [];
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) continue;
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (!Array.isArray(rows) || rows.length === 0) continue;

      // Find first data row: row containing a likely date and a number
      let startIdx = 1; // default skip header row
      for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const row = rows[i] || [];
        const joined = row.map((c) => (c == null ? "" : String(c))).join(" ");
        if (DATE_RE.test(joined) && AMT_RE.test(joined)) {
          startIdx = i;
          break;
        }
      }

      for (let i = startIdx; i < rows.length; i++) {
        const row = rows[i] || [];
        const line = row
          .map((cell) => (cell == null ? "" : String(cell)))
          .join(" ")
          .trim();
        if (line) allLines.push(line);
      }
    }

    return allLines.join("\n");
  }

  // ✅ Remove the fs.readFile fallback - it won't work in Vercel serverless
  throw new Error(`Unsupported file type: ${ext}`);
}

// ✅ Also update extractExcelTransactions to use buffer
export async function extractExcelTransactions(buffer) {
  // ✅ Use buffer directly instead of reading from file
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const preferredHeaders = {
    date: ["date", "txn date", "transaction date"],
    description: ["transaction details", "description", "narration", "details"],
    debit: ["debit", "withdrawal", "dr"],
    credit: ["credit", "deposit", "cr"],
    balance: ["balance", "running balance"],
    reference: ["cheque/reference#", "reference", "ref", "cheque no"],
  };

  function findColumnMap(headerRow) {
    const map = {};
    const cols = (headerRow || []).map((c) =>
      c == null ? "" : String(c).trim().toLowerCase()
    );
    for (const key of Object.keys(preferredHeaders)) {
      const aliases = preferredHeaders[key];
      for (let i = 0; i < cols.length; i++) {
        if (aliases.includes(cols[i])) {
          map[key] = i;
          break;
        }
      }
    }
    return map;
  }

  function normDateFromExcelCell(cell) {
    if (!cell) return null;
    let date;
    if (cell instanceof Date) {
      date = cell;
    } else if (typeof cell === 'number') {
      // Excel date serial number
      date = new Date((cell - 25569) * 86400 * 1000);
    } else {
      date = new Date(cell);
    }
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  function toNumber(val) {
    if (val == null) return 0;
    const num = parseFloat(String(val).replace(/[,\s]/g, ''));
    return isNaN(num) ? 0 : num;
  }

  const transactions = [];
  let openingBalance = null;
  let closingBalance = null;
  let sumDebit = 0;
  let sumCredit = 0;

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
    if (!rows || rows.length === 0) continue;

    // Detect header row by presence of expected columns
    let headerIdx = 0;
    let colMap = {};
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const map = findColumnMap(rows[i]);
      if (
        Object.keys(map).length >= 2 &&
        map.date != null &&
        (map.debit != null || map.credit != null)
      ) {
        headerIdx = i;
        colMap = map;
        break;
      }
    }

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const descRaw = row[colMap.description ?? -1];
      const desc = descRaw == null ? "" : String(descRaw);
      const isOpening = /opening balance/i.test(desc);

      const date = normDateFromExcelCell(row[colMap.date ?? -1]);
      const debit = toNumber(row[colMap.debit ?? -1]);
      const credit = toNumber(row[colMap.credit ?? -1]);
      const balance =
        colMap.balance != null ? toNumber(row[colMap.balance]) : null;

      if (isOpening) {
        if (balance != null) openingBalance = balance;
        // Do not count Opening Balance as a transaction row
        continue;
      }

      // Skip empty rows
      if (!date && !debit && !credit && !balance && !desc.trim()) continue;

      // Use signed amount: debit negative, credit positive
      let amount = 0;
      if (debit && !credit) amount = -Math.abs(debit);
      else if (credit && !debit) amount = Math.abs(credit);
      else if (credit && debit) amount = credit - debit;

      if (debit) sumDebit += Math.abs(debit);
      if (credit) sumCredit += Math.abs(credit);

      if (date) {
        transactions.push({
          date,
          amount,
          description: desc,
          reference: row[colMap.reference ?? -1] ?? null,
          balance,
          debitRaw: debit || 0,
          creditRaw: credit || 0,
        });
      }

      if (balance != null) closingBalance = balance; // last seen balance
    }
  }

  if (
    openingBalance == null &&
    (sumDebit || sumCredit) &&
    closingBalance != null
  ) {
    // Derive opening if only closing present
    openingBalance = closingBalance - sumCredit + sumDebit;
  }

  if (closingBalance == null && openingBalance != null) {
    closingBalance = openingBalance + sumCredit - sumDebit;
  }

  return { transactions, openingBalance, closingBalance, sumDebit, sumCredit };
}

