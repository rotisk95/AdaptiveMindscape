import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface PerformanceMetricsProps {
  data: {
    responseQuality: number;
    learningProgress: number;
    avgReflectionTime: number;
    memoryUtilization: number;
  };
}

export function PerformanceMetrics({ data }: PerformanceMetricsProps) {
  return (
    <div className="space-y-4">
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-300">Response Quality</span>
            <span className="text-sm font-mono text-emerald-400">{data.responseQuality}%</span>
          </div>
          <Progress value={data.responseQuality} className="h-2" />
        </CardContent>
      </Card>
      
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-300">Learning Progress</span>
            <span className="text-sm font-mono text-blue-400">+{data.learningProgress}%</span>
          </div>
          <Progress value={76} className="h-2" />
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-mono text-cyan-400">{data.avgReflectionTime}s</div>
            <div className="text-xs text-slate-400">Avg Reflection</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-mono text-amber-400">{data.memoryUtilization}%</div>
            <div className="text-xs text-slate-400">Memory Usage</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
