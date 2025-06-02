import { useEffect, useRef } from "react";

export function MemoryNetwork() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animation for connection lines
    const container = containerRef.current;
    if (!container) return;

    const nodes = container.querySelectorAll('[data-node]');
    nodes.forEach((node, index) => {
      const element = node as HTMLElement;
      element.style.animationDelay = `${index * 0.5}s`;
    });
  }, []);

  return (
    <div ref={containerRef} className="bg-slate-900 rounded-lg p-4 h-48 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Central Node */}
        <div className="w-4 h-4 bg-purple-500 rounded-full relative" data-node>
          {/* Connection Lines */}
          <div className="absolute w-16 h-px bg-gradient-to-r from-purple-500 to-transparent top-2 left-4"></div>
          <div className="absolute w-12 h-px bg-gradient-to-l from-cyan-500 to-transparent top-2 -left-12"></div>
          <div className="absolute w-px h-12 bg-gradient-to-t from-amber-500 to-transparent left-2 -top-12"></div>
          <div className="absolute w-px h-10 bg-gradient-to-b from-emerald-500 to-transparent left-2 top-4"></div>
        </div>
        
        {/* Connected Nodes */}
        <div 
          className="absolute top-4 right-8 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" 
          data-node
          style={{ animationDelay: '0.5s' }}
        ></div>
        <div 
          className="absolute top-4 left-8 w-2 h-2 bg-amber-400 rounded-full animate-pulse" 
          data-node
          style={{ animationDelay: '1s' }}
        ></div>
        <div 
          className="absolute top-16 left-1/2 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" 
          data-node
          style={{ animationDelay: '1.5s' }}
        ></div>
        <div 
          className="absolute bottom-16 left-1/2 w-2 h-2 bg-purple-400 rounded-full animate-pulse" 
          data-node
          style={{ animationDelay: '2s' }}
        ></div>
      </div>
      
      <div className="absolute bottom-2 left-2 text-xs text-slate-400">
        Active Connections: <span className="text-purple-400 font-mono">247</span>
      </div>
    </div>
  );
}
