import OpenAI from "openai";
import type { Product } from "@shared/schema";

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Embedding configuration
const EMBEDDING_MODEL = "text-embedding-3-small"; // Cost-effective embedding model
const EMBEDDING_DIMENSIONS = 1536; // Default dimensions for text-embedding-3-small

export interface ProductEmbeddingData {
  productId: number;
  content: string;
  embedding: number[];
}

export interface KnowledgeEmbeddingData {
  knowledgeId: number;
  content: string;
  embedding: number[];
}

/**
 * Generate embeddings for product data
 */
export async function generateProductEmbedding(product: Product): Promise<ProductEmbeddingData | null> {
  if (!openai) {
    console.warn("OpenAI not configured, skipping embedding generation");
    return null;
  }

  try {
    // Combine product information for embedding
    const content = `${product.name} - ${product.description} (${product.category}) - $${product.price}`;
    
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: content,
      dimensions: EMBEDDING_DIMENSIONS
    });

    return {
      productId: product.id,
      content,
      embedding: response.data[0].embedding
    };
  } catch (error) {
    console.error('Failed to generate product embedding:', error);
    return null;
  }
}

/**
 * Generate embeddings for text content
 */
export async function generateTextEmbedding(text: string): Promise<number[] | null> {
  if (!openai) {
    console.warn("OpenAI not configured, cannot generate embeddings");
    return null;
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Failed to generate text embedding:', error);
    return null;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const norm = Math.sqrt(normA) * Math.sqrt(normB);
  return norm === 0 ? 0 : dotProduct / norm;
}

/**
 * Find similar products using embeddings stored in memory or database
 */
export function findSimilarProducts(
  queryEmbedding: number[],
  productEmbeddings: ProductEmbeddingData[],
  limit: number = 5
): Array<ProductEmbeddingData & { similarity: number }> {
  return productEmbeddings
    .map(product => ({
      ...product,
      similarity: cosineSimilarity(queryEmbedding, product.embedding)
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Generate batch embeddings for multiple products
 */
export async function generateProductEmbeddingsBatch(products: Product[]): Promise<ProductEmbeddingData[]> {
  if (!openai) {
    console.warn("OpenAI not configured, skipping batch embedding generation");
    return [];
  }

  const embeddings: ProductEmbeddingData[] = [];
  
  // Process in batches of 10 to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (product) => {
      const embedding = await generateProductEmbedding(product);
      if (embedding) {
        embeddings.push(embedding);
      }
      // Add small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      return embedding;
    });

    await Promise.all(batchPromises);
  }

  return embeddings;
}

/**
 * Enhanced product search with semantic similarity
 */
export async function searchProducts(
  query: string,
  products: Product[],
  limit: number = 5
): Promise<Array<Product & { similarity: number }>> {
  // Generate embedding for the search query
  const queryEmbedding = await generateTextEmbedding(query);
  if (!queryEmbedding) {
    // Fallback to simple text matching
    return products
      .filter(product => 
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, limit)
      .map(product => ({ ...product, similarity: 0.5 }));
  }

  // Generate embeddings for products if not available
  const productEmbeddings = await generateProductEmbeddingsBatch(products);
  
  // Find similar products
  const similarProducts = findSimilarProducts(queryEmbedding, productEmbeddings, limit);
  
  // Map back to full product data
  return similarProducts.map(similar => {
    const product = products.find(p => p.id === similar.productId);
    return product ? { ...product, similarity: similar.similarity } : null;
  }).filter(Boolean) as Array<Product & { similarity: number }>;
}

/**
 * Efficient product search using pre-stored embeddings from database
 */
export async function searchProductsWithStoredEmbeddings(
  query: string,
  products: Product[],
  storedEmbeddings: Array<{ productId: number; content: string; embedding: any }>,
  limit: number = 5
): Promise<Array<Product & { similarity: number }>> {
  // Generate embedding for the search query
  const queryEmbedding = await generateTextEmbedding(query);
  if (!queryEmbedding) {
    // Fallback to simple text matching
    return products
      .filter(product => 
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, limit)
      .map(product => ({ ...product, similarity: 0.5 }));
  }

  // Convert stored embeddings to the format expected by findSimilarProducts
  const productEmbeddings: ProductEmbeddingData[] = storedEmbeddings.map(stored => ({
    productId: stored.productId,
    content: stored.content,
    embedding: Array.isArray(stored.embedding) ? stored.embedding : JSON.parse(stored.embedding)
  }));
  
  // Find similar products using stored embeddings
  const similarProducts = findSimilarProducts(queryEmbedding, productEmbeddings, limit);
  
  // Map back to full product data
  return similarProducts.map(similar => {
    const product = products.find(p => p.id === similar.productId);
    return product ? { ...product, similarity: similar.similarity } : null;
  }).filter(Boolean) as Array<Product & { similarity: number }>;
}