// Very pragmatic parsers: tweak as you see real data

const DATE_RE = /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/g; // 12/08/2025 or 12-08-25
const AMT_RE = /[-+]?\b\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\b/g;

function normDate(d) {
  // Accept dd/mm/yyyy or mm/dd/yyyy; assume dd/mm/yyyy by default.
  const parts = d.replaceAll("-", "/").split("/");
  let dd = parts[0],
    mm = parts[1],
    yyyy = parts[2];
  if (yyyy.length === 2) yyyy = (yyyy < "70" ? "20" : "19") + yyyy; // crude 2-digit year
  // swap if month > 12:
  if (parseInt(dd, 10) > 12 && parseInt(mm, 10) <= 12) [dd, mm] = [mm, dd];
  return `${yyyy.padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(
    2,
    "0"
  )}`;
}

function parseLinesToTx(rawText, source) {
  const lines = rawText
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const tx = [];
  for (const line of lines) {
    const dates = [...line.matchAll(DATE_RE)].map((m) => m[1]);
    const amts = [...line.matchAll(AMT_RE)].map((m) => m[0].replace(/,/g, ""));
    if (dates.length && amts.length) {
      const date = normDate(dates[0]);
      const amount = parseFloat(amts[amts.length - 1]); // take last number as amount
      tx.push({
        id: `${source}-${date}-${tx.length}`,
        source,
        date,
        amount,
        description: line,
      });
    }
  }
  return tx;
}

export function detectMonth(tx) {
  if (!tx.length) return null;
  // Get most frequent yyyy-mm in tx
  const counts = {};
  for (const t of tx) {
    const ym = t.date.slice(0, 7);
    counts[ym] = (counts[ym] || 0) + 1;
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}

export function filterByMonth(tx, monthYm) {
  if (!monthYm) return tx;
  return tx.filter((t) => t.date.startsWith(monthYm));
}

export function parseTextToTransactions(rawText, source) {
  return parseLinesToTx(rawText, source);
}
