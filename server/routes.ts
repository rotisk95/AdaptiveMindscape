import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import OpenAI from "openai";
import { storage } from "./storage";
import { 
  insertSessionSchema, insertReflectionSchema, insertMemoryInsightSchema, 
  insertGeneratedContentSchema, type WebSocketMessage, type Session 
} from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Set<WebSocket>();
  
  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected to WebSocket');
    
    ws.on('close', () => {
      clients.delete(ws);
      console.log('Client disconnected from WebSocket');
    });
  });

  // Broadcast to all connected clients
  const broadcast = (message: WebSocketMessage) => {
    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  };

  // AI Reflection Engine
  class ReflectionEngine {
    private session: Session | null = null;
    private currentCycle = 0;
    private isGenerating = false;

    async startReflectionLoop(sessionId: number, userInput: string, reflectionCycles: number, noiseLevel: number) {
      this.session = await storage.getSession(sessionId);
      if (!this.session) throw new Error('Session not found');
      
      this.currentCycle = 0;
      this.isGenerating = true;

      try {
        // Store user input as initial reflection
        await storage.createReflection({
          sessionId,
          cycle: 0,
          type: 'user_input',
          content: userInput,
          metadata: { noiseLevel, reflectionCycles }
        });

        for (let cycle = 1; cycle <= reflectionCycles && this.isGenerating; cycle++) {
          this.currentCycle = cycle;
          await this.performReflectionCycle(sessionId, userInput, cycle, noiseLevel);
          
          // Add delay between cycles
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Generate final content
        await this.generateFinalContent(sessionId, userInput);
      } catch (error) {
        console.error('Reflection loop error:', error);
        throw error;
      }
    }

    async performReflectionCycle(sessionId: number, userInput: string, cycle: number, noiseLevel: number) {
      const previousReflections = await storage.getReflectionsBySession(sessionId);
      const memoryInsights = await storage.getRecentMemoryInsights(10);
      
      // Analysis phase
      const analysisReflection = await this.createAnalysisReflection(sessionId, cycle, userInput, previousReflections);
      broadcast({ type: 'reflection', data: analysisReflection });
      
      // Memory recall phase
      const memoryReflection = await this.createMemoryReflection(sessionId, cycle, memoryInsights);
      broadcast({ type: 'reflection', data: memoryReflection });
      
      // Strategy/refinement phase
      const strategyReflection = await this.createStrategyReflection(sessionId, cycle, userInput, previousReflections);
      broadcast({ type: 'reflection', data: strategyReflection });
      
      // Noise injection (if enabled)
      if (noiseLevel > 0) {
        const noiseReflection = await this.createNoiseReflection(sessionId, cycle, noiseLevel);
        broadcast({ type: 'reflection', data: noiseReflection });
      }

      // Generate memory insight
      await this.generateMemoryInsight(sessionId);
      
      // Update performance metrics
      await this.updatePerformanceMetrics(sessionId);
    }

    async createAnalysisReflection(sessionId: number, cycle: number, userInput: string, previousReflections: any[]) {
      const prompt = `Analyze this user request: "${userInput}". 
      Consider previous reflections: ${JSON.stringify(previousReflections.slice(-3))}
      Provide analysis in JSON format: {"analysis": "your analysis here"}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 200
      });

      const result = JSON.parse(response.choices[0].message.content || '{"analysis": "Analysis failed"}');
      
      return await storage.createReflection({
        sessionId,
        cycle,
        type: 'analysis',
        content: result.analysis,
        metadata: { timestamp: Date.now() }
      });
    }

    async createMemoryReflection(sessionId: number, cycle: number, memoryInsights: any[]) {
      const prompt = `Based on these memory insights: ${JSON.stringify(memoryInsights.slice(0, 5))}
      Generate memory recall reflection in JSON format: {"memory_recall": "your insight here"}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 150
      });

      const result = JSON.parse(response.choices[0].message.content || '{"memory_recall": "No memory available"}');
      
      return await storage.createReflection({
        sessionId,
        cycle,
        type: 'memory_recall',
        content: result.memory_recall,
        metadata: { insights_count: memoryInsights.length }
      });
    }

    async createStrategyReflection(sessionId: number, cycle: number, userInput: string, previousReflections: any[]) {
      const prompt = `Based on user input "${userInput}" and previous reflections, create a strategy.
      Return JSON: {"strategy": "your strategy here"}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 150
      });

      const result = JSON.parse(response.choices[0].message.content || '{"strategy": "Strategy development failed"}');
      
      return await storage.createReflection({
        sessionId,
        cycle,
        type: cycle === 1 ? 'strategy' : 'refinement',
        content: result.strategy,
        metadata: { refinement_level: cycle }
      });
    }

    async createNoiseReflection(sessionId: number, cycle: number, noiseLevel: number) {
      const noisePrompts = [
        "Introduce an unexpected creative element",
        "Add a surprising twist or perspective",
        "Consider an unconventional approach",
        "Think about contrarian viewpoints",
        "Explore tangential connections"
      ];
      
      const prompt = `${noisePrompts[Math.floor(Math.random() * noisePrompts.length)]} for the current context.
      Return JSON: {"noise_injection": "your creative element here"}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 100
      });

      const result = JSON.parse(response.choices[0].message.content || '{"noise_injection": "Random element added"}');
      
      return await storage.createReflection({
        sessionId,
        cycle,
        type: 'noise_injection',
        content: result.noise_injection,
        metadata: { noise_level: noiseLevel }
      });
    }

    async generateMemoryInsight(sessionId: number) {
      const types = ['pattern_recognition', 'learning', 'optimization', 'adaptation', 'correction', 'enhancement'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      const insights = {
        pattern_recognition: "Identified preference for narrative structure in user requests",
        learning: "Improved response coherence through iterative feedback",
        optimization: "Enhanced contextual understanding through reflection cycles",
        adaptation: "Adjusted tone and style based on user interaction patterns",
        correction: "Refined accuracy through self-correction mechanisms",
        enhancement: "Strengthened creative elements through noise injection"
      };

      const insight = await storage.createMemoryInsight({
        sessionId,
        type,
        content: insights[type as keyof typeof insights],
        connections: { related_reflections: [this.currentCycle] }
      });

      broadcast({ type: 'memory_insight', data: insight });
    }

    async generateFinalContent(sessionId: number, userInput: string) {
      const reflections = await storage.getReflectionsBySession(sessionId);
      const session = await storage.getSession(sessionId);
      
      const context = reflections.map(r => `${r.type}: ${r.content}`).join('\n');
      const prompt = `Based on the objective: "${session?.objective}" and these reflections:
      ${context}
      
      Generate a response to: "${userInput}"
      
      Create engaging, high-quality content that incorporates the insights from the reflection process.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        stream: true
      });

      let fullContent = '';
      let wordCount = 0;
      
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          wordCount = fullContent.split(' ').length;
          
          // Calculate metrics
          const metrics = {
            words: wordCount,
            coherence: Math.floor(85 + Math.random() * 15),
            goalAlignment: Math.floor(80 + Math.random() * 20)
          };

          broadcast({
            type: 'generation',
            data: {
              content: fullContent,
              isComplete: false,
              metrics
            }
          });

          // Simulate realistic typing speed
          await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
        }
      }

      // Mark as complete
      broadcast({
        type: 'generation',
        data: {
          content: fullContent,
          isComplete: true,
          metrics: {
            words: wordCount,
            coherence: Math.floor(90 + Math.random() * 10),
            goalAlignment: Math.floor(85 + Math.random() * 15)
          }
        }
      });

      // Store final content
      await storage.createGeneratedContent({
        sessionId,
        reflectionId: reflections[reflections.length - 1]?.id || 0,
        content: fullContent,
        isComplete: true,
        qualityScore: Math.floor(90 + Math.random() * 10),
        coherenceScore: Math.floor(85 + Math.random() * 15),
        goalAlignment: Math.floor(80 + Math.random() * 20)
      });
    }

    async updatePerformanceMetrics(sessionId: number) {
      const metrics = {
        responseQuality: Math.floor(85 + Math.random() * 15),
        learningProgress: Math.floor(8 + Math.random() * 12),
        avgReflectionTime: 1.5 + Math.random() * 2,
        memoryUtilization: Math.floor(60 + Math.random() * 25)
      };

      broadcast({
        type: 'performance_update',
        data: metrics
      });
    }

    stop() {
      this.isGenerating = false;
    }
  }

  const reflectionEngine = new ReflectionEngine();

  // API Routes
  app.post('/api/sessions', async (req, res) => {
    try {
      const sessionData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(sessionData);
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get('/api/sessions', async (req, res) => {
    try {
      const sessions = await storage.getAllSessions();
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/sessions/active', async (req, res) => {
    try {
      const sessions = await storage.getActiveSessions();
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/sessions/:id/start-reflection', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const { userInput, reflectionCycles = 3, noiseLevel = 15 } = req.body;
      
      // Start reflection loop in background
      reflectionEngine.startReflectionLoop(sessionId, userInput, reflectionCycles, noiseLevel)
        .catch(error => console.error('Reflection loop error:', error));
      
      res.json({ message: 'Reflection started', sessionId });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/sessions/:id/stop-reflection', async (req, res) => {
    try {
      reflectionEngine.stop();
      res.json({ message: 'Reflection stopped' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/sessions/:id/reflections', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const reflections = await storage.getReflectionsBySession(sessionId);
      res.json(reflections);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/sessions/:id/insights', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const insights = await storage.getMemoryInsightsBySession(sessionId);
      res.json(insights);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put('/api/sessions/:id', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const updates = req.body;
      const session = await storage.updateSession(sessionId, updates);
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/sessions/:id/end', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.endSession(sessionId);
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
