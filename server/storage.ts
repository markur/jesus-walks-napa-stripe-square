import { users, events, registrations, waitlist, products, orders, orderItems, modelConfigs, conversations, messages, productEmbeddings, knowledgeBase, knowledgeEmbeddings } from "@shared/schema";
import type { User, Event, Registration, Waitlist, Product, Order, OrderItem, InsertUser, InsertEvent, InsertRegistration, InsertWaitlist, InsertProduct, InsertOrder, InsertOrderItem, ModelConfig, InsertModelConfig, Conversation, InsertConversation, Message, InsertMessage, ProductEmbedding, InsertProductEmbedding, KnowledgeBase, InsertKnowledgeBase, KnowledgeEmbedding, InsertKnowledgeEmbedding } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Event operations
  getEvent(id: number): Promise<Event | undefined>;
  getAllEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;

  // Registration operations
  getRegistration(id: number): Promise<Registration | undefined>;
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  getEventRegistrations(eventId: number): Promise<Registration[]>;

  // Waitlist operations
  addToWaitlist(email: InsertWaitlist): Promise<Waitlist>;
  isEmailInWaitlist(email: string): Promise<boolean>;

  // Product operations
  getProduct(id: number): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  getProductsByCategory(category: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProductStock(id: number, quantity: number): Promise<Product>;

  // Order operations
  getOrder(id: number): Promise<Order | undefined>;
  getUserOrders(userId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order>;

  // Order Item operations
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;

  // Admin operations
  getAllUsers(): Promise<User[]>;
  getAllOrders(): Promise<Order[]>;
  updateUserRole(userId: number, isAdmin: boolean): Promise<User>;

  // Session store
  sessionStore: session.Store;

  // Model config operations
  getModelConfig(id: number): Promise<ModelConfig | undefined>;
  getAllModelConfigs(): Promise<ModelConfig[]>;
  createModelConfig(config: InsertModelConfig): Promise<ModelConfig>;
  getActiveModelConfigs(): Promise<ModelConfig[]>;

  // Conversation operations
  getConversation(id: number): Promise<Conversation | undefined>;
  getUserConversations(userId: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;

  // Message operations
  getConversationMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Product Embeddings operations
  storeProductEmbedding(embedding: InsertProductEmbedding): Promise<ProductEmbedding>;
  getProductEmbeddings(): Promise<ProductEmbedding[]>;
  getProductEmbeddingByProductId(productId: number): Promise<ProductEmbedding | undefined>;
  clearProductEmbeddings(): Promise<void>;

  // Knowledge Base operations
  getKnowledgeBase(): Promise<KnowledgeBase[]>;
  getKnowledgeByCategory(category: string): Promise<KnowledgeBase[]>;
  createKnowledgeEntry(entry: InsertKnowledgeBase): Promise<KnowledgeBase>;
  searchKnowledgeByTokens(query: string, category?: string): Promise<Array<KnowledgeBase & { relevanceScore: number }>>;
  
  // Knowledge Embeddings operations
  storeKnowledgeEmbedding(embedding: InsertKnowledgeEmbedding): Promise<KnowledgeEmbedding>;
  getKnowledgeEmbeddings(): Promise<KnowledgeEmbedding[]>;

  updateUserPassword(userId: number, newPassword: string): Promise<void>;
  updateUserProfile(userId: number, updateData: any): Promise<User>;
  updateUserProfile(userId: number, profileData: any): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const PostgresStore = connectPgSimple(session);
    this.sessionStore = new PostgresStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getAllEvents(): Promise<Event[]> {
    return await db.select().from(events);
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async getRegistration(id: number): Promise<Registration | undefined> {
    const [registration] = await db.select().from(registrations).where(eq(registrations.id, id));
    return registration;
  }

  async createRegistration(registration: InsertRegistration): Promise<Registration> {
    const [newRegistration] = await db.insert(registrations).values(registration).returning();
    return newRegistration;
  }

  async getEventRegistrations(eventId: number): Promise<Registration[]> {
    return await db.select().from(registrations).where(eq(registrations.eventId, eventId));
  }

  async addToWaitlist(email: InsertWaitlist): Promise<Waitlist> {
    const [entry] = await db.insert(waitlist).values(email).returning();
    return entry;
  }

  async isEmailInWaitlist(email: string): Promise<boolean> {
    const [entry] = await db.select().from(waitlist).where(eq(waitlist.email, email));
    return !!entry;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.category, category));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProductStock(id: number, quantity: number): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ stock: quantity })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async updateProduct(id: number, productData: any): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ 
        ...productData,
        updatedAt: new Date()
      })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId));
  }

  async createOrder(orderData: any): Promise<any> {
    try {
      const { items, ...orderInfo } = orderData;

      console.log('Creating order with info:', orderInfo);
      
      // Create the order
      const [order] = await db.insert(orders).values(orderInfo).returning();

      // Create order items
      if (items && items.length > 0) {
        const orderItemsData = items.map((item: any) => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        }));

        console.log('Creating order items:', orderItemsData);
        await db.insert(orderItems).values(orderItemsData);
      }

      console.log('Order created successfully:', order.id);
      return order;
    } catch (error: any) {
      console.error('Database error in createOrder:', error);
      if (error.code === '42P01') {
        throw new Error('Orders table does not exist. Please run database migration.');
      }
      throw error;
    }
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async deleteOrder(id: number): Promise<void> {
    // Delete order items first
    await db.delete(orderItems).where(eq(orderItems.orderId, id));
    // Then delete the order
    await db.delete(orders).where(eq(orders.id, id));
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const [newOrderItem] = await db.insert(orderItems).values(orderItem).returning();
    return newOrderItem;
  }

  async getAllUsers(): Promise<User[]> {
    console.log('Fetching all users from database...');
    const allUsers = await db.select().from(users);
    console.log('Raw users from DB:', allUsers.length);
    const sanitizedUsers = allUsers.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as User; // Return without password field
    });
    console.log('Sanitized users:', sanitizedUsers.length);
    return sanitizedUsers;
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders);
  }

  async updateUserRole(userId: number, isAdmin: boolean): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ isAdmin })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async getModelConfig(id: number): Promise<ModelConfig | undefined> {
    const [config] = await db.select().from(modelConfigs).where(eq(modelConfigs.id, id));
    return config;
  }

  async getAllModelConfigs(): Promise<ModelConfig[]> {
    return await db.select().from(modelConfigs);
  }

  async getActiveModelConfigs(): Promise<ModelConfig[]> {
    return await db.select().from(modelConfigs).where(eq(modelConfigs.active, true));
  }

  async createModelConfig(config: InsertModelConfig): Promise<ModelConfig> {
    const [newConfig] = await db.insert(modelConfigs).values(config).returning();
    return newConfig;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async getUserConversations(userId: number): Promise<Conversation[]> {
    return await db.select().from(conversations).where(eq(conversations.userId, userId));
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db.insert(conversations).values(conversation).returning();
    return newConversation;
  }

  async getConversationMessages(conversationId: number): Promise<Message[]> {
    return await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: newPassword })
      .where(eq(users.id, userId));
  }

  async updateUserProfile(userId: number, profileData: any): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...profileData, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
  }

  async setPasswordResetToken(userId: number, token: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({ 
        resetToken: token,
        resetTokenExpiry: expiry,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.resetToken, token));

    if (!user || !user.resetTokenExpiry) {
      return undefined;
    }

    // Check if token is expired
    if (new Date() > user.resetTokenExpiry) {
      // Clear expired token
      await this.clearPasswordResetToken(user.id);
      return undefined;
    }

    return user;
  }

  async clearPasswordResetToken(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // RAG System - Product Embeddings Methods
  async storeProductEmbedding(embedding: InsertProductEmbedding): Promise<ProductEmbedding> {
    // Check if embedding already exists for this product
    const existing = await this.getProductEmbeddingByProductId(embedding.productId);
    
    if (existing) {
      // Update existing embedding
      const [updatedEmbedding] = await db
        .update(productEmbeddings)
        .set({ 
          content: embedding.content,
          embedding: embedding.embedding,
          updatedAt: new Date()
        })
        .where(eq(productEmbeddings.productId, embedding.productId))
        .returning();
      return updatedEmbedding;
    } else {
      // Create new embedding
      const [newEmbedding] = await db.insert(productEmbeddings).values(embedding).returning();
      return newEmbedding;
    }
  }

  async getProductEmbeddings(): Promise<ProductEmbedding[]> {
    return await db.select().from(productEmbeddings);
  }

  async getProductEmbeddingByProductId(productId: number): Promise<ProductEmbedding | undefined> {
    const [embedding] = await db.select().from(productEmbeddings).where(eq(productEmbeddings.productId, productId));
    return embedding;
  }

  async clearProductEmbeddings(): Promise<void> {
    await db.delete(productEmbeddings);
  }

  // Knowledge Base Methods
  async getKnowledgeBase(): Promise<KnowledgeBase[]> {
    return await db.select().from(knowledgeBase).where(eq(knowledgeBase.isActive, true));
  }

  async getKnowledgeByCategory(category: string): Promise<KnowledgeBase[]> {
    return await db.select().from(knowledgeBase)
      .where(eq(knowledgeBase.category, category))
      .where(eq(knowledgeBase.isActive, true));
  }

  async createKnowledgeEntry(entry: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const [newEntry] = await db.insert(knowledgeBase).values(entry).returning();
    return newEntry;
  }

  // Knowledge Embeddings Methods
  async storeKnowledgeEmbedding(embedding: InsertKnowledgeEmbedding): Promise<KnowledgeEmbedding> {
    const [newEmbedding] = await db.insert(knowledgeEmbeddings).values(embedding).returning();
    return newEmbedding;
  }

  async getKnowledgeEmbeddings(): Promise<KnowledgeEmbedding[]> {
    return await db.select().from(knowledgeEmbeddings);
  }

  // Robust tokenized keyword search for knowledge base
  async searchKnowledgeByTokens(query: string, category?: string): Promise<Array<KnowledgeBase & { relevanceScore: number }>> {
    // Get all knowledge entries (filtered by category if provided)
    const knowledgeEntries = category 
      ? await this.getKnowledgeByCategory(category)
      : await this.getKnowledgeBase();

    // Clean and tokenize the query
    const queryTokens = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(token => token.length > 1) // Remove single characters
      .filter(token => !['the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(token)); // Remove common stop words

    if (queryTokens.length === 0) {
      return [];
    }

    // Score each knowledge entry
    const scoredEntries = knowledgeEntries.map(entry => {
      const titleLower = entry.title.toLowerCase();
      const contentLower = entry.content.toLowerCase();
      const tagsLower = entry.tags.map(tag => tag.toLowerCase());

      let score = 0;

      // Score each query token
      queryTokens.forEach(token => {
        // Title matches - highest weight
        if (titleLower.includes(token)) {
          score += 3;
        }

        // Tag matches - high weight
        const tagMatch = tagsLower.some(tag => tag.includes(token));
        if (tagMatch) {
          score += 2.5;
        }

        // Content matches - lower weight
        if (contentLower.includes(token)) {
          score += 1;
        }

        // Bonus points for exact word matches (word boundaries)
        const wordBoundaryRegex = new RegExp(`\\b${token}\\b`, 'i');
        if (wordBoundaryRegex.test(entry.title)) {
          score += 1; // Exact word in title
        }
        if (tagsLower.some(tag => wordBoundaryRegex.test(tag))) {
          score += 0.5; // Exact word in tag
        }
        if (wordBoundaryRegex.test(entry.content)) {
          score += 0.5; // Exact word in content
        }
      });

      // Bonus for matching multiple tokens
      const matchedTokens = queryTokens.filter(token => 
        titleLower.includes(token) || 
        contentLower.includes(token) || 
        tagsLower.some(tag => tag.includes(token))
      );
      
      if (matchedTokens.length > 1) {
        score += matchedTokens.length * 0.5; // Bonus for multiple matches
      }

      return {
        ...entry,
        relevanceScore: score
      };
    })
    .filter(entry => entry.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

    return scoredEntries;
  }
}

export const storage = new DatabaseStorage();