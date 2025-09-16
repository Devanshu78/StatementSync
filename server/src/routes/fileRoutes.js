import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { requireAuth } from "../middlerware/authMiddlerware.js";
import { getFiles, getHistory , getAuditByUploadId} from "../Controllers/filesController.js";

const router = Router();

const UP_DIR = path.join(process.cwd(), "tmp_uploads");
if (!fs.existsSync(UP_DIR)) fs.mkdirSync(UP_DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UP_DIR),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`),
});
const upload = multer({ storage, limits: { fileSize: 250 * 1024 * 1024 } });

router.post(
  "/upload",
  requireAuth,
  upload.fields([
    { name: "bank", maxCount: 1 },
    { name: "shop", maxCount: 1 },
  ]),
  getFiles
);

router.get("/history", requireAuth, getHistory);

router.get("/audit/:id", requireAuth, getAuditByUploadId);

export default router;
