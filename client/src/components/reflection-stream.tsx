import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, FolderSync, Edit } from "lucide-react";
import type { Reflection } from "@shared/schema";

interface ReflectionStreamProps {
  reflections: Reflection[];
  generationContent: string;
  generationMetrics: { words: number; coherence: number; goalAlignment: number };
  isGenerating: boolean;
  userInput: string;
}

export function ReflectionStream({ 
  reflections, 
  generationContent, 
  generationMetrics, 
  isGenerating, 
  userInput 
}: ReflectionStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [reflections, generationContent]);

  const getReflectionIcon = (type: string) => {
    switch (type) {
      case 'analysis':
        return <Brain className="w-4 h-4 text-amber-400" />;
      case 'memory_recall':
        return <Brain className="w-4 h-4 text-emerald-400" />;
      case 'strategy':
      case 'refinement':
        return <FolderSync className="w-4 h-4 text-blue-400" />;
      case 'noise_injection':
        return <FolderSync className="w-4 h-4 text-purple-400" />;
      default:
        return <Brain className="w-4 h-4 text-slate-400" />;
    }
  };

  const getReflectionColor = (type: string) => {
    switch (type) {
      case 'analysis':
        return 'border-amber-400';
      case 'memory_recall':
        return 'border-emerald-400';
      case 'strategy':
      case 'refinement':
        return 'border-cyan-400';
      case 'noise_injection':
        return 'border-purple-400';
      default:
        return 'border-slate-400';
    }
  };

  const formatReflectionType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const groupedReflections = reflections.reduce((acc, reflection) => {
    const cycle = reflection.cycle;
    if (!acc[cycle]) acc[cycle] = [];
    acc[cycle].push(reflection);
    return acc;
  }, {} as Record<number, Reflection[]>);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-6 space-y-4">
      {/* User Message */}
      {userInput && (
        <div className="flex justify-end">
          <Card className="max-w-3xl bg-blue-600 border-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-100">User</span>
                <span className="text-xs text-blue-200">Just now</span>
              </div>
              <p className="text-white">{userInput}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reflection Cycles */}
      {Object.entries(groupedReflections).map(([cycle, cycleReflections]) => (
        <div key={cycle} className={`border-l-4 ${getReflectionColor(cycleReflections[0]?.type)} pl-4 bg-slate-800 rounded-r-lg p-4`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {getReflectionIcon(cycleReflections[0]?.type)}
              <span className="font-medium text-cyan-400">
                Reflection Cycle {cycle}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {cycleReflections[0] ? new Date(cycleReflections[0].timestamp).toLocaleTimeString() : ''}
            </span>
          </div>
          
          <div className="space-y-3 text-sm">
            {cycleReflections.map((reflection) => (
              <div key={reflection.id} className="bg-slate-900 rounded p-3">
                <span className={`font-mono text-xs ${
                  reflection.type === 'analysis' ? 'text-cyan-400' :
                  reflection.type === 'memory_recall' ? 'text-emerald-400' :
                  reflection.type === 'strategy' ? 'text-blue-400' :
                  reflection.type === 'refinement' ? 'text-amber-400' :
                  reflection.type === 'noise_injection' ? 'text-purple-400' :
                  'text-slate-400'
                }`}>
                  {formatReflectionType(reflection.type).toUpperCase()}:
                </span>
                <p className="text-slate-300 mt-1">{reflection.content}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Current Generation Stream */}
      {(isGenerating || generationContent) && (
        <div className="border-l-4 border-emerald-400 pl-4 bg-slate-800 rounded-r-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Edit className="w-4 h-4 text-emerald-400" />
              <span className="font-medium text-emerald-400">Generation Stream</span>
              {isGenerating && <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>}
            </div>
            <span className="text-xs text-slate-400">{isGenerating ? 'Live' : 'Complete'}</span>
          </div>
          
          <div className="bg-slate-900 rounded p-4 font-mono text-sm">
            <p className="text-slate-200 leading-relaxed">
              {generationContent}
              {isGenerating && (
                <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-1"></span>
              )}
            </p>
          </div>
          
          {/* Generation Metrics */}
          {generationMetrics.words > 0 && (
            <div className="mt-3 flex items-center space-x-4 text-xs text-slate-400">
              <span>Words: <span className="text-emerald-400 font-mono">{generationMetrics.words}</span></span>
              <span>Coherence: <span className="text-emerald-400 font-mono">{generationMetrics.coherence}%</span></span>
              <span>Goal Alignment: <span className="text-emerald-400 font-mono">{generationMetrics.goalAlignment}%</span></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
