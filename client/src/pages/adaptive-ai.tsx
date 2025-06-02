import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, Target, Keyboard, Upload, Play, Pause, Save, RotateCcw, 
  Lightbulb, TrendingUp, Database, FolderSync, Edit, MoreHorizontal, MessageSquare, History
} from "lucide-react";
import { MemoryNetwork } from "@/components/memory-network";
import { ReflectionStream } from "@/components/reflection-stream";
import { MemoryInsights } from "@/components/memory-insights";
import { PerformanceMetrics } from "@/components/performance-metrics";
import type { Session, MemoryInsight, Reflection, WebSocketMessage } from "@shared/schema";

export default function AdaptiveAI() {
  const [objective, setObjective] = useState("Develop creative writing skills through iterative feedback and self-reflection");
  const [userInput, setUserInput] = useState("Write a short story about time travel that incorporates elements of mystery and romance.");
  const [reflectionCycles, setReflectionCycles] = useState(3);
  const [noiseLevel, setNoiseLevel] = useState([15]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [generationContent, setGenerationContent] = useState("");
  const [generationMetrics, setGenerationMetrics] = useState({ words: 0, coherence: 0, goalAlignment: 0 });
  const [memoryInsights, setMemoryInsights] = useState<MemoryInsight[]>([]);
  const [performanceData, setPerformanceData] = useState({
    responseQuality: 94,
    learningProgress: 12,
    avgReflectionTime: 2.3,
    memoryUtilization: 68
  });

  // WebSocket connection
  useWebSocket((message: WebSocketMessage) => {
    switch (message.type) {
      case 'reflection':
        setReflections(prev => [...prev, message.data]);
        if (message.data.type === 'analysis') {
          setCurrentCycle(message.data.cycle);
        }
        break;
      case 'generation':
        setGenerationContent(message.data.content);
        if (message.data.metrics) {
          setGenerationMetrics(message.data.metrics);
        }
        if (message.data.isComplete) {
          setIsGenerating(false);
        }
        break;
      case 'memory_insight':
        setMemoryInsights(prev => [message.data, ...prev.slice(0, 9)]);
        break;
      case 'performance_update':
        setPerformanceData(message.data);
        break;
    }
  });

  // Fetch sessions
  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['/api/sessions'],
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: { name: string; objective: string }) => {
      const res = await apiRequest('POST', '/api/sessions', data);
      return res.json();
    },
    onSuccess: (session) => {
      setCurrentSession(session);
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
  });

  // Start reflection mutation
  const startReflectionMutation = useMutation({
    mutationFn: async (data: { sessionId: number; userInput: string; reflectionCycles: number; noiseLevel: number }) => {
      const res = await apiRequest('POST', `/api/sessions/${data.sessionId}/start-reflection`, data);
      return res.json();
    },
    onSuccess: () => {
      setIsGenerating(true);
      setCurrentCycle(0);
      setReflections([]);
      setGenerationContent("");
    },
  });

  // Stop reflection mutation
  const stopReflectionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await apiRequest('POST', `/api/sessions/${sessionId}/stop-reflection`, {});
      return res.json();
    },
    onSuccess: () => {
      setIsGenerating(false);
    },
  });

  // Initialize with first session if available
  useEffect(() => {
    if (sessions.length > 0 && !currentSession) {
      const activeSession = sessions.find(s => s.isActive) || sessions[0];
      setCurrentSession(activeSession);
    }
  }, [sessions, currentSession]);

  const handleCreateSession = () => {
    createSessionMutation.mutate({
      name: "Creative Writing Session",
      objective
    });
  };

  const handleStartGeneration = () => {
    if (!currentSession) {
      handleCreateSession();
      return;
    }
    
    startReflectionMutation.mutate({
      sessionId: currentSession.id,
      userInput,
      reflectionCycles,
      noiseLevel: noiseLevel[0]
    });
  };

  const handleStopGeneration = () => {
    if (currentSession) {
      stopReflectionMutation.mutate(currentSession.id);
    }
  };

  const progress = reflectionCycles > 0 ? (currentCycle / reflectionCycles) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Brain className="text-white w-4 h-4" />
              </div>
              <h1 className="text-xl font-semibold">Adaptive AI</h1>
            </div>
            <div className="bg-slate-700 px-3 py-1 rounded-full text-xs font-medium text-cyan-400">
              Experimental
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-300">Connected</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">Memory: 2.4GB</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 hover:bg-slate-600">
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button variant="outline" size="sm" className="bg-red-600 border-red-500 hover:bg-red-700">
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex pt-16 h-screen">
        {/* Left Panel */}
        <div className="w-96 bg-slate-800 border-r border-slate-700 flex flex-col">
          {/* Objective Setting */}
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-blue-400" />
              Objective
            </h2>
            <Textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Define the AI's learning objective or goal..."
              className="h-24 bg-slate-900 border-slate-600 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-xs text-slate-400">Objective Active</span>
              </div>
              <Button variant="link" size="sm" className="text-blue-400 hover:text-blue-300 p-0 h-auto">
                Update
              </Button>
            </div>
          </div>

          {/* Input Controls */}
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Keyboard className="w-5 h-5 mr-2 text-cyan-400" />
              Input
            </h2>
            
            <div className="mb-4">
              <Label className="text-sm font-medium text-slate-300 mb-2 block">Prompt/Query</Label>
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Enter your prompt or question for the AI..."
                className="h-32 bg-slate-900 border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
              />
            </div>
            
            {/* Dataset Upload */}
            <div className="mb-4">
              <Label className="text-sm font-medium text-slate-300 mb-2 block">Dataset Upload</Label>
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-4 text-center hover:border-slate-500 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Drop files here or click to upload</p>
                <p className="text-xs text-slate-500 mt-1">Supports: .txt, .json, .csv</p>
              </div>
            </div>
            
            {/* Generation Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-slate-300">Reflection Cycles</Label>
                <Input
                  type="number"
                  value={reflectionCycles}
                  onChange={(e) => setReflectionCycles(parseInt(e.target.value) || 3)}
                  className="w-16 bg-slate-900 border-slate-600"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-slate-300">Noise Level</Label>
                <div className="flex items-center space-x-2">
                  <Slider
                    value={noiseLevel}
                    onValueChange={setNoiseLevel}
                    max={100}
                    step={1}
                    className="w-24"
                  />
                  <span className="text-xs text-slate-400 w-8">{noiseLevel[0]}%</span>
                </div>
              </div>
            </div>
            
            <Button
              onClick={isGenerating ? handleStopGeneration : handleStartGeneration}
              disabled={createSessionMutation.isPending || startReflectionMutation.isPending}
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 font-medium py-3"
            >
              {isGenerating ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Generation
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Generation
                </>
              )}
            </Button>
          </div>

          {/* Memory Insights */}
          <div className="p-6 flex-1 overflow-hidden">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-amber-400" />
              Memory Insights
            </h2>
            <MemoryInsights insights={memoryInsights} />
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex flex-col">
          {/* Reflection Process Header */}
          <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center">
                <FolderSync className={`w-5 h-5 mr-2 text-blue-400 ${isGenerating ? 'animate-spin' : ''}`} />
                Reflection Process
              </h2>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-300">Cycle:</span>
                  <div className="bg-slate-700 px-2 py-1 rounded text-sm font-mono">
                    {currentCycle}/{reflectionCycles}
                  </div>
                </div>
                
                <Progress value={progress} className="w-32" />
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isGenerating ? handleStopGeneration : handleStartGeneration}
                  className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                >
                  {isGenerating ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                  {isGenerating ? 'Pause' : 'Start'}
                </Button>
              </div>
            </div>
          </div>

          {/* Conversation/Reflection Stream */}
          <div className="flex-1 overflow-hidden">
            <ReflectionStream
              reflections={reflections}
              generationContent={generationContent}
              generationMetrics={generationMetrics}
              isGenerating={isGenerating}
              userInput={userInput}
            />
          </div>

          {/* Generation Controls Footer */}
          <div className="bg-slate-800 border-t border-slate-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Play className="w-4 h-4 mr-2" />
                  Continue
                </Button>
                <Button variant="outline" className="bg-slate-700 border-slate-600 hover:bg-slate-600">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
                <Button variant="outline" className="bg-amber-600 border-amber-500 hover:bg-amber-700">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Feedback
                </Button>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-slate-300">
                <span>Session: <span className="font-mono text-cyan-400">2h 34m</span></span>
                <span>Total Reflections: <span className="font-mono text-cyan-400">{reflections.length}</span></span>
                <span>Learning Rate: <span className="font-mono text-emerald-400">+{performanceData.learningProgress}%</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
          {/* Performance Metrics */}
          <div className="p-6 border-b border-slate-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-emerald-400" />
              Performance
            </h3>
            <PerformanceMetrics data={performanceData} />
          </div>

          {/* Memory Visualization */}
          <div className="p-6 border-b border-slate-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-400" />
              Memory Network
            </h3>
            <MemoryNetwork />
          </div>

          {/* Session Data */}
          <div className="p-6 flex-1 overflow-hidden">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <History className="w-5 h-5 mr-2 text-blue-400" />
              Session History
            </h3>
            
            <div className="space-y-3 h-full overflow-y-auto">
              {sessions.map((session) => (
                <Card key={session.id} className="bg-slate-900 border-slate-700">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-300">{session.name}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(session.startTime).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">
                      {session.totalReflections} reflections, +{session.improvementRate}% improvement
                    </p>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${session.isActive ? 'bg-emerald-500' : 'bg-slate-500'}`}></div>
                      <span className={`text-xs ${session.isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {session.isActive ? 'Active' : 'Completed'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
