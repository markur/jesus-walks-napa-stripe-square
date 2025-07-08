
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
  const requiredEnvVars = [
    { name: 'DATABASE_URL', message: 'Please add a DATABASE_URL secret in your deployment configuration.' },
    { name: 'SESSION_SECRET', message: 'Please add a SESSION_SECRET secret in your deployment configuration.' }
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar.name]) {
      console.error(`${envVar.name} is required. ${envVar.message}`);
      process.exit(1);
    }
  }
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
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    const environment = isStaging ? 'STAGING' : (isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
    log(`serving on port ${port} - Environment: ${environment}`);
  });
})();
