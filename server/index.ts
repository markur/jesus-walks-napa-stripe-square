
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import "./types"; // Import type definitions for session

// Determine if this is staging or production
const isStaging = process.env.REPLIT_DEPLOYMENT && !process.env.CUSTOM_DOMAIN;
const isProduction = process.env.NODE_ENV === 'production' && !isStaging;

// Check required environment variables only in production
if (isProduction) {
  console.log('Production environment detected, checking required environment variables...');
  
  const requiredEnvVars = [
    { name: 'DATABASE_URL', message: 'Please add a DATABASE_URL secret in your deployment configuration.' },
    { name: 'SESSION_SECRET', message: 'Please add a SESSION_SECRET secret in your deployment configuration.' }
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar.name]) {
      console.error(`MISSING REQUIRED ENV VAR: ${envVar.name} is required. ${envVar.message}`);
      console.error('Available environment variables:', Object.keys(process.env).filter(key => !key.includes('PATH')));
      process.exit(1);
    } else {
      console.log(`✓ ${envVar.name} is configured`);
    }
  }
  
  console.log('All required environment variables are present');
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public')); // Serve static files from the public directory

const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "development-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Helps with cross-site request issues
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true, // Prevents client-side JS from reading the cookie
    },
    proxy: true, // Trust the reverse proxy when setting secure cookies
  })
);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log('Starting server initialization...');
    const server = await registerRoutes(app);
    console.log('Routes registered successfully');

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      console.error('Express error handler caught:', err);
      res.status(status).json({ message });
      throw err;
    });

    if (app.get("env") === "development") {
      console.log('Setting up Vite for development...');
      await setupVite(app, server);
    } else {
      console.log('Setting up static file serving for production...');
      serveStatic(app);
    }

    const port = 5000;
    
    // Handle port conflicts more gracefully
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Trying to find and kill conflicting process...`);
        process.exit(1);
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });

    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      const environment = isStaging ? 'STAGING' : (isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
      log(`serving on port ${port} - Environment: ${environment}`);
    });
  } catch (error) {
    console.error('FATAL ERROR during server startup:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
})();

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED PROMISE REJECTION at:', promise, 'reason:', reason);
  process.exit(1);
});
