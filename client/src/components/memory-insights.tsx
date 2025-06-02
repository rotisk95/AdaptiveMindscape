import { Card, CardContent } from "@/components/ui/card";
import type { MemoryInsight } from "@shared/schema";

interface MemoryInsightsProps {
  insights: MemoryInsight[];
}

export function MemoryInsights({ insights }: MemoryInsightsProps) {
  const getInsightColor = (type: string) => {
    switch (type) {
      case 'pattern_recognition':
        return 'border-amber-400 text-amber-400';
      case 'learning':
        return 'border-emerald-400 text-emerald-400';
      case 'optimization':
        return 'border-cyan-400 text-cyan-400';
      case 'adaptation':
        return 'border-purple-400 text-purple-400';
      case 'correction':
        return 'border-red-400 text-red-400';
      case 'enhancement':
        return 'border-blue-400 text-blue-400';
      default:
        return 'border-slate-400 text-slate-400';
    }
  };

  const formatInsightType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (insights.length === 0) {
    return (
      <div className="text-center text-slate-400 py-8">
        <p className="text-sm">No memory insights yet.</p>
        <p className="text-xs mt-1">Insights will appear as the AI learns.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 h-full overflow-y-auto">
      {insights.map((insight) => (
        <Card key={insight.id} className={`bg-slate-900 border-l-4 ${getInsightColor(insight.type).split(' ')[0]}`}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between mb-1">
              <span className={`text-xs font-medium ${getInsightColor(insight.type).split(' ')[1]}`}>
                {formatInsightType(insight.type)}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(insight.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm text-slate-300">{insight.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
