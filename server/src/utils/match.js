// Simple, fast reconciliation:
// - If month provided -> filter both sets to that month
// - Else -> detect month from bank and filter both to that month
// - Match by (abs amount equal) and date within ±3 days; tie-break by description similarity (very basic)

function dateWithinDays(d1, d2, days = 3) {
  const a = new Date(d1).getTime();
  const b = new Date(d2).getTime();
  const diff = Math.abs(a - b) / (24 * 60 * 60 * 1000);
  return diff <= days;
}

function sim(a, b) {
  a = a.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
  b = b.toLowerCase().replace(/\s+/g, " ").slice(0, 80);
  const setA = new Set(a.split(" "));
  const setB = new Set(b.split(" "));
  const inter = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union ? inter / union : 0;
}

export function matchTransactions(bankTx, shopTx, monthYm) {
  // month filtering handled by caller
  const bankPool = [...bankTx];
  const shopPool = [...shopTx];
  const matches = [];
  const anomalies = [];

  for (const b of bankPool) {
    // candidate shop tx: same abs amount, within ±3 days
    const candidates = shopPool.filter(
      (s) =>
        Math.abs(Math.abs(s.amount) - Math.abs(b.amount)) < 0.001 &&
        dateWithinDays(b.date, s.date, 3)
    );
    if (!candidates.length) {
      anomalies.push({ type: "missing_in_shop", bankId: b.id, bank: b });
      continue;
    }
    // pick best by description similarity
    let best = null,
      bestScore = -1;
    for (const s of candidates) {
      const score = sim(b.description, s.description);
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
    // record match + remove from shop pool
    matches.push({
      bankId: b.id,
      shopId: best.id,
      confidence: Number(bestScore.toFixed(2)),
    });
    const idx = shopPool.findIndex((x) => x.id === best.id);
    if (idx >= 0) shopPool.splice(idx, 1);
  }

  // Remaining shopPool are extras not found in bank
  for (const s of shopPool) {
    anomalies.push({ type: "missing_in_bank", shopId: s.id, shop: s });
  }

  const stats = {
    totalBank: bankTx.length,
    totalShop: shopTx.length,
    matched: matches.length,
    unmatched: anomalies.length,
    confidencePct: Math.round(
      100 *
        (matches.filter((m) => m.confidence >= 0.6).length /
          Math.max(1, matches.length))
    ),
  };

  return { matches, anomalies, stats, month: monthYm || null };
}
