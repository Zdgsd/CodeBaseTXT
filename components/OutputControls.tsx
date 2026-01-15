import React from 'react';
import { OutputFormat, GenerationOptions } from '../types';
import { FileText, FileCode, Code, FileJson, Hash, Zap, Layers, Terminal, Minimize2, PackageX, MessageSquare, Bone, Scissors, ScrollText } from 'lucide-react';
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
        desc: 'Balanced MD', 
        apply: () => { setFormat('MARKDOWN'); setOptions({ ...options, removeComments: false, removeEmptyLines: false, removeConsoleLogs: false, minifyWhitespace: false, removeImports: false, skeletonize: false, truncateLargeValues: false }); } 
    },
    { 
        name: 'Compressed', 
        desc: 'Dense & Clean', 
        apply: () => { setFormat('DENSE'); setOptions({ ...options, removeComments: true, removeEmptyLines: true, removeConsoleLogs: true, minifyWhitespace: false, removeImports: false, skeletonize: false, truncateLargeValues: true }); } 
    },
    { 
        name: 'Skeleton', 
        desc: 'Structure Only', 
        apply: () => { setFormat('MARKDOWN'); setOptions({ ...options, removeComments: true, removeEmptyLines: true, removeConsoleLogs: true, minifyWhitespace: false, removeImports: true, skeletonize: true, truncateLargeValues: true }); } 
    },
    { 
        name: 'Minified', 
        desc: 'Max Savings', 
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
    <div className="space-y-8">
      {/* Quick Presets */}
      <div className="space-y-3">
         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <ScrollText className="w-3 h-3" /> Quick Presets
         </label>
         {/* Fixed grid columns to 2 to fit sidebar width */}
         <div className="grid grid-cols-2 gap-2">
            {presets.map((p) => (
                <button 
                    key={p.name}
                    onClick={p.apply}
                    className="flex flex-col items-start justify-center p-3 rounded-lg border border-slate-700 bg-surface/30 hover:bg-surface hover:border-primary/50 transition-all group h-full text-left"
                >
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-primary transition-colors">{p.name}</div>
                    <div className="text-[10px] text-slate-500 group-hover:text-slate-400">{p.desc}</div>
                </button>
            ))}
         </div>
      </div>

      {/* Format Selection */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-3 h-3" /> Format
        </label>
        <div className="grid grid-cols-5 gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
          {formats.map(f => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={clsx(
                "flex flex-col items-center justify-center py-2 rounded-md text-[10px] font-medium transition-all relative",
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
              <f.icon className={clsx("w-4 h-4 mb-1 relative z-10", format === f.id ? "text-primary" : "text-current")} />
              <span className="relative z-10 scale-90">{f.label}</span>
            </button>
          ))}
        </div>
        <div className="px-1">
             <p className="text-[10px] text-slate-500 leading-relaxed border-l-2 border-slate-800 pl-2">
                {format === 'DENSE' && "Removes formatting overhead. Best for pure context."}
                {format === 'MARKDOWN' && "Standard format with syntax highlighting support."}
                {format === 'XML' && "Structured tagging, preferred by Anthropic models."}
                {format === 'JSON' && "Single JSON object mapping paths to content."}
                {format === 'TEXT' && "Simple flat text file format."}
            </p>
        </div>
      </div>

      {/* Optimizations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Optimizations</label>
            {savedPercent > 0 && (
                <motion.span 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-[10px] font-bold bg-success/10 text-success px-1.5 py-0.5 rounded border border-success/20"
                >
                    -{savedPercent}%
                </motion.span>
            )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setOptions({ ...options, removeComments: !options.removeComments })}
            className={clsx(
              "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[11px] font-medium transition-all text-left",
              options.removeComments ? "bg-primary/10 border-primary/50 text-white" : "bg-surface/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:bg-surface"
            )}
          >
            <Hash className={clsx("w-3.5 h-3.5 shrink-0", options.removeComments ? "text-primary" : "text-slate-500")} />
            <span>No Comments</span>
          </button>
          <button
            onClick={() => setOptions({ ...options, removeConsoleLogs: !options.removeConsoleLogs })}
            className={clsx(
              "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[11px] font-medium transition-all text-left",
              options.removeConsoleLogs ? "bg-primary/10 border-primary/50 text-white" : "bg-surface/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:bg-surface"
            )}
          >
            <Terminal className={clsx("w-3.5 h-3.5 shrink-0", options.removeConsoleLogs ? "text-primary" : "text-slate-500")} />
            <span>No Logs</span>
          </button>
          <button
            onClick={() => setOptions({ ...options, removeImports: !options.removeImports })}
            className={clsx(
              "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[11px] font-medium transition-all text-left",
              options.removeImports ? "bg-primary/10 border-primary/50 text-white" : "bg-surface/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:bg-surface"
            )}
          >
            <PackageX className={clsx("w-3.5 h-3.5 shrink-0", options.removeImports ? "text-primary" : "text-slate-500")} />
            <span>No Imports</span>
          </button>
          <button
            onClick={() => setOptions({ ...options, minifyWhitespace: !options.minifyWhitespace })}
            className={clsx(
              "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[11px] font-medium transition-all text-left",
              options.minifyWhitespace ? "bg-primary/10 border-primary/50 text-white" : "bg-surface/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:bg-surface"
            )}
            title="Minifies JSON/HTML and removes indent from code"
          >
            <Minimize2 className={clsx("w-3.5 h-3.5 shrink-0", options.minifyWhitespace ? "text-primary" : "text-slate-500")} />
            <span>Minify</span>
          </button>
           <button
            onClick={() => setOptions({ ...options, skeletonize: !options.skeletonize })}
            className={clsx(
              "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[11px] font-medium transition-all text-left group",
              options.skeletonize ? "bg-accent/10 border-accent/50 text-white" : "bg-surface/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:bg-surface"
            )}
            title="Keeps definitions, removes implementation logic"
          >
            <Bone className={clsx("w-3.5 h-3.5 shrink-0", options.skeletonize ? "text-accent" : "text-slate-500")} />
            <span>Skeleton Mode</span>
          </button>
           <button
            onClick={() => setOptions({ ...options, truncateLargeValues: !options.truncateLargeValues })}
            className={clsx(
              "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[11px] font-medium transition-all text-left",
              options.truncateLargeValues ? "bg-primary/10 border-primary/50 text-white" : "bg-surface/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:bg-surface"
            )}
            title="Truncates base64 strings and long text > 150 chars"
          >
            <Scissors className={clsx("w-3.5 h-3.5 shrink-0", options.truncateLargeValues ? "text-primary" : "text-slate-500")} />
            <span>Truncate Data</span>
          </button>
        </div>
      </div>

      {/* Custom Prompt */}
      <div className="space-y-3">
         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-3 h-3" /> Context Wrapper
        </label>
        <textarea
          value={options.customPrompt}
          onChange={(e) => setOptions({...options, customPrompt: e.target.value})}
          placeholder="E.g. 'Analyze this codebase for security vulnerabilities...'"
          className="w-full h-24 bg-black/20 border border-slate-700/50 rounded-lg p-3 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:bg-black/40 resize-none custom-scrollbar transition-all"
        />
      </div>

      {/* Token Usage Bar */}
      <div className="bg-surfaceHighlight rounded-xl p-4 border border-white/5 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex justify-between items-end mb-3 relative z-10">
            <div>
                <div className="text-2xl font-bold text-white font-mono tracking-tighter flex items-end gap-2">
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
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden relative z-10">
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