import { 
  users, sessions, reflections, memoryInsights, generatedContent, modelWeights, tokenVocabulary, trainingBatches, learningMetrics,
  type User, type InsertUser, type Session, type InsertSession,
  type Reflection, type InsertReflection, type MemoryInsight, type InsertMemoryInsight,
  type GeneratedContent, type InsertGeneratedContent, type ModelWeights, type InsertModelWeights,
  type TokenVocabulary, type InsertTokenVocabulary, type TrainingBatch, type InsertTrainingBatch,
  type LearningMetrics, type InsertLearningMetrics
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Sessions
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: number): Promise<Session | undefined>;
  getActiveSessions(): Promise<Session[]>;
  getAllSessions(): Promise<Session[]>;
  updateSession(id: number, updates: Partial<Session>): Promise<Session>;
  endSession(id: number): Promise<Session>;
  
  // Reflections
  createReflection(reflection: InsertReflection): Promise<Reflection>;
  getReflectionsBySession(sessionId: number): Promise<Reflection[]>;
  getReflection(id: number): Promise<Reflection | undefined>;
  
  // Memory Insights
  createMemoryInsight(insight: InsertMemoryInsight): Promise<MemoryInsight>;
  getMemoryInsightsBySession(sessionId: number): Promise<MemoryInsight[]>;
  getRecentMemoryInsights(limit: number): Promise<MemoryInsight[]>;
  
  // Generated Content
  createGeneratedContent(content: InsertGeneratedContent): Promise<GeneratedContent>;
  getGeneratedContentBySession(sessionId: number): Promise<GeneratedContent[]>;
  updateGeneratedContent(id: number, updates: Partial<GeneratedContent>): Promise<GeneratedContent>;

  // Neural Network Components
  createModelWeights(weights: InsertModelWeights): Promise<ModelWeights>;
  getModelWeightsBySession(sessionId: number): Promise<ModelWeights[]>;
  updateModelWeights(id: number, updates: Partial<ModelWeights>): Promise<ModelWeights>;
  
  // Tokenization
  createTokenVocabulary(token: InsertTokenVocabulary): Promise<TokenVocabulary>;
  getTokenVocabularyBySession(sessionId: number): Promise<TokenVocabulary[]>;
  getTokenByValue(sessionId: number, token: string): Promise<TokenVocabulary | undefined>;
  
  // Training
  createTrainingBatch(batch: InsertTrainingBatch): Promise<TrainingBatch>;
  getTrainingBatchesBySession(sessionId: number): Promise<TrainingBatch[]>;
  
  // Learning Metrics
  createLearningMetrics(metrics: InsertLearningMetrics): Promise<LearningMetrics>;
  getLearningMetricsBySession(sessionId: number): Promise<LearningMetrics[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Sessions
  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db
      .insert(sessions)
      .values({
        ...insertSession,
        isActive: true,
        totalReflections: 0,
        improvementRate: 0,
      })
      .returning();
    return session;
  }

  async getSession(id: number): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async getActiveSessions(): Promise<Session[]> {
    return await db.select().from(sessions).where(eq(sessions.isActive, true));
  }

  async getAllSessions(): Promise<Session[]> {
    return await db.select().from(sessions).orderBy(desc(sessions.startTime));
  }

  async updateSession(id: number, updates: Partial<Session>): Promise<Session> {
    const [session] = await db
      .update(sessions)
      .set(updates)
      .where(eq(sessions.id, id))
      .returning();
    if (!session) throw new Error(`Session ${id} not found`);
    return session;
  }

  async endSession(id: number): Promise<Session> {
    const [session] = await db
      .update(sessions)
      .set({ isActive: false, endTime: new Date() })
      .where(eq(sessions.id, id))
      .returning();
    if (!session) throw new Error(`Session ${id} not found`);
    return session;
  }

  // Reflections
  async createReflection(insertReflection: InsertReflection): Promise<Reflection> {
    const [reflection] = await db
      .insert(reflections)
      .values(insertReflection)
      .returning();
    
    // Update session reflection count (simplified)
    const reflectionCount = await db
      .select()
      .from(reflections)
      .where(eq(reflections.sessionId, insertReflection.sessionId!));
    
    await db
      .update(sessions)
      .set({ totalReflections: reflectionCount.length })
      .where(eq(sessions.id, insertReflection.sessionId!));
    
    return reflection;
  }

  async getReflectionsBySession(sessionId: number): Promise<Reflection[]> {
    return await db
      .select()
      .from(reflections)
      .where(eq(reflections.sessionId, sessionId))
      .orderBy(reflections.timestamp);
  }

  async getReflection(id: number): Promise<Reflection | undefined> {
    const [reflection] = await db.select().from(reflections).where(eq(reflections.id, id));
    return reflection || undefined;
  }

  // Memory Insights
  async createMemoryInsight(insertInsight: InsertMemoryInsight): Promise<MemoryInsight> {
    const [insight] = await db
      .insert(memoryInsights)
      .values(insertInsight)
      .returning();
    return insight;
  }

  async getMemoryInsightsBySession(sessionId: number): Promise<MemoryInsight[]> {
    return await db
      .select()
      .from(memoryInsights)
      .where(eq(memoryInsights.sessionId, sessionId))
      .orderBy(desc(memoryInsights.timestamp));
  }

  async getRecentMemoryInsights(limit: number): Promise<MemoryInsight[]> {
    return await db
      .select()
      .from(memoryInsights)
      .orderBy(desc(memoryInsights.timestamp))
      .limit(limit);
  }

  // Generated Content
  async createGeneratedContent(insertContent: InsertGeneratedContent): Promise<GeneratedContent> {
    const [content] = await db
      .insert(generatedContent)
      .values(insertContent)
      .returning();
    return content;
  }

  async getGeneratedContentBySession(sessionId: number): Promise<GeneratedContent[]> {
    return await db
      .select()
      .from(generatedContent)
      .where(eq(generatedContent.sessionId, sessionId))
      .orderBy(generatedContent.timestamp);
  }

  async updateGeneratedContent(id: number, updates: Partial<GeneratedContent>): Promise<GeneratedContent> {
    const [content] = await db
      .update(generatedContent)
      .set(updates)
      .where(eq(generatedContent.id, id))
      .returning();
    if (!content) throw new Error(`Generated content ${id} not found`);
    return content;
  }

  // Neural Network Components
  async createModelWeights(insertWeights: InsertModelWeights): Promise<ModelWeights> {
    const [weights] = await db
      .insert(modelWeights)
      .values(insertWeights)
      .returning();
    return weights;
  }

  async getModelWeightsBySession(sessionId: number): Promise<ModelWeights[]> {
    return await db
      .select()
      .from(modelWeights)
      .where(eq(modelWeights.sessionId, sessionId))
      .orderBy(desc(modelWeights.lastUpdated));
  }

  async updateModelWeights(id: number, updates: Partial<ModelWeights>): Promise<ModelWeights> {
    const [weights] = await db
      .update(modelWeights)
      .set(updates)
      .where(eq(modelWeights.id, id))
      .returning();
    if (!weights) throw new Error(`Model weights ${id} not found`);
    return weights;
  }

  // Tokenization
  async createTokenVocabulary(insertToken: InsertTokenVocabulary): Promise<TokenVocabulary> {
    const [token] = await db
      .insert(tokenVocabulary)
      .values(insertToken)
      .returning();
    return token;
  }

  async getTokenVocabularyBySession(sessionId: number): Promise<TokenVocabulary[]> {
    return await db
      .select()
      .from(tokenVocabulary)
      .where(eq(tokenVocabulary.sessionId, sessionId))
      .orderBy(desc(tokenVocabulary.frequency));
  }

  async getTokenByValue(sessionId: number, token: string): Promise<TokenVocabulary | undefined> {
    const [tokenRecord] = await db
      .select()
      .from(tokenVocabulary)
      .where(eq(tokenVocabulary.sessionId, sessionId))
      .where(eq(tokenVocabulary.token, token));
    return tokenRecord || undefined;
  }

  // Training
  async createTrainingBatch(insertBatch: InsertTrainingBatch): Promise<TrainingBatch> {
    const [batch] = await db
      .insert(trainingBatches)
      .values(insertBatch)
      .returning();
    return batch;
  }

  async getTrainingBatchesBySession(sessionId: number): Promise<TrainingBatch[]> {
    return await db
      .select()
      .from(trainingBatches)
      .where(eq(trainingBatches.sessionId, sessionId))
      .orderBy(trainingBatches.timestamp);
  }

  // Learning Metrics
  async createLearningMetrics(insertMetrics: InsertLearningMetrics): Promise<LearningMetrics> {
    const [metrics] = await db
      .insert(learningMetrics)
      .values(insertMetrics)
      .returning();
    return metrics;
  }

  async getLearningMetricsBySession(sessionId: number): Promise<LearningMetrics[]> {
    return await db
      .select()
      .from(learningMetrics)
      .where(eq(learningMetrics.sessionId, sessionId))
      .orderBy(learningMetrics.epoch);
  }
}

export const storage = new DatabaseStorage();
