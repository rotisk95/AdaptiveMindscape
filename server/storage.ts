import { 
  users, sessions, reflections, memoryInsights, generatedContent,
  type User, type InsertUser, type Session, type InsertSession,
  type Reflection, type InsertReflection, type MemoryInsight, type InsertMemoryInsight,
  type GeneratedContent, type InsertGeneratedContent
} from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sessions: Map<number, Session>;
  private reflections: Map<number, Reflection>;
  private memoryInsights: Map<number, MemoryInsight>;
  private generatedContent: Map<number, GeneratedContent>;
  private currentUserId: number;
  private currentSessionId: number;
  private currentReflectionId: number;
  private currentMemoryInsightId: number;
  private currentGeneratedContentId: number;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.reflections = new Map();
    this.memoryInsights = new Map();
    this.generatedContent = new Map();
    this.currentUserId = 1;
    this.currentSessionId = 1;
    this.currentReflectionId = 1;
    this.currentMemoryInsightId = 1;
    this.currentGeneratedContentId = 1;
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Sessions
  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = this.currentSessionId++;
    const session: Session = {
      ...insertSession,
      id,
      isActive: true,
      startTime: new Date(),
      endTime: null,
      totalReflections: 0,
      improvementRate: 0,
    };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: number): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async getActiveSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(session => session.isActive);
  }

  async getAllSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values()).sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  async updateSession(id: number, updates: Partial<Session>): Promise<Session> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Session ${id} not found`);
    
    const updatedSession = { ...session, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async endSession(id: number): Promise<Session> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Session ${id} not found`);
    
    const updatedSession = { 
      ...session, 
      isActive: false, 
      endTime: new Date() 
    };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  // Reflections
  async createReflection(insertReflection: InsertReflection): Promise<Reflection> {
    const id = this.currentReflectionId++;
    const reflection: Reflection = {
      ...insertReflection,
      id,
      timestamp: new Date(),
    };
    this.reflections.set(id, reflection);
    
    // Update session reflection count
    const session = this.sessions.get(insertReflection.sessionId);
    if (session) {
      const updatedSession = { ...session, totalReflections: session.totalReflections + 1 };
      this.sessions.set(insertReflection.sessionId, updatedSession);
    }
    
    return reflection;
  }

  async getReflectionsBySession(sessionId: number): Promise<Reflection[]> {
    return Array.from(this.reflections.values())
      .filter(reflection => reflection.sessionId === sessionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async getReflection(id: number): Promise<Reflection | undefined> {
    return this.reflections.get(id);
  }

  // Memory Insights
  async createMemoryInsight(insertInsight: InsertMemoryInsight): Promise<MemoryInsight> {
    const id = this.currentMemoryInsightId++;
    const insight: MemoryInsight = {
      ...insertInsight,
      id,
      timestamp: new Date(),
    };
    this.memoryInsights.set(id, insight);
    return insight;
  }

  async getMemoryInsightsBySession(sessionId: number): Promise<MemoryInsight[]> {
    return Array.from(this.memoryInsights.values())
      .filter(insight => insight.sessionId === sessionId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getRecentMemoryInsights(limit: number): Promise<MemoryInsight[]> {
    return Array.from(this.memoryInsights.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // Generated Content
  async createGeneratedContent(insertContent: InsertGeneratedContent): Promise<GeneratedContent> {
    const id = this.currentGeneratedContentId++;
    const content: GeneratedContent = {
      ...insertContent,
      id,
      timestamp: new Date(),
    };
    this.generatedContent.set(id, content);
    return content;
  }

  async getGeneratedContentBySession(sessionId: number): Promise<GeneratedContent[]> {
    return Array.from(this.generatedContent.values())
      .filter(content => content.sessionId === sessionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async updateGeneratedContent(id: number, updates: Partial<GeneratedContent>): Promise<GeneratedContent> {
    const content = this.generatedContent.get(id);
    if (!content) throw new Error(`Generated content ${id} not found`);
    
    const updatedContent = { ...content, ...updates };
    this.generatedContent.set(id, updatedContent);
    return updatedContent;
  }
}

export const storage = new MemStorage();
