import { nanoid } from "nanoid";
import fs from "fs/promises";
import { extractTextSmart, extractExcelTransactions } from "../utils/vision.js";
import { parseTextToTransactions } from "../utils/parseText.js";
import { matchTransactions } from "../utils/match.js";
import { createUpload, finalizeUpload, listUploadsByUser, createAudit, getAuditById } from "../DB/neon.js";

export async function getFiles(req, res) {
  try {
    const bankFile = req.files?.bank?.[0];
    const shopFile = req.files?.shop?.[0];
    if (!bankFile || !shopFile) {
      return res
        .status(400)
        .json({ error: "Provide both bank and shop files" });
    }

    const userId = req.user.id;
    const userMonth = req.body?.month || req.query?.month; // optional "YYYY-MM"

    const uploadId = nanoid();
    await createUpload({
      id: uploadId,
      userId,
      bankFilename: bankFile.originalname,
      shopFilename: shopFile.originalname,
    });

    const bankExt = (
      bankFile.originalname.split(".").pop() || ""
    ).toLowerCase();
    const shopExt = (
      shopFile.originalname.split(".").pop() || ""
    ).toLowerCase();

    let bankTx = [];
    let shopTx = [];
    let bankBalances = { openingBalance: null, closingBalance: null };
    let shopBalances = { openingBalance: null, closingBalance: null };

    // ---- Load + parse BANK (authoritative) ----
    if (bankExt === "xlsx" || bankExt === "xls") {
      const bankExtr = await extractExcelTransactions(bankFile.path);
      bankTx = bankExtr.transactions.map((t, i) => ({
        id: `bank-${t.date}-${i}`,
        source: "bank",
        date: t.date, // MUST be ISO YYYY-MM-DD
        amount: t.amount,
        description: t.description || "",
        debitRaw: t.debitRaw ?? (t.amount < 0 ? Math.abs(t.amount) : 0),
        creditRaw: t.creditRaw ?? (t.amount > 0 ? t.amount : 0),
      }));
      bankBalances = {
        openingBalance: bankExtr.openingBalance ?? null,
        closingBalance: bankExtr.closingBalance ?? null,
      };
    } else {
      const bankText = await extractTextSmart(
        bankFile.path,
        bankFile.originalname
      );
      bankTx = parseTextToTransactions(bankText, "bank");
    }

    // Guard: need at least one valid bank date to define the window
    const bankDates = bankTx
      .map((t) => t.date)
      .filter(Boolean)
      .sort();
    if (!bankDates.length) {
      return res
        .status(400)
        .json({ error: "Could not determine bank date range" });
    }

    // Canonical bank window (inclusive)
    const bankStart = bankDates[0]; // "YYYY-MM-DD"
    const bankEnd = bankDates[bankDates.length - 1]; // "YYYY-MM-DD"
    const detectedMonth = bankStart.slice(0, 7); // for display only
    const inBankRange = (isoDate) =>
      !!isoDate && isoDate >= bankStart && isoDate <= bankEnd;

    // Optional: validate user month must fully contain the bank window
    if (userMonth) {
      // compute that month's start/end
      const [yStr, mStr] = userMonth.split("-");
      const y = Number(yStr),
        m = Number(mStr);
      if (!y || !m || m < 1 || m > 12) {
        return res
          .status(400)
          .json({ error: "Invalid month format; expected YYYY-MM" });
      }
      const monthStart = `${yStr}-${mStr.padStart(2, "0")}-01`;
      // last day of the month via Date.UTC(y, m, 0) (m is 1..12 here)
      const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
      const bankInsideUserMonth =
        bankStart >= monthStart && bankEnd <= monthEnd;
      if (!bankInsideUserMonth) {
        return res.status(400).json({
          error: "Month mismatch",
          details: `Provided month (${userMonth}) does not align with bank range (${bankStart} to ${bankEnd}).`,
        });
      }
    }

    // ---- Load + parse SHOP (no month detection — filter by bank window) ----
    if (shopExt === "xlsx" || shopExt === "xls") {
      const shopExtr = await extractExcelTransactions(shopFile.path);
      shopTx = shopExtr.transactions.map((t, i) => ({
        id: `shop-${t.date}-${i}`,
        source: "shop",
        date: t.date, // MUST be ISO YYYY-MM-DD
        amount: t.amount,
        description: t.description || "",
        debitRaw: t.debitRaw ?? (t.amount < 0 ? Math.abs(t.amount) : 0),
        creditRaw: t.creditRaw ?? (t.amount > 0 ? t.amount : 0),
      }));
      shopBalances = {
        openingBalance: shopExtr.openingBalance ?? null,
        closingBalance: shopExtr.closingBalance ?? null,
      };
    } else {
      const shopText = await extractTextSmart(
        shopFile.path,
        shopFile.originalname
      );
      shopTx = parseTextToTransactions(shopText, "shop");
    }

    // Flag out-of-range shop rows using the bank window
    const shopWithFlag = shopTx.map((t) => ({
      ...t,
      outofrange: !inBankRange(t.date),
    }));
    const shopInRange = shopWithFlag.filter((t) => !t.outofrange);
    const shopOutOfRange = shopWithFlag.filter((t) => t.outofrange);

    // Bank in-range is the bank itself (it defined the window)
    const bankInRange = bankTx;

    // ---- Matching (use in-range Shop) ----
    const result = matchTransactions(bankInRange, shopInRange, detectedMonth);

    // Add out-of-range anomalies for visibility
    for (const s of shopOutOfRange) {
      result.anomalies.push({ type: "out_of_range", shopId: s.id, shop: s });
    }

    // Totals
    const bankTotalsRaw = {
      debit: bankTx.reduce(
        (sum, t) =>
          sum +
          (typeof t.debitRaw === "number"
            ? t.debitRaw
            : t.amount < 0
            ? Math.abs(t.amount)
            : 0),
        0
      ),
      credit: bankTx.reduce(
        (sum, t) =>
          sum +
          (typeof t.creditRaw === "number"
            ? t.creditRaw
            : t.amount > 0
            ? t.amount
            : 0),
        0
      ),
    };
    const shopTotalsRaw = {
      debit: shopInRange.reduce(
        (sum, t) =>
          sum + (t.debitRaw || (t.amount < 0 ? Math.abs(t.amount) : 0)),
        0
      ),
      credit: shopInRange.reduce(
        (sum, t) => sum + (t.creditRaw || (t.amount > 0 ? t.amount : 0)),
        0
      ),
    };

    // Stats summary
    result.stats = {
      ...result.stats,
      bankWindow: { start: bankStart, end: bankEnd },
      bankOpeningBalance: bankBalances.openingBalance,
      bankClosingBalance: bankBalances.closingBalance,
      shopOpeningBalance: shopBalances.openingBalance,
      shopClosingBalance: shopBalances.closingBalance,
      bankTxCount: bankInRange.length,
      shopTxCount: shopInRange.length,
      originalBankTxCount: bankTx.length,
      originalShopTxCount: shopTx.length,
      bankTotals: bankTotalsRaw,
      shopTotals: shopTotalsRaw,
      totalsEqual:
        Math.round(
          bankInRange.reduce(
            (sum, t) => (t.amount < 0 ? sum + Math.abs(t.amount) : sum),
            0
          ) * 100
        ) ===
          Math.round(
            shopInRange.reduce(
              (sum, t) => (t.amount < 0 ? sum + Math.abs(t.amount) : sum),
              0
            ) * 100
          ) &&
        Math.round(
          bankInRange.reduce(
            (sum, t) => (t.amount > 0 ? sum + t.amount : sum),
            0
          ) * 100
        ) ===
          Math.round(
            shopInRange.reduce(
              (sum, t) => (t.amount > 0 ? sum + t.amount : sum),
              0
            ) * 100
          ),
    };

    // Persist audit
    await createAudit({
      id: nanoid(),
      uploadId,
      userId,
      month: detectedMonth, // display month from bankStart
      stats: result.stats,
      matches: result.matches,
      anomalies: result.anomalies,
    });

    await finalizeUpload({
      id: uploadId,
      detectedMonth,
      status: "done",
    });

    // Cleanup temp files
    try {
      await fs.unlink(bankFile.path);
    } catch {}
    try {
      await fs.unlink(shopFile.path);
    } catch {}

    // Response
    return res.json({
      ok: true,
      uploadId,
      month: detectedMonth,
      bankWindow: result.stats.bankWindow,
      stats: result.stats,
      matches: result.matches.slice(0, 100),
      anomalies: result.anomalies.slice(0, 100),
    });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ error: "Processing failed", details: e.message });
  }
}

export async function getHistory(req, res) {
  try {
    const { limit } = req.query;
    const userId = req.user.id;
    
    const uploads = await listUploadsByUser(userId, parseInt(limit));
    
    return res.json({ 
      ok: true, 
      uploads: uploads.map(upload => ({
        id: upload.id,
        bank_filename: upload.bank_filename,
        shop_filename: upload.shop_filename,
        detected_month: upload.detected_month,
        status: upload.status,
        created_at: upload.created_at
      }))
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Failed to get Records", details: error.message });
  }
}

export async function getAuditByUploadId(req, res) {
  try {
    const { id : uploadId } = req.params;
    const userId = req.user.id;
    
    // First get the upload to verify ownership
    const uploads = await listUploadsByUser(userId, 1000); // Get all uploads to find the one
    const upload = uploads.find(u => u.id === uploadId);
    if (!upload) {
      return res.status(404).json({ error: "Upload not found" });
    }
    
    // Get the audit data for this upload
    const audit = await getAuditById(uploadId, userId);
    
    if (!audit) {
      return res.status(404).json({ error: "Audit not found" });
    }
    return res.json({ 
      ok: true, 
      audit: {
        id: audit.id,
        upload_id: audit.upload_id,
        month: audit.month,
        stats_json: audit.stats_json,
        matches_json: audit.matches_json,
        anomalies_json: audit.anomalies_json,
        created_at: audit.created_at
      }
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Failed to get audit details", details: error.message });
  }
}
