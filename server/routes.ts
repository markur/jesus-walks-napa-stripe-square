import type { Express } from "express";
import path from "path";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertUserSchema, insertEventSchema, insertRegistrationSchema, insertWaitlistSchema, insertProductSchema, shippingAddressSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import { shippingService } from "./services/shipping.js";
import { generateChatResponse, countTokens } from "./services/openai.js";
import { generateClaudeResponse, countClaudeTokens } from "./services/anthropic.js";
import { generateGeminiResponse, countGeminiTokens } from "./services/gemini.js";
import multer from "multer";
import fs from "fs";
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
  const server = createServer(app);
  // Simple admin recovery route for development
  app.get("/api/admin-recovery", async (req, res) => {
    try {
      console.log("Admin recovery endpoint accessed");

      // Find the markur user
      const user = await storage.getUserByUsername("markur");
      console.log("Found user:", user ? user.username : "not found");

      if (!user) {
        console.log("User 'markur' not found, creating admin user");
        // Create admin user if doesn't exist
        const newAdmin = await storage.createUser({
          username: "markur",
          password: "TempPass2025!",
          email: "admin@jesuswalks.com",
          isAdmin: true
        });

        console.log("Admin user created successfully");
        return res.json({
          success: true,
          message: "Admin user created successfully",
          username: "markur",
          temporaryPassword: "TempPass2025!",
          note: "Please change this password immediately after logging in"
        });
      }

      // Reset password to a temporary one
      const tempPassword = "TempPass2025!";
      await storage.updateUserPassword(user.id, tempPassword);
      console.log("Password reset completed");

      return res.json({
        success: true,
        message: "Password reset successful",
        username: "markur",
        temporaryPassword: "TempPass2025!",
        note: "Please change this password immediately after logging in"
      });
    } catch (error) {
      console.error("Admin recovery error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reset password",
        error: error.message
      });
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
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);

      if (!user) {
        console.log(`Login failed: User ${username} not found`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.password !== password) {
        console.log(`Login failed: Password mismatch for ${username}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      req.session.userId = user.id;
      
      // Save session before responding
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve(true);
        });
      });

      console.log(`Login successful for ${username} (User ID: ${user.id}, Admin: ${user.isAdmin})`);
      console.log(`Session ID: ${req.session.id}`);
      
      res.json({ 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin
        }
      });
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

  // Forgot password - send reset email
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If this email exists, you will receive a password reset link." });
      }

      // Generate reset token
      const resetToken = Math.random().toString(36).substr(2, 15) + Date.now().toString(36);
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Store reset token in database
      await storage.setPasswordResetToken(user.id, resetToken, resetExpiry);

      // In a real app, you would send an email here
      // For now, we'll log the reset link
      console.log(`Password reset link for ${email}: /reset-password?token=${resetToken}`);

      res.json({ 
        message: "If this email exists, you will receive a password reset link.",
        // For development only - remove in production
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Verify token
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Update password and clear reset token
      await storage.updateUserPassword(user.id, newPassword);
      await storage.clearPasswordResetToken(user.id);

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Check if username or email exists (for signup validation)
  app.post("/api/auth/check-availability", async (req, res) => {
    try {
      const { username, email } = req.body;
      
      const result = {
        usernameAvailable: true,
        emailAvailable: true,
        suggestions: []
      };

      if (username) {
        const existingUser = await storage.getUserByUsername(username);
        result.usernameAvailable = !existingUser;
      }

      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        result.emailAvailable = !existingEmail;
      }

      res.json(result);
    } catch (error) {
      console.error("Check availability error:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // Keep existing routes simple

  // Admin routes
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      console.log('Admin users request from user:', req.session?.userId);
      const users = await storage.getAllUsers();
      console.log('Found users:', users.length);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: "Failed to fetch users", error: error.message });
    }
  });

  // Update user profile (admin only)
  app.put("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updateData = req.body;

      const updatedUser = await storage.updateUserProfile(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Admin manual order creation
  app.post("/api/admin/create-order", requireAdmin, async (req, res) => {
    try {
      const { userId, items, total, shippingAddress, status = 'pending' } = req.body;

      if (!userId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Invalid order data" });
      }

      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify products exist and have sufficient stock
      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res.status(404).json({ message: `Product ${item.productId} not found` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
        }
      }

      // Create the order
      const order = await storage.createOrder({
        userId,
        status,
        total,
        shippingAddress,
        items
      });

      // Update product stock
      for (const item of items) {
        await storage.updateProductStock(item.productId, -item.quantity);
      }

      res.status(201).json({ 
        message: "Order created successfully", 
        order 
      });
    } catch (error) {
      console.error("Admin order creation error:", error);
      res.status(500).json({ message: "Failed to create order" });
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

  // User profile update route
  app.put("/api/users/:id/profile", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { updateUserProfileSchema } = await import("@shared/schema");
      const profileData = updateUserProfileSchema.parse(req.body);

      const updatedUser = await storage.updateUserProfile(userId, profileData);
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // Admin user creation route
  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("User creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user", error: error.message });
    }
  });

  // Public user registration route  
  app.post("/api/auth/register", async (req, res) => {
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
      console.error("Product creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product", error: error.message });
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

  // Create test product for development
  app.post("/api/admin/create-test-product", requireAdmin, async (req, res) => {
    try {
      const testProduct = {
        name: "Disneyland 2-day Ticket",
        description: "Good for California Adventure and Disneyland",
        price: "100.00",
        imageUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400",
        category: "Tickets",
        stock: 50
      };

      const product = await storage.createProduct(testProduct);
      res.status(201).json({ 
        message: "Test product created successfully", 
        product 
      });
    } catch (error) {
      console.error("Test product creation error:", error);
      res.status(500).json({ message: "Failed to create test product", error: error.message });
    }
  });

  // Development endpoint to quickly create a product (no auth required)
  app.post("/api/dev/create-product", async (req, res) => {
    try {
      // Only allow in development
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: "Not available in production" });
      }

      const testProduct = {
        name: "Jesus Walks Napa Valley Wine",
        description: "Premium wine from the beautiful vineyards of Napa Valley",
        price: "49.99",
        imageUrl: "/assets/napa-valley-vineyard.webp",
        category: "Wine",
        stock: 100
      };

      const product = await storage.createProduct(testProduct);
      console.log("Development product created:", product);
      
      res.status(201).json({ 
        message: "Development product created successfully", 
        product 
      });
    } catch (error) {
      console.error("Development product creation error:", error);
      res.status(500).json({ message: "Failed to create development product", error: error.message });
    }
  });

  // Debug endpoint to check products count
  app.get("/api/debug/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      console.log("Products found in debug endpoint:", products.length);
      res.json({ 
        count: products.length,
        products: products.map(p => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, imageUrl: p.imageUrl }))
      });
    } catch (error) {
      console.error("Debug products error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Force create test products endpoint
  app.post("/api/debug/force-create-products", async (req, res) => {
    try {
      const testProducts = [
        {
          name: "Jesus Walks Napa Valley Wine",
          description: "Premium wine from the beautiful vineyards of Napa Valley",
          price: "49.99",
          imageUrl: "/assets/napa-valley-vineyard.webp",
          category: "Wine",
          stock: 100
        },
        {
          name: "Vineyard Tour Experience",
          description: "Guided tour through our premium vineyard with wine tasting",
          price: "75.00",
          imageUrl: "/assets/napa-valley-vineyard.webp",
          category: "Experience",
          stock: 25
        }
      ];

      const createdProducts = [];
      for (const productData of testProducts) {
        const product = await storage.createProduct(productData);
        createdProducts.push(product);
      }

      console.log("Force created products:", createdProducts.length);
      res.json({
        message: "Test products created successfully",
        count: createdProducts.length,
        products: createdProducts
      });
    } catch (error) {
      console.error("Force create products error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.status(200).json({ 
      status: "OK", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: "1.0.0"
    });
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

  // SafeKey payment processing endpoint for checkout
  app.post("/api/safekey/process-payment", (req, res) => {
    try {
      const { amount, currency, mobileNumber, cardNumber, merchantReference } = req.body;

      // Validate required fields
      if (!amount || !mobileNumber || !cardNumber) {
        return res.status(400).json({
          success: false,
          error: "Missing required payment information"
        });
      }

      // Simulate SafeKey payment processing
      // In production, this would:
      // 1. Validate card details with SafeKey API
      // 2. Send push notification to mobile device
      // 3. Wait for user authorization
      // 4. Process payment once authorized

      console.log(`SafeKey payment processing:`, {
        amount,
        currency: currency || 'USD',
        mobile: mobileNumber,
        cardLast4: cardNumber.slice(-4),
        reference: merchantReference
      });

      // Simulate successful payment processing
      const paymentId = `safekey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const authReference = `auth_${Date.now()}`;

      res.json({
        success: true,
        paymentId,
        authReference,
        status: "pending_authorization",
        message: "Push notification sent to mobile device. Please approve on your banking app."
      });

    } catch (error) {
      console.error("SafeKey payment processing error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process SafeKey payment"
      });
    }
  });

  // Apple Pay configuration endpoint
  app.get("/api/apple-pay/config", (req, res) => {
    try {
      const { getApplePayConfig } = require('./services/mobile-payments.js');
      res.json(getApplePayConfig());
    } catch (error: any) {
      console.error('Apple Pay config error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get Apple Pay configuration'
      });
    }
  });

  // Google Pay configuration endpoint
  app.get("/api/google-pay/config", (req, res) => {
    try {
      const { getGooglePayConfig } = require('./services/mobile-payments.js');
      res.json(getGooglePayConfig());
    } catch (error: any) {
      console.error('Google Pay config error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get Google Pay configuration'
      });
    }
  });

  // Apple Pay payment processing endpoint
  app.post("/api/apple-pay/process-payment", async (req, res) => {
    try {
      const { processApplePayPayment } = require('./services/mobile-payments.js');
      const result = await processApplePayPayment(req.body);
      res.json(result);
    } catch (error: any) {
      console.error('Apple Pay payment error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Apple Pay payment failed'
      });
    }
  });

  // Google Pay payment processing endpoint
  app.post("/api/google-pay/process-payment", async (req, res) => {
    try {
      const { processGooglePayPayment } = require('./services/mobile-payments.js');
      const result = await processGooglePayPayment(req.body);
      res.json(result);
    } catch (error: any) {
      console.error('Google Pay payment error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Google Pay payment failed'
      });
    }
  });

  // Crypto exchange rates endpoint
  app.get("/api/crypto/exchange-rates", async (req, res) => {
    try {
      const { getCryptoExchangeRates } = await import('./services/crypto-payments.js');
      const currency = req.query.currency as string || 'USD';
      const rates = await getCryptoExchangeRates(currency);
      res.json(rates);
    } catch (error: any) {
      console.error('Crypto exchange rates error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get exchange rates'
      });
    }
  });

  // Stripe crypto payment endpoint
  app.post("/api/crypto/stripe/process-payment", async (req, res) => {
    try {
      const { processStripeCryptoPayment } = await import('./services/crypto-payments.js');
      const result = await processStripeCryptoPayment(req.body);
      res.json(result);
    } catch (error: any) {
      console.error('Stripe crypto payment error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Stripe crypto payment failed'
      });
    }
  });

  // Coinbase crypto payment endpoint (duplicate removed)
  // Already defined above with proper ES6 import

  // Crypto payment verification endpoint (duplicate removed)
  // Already defined above with proper ES6 import

  // Coinbase crypto payment endpoint
  app.post("/api/crypto/coinbase/process-payment", async (req, res) => {
    try {
      const { processCoinbaseCryptoPayment } = await import('./services/crypto-payments.js');
      const result = await processCoinbaseCryptoPayment(req.body);
      res.json(result);
    } catch (error: any) {
      console.error('Coinbase crypto payment error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Coinbase crypto payment failed'
      });
    }
  });

  // Crypto payment verification endpoint
  app.post("/api/crypto/verify-payment", async (req, res) => {
    try {
      const { verifyCryptoPayment } = await import('./services/crypto-payments.js');
      const { paymentId, provider } = req.body;
      const result = await verifyCryptoPayment(paymentId, provider);
      res.json(result);
    } catch (error: any) {
      console.error('Crypto payment verification error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Payment verification failed'
      });
    }
  });

  // Upload endpoint for file handling
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    res.json({ 
      success: true, 
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`
    });
  });

  // Catch-all route for client-side routing - must be last
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    
    // Skip static file requests
    if (req.path.includes('.')) {
      return next();
    }
    
    // For all other routes, serve the main index.html for client-side routing
    if (app.get("env") === "development") {
      // In development, let Vite handle this
      return next();
    } else {
      // In production, serve the built index.html
      res.sendFile(path.resolve('dist/client/index.html'));
    }
  });

  return server;
}