import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { initDb } from "./src/DB/neon.js";
import authRoutes from "./src/routes/authRoutes.js";
import fileRoutes from "./src/routes/fileRoutes.js";

const app = express();


let dbInitialized = false;
const initializeDbIfNeeded = async () => {
  if (!dbInitialized) {
    try {
      await initDb();
      console.log('Database initialized successfully');
      dbInitialized = true;
    } catch (error) {
      console.error('Database initialization failed:', error.message);
      throw error;
    }
  }
};

app.use(async (req, res, next) => {
  try {
    await initializeDbIfNeeded();
    next();
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https:; connect-src 'self' https:;"
  );
  next();
});

const getCorsOrigins = () => {
  const isLocal = process.env.NODE_ENV !== 'production';
  const isVercel = process.env.VERCEL === '1';
  
  if (isLocal) {
    // Local development
    return [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174"
    ];
  } else {
    const vercelUrl = process.env.VERCEL_URL;
    const frontendUrl = process.env.FRONTEND_URL;  
    const allowedOrigins = process.env.ALLOWED_ORIGINS;  
    const origins = [];
    
    if (vercelUrl) {
      origins.push(`https://${vercelUrl}`);
    }
    
    if (frontendUrl) {
      origins.push(frontendUrl);
    }
    
    if (allowedOrigins) {
      origins.push(allowedOrigins);
    }

    console.log(origins);

    if (origins.length === 0) {
      return true; // Allow all origins
    }
    return origins;
  }
};


app.use(
  cors({
    origin: getCorsOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);

const PORT = process.env.PORT || 4000;

// Always export the app for Vercel
export default app;

// Only start server in development
if (process.env.NODE_ENV !== 'production') {
  initializeDbIfNeeded().then( () => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Database initialized successfully');
    });
  });
}