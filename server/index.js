import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { initDb } from "./src/DB/neon.js";
import authRoutes from "./src/routes/authRoutes.js";
import fileRoutes from "./src/routes/fileRoutes.js";

const app = express();

// Database initialization
let dbInitialized = false;
const initializeDbIfNeeded = async () => {
  if (!dbInitialized) {
    try {
      await initDb();
      console.log('✅ Database initialized successfully');
      dbInitialized = true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      throw error;
    }
  }
};

// Database middleware
app.use(async (req, res, next) => {
  try {
    await initializeDbIfNeeded();
    next();
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Content Security Policy
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https:; connect-src 'self' https:;"
  );
  next();
});

// CORS Configuration
const getCorsOrigins = () => {
  const isLocal = process.env.NODE_ENV !== 'production';
  const isVercel = process.env.VERCEL === '1';
  
  console.log('🔧 CORS Configuration Debug:');
  console.log('  - NODE_ENV:', process.env.NODE_ENV);
  console.log('  - VERCEL:', process.env.VERCEL);
  console.log('  - isLocal:', isLocal);
  
  if (isLocal) {
    const localOrigins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174"
    ];
    console.log('  - Using local origins:', localOrigins);
    return localOrigins;
  } else {
    const vercelUrl = process.env.VERCEL_URL;
    const frontendUrl = process.env.FRONTEND_URL;  
    const allowedOrigins = process.env.ALLOWED_ORIGINS;  
    const origins = [];
    
    console.log('  - Environment Variables:');
    console.log('    * VERCEL_URL:', vercelUrl);
    console.log('    * FRONTEND_URL:', frontendUrl);
    console.log('    * ALLOWED_ORIGINS:', allowedOrigins);
    
    if (vercelUrl) {
      origins.push(`https://${vercelUrl}`);
      console.log('  - Added Vercel URL:', `https://${vercelUrl}`);
    }
    
    if (frontendUrl) {
      origins.push(frontendUrl);
      console.log('  - Added Frontend URL:', frontendUrl);
    }
    
    if (allowedOrigins) {
      const splitOrigins = allowedOrigins.split(',').map(origin => origin.trim());
      origins.push(...splitOrigins);
      console.log('  - Added Allowed Origins:', splitOrigins);
    }

    // Add Zentra's URL explicitly
    origins.push('https://zentra-rho-kohl.vercel.app');
    console.log('  - Added Zentra URL: https://zentra-rho-kohl.vercel.app');
    
    console.log('  - Final CORS origins:', origins);
    
    if (origins.length === 0) {
      console.log('  - ⚠️  No origins found, allowing all origins');
      return true; // Allow all origins
    }
    return origins;
  }
};

// CORS Middleware
app.use(
  cors({
    origin: getCorsOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type", 
      "Authorization", 
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers"
    ],
    exposedHeaders: ["Set-Cookie"],
    optionsSuccessStatus: 200,
    preflightContinue: false,
  })
);

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📥 [${timestamp}] ${req.method} ${req.path}`);
  console.log(`   Origin: ${req.headers.origin || 'No origin'}`);
  console.log(`   User-Agent: ${req.headers['user-agent']?.substring(0, 50) || 'Unknown'}`);
  
  // Log CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('   🔄 CORS Preflight Request');
  }
  
  next();
});

// Body parsing middleware
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// Health check endpoint
app.get("/api/health", (req, res) => {
  console.log('🏥 Health check requested');
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 4000;

// Always export the app for Vercel
export default app;

// Only start server in development
if (process.env.NODE_ENV !== 'production') {
  initializeDbIfNeeded().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('📊 CORS Configuration:');
      getCorsOrigins(); // Log CORS config on startup
    });
  });
} else {
  console.log('🌐 Running in production mode (Vercel)');
  console.log('📊 CORS Configuration:');
  getCorsOrigins(); // Log CORS config on startup
}