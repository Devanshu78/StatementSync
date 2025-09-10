import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { initDb } from "./src/DB/neon.js";
import authRoutes from "./src/routes/authRoutes.js";
import fileRoutes from "./src/routes/fileRoutes.js";

dotenv.config();
const app = express();
await initDb();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/files", fileRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
