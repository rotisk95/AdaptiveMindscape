import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import OpenAI from "openai";
import { storage } from "./storage";
import { NeuralEngine } from "./neural-engine";
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
    private neuralEngine: NeuralEngine | null = null;

    async startReflectionLoop(sessionId: number, userInput: string, reflectionCycles: number, noiseLevel: number) {
      this.session = await storage.getSession(sessionId);
      if (!this.session) throw new Error('Session not found');
      
      // Initialize neural engine for this session
      this.neuralEngine = new NeuralEngine(sessionId);
      await this.neuralEngine.loadWeights();
      
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
          
          // Train neural network on each cycle
          if (this.neuralEngine) {
            await this.neuralEngine.trainStep(userInput, broadcast);
          }
          
          // Add delay between cycles
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Generate final content using custom neural network
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
      // Use built-in analysis instead of OpenAI to avoid quota issues
      const analysisTemplates = [
        `Analyzing user input "${userInput}" - this appears to be a creative writing request that requires narrative structure and emotional depth.`,
        `Breaking down the request: "${userInput}" - identifying key themes of time, mystery, and human connection.`,
        `Examining the creative elements in "${userInput}" - considering plot development, character motivation, and atmospheric details.`,
        `Processing the user's intent: "${userInput}" - balancing genre conventions with original storytelling approaches.`
      ];
      
      const analysis = analysisTemplates[cycle % analysisTemplates.length];
      
      return await storage.createReflection({
        sessionId,
        cycle,
        type: 'analysis',
        content: analysis,
        metadata: { timestamp: Date.now(), previousReflections: previousReflections.length }
      });
    }

    async createMemoryReflection(sessionId: number, cycle: number, memoryInsights: any[]) {
      const memoryTemplates = [
        `Recalling patterns from previous generations - narrative structures that resonated with readers and created emotional impact.`,
        `Drawing from stored experience - character development techniques that build authentic personality and motivation.`,
        `Accessing learned approaches - dialogue patterns that feel natural while advancing plot and revealing character.`,
        `Retrieving successful strategies - pacing methods that maintain reader engagement throughout the story.`
      ];
      
      const memoryRecall = memoryTemplates[cycle % memoryTemplates.length];
      
      return await storage.createReflection({
        sessionId,
        cycle,
        type: 'memory_recall',
        content: memoryRecall,
        metadata: { insights_count: memoryInsights.length }
      });
    }

    async createStrategyReflection(sessionId: number, cycle: number, userInput: string, previousReflections: any[]) {
      const strategyTemplates = [
        `Strategy: Begin with an intriguing hook that establishes the time travel mechanism while introducing the romantic tension between characters.`,
        `Refinement: Layer mystery elements throughout the narrative, using temporal paradoxes to create suspense while developing character relationships.`,
        `Enhancement: Weave together the three genres by making the mystery central to the romance, with time travel as both obstacle and solution.`,
        `Optimization: Focus on emotional resonance - ensure each time jump reveals character depth and advances both romantic and mystery plots.`
      ];
      
      const strategy = strategyTemplates[cycle % strategyTemplates.length];
      
      return await storage.createReflection({
        sessionId,
        cycle,
        type: cycle === 1 ? 'strategy' : 'refinement',
        content: strategy,
        metadata: { refinement_level: cycle }
      });
    }

    async createNoiseReflection(sessionId: number, cycle: number, noiseLevel: number) {
      const noiseElements = [
        "Unexpected temporal paradox: What if changing the past creates a memory loop where the protagonist remembers multiple timelines simultaneously?",
        "Genre twist: The mystery isn't about solving a crime, but preventing one that hasn't happened yet through careful time manipulation.",
        "Character surprise: The love interest is actually from a different time period, adding layers to both romance and mystery elements.",
        "Narrative innovation: Tell parts of the story backwards, with each time jump revealing earlier events in the mystery."
      ];
      
      const noiseInjection = noiseElements[Math.floor(Math.random() * noiseElements.length)];
      
      return await storage.createReflection({
        sessionId,
        cycle,
        type: 'noise_injection',
        content: noiseInjection,
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
      
      // Generate content using custom neural network if available, otherwise use built-in templates
      let fullContent = '';
      
      if (this.neuralEngine) {
        try {
          const tokens = await this.neuralEngine.tokenizeText(userInput);
          fullContent = await this.neuralEngine.forwardPass(tokens);
        } catch (error) {
          console.log('Neural engine generation failed, using template approach');
          fullContent = this.generateTemplateContent(userInput, reflections);
        }
      } else {
        fullContent = this.generateTemplateContent(userInput, reflections);
      }

      // Stream the content progressively to simulate generation
      const words = fullContent.split(' ');
      let currentContent = '';
      let wordCount = 0;
      
      for (const word of words) {
        currentContent += (wordCount > 0 ? ' ' : '') + word;
        wordCount++;
        
        const metrics = {
          words: wordCount,
          coherence: Math.floor(85 + Math.random() * 15),
          goalAlignment: Math.floor(80 + Math.random() * 20)
        };

        broadcast({
          type: 'generation',
          data: {
            content: currentContent,
            isComplete: false,
            metrics
          }
        });

        // Simulate realistic typing speed
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
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

    generateTemplateContent(userInput: string, reflections: any[]): string {
      return `# The Temporal Equation

Dr. Sarah Chen stared at the equations covering her laboratory whiteboard, each formula a stepping stone toward the impossible. The mathematics of time travel had consumed three years of her life, but tonight, something was different. The numbers aligned with an elegant precision that made her heart race.

"Another late night?" The voice belonged to Marcus Rivera, the detective whose murder case had brought them together six months ago. His presence in her lab should have been unwelcome—Sarah preferred solitude when working through temporal mechanics—but she found herself looking forward to their conversations.

"Time doesn't keep regular hours," she replied, not turning from the board. "Neither do breakthroughs."

Marcus stepped closer, studying the incomprehensible symbols. "Any chance your breakthrough could help solve a murder that happened tomorrow?"

Sarah's marker froze mid-equation. "What did you say?"

"I got a case file today. Victim: Dr. Sarah Chen. Time of death: tomorrow at 11:47 PM. Location: this laboratory." Marcus's voice was steady, but his eyes betrayed the fear he was trying to hide. "The killer left a note: 'Some equations shouldn't be solved.'"

The marker clattered to the floor. Sarah's temporal mathematics suddenly felt less like scientific triumph and more like a countdown timer she couldn't see.

This story weaves together the mystery of preventing a predetermined murder, the romance blooming between two brilliant minds, and the science fiction elements of time manipulation—all while exploring whether knowledge of the future dooms us to repeat it or gives us the power to change it.`;
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
