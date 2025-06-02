import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  objective: text("objective").notNull(),
  isActive: boolean("is_active").default(false),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  totalReflections: integer("total_reflections").default(0),
  improvementRate: integer("improvement_rate").default(0),
});

export const reflections = pgTable("reflections", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => sessions.id),
  cycle: integer("cycle").notNull(),
  type: text("type").notNull(), // 'analysis', 'memory_recall', 'strategy', 'refinement', 'noise_injection', 'generation'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  metadata: jsonb("metadata"), // For storing additional data like metrics, connections, etc.
});

export const memoryInsights = pgTable("memory_insights", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => sessions.id),
  type: text("type").notNull(), // 'pattern_recognition', 'learning', 'optimization', 'adaptation', 'correction', 'enhancement'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  connections: jsonb("connections"), // For storing network connections data
});

export const generatedContent = pgTable("generated_content", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => sessions.id),
  reflectionId: integer("reflection_id").references(() => reflections.id),
  content: text("content").notNull(),
  isComplete: boolean("is_complete").default(false),
  qualityScore: integer("quality_score"),
  coherenceScore: integer("coherence_score"),
  goalAlignment: integer("goal_alignment"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Insert schemas
export const insertSessionSchema = createInsertSchema(sessions).pick({
  name: true,
  objective: true,
});

export const insertReflectionSchema = createInsertSchema(reflections).pick({
  sessionId: true,
  cycle: true,
  type: true,
  content: true,
  metadata: true,
});

export const insertMemoryInsightSchema = createInsertSchema(memoryInsights).pick({
  sessionId: true,
  type: true,
  content: true,
  connections: true,
});

export const insertGeneratedContentSchema = createInsertSchema(generatedContent).pick({
  sessionId: true,
  reflectionId: true,
  content: true,
  isComplete: true,
  qualityScore: true,
  coherenceScore: true,
  goalAlignment: true,
});

// Types
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertReflection = z.infer<typeof insertReflectionSchema>;
export type Reflection = typeof reflections.$inferSelect;
export type InsertMemoryInsight = z.infer<typeof insertMemoryInsightSchema>;
export type MemoryInsight = typeof memoryInsights.$inferSelect;
export type InsertGeneratedContent = z.infer<typeof insertGeneratedContentSchema>;
export type GeneratedContent = typeof generatedContent.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Additional types for real-time communication
export type ReflectionMessage = {
  type: 'reflection';
  data: Reflection;
};

export type GenerationMessage = {
  type: 'generation';
  data: {
    content: string;
    isComplete: boolean;
    metrics?: {
      words: number;
      coherence: number;
      goalAlignment: number;
    };
  };
};

export type MemoryInsightMessage = {
  type: 'memory_insight';
  data: MemoryInsight;
};

export type PerformanceUpdateMessage = {
  type: 'performance_update';
  data: {
    responseQuality: number;
    learningProgress: number;
    avgReflectionTime: number;
    memoryUtilization: number;
  };
};

export type WebSocketMessage = ReflectionMessage | GenerationMessage | MemoryInsightMessage | PerformanceUpdateMessage;
