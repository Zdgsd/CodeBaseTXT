import React from 'react';
import { OutputFormat, GenerationOptions } from '../types';
import { FileText, FileCode, Code, FileJson, Zap, Layers, Terminal, Minimize2, PackageX, MessageSquare, Bone, Scissors, ScrollText } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface OutputControlsProps {
  format: OutputFormat;
  setFormat: (f: OutputFormat) => void;
  options: GenerationOptions;
  setOptions: (o: GenerationOptions) => void;
  tokenCount: number;
  rawTokenCount: number;
}

const OutputControls: React.FC<OutputControlsProps> = ({ format, setFormat, options, setOptions, tokenCount, rawTokenCount }) => {
  const formats: { id: OutputFormat; label: string; icon: any }[] = [
    { id: 'DENSE', label: 'Dense', icon: Zap },
    { id: 'MARKDOWN', label: 'MD', icon: FileCode },
    { id: 'XML', label: 'XML', icon: Code },
    { id: 'JSON', label: 'JSON', icon: FileJson },
    { id: 'TEXT', label: 'TXT', icon: FileText },
  ];

  const presets = [
    { 
        name: 'Standard', 
        desc: 'Balanced', 
        apply: () => { setFormat('MARKDOWN'); setOptions({ ...options, removeComments: false, removeEmptyLines: false, removeConsoleLogs: false, minifyWhitespace: false, removeImports: false, skeletonize: false, truncateLargeValues: false }); } 
    },
    { 
        name: 'Compressed', 
        desc: 'Clean', 
        apply: () => { setFormat('DENSE'); setOptions({ ...options, removeComments: true, removeEmptyLines: true, removeConsoleLogs: true, minifyWhitespace: false, removeImports: false, skeletonize: false, truncateLargeValues: true }); } 
    },
    { 
        name: 'Skeleton', 
        desc: 'Structure', 
        apply: () => { setFormat('MARKDOWN'); setOptions({ ...options, removeComments: true, removeEmptyLines: true, removeConsoleLogs: true, minifyWhitespace: false, removeImports: true, skeletonize: true, truncateLargeValues: true }); } 
    },
    { 
        name: 'Minified', 
        desc: 'Smallest', 
        apply: () => { setFormat('DENSE'); setOptions({ ...options, removeComments: true, removeEmptyLines: true, removeConsoleLogs: true, minifyWhitespace: true, removeImports: true, skeletonize: false, truncateLargeValues: true }); } 
    },
  ];

  const maxContext = 128000;
  const percentage = Math.min((tokenCount / maxContext) * 100, 100);
  const savedTokens = rawTokenCount - tokenCount;
  const savedPercent = rawTokenCount > 0 ? Math.round((savedTokens / rawTokenCount) * 100) : 0;
  
  let barColor = 'bg-success';
  if (percentage > 50) barColor = 'bg-yellow-500';
  if (percentage > 90) barColor = 'bg-red-500';

  return (
    <div className="flex flex-col gap-4">
      {/* Quick Presets */}
      <div className="shrink-0 space-y-2">
         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <ScrollText className="w-3 h-3" /> Quick Presets
         </label>
         <div className="grid grid-cols-4 gap-1.5">
            {presets.map((p) => (
                <button 
                    key={p.name}
                    onClick={p.apply}
                    className="flex flex-col items-center justify-center py-2 px-0.5 rounded-lg border border-slate-700 bg-surface/30 hover:bg-surface hover:border-primary/50 transition-all group"
                    title={p.desc}
                >
                    <div className="text-[9px] font-bold text-slate-200 group-hover:text-primary transition-colors tracking-tight">{p.name}</div>
                    <div className="text-[8px] text-slate-500 leading-none mt-0.5">{p.desc}</div>
                </button>
            ))}
         </div>
      </div>

      {/* Format Selection */}
      <div className="shrink-0 space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-3 h-3" /> Format
        </label>
        <div className="grid grid-cols-5 gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
          {formats.map(f => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={clsx(
                "flex flex-col items-center justify-center py-1.5 rounded-md text-[10px] font-medium transition-all relative",
                format === f.id ? "text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              {format === f.id && (
                <motion.div
                  layoutId="activeFormat"
                  className="absolute inset-0 bg-surfaceHighlight rounded-md border border-white/10 shadow-sm"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <f.icon className={clsx("w-3.5 h-3.5 mb-0.5 relative z-10", format === f.id ? "text-primary" : "text-current")} />
              <span className="relative z-10 scale-90">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Optimizations */}
      <div className="shrink-0 space-y-2">
        <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Optimizations</label>
            {savedPercent > 0 && (
                <span className="text-[9px] font-bold bg-success/10 text-success px-1.5 py-0.5 rounded border border-success/20">
                    -{savedPercent}%
                </span>
            )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setOptions({ ...options, removeComments: !options.removeComments })}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-medium transition-all text-left",
              options.removeComments ? "bg-primary/10 border-primary/50 text-white" : "bg-surface/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:bg-surface"
            )}
          >
            <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", options.removeComments ? "bg-primary" : "bg-slate-600")} />
            <span>No Comments</span>
          </button>
          <button
            onClick={() => setOptions({ ...options, removeConsoleLogs: !options.removeConsoleLogs })}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-medium transition-all text-left",
              options.removeConsoleLogs ? "bg-primary/10 border-primary/50 text-white" : "bg-surface/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:bg-surface"
            )}
          >
            <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", options.removeConsoleLogs ? "bg-primary" : "bg-slate-600")} />
            <span>No Logs</span>
          </button>
          <button
            onClick={() => setOptions({ ...options, removeImports: !options.removeImports })}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-medium transition-all text-left",
              options.removeImports ? "bg-primary/10 border-primary/50 text-white" : "bg-surface/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:bg-surface"
            )}
          >
             <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", options.removeImports ? "bg-primary" : "bg-slate-600")} />
            <span>No Imports</span>
          </button>
          <button
            onClick={() => setOptions({ ...options, minifyWhitespace: !options.minifyWhitespace })}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-medium transition-all text-left",
              options.minifyWhitespace ? "bg-primary/10 border-primary/50 text-white" : "bg-surface/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:bg-surface"
            )}
          >
             <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", options.minifyWhitespace ? "bg-primary" : "bg-slate-600")} />
            <span>Minify</span>
          </button>
           <button
            onClick={() => setOptions({ ...options, skeletonize: !options.skeletonize })}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-medium transition-all text-left",
              options.skeletonize ? "bg-accent/10 border-accent/50 text-white" : "bg-surface/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:bg-surface"
            )}
          >
             <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", options.skeletonize ? "bg-accent" : "bg-slate-600")} />
            <span>Skeleton</span>
          </button>
           <button
            onClick={() => setOptions({ ...options, truncateLargeValues: !options.truncateLargeValues })}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-medium transition-all text-left",
              options.truncateLargeValues ? "bg-primary/10 border-primary/50 text-white" : "bg-surface/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:bg-surface"
            )}
          >
             <div className={clsx("w-1.5 h-1.5 rounded-full shrink-0", options.truncateLargeValues ? "bg-primary" : "bg-slate-600")} />
            <span>Truncate</span>
          </button>
        </div>
      </div>

      {/* Custom Prompt - Flexible Height */}
      <div className="flex flex-col space-y-2">
         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 shrink-0">
            <MessageSquare className="w-3 h-3" /> Context Wrapper
        </label>
        <textarea
          value={options.customPrompt}
          onChange={(e) => setOptions({...options, customPrompt: e.target.value})}
          placeholder="E.g. 'Analyze this codebase for security vulnerabilities...'"
          className="w-full bg-black/20 border border-slate-700/50 rounded-lg p-3 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:bg-black/40 min-h-[80px] resize-y custom-scrollbar transition-all"
        />
      </div>

      {/* Token Usage Bar - Fixed at Bottom */}
      <div className="shrink-0 bg-surfaceHighlight rounded-xl p-3 border border-white/5 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex justify-between items-end mb-2 relative z-10">
            <div>
                <div className="text-xl font-bold text-white font-mono tracking-tighter flex items-end gap-2">
                    {new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(tokenCount)} 
                </div>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Est. Tokens</span>
            </div>
            <div className="text-right">
                <div className="text-[9px] text-slate-500 uppercase mb-0.5">Capacity</div>
                <div className={clsx("text-xs font-mono font-bold", percentage > 90 ? "text-red-400" : "text-accent")}>
                    {percentage.toFixed(1)}%
                </div>
            </div>
        </div>
        <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden relative z-10">
          <motion.div 
            className={`h-full ${barColor} shadow-[0_0_10px_currentColor]`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: 'spring', stiffness: 40 }}
          />
        </div>
      </div>
    </div>
  );
};

export default OutputControls;