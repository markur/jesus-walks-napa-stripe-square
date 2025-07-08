import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertEventSchema, insertRegistrationSchema, insertWaitlistSchema, insertProductSchema, shippingAddressSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import { shippingService } from "./services/shipping";
import { generateChatResponse, countTokens } from "./services/openai";
import { generateClaudeResponse, countClaudeTokens } from "./services/anthropic";
import multer from "multer";
import fs from "fs";
import path from "path";
import { promisify } from "util";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("Warning: Missing STRIPE_SECRET_KEY. Payment features will be disabled.");
  process.env.STRIPE_SECRET_KEY = '';
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware to check if user is authenticated and is an admin
const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user?.isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
};

// Setup multer for file uploads
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
const productUploadsDir = path.join(uploadDir, 'products');

// Create upload directories if they don't exist
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  if (!fs.existsSync(productUploadsDir)) {
    fs.mkdirSync(productUploadsDir);
  }
} catch (err) {
  console.error("Error creating upload directories:", err);
}

// Configure storage
const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, productUploadsDir);
  },
  filename: function (req, file, cb) {
    // Ensure unique filename with timestamp and preserve extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: multerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      return cb(null, false);
    }
    cb(null, true);
  }
});

const writeFileAsync = promisify(fs.writeFile);

export async function registerRoutes(app: Express): Promise<Server> {
  // Secure admin recovery route - use long random URL to prevent bot attacks
  app.get("/api/admin-recovery-secure-f8a2b4c6d9e1f3g7h8j9k2l4m6n8p0q2r5s7t9u1v3w5x7y9z1a3b5c7d9e", async (req, res) => {
    try {
      // Find the markur user
      const user = await storage.getUserByUsername("markur");

      if (!user) {
        return res.status(404).json({ message: "User 'markur' not found" });
      }

      // Reset password to a temporary one
      const tempPassword = "TempPass2025!";
      await storage.updateUserPassword(user.id, tempPassword);

      res.json({ 
        message: "Password reset successful",
        username: "markur",
        temporaryPassword: tempPassword,
        note: "Please change this password immediately after logging in"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Special route to create an admin user (for initial setup)
  app.post("/api/create-admin", async (req, res) => {
    try {
      const { username, password, email } = req.body;

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const user = await storage.createUser({
        username,
        password,
        email,
        isAdmin: true
      });

      req.session.userId = user.id;
      res.status(201).json({ message: "Admin user created successfully", user });
    } catch (error) {
      res.status(500).json({ message: "Failed to create admin user" });
    }
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;

    try {
      console.log(`Login attempt for username: ${username}`);
      const user = await storage.getUserByUsername(username);

      if (!user) {
        console.log(`Login failed: User ${username} not found`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.password !== password) { // Note: In production, use proper password hashing
        console.log(`Login failed: Password mismatch for ${username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      console.log(`Login successful for ${username} (User ID: ${user.id}, Admin: ${user.isAdmin})`);
      console.log(`Session ID: ${req.session.id}`);
      res.json({ user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login", error: error.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    console.log(`Session check: ${req.session.id}, userId: ${req.session?.userId || 'not set'}`);

    if (!req.session?.userId) {
      console.log('No userId in session, returning null');
      return res.json(null);
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        console.log(`Found user: ${user.username} (ID: ${user.id}, Admin: ${user.isAdmin})`);
      } else {
        console.log(`No user found with ID: ${req.session.userId}`);
      }
      res.json(user || null);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to get user", error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  // Change own password
  app.post("/api/auth/change-password", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { currentPassword, newPassword } = req.body;

      // Verify current password
      const user = await storage.getUser(req.session.userId);
      if (!user || user.password !== currentPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Update password
      await storage.updateUserPassword(user.id, newPassword);
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Keep existing routes simple

  // Admin routes
  app.get("/api/users", requireAdmin, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/orders", requireAdmin, async (_req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if this is the first user being created - if so, make them an admin
      const users = await storage.getAllUsers();
      const isFirstUser = users.length === 0;

      if (isFirstUser) {
        userData.isAdmin = true;
      }

      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const user = await storage.createUser(userData);
      req.session.userId = user.id;
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Event routes
  app.get("/api/events", async (_req, res) => {
    try {
      const events = await storage.getAllEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post("/api/events", async (req, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // Registration routes
  app.post("/api/registrations", async (req, res) => {
    try {
      const registrationData = insertRegistrationSchema.parse(req.body);

      const event = await storage.getEvent(registrationData.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const registrations = await storage.getEventRegistrations(registrationData.eventId);
      if (registrations.length >= event.capacity) {
        return res.status(400).json({ message: "Event is at full capacity" });
      }

      const registration = await storage.createRegistration(registrationData);
      res.status(201).json(registration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid registration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create registration" });
    }
  });

  // Waitlist routes
  app.post("/api/waitlist", async (req, res) => {
    try {
      const waitlistData = insertWaitlistSchema.parse(req.body);

      const isEmailRegistered = await storage.isEmailInWaitlist(waitlistData.email);
      if (isEmailRegistered) {
        return res.status(400).json({ message: "Email already in waitlist" });
      }

      const entry = await storage.addToWaitlist(waitlistData);
      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid email", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add to waitlist" });
    }
  });

  // File upload route for product images
  app.post("/api/upload/product-image", requireAdmin, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Return the file URL for client-side use
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const relativePath = `/uploads/products/${req.file.filename}`;
      const imageUrl = `${baseUrl}${relativePath}`;

      res.json({ 
        imageUrl,
        filename: req.file.filename,
        success: true 
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Failed to upload file", error: String(error) });
    }
  });

  // Handle base64 image uploads
  app.post("/api/upload/base64-image", requireAdmin, async (req, res) => {
    try {
      const { imageData, filename = "clipboard-image" } = req.body;

      if (!imageData) {
        return res.status(400).json({ message: "No image data provided" });
      }

      // Extract the base64 data - remove data URI prefix
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");

      // Create a unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExt = imageData.substring(imageData.indexOf('/') + 1, imageData.indexOf(';base64'));
      const safeName = `${filename.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${uniqueSuffix}.${fileExt || 'png'}`;

      // Save the file
      const filePath = path.join(productUploadsDir, safeName);
      await writeFileAsync(filePath, base64Data, 'base64');

      // Return the image URL
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const relativePath = `/uploads/products/${safeName}`;
      const imageUrl = `${baseUrl}${relativePath}`;

      res.json({ 
        imageUrl,
        filename: safeName,
        success: true 
      });
    } catch (error) {
      console.error("Base64 upload error:", error);
      res.status(500).json({ message: "Failed to process image", error: String(error) });
    }
  });

  // Product routes
  app.post("/api/products", requireAdmin, async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.get("/api/products", async (_req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Environment variables check endpoint (for debugging)
  app.get("/api/env-check", (req, res) => {
    const envStatus = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      SESSION_SECRET: !!process.env.SESSION_SECRET,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      NODE_ENV: process.env.NODE_ENV || 'development'
    };

    console.log('Environment variables status:', envStatus);
    res.json(envStatus);
  });

  // Add Stripe payment route
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      console.log('Creating payment intent, request body:', req.body);

      const { amount } = req.body;

      if (!amount || amount <= 0) {
        console.log('Invalid amount received:', amount);
        return res.status(400).json({ error: "Invalid amount" });
      }

      // Check if Stripe is properly configured
      if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === '') {
        console.error('Stripe secret key not configured');
        return res.status(500).json({
          error: "Payment system not configured"
        });
      }

      console.log('Creating Stripe payment intent for amount:', amount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
      });

      console.log('Payment intent created successfully:', paymentIntent.id);

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({
        error: "Error creating payment intent",
        details: error.message
      });
    }
  });

  // Add Square payment configuration endpoint
  app.get("/api/square-config", async (req, res) => {
    try {
      const isDevelopment = process.env.NODE_ENV !== 'production';
      res.json({
        applicationId: isDevelopment 
          ? 'sandbox-sq0idb-b3G3QhqMv8dmZkEJnG10kw'
          : 'sq0idp-C-wqKe8QpQAHwg3YtLziEw',
        environment: isDevelopment ? 'sandbox' : 'production'
      });
    } catch (error: any) {
      console.error("Square config error:", error);
      res.status(500).json({
        error: "Failed to get Square configuration"
      });
    }
  });

  // SafeKey payment initiation endpoint
  app.post("/api/safekey/initiate-payment", (req, res) => {
    try {
      const { amount, currency } = req.body;

      // Simulate SafeKey payment initiation
      // In a real implementation, this would integrate with SafeKey's API
      console.log(`SafeKey payment initiated: ${currency} ${amount}`);

      // Simulate successful initiation
      res.json({
        success: true,
        paymentId: `safekey_${Date.now()}`,
        message: "Push notification sent to mobile device"
      });
    } catch (error) {
      console.error("SafeKey payment error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to initiate SafeKey payment"
      });
    }
  });

  // TODO: Shipping routes temporarily disabled for deployment stability
  // These will be re-enabled once address validation service is stabilized
  /*
  // Shipping routes for address validation and rate calculation
  app.get("/api/shipping/address-suggestions", async (req, res) => {
    try {
      const query = req.query.query as string;
      if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      const suggestions = await shippingService.getAddressSuggestions(query);
      res.json(suggestions);
    } catch (error: any) {
      console.error("Error getting address suggestions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/shipping/address-details", async (req, res) => {
    try {
      const placeId = req.query.placeId as string;
      if (!placeId) {
        return res.status(400).json({ error: "PlaceId parameter is required" });
      }

      const addressDetails = await shippingService.getAddressDetails(placeId);
      res.json(addressDetails);
    } catch (error: any) {
      console.error("Error getting address details:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/shipping/postal-code-details", async (req, res) => {
    try {
      const code = req.query.code as string;
      if (!code) {
        return res.status(400).json({ error: "Code parameter is required" });
      }

      const details = await shippingService.getPostalCodeDetails(code);
      res.json(details);
    } catch (error: any) {
      console.error("Error getting postal code details:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/shipping/validate-address", async (req, res) => {
    try {
      console.log("=== BACKEND VALIDATION START ===");
      console.log("Request body:", JSON.stringify(req.body, null, 2));

      const address = req.body;
      const validatedAddress = await shippingService.validateAddress(address);

      console.log("Validation result:", JSON.stringify(validatedAddress, null, 2));
      console.log("=== BACKEND VALIDATION END ===");

      res.json(validatedAddress);
    } catch (error: any) {
      console.error("Address validation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/shipping/rates", async (req, res) => {
    try {
      const { fromAddress, toAddress, parcelDetails } = req.body;
      const rates = await shippingService.getShippingRates(fromAddress, toAddress, parcelDetails);
      res.json(rates);
    } catch (error: any) {
      console.error("Error getting shipping rates:", error);
      res.status(500).json({ error: error.message });
    }
  });
  */


  // Chat routes
  app.get("/api/models", async (req, res) => {
    try {
      const models = await storage.getActiveModelConfigs();
      res.json(models);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch models" });
    }
  });

  app.get("/api/conversations", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const conversations = await storage.getUserConversations(req.session.userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const conversationData = {
        ...req.body,
        userId: req.session.userId,
      };
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const conversation = await storage.getConversation(parseInt(req.params.id));
      if (!conversation || conversation.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const messages = await storage.getConversationMessages(conversation.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const conversation = await storage.getConversation(parseInt(req.params.id));
      if (!conversation || conversation.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Create user message
      const userMessage = await storage.createMessage({
        conversationId: conversation.id,
        role: 'user',
        content: req.body.content,
        tokens: await countTokens(req.body.content),
      });

      // Get model config and generate response
      const modelConfig = await storage.getModelConfig(conversation.modelConfigId);
      if (!modelConfig) {
        throw new Error("Model configuration not found");
      }

      const messages = await storage.getConversationMessages(conversation.id);
      const messageHistory = messages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }));
      
      // Choose service based on model
      let response: string;
      let tokenCount: number;
      
      if (modelConfig.modelId.startsWith('claude-')) {
        response = await generateClaudeResponse(messageHistory, modelConfig);
        tokenCount = await countClaudeTokens(response);
      } else {
        response = await generateChatResponse(messageHistory, modelConfig);
        tokenCount = await countTokens(response);
      }

      // Create assistant message
      const assistantMessage = await storage.createMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: response,
        tokens: tokenCount,
      });

      res.json({
        userMessage,
        assistantMessage,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to process message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

