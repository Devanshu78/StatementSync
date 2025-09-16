import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { initDb } from "./src/DB/neon.js";
import authRoutes from "./src/routes/authRoutes.js";
import fileRoutes from "./src/routes/fileRoutes.js";

const app = express();

try {
  await initDb();
  console.log('Database initialized successfully');
} catch (error) {
  console.error('Database initialization failed:', error.message);
  console.error('Full error details:', error);
  process.exit(1);
}

app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-app-name.vercel.app']
    : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/files", fileRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(process.cwd(), 'client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'client/dist/index.html'));
  });
}

const PORT = process.env.PORT || 4000;

// Always export the app for Vercel
export default app;

// Only start server in development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}